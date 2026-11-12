import hmac
import hashlib
import time
import json
from datetime import datetime
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db, limiter
from app.models import Post, Series, Comment
from app.services.ai_search_service import RecommendationService
from app.utils.helpers import api_response, admin_required, generate_slug, sanitize_html

posts_bp = Blueprint("posts", __name__)

def generate_preview_token(post_id: int) -> str:
    """Sinh token xem trước bài nháp bảo mật tạm thời (15 phút)."""
    secret = current_app.config['SECRET_KEY']
    expire_at = int(time.time()) + 900
    msg = f"{post_id}:{expire_at}"
    signature = hmac.new(secret.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return f"{msg}:{signature}"

def verify_preview_token(post_id: int, token: str) -> bool:
    if not token:
        return False
    parts = token.split(":")
    if len(parts) != 3:
        return False
    t_post_id, expire_at, signature = parts
    if int(t_post_id) != post_id:
        return False
    if int(expire_at) < int(time.time()):
        return False
    secret = current_app.config['SECRET_KEY']
    expected_sig = hmac.new(secret.encode(), f"{t_post_id}:{expire_at}".encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_sig, signature)

@posts_bp.route("/posts", methods=["GET"])
def get_posts():
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 10, type=int)
    tag = request.args.get("tag", "").strip()
    series_id = request.args.get("series_id", type=int)
    lang = request.args.get("lang", "").strip()

    query = Post.query.filter_by(status="published")

    if lang:
        query = query.filter_by(lang=lang)
    if series_id:
        query = query.filter_by(series_id=series_id)
    if tag:
        query = query.filter(Post.tags.ilike(f"%{tag}%"))

    pagination = query.order_by(Post.created_at.desc()).paginate(page=page, per_page=limit, error_out=False)
    
    posts_data = [p.to_dict(include_content=False) for p in pagination.items]
    return api_response(success=True, data={
        "posts": posts_data,
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev
    })

@posts_bp.route("/posts/<string:slug>", methods=["GET"])
def get_post_detail(slug: str):
    post = Post.query.filter_by(slug=slug, status="published").first()
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    # Chống tăng view lặp lại do React StrictMode kích hoạt 2 request liên tiếp
    # Cách chuẩn của các nền tảng CMS: Nhận diện client qua IP + User-Agent và ghi nhận phiên truy cập ngắn
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    user_agent = request.headers.get("User-Agent", "")
    client_key = hashlib.md5(f"{client_ip}:{user_agent}:{post.id}".encode()).hexdigest()

    # Sử dụng cache bộ nhớ tạm thời trên server để chặn các request trùng lặp trong vòng 3 giây
    if not hasattr(current_app, "_recent_views"):
        current_app._recent_views = {}

    now = time.time()
    # Dọn dẹp cache cũ > 60 giây
    current_app._recent_views = {k: v for k, v in current_app._recent_views.items() if now - v < 60}

    last_view_time = current_app._recent_views.get(client_key, 0)
    if now - last_view_time > 3:
        post.views += 1
        db.session.commit()
        current_app._recent_views[client_key] = now

    # Lấy bài trước và bài sau
    prev_post = Post.query.filter(Post.status == "published", Post.created_at < post.created_at).order_by(Post.created_at.desc()).first()
    next_post = Post.query.filter(Post.status == "published", Post.created_at > post.created_at).order_by(Post.created_at.asc()).first()

    # Gợi ý bài liên quan bằng AI Recommendation (TF-IDF & Cosine Similarity)
    related_posts = RecommendationService.get_related_posts(post.id, limit=4)

    post_data = post.to_dict(include_content=True)
    post_data["navigation"] = {
        "prev": {"title": prev_post.title, "slug": prev_post.slug} if prev_post else None,
        "next": {"title": next_post.title, "slug": next_post.slug} if next_post else None
    }
    post_data["related_posts"] = related_posts

    return api_response(success=True, data=post_data)

@posts_bp.route("/posts/<string:slug>/preview", methods=["GET"])
def preview_post(slug: str):
    token = request.args.get("token", "")
    post = Post.query.filter_by(slug=slug).first()
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    if not verify_preview_token(post.id, token):
        return api_response(success=False, message="Invalid or expired preview token.", status_code=403)

    return api_response(success=True, data=post.to_dict(include_content=True))

