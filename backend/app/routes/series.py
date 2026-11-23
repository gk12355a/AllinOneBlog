import json
from flask import Blueprint, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from app.extensions import db
from app.models import Series, Post, Video, SeriesItem, SeriesProgress
from app.utils.helpers import api_response, admin_required, generate_slug
from flask_jwt_extended import jwt_required, get_jwt_identity

series_bp = Blueprint("series", __name__)

def is_admin_request() -> bool:
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        return bool(claims and claims.get("role") == "admin")
    except Exception:
        return False

@series_bp.route("/series", methods=["GET"])
def get_series():
    from app.services.post_access_service import get_current_user_optional
    current_u = get_current_user_optional()
    query = Series.query
    is_admin = is_admin_request()
    if not is_admin:
        query = query.filter_by(is_published=True)
    all_series = query.order_by(Series.created_at.desc()).all()

    # Chỉ hiển thị series nếu series đó còn ít nhất 1 bài học khả dụng cho người xem (Stealth Mode)
    results = []
    for s in all_series:
        s_data = s.to_dict(include_items=False, current_user=current_u)
        if is_admin or s_data.get("total_items", 0) > 0:
            results.append(s_data)

    return api_response(success=True, data=results)

@series_bp.route("/series/<string:slug>", methods=["GET"])
def get_series_detail(slug: str):
    from app.services.post_access_service import get_current_user_optional
    current_u = get_current_user_optional()
    series = Series.query.filter_by(slug=slug).first()
    if not series:
        return api_response(success=False, message="Series not found.", status_code=404)
    # Check is_published
    is_admin = is_admin_request()
    if not series.is_published and not is_admin:
        return api_response(success=False, message="Series is currently private.", status_code=403)
    return api_response(success=True, data=series.to_dict(include_items=True, current_user=current_u))

@series_bp.route("/admin/series", methods=["POST"])
@admin_required()
def create_series():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    if not title:
        return api_response(success=False, message="Series title is required.", status_code=400)

    slug = data.get("slug", "").strip() or generate_slug(title)
    if Series.query.filter_by(slug=slug).first():
        return api_response(success=False, message="Series slug already exists.", status_code=409)

    upcoming_raw = data.get("upcoming_lessons", [])
    upcoming_str = json.dumps(upcoming_raw, ensure_ascii=False) if isinstance(upcoming_raw, list) else "[]"

    series = Series(
        title=title,
        slug=slug,
        description=data.get("description", "").strip(),
        cover_image=data.get("cover_image", "").strip(),
        level=data.get("level", "beginner"),
        status=data.get("status", "updating"),
        is_published=bool(data.get("is_published", True)),
        upcoming_lessons=upcoming_str
    )
    db.session.add(series)
    db.session.commit()

    return api_response(success=True, data=series.to_dict(include_items=True), message="Series created successfully.", status_code=201)

@series_bp.route("/admin/series/<int:series_id>", methods=["PUT"])
@admin_required()
def update_series(series_id: int):
    series = Series.query.get(series_id)
    if not series:
        return api_response(success=False, message="Series not found.", status_code=404)

    data = request.get_json() or {}
    if "title" in data:
        series.title = data["title"].strip()
    if "description" in data:
        series.description = data["description"].strip()
    if "cover_image" in data:
        series.cover_image = data["cover_image"].strip()
    if "level" in data:
        series.level = data["level"].strip()
    if "status" in data:
        series.status = data["status"].strip()
    if "is_published" in data:
        series.is_published = bool(data["is_published"])
    if "upcoming_lessons" in data:
        upcoming_raw = data["upcoming_lessons"]
        series.upcoming_lessons = json.dumps(upcoming_raw, ensure_ascii=False) if isinstance(upcoming_raw, list) else "[]"
    if "slug" in data and data["slug"].strip():
        new_slug = generate_slug(data["slug"].strip())
        if new_slug != series.slug and not Series.query.filter_by(slug=new_slug).first():
            series.slug = new_slug

    db.session.commit()
    return api_response(success=True, data=series.to_dict(include_items=True), message="Series updated successfully.")

@series_bp.route("/admin/series/<int:series_id>", methods=["DELETE"])
@admin_required()
def delete_series(series_id: int):
    series = Series.query.get(series_id)
    if not series:
        return api_response(success=False, message="Series not found.", status_code=404)

    # Detach posts from this series before deletion
    for p in series.posts:
        p.series_id = None
        p.order_index = 0

    db.session.delete(series)
    db.session.commit()
    return api_response(success=True, message="Series deleted successfully.")

