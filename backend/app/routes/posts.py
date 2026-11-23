import hmac
import hashlib
import time
import json
from datetime import datetime
from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db, limiter
from app.models import Post, Series, Comment, PostAccessUser, PostAccessRole, PostExcludedUser, User
from app.services.ai_search_service import RecommendationService
from app.services.post_access_service import get_current_user_optional, visible_posts, get_post_or_404
from app.services.audit_service import AuditService
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
    user = get_current_user_optional()
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 10, type=int)
    tag = request.args.get("tag", "").strip()
    series_id = request.args.get("series_id", type=int)
    lang = request.args.get("lang", "").strip()
    sort_by = request.args.get("sort", "newest").strip().lower()

    # Bắt buộc lọc qua visible_posts (Single Source of Truth)
    query = visible_posts(user)

    if lang and lang != "all":
        query = query.filter(Post.lang == lang)
    if series_id:
        query = query.filter(Post.series_id == series_id)
    if tag:
        query = query.filter(Post.tags.ilike(f"%{tag}%"))

    if sort_by in ("views", "popular", "most_viewed"):
        query = query.order_by(Post.views.desc(), Post.created_at.desc())
    else:
        query = query.order_by(Post.created_at.desc())

    pagination = query.paginate(page=page, per_page=limit, error_out=False)
    
    posts_data = [p.to_dict(include_content=False) for p in pagination.items]
    response, code = api_response(success=True, data={
        "posts": posts_data,
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev
    })
    response.headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate"
    response.headers["Vary"] = "Authorization"
    return response, code

@posts_bp.route("/posts/<string:slug>", methods=["GET"])
def get_post_detail(slug: str):
    user = get_current_user_optional()
    post, err_resp = get_post_or_404(slug, user)
    if err_resp:
        # Nếu bài viết thật sự tồn tại trong DB nhưng bị từ chối quyền (Stealth Mode) -> Ghi log Audit an ninh
        existing_post = Post.query.filter_by(slug=slug).first()
        if existing_post:
            AuditService.log(
                action="Truy cập bài viết bị từ chối (404 Stealth)",
                feature="Phân quyền bài viết",
                status="failed",
                user_id=user.id if user else None,
                username=user.username if user else "Khách ẩn danh",
                failure_reason=f"Không có quyền đọc bài viết riêng tư (Visibility: {existing_post.visibility})",
                target_type="post",
                target_id=str(existing_post.id),
                target_name=existing_post.title,
                commit=True
            )
        return err_resp

    # Chống tăng view lặp lại do React StrictMode kích hoạt 2 request liên tiếp
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    user_agent = request.headers.get("User-Agent", "")
    client_key = hashlib.md5(f"{client_ip}:{user_agent}:{post.id}".encode()).hexdigest()

    if not hasattr(current_app, "_recent_views"):
        current_app._recent_views = {}

    now = time.time()
    current_app._recent_views = {k: v for k, v in current_app._recent_views.items() if now - v < 60}

    last_view_time = current_app._recent_views.get(client_key, 0)
    if now - last_view_time > 3:
        post.views += 1
        db.session.commit()
        current_app._recent_views[client_key] = now

    # Lấy bài trước và bài sau (Chỉ lấy trong danh sách visible_posts của người này)
    vis_q = visible_posts(user)
    prev_post = vis_q.filter(Post.created_at < post.created_at).order_by(Post.created_at.desc()).first()
    next_post = vis_q.filter(Post.created_at > post.created_at).order_by(Post.created_at.asc()).first()

    # Gợi ý bài liên quan bằng AI Recommendation (chỉ lọc trong visible_posts)
    related_posts = RecommendationService.get_related_posts(post.id, limit=4, user=user)

    post_data = post.to_dict(include_content=True)
    post_data["navigation"] = {
        "prev": {"title": prev_post.title, "slug": prev_post.slug} if prev_post else None,
        "next": {"title": next_post.title, "slug": next_post.slug} if next_post else None
    }
    post_data["related_posts"] = related_posts

    response, code = api_response(success=True, data=post_data)
    if post.visibility != "public":
        response.headers["Cache-Control"] = "private, no-cache, no-store, must-revalidate"
        response.headers["Vary"] = "Authorization"
    return response, code

@posts_bp.route("/posts/<string:slug>/preview", methods=["GET"])
def preview_post(slug: str):
    token = request.args.get("token", "")
    post = Post.query.filter_by(slug=slug).first()
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    if not verify_preview_token(post.id, token):
        return api_response(success=False, message="Invalid or expired preview token.", status_code=403)

    return api_response(success=True, data=post.to_dict(include_content=True))

@posts_bp.route("/admin/posts/<post_identifier>/preview-token", methods=["POST"])
@admin_required()
def create_preview_token(post_identifier):
    if str(post_identifier).isdigit():
        post = Post.query.get(int(post_identifier))
    else:
        post = Post.query.filter_by(slug=str(post_identifier)).first()

    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)
    token = generate_preview_token(post.id)
    return api_response(success=True, data={"token": token, "preview_token": token, "preview_url": f"/blog/{post.slug}?preview={token}"})