@posts_bp.route("/admin/posts/<int:post_id>/preview-token", methods=["POST"])
@admin_required()
def create_preview_token(post_id: int):
    post = Post.query.get(post_id)
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)
    token = generate_preview_token(post.id)
    return api_response(success=True, data={"token": token, "preview_url": f"/blog/{post.slug}?preview={token}"})

@posts_bp.route("/posts/<string:slug>/reactions", methods=["POST"])
@limiter.limit("60 per minute")
def react_post(slug: str):
    post = Post.query.filter_by(slug=slug).first()
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    data = request.get_json() or {}
    reaction_type = data.get("type", "heart").lower()
    # Hỗ trợ cờ remove: True/False để bật/tắt (toggle) phản ứng như Facebook
    action = data.get("action", "add")  # "add" hoặc "remove"

    reactions = json.loads(post.reactions_json or '{"fire": 0, "heart": 0, "idea": 0, "rocket": 0}')
    if reaction_type not in reactions:
        reactions[reaction_type] = 0

    if action == "remove":
        reactions[reaction_type] = max(0, reactions[reaction_type] - 1)
    else:
        reactions[reaction_type] += 1

    post.reactions_json = json.dumps(reactions)
    db.session.commit()

    return api_response(success=True, data=reactions, message="Reaction updated.")

# --- COMMENT ENDPOINTS ---

@posts_bp.route("/posts/<string:slug>/comments", methods=["GET"])
def get_post_comments(slug: str):
    post = Post.query.filter_by(slug=slug).first()
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    # Lấy các bình luận gốc (parent_id is None) kèm các câu trả lời lồng nhau (nested replies)
    root_comments = Comment.query.filter_by(post_id=post.id, parent_id=None).order_by(Comment.created_at.desc()).all()
    return api_response(success=True, data=[c.to_dict(include_replies=True) for c in root_comments])

@posts_bp.route("/posts/<string:slug>/comments", methods=["POST"])
@jwt_required()
@limiter.limit("15 per minute")
def add_comment(slug: str):
    user_id = int(get_jwt_identity())
    post = Post.query.filter_by(slug=slug).first()
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    data = request.get_json() or {}
    raw_content = data.get("content", "").strip()
    parent_id = data.get("parent_id")  # ID của bình luận cha nếu là trả lời (reply)

    if not raw_content:
        return api_response(success=False, message="Nội dung bình luận không được để trống.", status_code=400)

    # Nếu có parent_id, kiểm tra bình luận cha có tồn tại không
    if parent_id:
        parent_comment = Comment.query.get(parent_id)
        if not parent_comment or parent_comment.post_id != post.id:
            return api_response(success=False, message="Bình luận cha không hợp lệ.", status_code=400)

    # Chống XSS an toàn bằng bleach
    clean_content = sanitize_html(raw_content)

    comment = Comment(post_id=post.id, user_id=user_id, parent_id=parent_id, content=clean_content)
    db.session.add(comment)
    db.session.commit()

    return api_response(success=True, data=comment.to_dict(include_replies=True), message="Đăng bình luận thành công.", status_code=201)

@posts_bp.route("/comments/<int:comment_id>", methods=["PUT"])
@jwt_required()
def edit_comment(comment_id: int):
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    comment = Comment.query.get(comment_id)
    if not comment:
        return api_response(success=False, message="Comment not found.", status_code=404)

    if comment.user_id != user_id and claims.get("role") != "admin":
        return api_response(success=False, message="Bạn không có quyền sửa bình luận này.", status_code=403)

    data = request.get_json() or {}
    raw_content = data.get("content", "").strip()
    if not raw_content:
        return api_response(success=False, message="Nội dung bình luận không được để trống.", status_code=400)

    comment.content = sanitize_html(raw_content)
    comment.updated_at = datetime.utcnow()
    db.session.commit()

    return api_response(success=True, data=comment.to_dict(), message="Cập nhật bình luận thành công.")