# --- CÁC ROUTE QUẢN LÝ ITEMS (BÀI VIẾT, VIDEO, PLACEHOLDER) TRONG SERIES ---

@series_bp.route("/admin/series/<int:series_id>/items", methods=["POST"])
@admin_required()
def add_item_to_series(series_id: int):
    """Thêm một bài viết, video hoặc bài dự kiến vào series."""
    series = Series.query.get(series_id)
    if not series:
        return api_response(success=False, message="Series not found.", status_code=404)

    data = request.get_json() or {}
    item_type = data.get("item_type", "post")  # 'post' | 'video' | 'placeholder'
    item_id = data.get("item_id")
    title_override = data.get("title_override", "").strip()
    section_title = data.get("section_title", "").strip()
    duration = data.get("duration", "").strip()
    note = data.get("note", "").strip()

    # Kiểm tra trùng item_id nếu là post hoặc video
    if item_type in ["post", "video"] and item_id:
        existing = SeriesItem.query.filter_by(series_id=series.id, item_type=item_type, item_id=item_id).first()
        if existing:
            return api_response(success=False, message="Mục này đã tồn tại trong chuỗi bài học.", status_code=409)

    # Tính position tiếp theo (thêm vào cuối)
    max_pos = db.session.query(db.func.max(SeriesItem.position)).filter_by(series_id=series.id).scalar() or 0
    new_position = max_pos + 1

    item = SeriesItem(
        series_id=series.id,
        item_type=item_type,
        item_id=int(item_id) if item_id else None,
        position=new_position,
        section_title=section_title,
        title_override=title_override,
        note=note,
        duration=duration
    )
    db.session.add(item)

    # Cập nhật ngược series_id cho post/video (backward compatibility)
    if item_type == "post" and item_id:
        p = Post.query.get(item_id)
        if p:
            p.series_id = series.id
            p.order_index = new_position
    elif item_type == "video" and item_id:
        v = Video.query.get(item_id)
        if v:
            v.series_id = series.id
            v.order_index = new_position

    db.session.commit()
    return api_response(success=True, data=series.to_dict(include_items=True), message="Đã thêm mục vào chuỗi bài học.")

@series_bp.route("/admin/series/<int:series_id>/items/reorder", methods=["PUT", "POST"])
@admin_required()
def reorder_series_items(series_id: int):
    """Sắp xếp lại thứ tự tất cả các mục (bài viết, video, dự kiến) trong series."""
    series = Series.query.get(series_id)
    if not series:
        return api_response(success=False, message="Series not found.", status_code=404)

    data = request.get_json() or {}
    items = data.get("items") or []

    for idx, it_data in enumerate(items, start=1):
        it_id = it_data.get("id") if isinstance(it_data, dict) else it_data
        if it_id:
            db_item = SeriesItem.query.filter_by(id=it_id, series_id=series.id).first()
            if db_item:
                db_item.position = idx
                if isinstance(it_data, dict) and "section_title" in it_data:
                    db_item.section_title = it_data["section_title"].strip()
                # Đồng bộ order_index cho post/video
                if db_item.item_type == "post" and db_item.item_id:
                    p = Post.query.get(db_item.item_id)
                    if p: p.order_index = idx
                elif db_item.item_type == "video" and db_item.item_id:
                    v = Video.query.get(db_item.item_id)
                    if v: v.order_index = idx

    db.session.commit()
    return api_response(success=True, data=series.to_dict(include_items=True), message="Đã cập nhật thứ tự lộ trình.")

@series_bp.route("/admin/series/<int:series_id>/items/<int:item_id>", methods=["DELETE"])
@admin_required()
def remove_item_from_series(series_id: int, item_id: int):
    """Gỡ bỏ một mục khỏi series (không xóa bài viết hoặc video gốc)."""
    item = SeriesItem.query.filter_by(id=item_id, series_id=series_id).first()
    if not item:
        return api_response(success=False, message="Mục không tồn tại trong series này.", status_code=404)

    # Gỡ series_id ở post/video
    if item.item_type == "post" and item.item_id:
        p = Post.query.get(item.item_id)
        if p and p.series_id == series_id:
            p.series_id = None
            p.order_index = 0
    elif item.item_type == "video" and item.item_id:
        v = Video.query.get(item.item_id)
        if v and v.series_id == series_id:
            v.series_id = None
            v.order_index = 0

    db.session.delete(item)
    db.session.commit()

    # Đánh số lại position cho các mục còn lại
    remaining = SeriesItem.query.filter_by(series_id=series_id).order_by(SeriesItem.position.asc()).all()
    for idx, rem in enumerate(remaining, start=1):
        rem.position = idx
    db.session.commit()

    series = Series.query.get(series_id)
    return api_response(success=True, data=series.to_dict(include_items=True) if series else None, message="Đã gỡ mục khỏi series.")