@posts_bp.route("/posts/<string:slug>/reactions", methods=["POST"])
@limiter.limit("60 per minute")
def react_post(slug: str):
    user = get_current_user_optional()
    post, err_resp = get_post_or_404(slug, user)
    if err_resp:
        return err_resp

    data = request.get_json() or {}
    reaction_type = data.get("type", "heart").lower()
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
    user = get_current_user_optional()
    post, err_resp = get_post_or_404(slug, user)
    if err_resp:
        return err_resp

    root_comments = Comment.query.filter_by(post_id=post.id, parent_id=None).order_by(Comment.created_at.desc()).all()
    return api_response(success=True, data=[c.to_dict(include_replies=True) for c in root_comments])

@posts_bp.route("/posts/<string:slug>/comments", methods=["POST"])
@jwt_required()
@limiter.limit("15 per minute")
def add_comment(slug: str):
    user_id = int(get_jwt_identity())
    current_u = User.query.get(user_id)
    post, err_resp = get_post_or_404(slug, current_u)
    if err_resp:
        return err_resp

    data = request.get_json() or {}
    raw_content = data.get("content", "").strip()
    parent_id = data.get("parent_id")

    if not raw_content:
        return api_response(success=False, message="Nội dung bình luận không được để trống.", status_code=400)

    if parent_id:
        parent_comment = Comment.query.get(parent_id)
        if not parent_comment or parent_comment.post_id != post.id:
            return api_response(success=False, message="Bình luận cha không hợp lệ.", status_code=400)

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
    user = get_current_user_optional()
    # Chỉ đếm tag trên các bài viết mà user hiện tại được phép nhìn thấy (Stealth chống rò rỉ tag bí mật)
    posts = visible_posts(user).all()
    tag_counts = {}
    for p in posts:
        if p.tags:
            for t in p.tags.split(","):
                t = t.strip().lower()
                if t:
                    tag_counts[t] = tag_counts.get(t, 0) + 1
    
    tags_list = [{"tag": k, "count": v} for k, v in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)]
    return api_response(success=True, data=tags_list)

@posts_bp.route("/admin/posts", methods=["GET"])
@admin_required()
def get_admin_posts():
    posts = Post.query.order_by(Post.created_at.desc()).all()
    return api_response(success=True, data=[p.to_dict(include_content=True, include_access=True) for p in posts])

@posts_bp.route("/admin/posts/<int:post_id>", methods=["GET"])
@admin_required()
def get_admin_post(post_id: int):
    post = Post.query.get(post_id)
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)
    return api_response(success=True, data=post.to_dict(include_content=True, include_access=True))

@posts_bp.route("/posts", methods=["POST"])
@posts_bp.route("/admin/posts", methods=["POST"])
@admin_required()
def create_post():
    admin_id = int(get_jwt_identity())
    admin_user = User.query.get(admin_id)
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()

    if not title or not content:
        return api_response(success=False, message="Title and content are required.", status_code=400)

    slug = data.get("slug", "").strip() or generate_slug(title)
    original_slug = slug
    counter = 1
    while Post.query.filter_by(slug=slug).first():
        slug = f"{original_slug}-{counter}"
        counter += 1

    content_type = data.get("content_type", "markdown")
    if content_type == "richtext":
        content = sanitize_html(content)

    status = data.get("status", "draft")
    published_at = datetime.utcnow() if status == "published" else None
    visibility = data.get("visibility", "public")
    if visibility not in ("public", "logged_in", "role", "custom", "unlisted"):
        visibility = "public"

    post = Post(
        author_id=admin_id,
        title=title,
        slug=slug,
        excerpt=data.get("excerpt", "").strip(),
        content=content,
        content_type=content_type,
        cover_image=data.get("cover_image", "").strip(),
        status=status,
        visibility=visibility,
        tags=",".join([t.strip() for t in data.get("tags", [])]) if isinstance(data.get("tags"), list) else data.get("tags", "").strip(),
        lang=data.get("lang", "vi"),
        series_id=data.get("series_id"),
        order_index=data.get("order_index", 0),
        published_at=published_at
    )
    db.session.add(post)
    db.session.flush()

    # Thêm Whitelist Users
    allowed_user_ids = data.get("allowed_user_ids") or []
    if visibility == "custom" and isinstance(allowed_user_ids, list):
        for uid in allowed_user_ids:
            if uid:
                db.session.add(PostAccessUser(post_id=post.id, user_id=int(uid), granted_by=admin_id))

    # Thêm Whitelist Roles
    allowed_roles = data.get("allowed_roles") or []
    if visibility == "role" and isinstance(allowed_roles, list):
        for r in allowed_roles:
            if r:
                db.session.add(PostAccessRole(post_id=post.id, role=str(r).strip()))

    # Thêm Excluded Users (Loại trừ người dùng chỉ định)
    excluded_user_ids = data.get("excluded_user_ids") or []
    if isinstance(excluded_user_ids, list):
        for uid in excluded_user_ids:
            if uid:
                db.session.add(PostExcludedUser(post_id=post.id, user_id=int(uid)))

    db.session.commit()

    # Ghi log Audit an ninh
    AuditService.log(
        action=f"Tạo bài viết mới [{visibility.upper()}]",
        feature="Quản lý bài viết",
        status="success",
        user_id=admin_id,
        username=admin_user.username if admin_user else "Admin",
        target_type="post",
        target_id=str(post.id),
        target_name=post.title,
        details={"visibility": visibility, "allowed_users": allowed_user_ids, "allowed_roles": allowed_roles},
        commit=True
    )

    return api_response(success=True, data=post.to_dict(include_content=True, include_access=True), message="Post created successfully.", status_code=201)

