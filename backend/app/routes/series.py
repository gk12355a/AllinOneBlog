import json
from flask import Blueprint, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from app.extensions import db
from app.models import Series, Post
from app.utils.helpers import api_response, admin_required, generate_slug

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
    query = Series.query
    # If not admin, only return published series
    is_admin = is_admin_request()
    if not is_admin:
        query = query.filter_by(is_published=True)
    all_series = query.order_by(Series.created_at.desc()).all()
    return api_response(success=True, data=[s.to_dict(include_items=False) for s in all_series])

@series_bp.route("/series/<string:slug>", methods=["GET"])
def get_series_detail(slug: str):
    series = Series.query.filter_by(slug=slug).first()
    if not series:
        return api_response(success=False, message="Series not found.", status_code=404)
    # Check is_published
    is_admin = is_admin_request()
    if not series.is_published and not is_admin:
        return api_response(success=False, message="Series is currently private.", status_code=403)
    return api_response(success=True, data=series.to_dict(include_items=True))

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

# Route to assign or reorder posts in a series
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