# --- TIẾN ĐỘ HỌC TẬP (SERIES PROGRESS) ---

@series_bp.route("/series/<int:series_id>/progress", methods=["GET"])
def get_series_progress(series_id: int):
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        user_id = None

    if not user_id:
        return api_response(success=True, data={"completed_item_ids": []})

    progress_entries = SeriesProgress.query.filter_by(user_id=int(user_id), series_id=series_id).all()
    completed_ids = [p.item_id for p in progress_entries if p.status == "completed"]
    return api_response(success=True, data={"completed_item_ids": completed_ids})

@series_bp.route("/series/<int:series_id>/progress/<int:item_id>/toggle", methods=["POST"])
@jwt_required()
def toggle_item_progress(series_id: int, item_id: int):
    user_id = int(get_jwt_identity())
    entry = SeriesProgress.query.filter_by(user_id=user_id, series_id=series_id, item_id=item_id).first()

    if entry:
        db.session.delete(entry)
        is_completed = False
    else:
        entry = SeriesProgress(user_id=user_id, series_id=series_id, item_id=item_id, status="completed")
        db.session.add(entry)
        is_completed = True

    db.session.commit()
    return api_response(success=True, data={"completed": is_completed}, message="Đã cập nhật tiến độ học tập.")

# Route to assign or reorder posts in a series (Backward compatibility)
@series_bp.route("/admin/series/<int:series_id>/posts", methods=["POST"])
@admin_required()
def assign_post_to_series(series_id: int):
    series = Series.query.get(series_id)
    if not series:
        return api_response(success=False, message="Series not found.", status_code=404)

    data = request.get_json() or {}
    post_id = data.get("post_id")
    order_index = data.get("order_index")

    post = Post.query.get(post_id)
    if not post:
        return api_response(success=False, message="Post not found.", status_code=404)

    post.series_id = series.id
    if order_index is not None and str(order_index).strip() != "":
        try:
            post.order_index = int(order_index)
        except (ValueError, TypeError):
            post.order_index = 0
    else:
        # Append to end
        max_idx = db.session.query(db.func.max(Post.order_index)).filter_by(series_id=series.id).scalar() or 0
        post.order_index = max_idx + 1

    db.session.commit()
    return api_response(success=True, data=series.to_dict(include_items=True), message="Post assigned to series successfully.")

# Route to reorder multiple posts in a series
@series_bp.route("/admin/series/<int:series_id>/reorder", methods=["PUT", "POST"])
@admin_required()
def reorder_series_posts(series_id: int):
    series = Series.query.get(series_id)
    if not series:
        return api_response(success=False, message="Series not found.", status_code=404)

    data = request.get_json() or {}
    items = data.get("posts") or data.get("items") or []

    if items:
        for idx, item in enumerate(items):
            if isinstance(item, dict):
                p_id = item.get("id") or item.get("post_id")
                ord_idx = item.get("order_index", idx + 1)
            else:
                p_id = item
                ord_idx = idx + 1
            if p_id:
                post = Post.query.filter_by(id=p_id, series_id=series_id).first()
                if post:
                    try:
                        post.order_index = int(ord_idx)
                    except (ValueError, TypeError):
                        pass

    db.session.commit()
    return api_response(success=True, data=series.to_dict(include_items=True), message="Series posts reordered successfully.")

# Route to remove a post from a series
@series_bp.route("/admin/series/<int:series_id>/posts/<int:post_id>", methods=["DELETE"])
@admin_required()
def remove_post_from_series(series_id: int, post_id: int):
    post = Post.query.filter_by(id=post_id, series_id=series_id).first()
    if not post:
        return api_response(success=False, message="Post not in this series.", status_code=404)

    post.series_id = None
    post.order_index = 0
    db.session.commit()

    series = Series.query.get(series_id)
    return api_response(success=True, data=series.to_dict(include_items=True) if series else None, message="Post removed from series successfully.")
