import json
from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models import Profile, Post, Project, Video, Album, Message, User
from app.utils.helpers import api_response, admin_required

profile_bp = Blueprint("profile", __name__)

@profile_bp.route("/profile", methods=["GET"])
def get_profile():
    profile = Profile.query.first()
    if not profile:
        profile = Profile()
        db.session.add(profile)
        db.session.commit()
    return api_response(success=True, data=profile.to_dict())

@profile_bp.route("/admin/profile", methods=["PUT"])
@admin_required()
def update_profile():
    data = request.get_json() or {}
    profile = Profile.query.first()
    if not profile:
        profile = Profile()
        db.session.add(profile)

    if "full_name" in data:
        profile.full_name = data["full_name"]
    if "headline" in data:
        profile.headline = data["headline"]
    if "bio" in data:
        profile.bio = data["bio"]
    if "avatar_url" in data:
        profile.avatar_url = data["avatar_url"]
    if "resume_url" in data:
        profile.resume_url = data["resume_url"]
    if "live_status" in data:
        profile.live_status = data["live_status"]
    if "social_links" in data:
        profile.social_links_json = json.dumps(data["social_links"])
    if "skills" in data:
        profile.skills_json = json.dumps(data["skills"])
    if "timeline" in data:
        profile.timeline_json = json.dumps(data["timeline"])

    db.session.commit()
    return api_response(success=True, data=profile.to_dict(), message="Profile updated successfully.")

@profile_bp.route("/admin/stats", methods=["GET"])
@admin_required()
def get_admin_stats():
    total_posts = Post.query.count()
    total_projects = Project.query.count()
    total_videos = Video.query.count()
    total_albums = Album.query.count()
    total_users = User.query.filter_by(role="user").count()
    unread_messages = Message.query.filter_by(is_read=False).count()
    
    # Tính tổng lượt xem
    total_views = db.session.query(db.func.sum(Post.views)).scalar() or 0
    
    # Lấy top 5 bài viết nhiều view nhất
    top_posts = Post.query.filter_by(status="published").order_by(Post.views.desc()).limit(5).all()

    stats_data = {
        "total_posts": total_posts,
        "total_projects": total_projects,
        "total_videos": total_videos,
        "total_albums": total_albums,
        "total_users": total_users,
        "unread_messages": unread_messages,
        "total_views": total_views,
        "top_posts": [p.to_dict(include_content=False) for p in top_posts]
    }
    return api_response(success=True, data=stats_data)