@posts_bp.route("/posts/<int:post_id>", methods=["PUT"])
@posts_bp.route("/admin/posts/<int:post_id>", methods=["PUT"])
@admin_required()
def update_post(post_id: int):
    admin_id = int(get_jwt_identity())
    admin_user = User.query.get(admin_id)
    post = Post.query.get(post_id)
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    data = request.get_json() or {}
    old_visibility = post.visibility or "public"

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
    if "cover_image" in data or "thumbnail" in data:
        post.cover_image = (data.get("cover_image") or data.get("thumbnail") or "").strip()
    if "status" in data:
        if post.status != "published" and data["status"] == "published":
            post.published_at = datetime.utcnow()
        post.status = data["status"]
    if "tags" in data:
        post.tags = ",".join([t.strip() for t in data["tags"]]) if isinstance(data["tags"], list) else data["tags"].strip()
    if "lang" in data or "language" in data:
        post.lang = data.get("lang") or data.get("language")
    if "series_id" in data:
        post.series_id = data["series_id"]
    if "order_index" in data:
        post.order_index = data["order_index"]

    # Cập nhật Visibility & Whitelist
    new_visibility = data.get("visibility", post.visibility)
    if new_visibility in ("public", "logged_in", "role", "custom", "unlisted"):
        post.visibility = new_visibility

    # Quản lý post_access_users nếu có gửi lên
    added_users = []
    removed_users = []
    if "allowed_user_ids" in data and isinstance(data["allowed_user_ids"], list):
        target_ids = set(int(uid) for uid in data["allowed_user_ids"] if uid)
        existing_rules = PostAccessUser.query.filter_by(post_id=post.id).all()
        existing_ids = set(r.user_id for r in existing_rules)

        to_add = target_ids - existing_ids
        to_del = existing_ids - target_ids

        for uid in to_add:
            db.session.add(PostAccessUser(post_id=post.id, user_id=uid, granted_by=admin_id))
            added_users.append(uid)
        for r in existing_rules:
            if r.user_id in to_del:
                db.session.delete(r)
                removed_users.append(r.user_id)

    # Quản lý post_access_roles
    if "allowed_roles" in data and isinstance(data["allowed_roles"], list):
        PostAccessRole.query.filter_by(post_id=post.id).delete()
        for r in data["allowed_roles"]:
            if r:
                db.session.add(PostAccessRole(post_id=post.id, role=str(r).strip()))

    # Quản lý post_excluded_users
    added_excluded = []
    removed_excluded = []
    if "excluded_user_ids" in data and isinstance(data["excluded_user_ids"], list):
        target_excluded_ids = set(int(uid) for uid in data["excluded_user_ids"] if uid)
        existing_excluded = PostExcludedUser.query.filter_by(post_id=post.id).all()
        existing_excluded_ids = set(r.user_id for r in existing_excluded)

        to_add_ex = target_excluded_ids - existing_excluded_ids
        to_del_ex = existing_excluded_ids - target_excluded_ids

        for uid in to_add_ex:
            db.session.add(PostExcludedUser(post_id=post.id, user_id=uid))
            added_excluded.append(uid)
        for r in existing_excluded:
            if r.user_id in to_del_ex:
                db.session.delete(r)
                removed_excluded.append(r.user_id)

    db.session.commit()

    # Ghi log Audit nếu có thay đổi quyền
    if old_visibility != post.visibility or added_users or removed_users or added_excluded or removed_excluded:
        AuditService.log(
            action="Thay đổi phân quyền bài viết",
            feature="Phân quyền bài viết",
            status="success",
            user_id=admin_id,
            username=admin_user.username if admin_user else "Admin",
            target_type="post",
            target_id=str(post.id),
            target_name=post.title,
            details={
                "visibility": [old_visibility, post.visibility],
                "added_users": added_users,
                "removed_users": removed_users,
                "added_excluded_users": added_excluded,
                "removed_excluded_users": removed_excluded
            },
            commit=True
        )

    return api_response(success=True, data=post.to_dict(include_content=True, include_access=True), message="Post updated successfully.")

@posts_bp.route("/posts/<int:post_id>", methods=["DELETE"])
@posts_bp.route("/admin/posts/<int:post_id>", methods=["DELETE"])
@admin_required()
def delete_post(post_id: int):
    post = Post.query.get(post_id)
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    db.session.delete(post)
    db.session.commit()
    return api_response(success=True, message="Post deleted successfully.")
