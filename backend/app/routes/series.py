from flask import Blueprint, request
from app.extensions import db
from app.models import Series
from app.utils.helpers import api_response, admin_required, generate_slug

series_bp = Blueprint("series", __name__)

@series_bp.route("/series", methods=["GET"])
def get_series():
    all_series = Series.query.order_by(Series.created_at.desc()).all()
    return api_response(success=True, data=[s.to_dict(include_items=False) for s in all_series])

@series_bp.route("/series/<string:slug>", methods=["GET"])
def get_series_detail(slug: str):
    series = Series.query.filter_by(slug=slug).first()
    if not series:
        return api_response(success=False, message="Series not found.", status_code=404)
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

    series = Series(
        title=title,
        slug=slug,
        description=data.get("description", "").strip(),
        cover_image=data.get("cover_image", "").strip()
    )
    db.session.add(series)
    db.session.commit()

    return api_response(success=True, data=series.to_dict(include_items=False), message="Series created successfully.", status_code=201)

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
    if "slug" in data and data["slug"].strip():
        new_slug = generate_slug(data["slug"].strip())
        if new_slug != series.slug and not Series.query.filter_by(slug=new_slug).first():
            series.slug = new_slug

    db.session.commit()
    return api_response(success=True, data=series.to_dict(include_items=False), message="Series updated successfully.")

@series_bp.route("/admin/series/<int:series_id>", methods=["DELETE"])
@admin_required()
def delete_series(series_id: int):
    series = Series.query.get(series_id)
    if not series:
        return api_response(success=False, message="Series not found.", status_code=404)

    db.session.delete(series)
    db.session.commit()
    return api_response(success=True, message="Series deleted successfully.")