@posts_bp.route("/comments/<int:comment_id>", methods=["DELETE"])
@jwt_required()
def delete_comment(comment_id: int):
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    comment = Comment.query.get(comment_id)
    if not comment:
        return api_response(success=False, message="Comment not found.", status_code=404)

    if comment.user_id != user_id and claims.get("role") != "admin":
        return api_response(success=False, message="Bạn không có quyền xóa bình luận này.", status_code=403)

    db.session.delete(comment)
    db.session.commit()
    return api_response(success=True, message="Đã xóa bình luận.")

@posts_bp.route("/tags", methods=["GET"])
def get_tags():
    posts = Post.query.filter_by(status="published").all()
    tag_counts = {}
    for p in posts:
        if p.tags:
            for t in p.tags.split(","):
                t = t.strip()
                if t:
                    tag_counts[t] = tag_counts.get(t, 0) + 1
    
    tags_list = [{"tag": k, "count": v} for k, v in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)]
    return api_response(success=True, data=tags_list)

@posts_bp.route("/admin/posts", methods=["GET"])
@admin_required()
def get_admin_posts():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    return api_response(success=True, data=[p.to_dict(include_content=False) for p in posts])

@posts_bp.route("/posts", methods=["POST"])
@admin_required()
def create_post():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not title or not content:
        return api_response(success=False, message="Title and content are required.", status_code=400)

    slug = data.get("slug", "").strip() or generate_slug(title)
    # Đảm bảo tính duy nhất của slug
    original_slug = slug
    counter = 1
    while Post.query.filter_by(slug=slug).first():
        slug = f"{original_slug}-{counter}"
        counter += 1

    # Làm sạch nội dung chống XSS nếu là richtext
    content_type = data.get("content_type", "markdown")
    if content_type == "richtext":
        content = sanitize_html(content)

    status = data.get("status", "draft")
    published_at = datetime.utcnow() if status == "published" else None

    post = Post(
        title=title,
        slug=slug,
        excerpt=data.get("excerpt", "").strip(),
        content=content,
        content_type=content_type,
        cover_image=data.get("cover_image", "").strip(),
        status=status,
        tags=",".join([t.strip() for t in data.get("tags", [])]) if isinstance(data.get("tags"), list) else data.get("tags", "").strip(),
        lang=data.get("lang", "vi"),
        series_id=data.get("series_id"),
        order_index=data.get("order_index", 0),
        published_at=published_at
    )

    db.session.add(post)
    db.session.commit()

    return api_response(success=True, data=post.to_dict(include_content=True), message="Post created successfully.", status_code=201)

@posts_bp.route("/posts/<int:post_id>", methods=["PUT"])
@admin_required()
def update_post(post_id: int):
    post = Post.query.get(post_id)
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    data = request.get_json() or {}

    if "title" in data:
        post.title = data["title"].strip()
    if "slug" in data and data["slug"].strip():
        new_slug = generate_slug(data["slug"].strip())
        if new_slug != post.slug and not Post.query.filter_by(slug=new_slug).first():
            post.slug = new_slug
    if "excerpt" in data:
        post.excerpt = data["excerpt"].strip()
    if "content" in data:
        content_type = data.get("content_type", post.content_type)
        post.content = sanitize_html(data["content"]) if content_type == "richtext" else data["content"]
        post.content_type = content_type
    if "cover_image" in data:
        post.cover_image = data["cover_image"].strip()
    if "status" in data:
        if post.status != "published" and data["status"] == "published":
            post.published_at = datetime.utcnow()
        post.status = data["status"]
    if "tags" in data:
        post.tags = ",".join([t.strip() for t in data["tags"]]) if isinstance(data["tags"], list) else data["tags"].strip()
    if "lang" in data:
        post.lang = data["lang"]
    if "series_id" in data:
        post.series_id = data["series_id"]
    if "order_index" in data:
        post.order_index = data["order_index"]

    db.session.commit()
    return api_response(success=True, data=post.to_dict(include_content=True), message="Post updated successfully.")

@posts_bp.route("/posts/<int:post_id>", methods=["DELETE"])
@admin_required()
def delete_post(post_id: int):
    post = Post.query.get(post_id)
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    db.session.delete(post)
    db.session.commit()
    return api_response(success=True, message="Post deleted successfully.")
