from datetime import datetime
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import ReadingHistory, LikedPost, SavedPost, Post, User
from app.services.post_access_service import check_single_post_access, get_post_or_404
from app.utils.helpers import api_response

user_library_bp = Blueprint("user_library", __name__)

def sanitize_library_item(item_dict, post, user):
    """
    Nếu bài viết đã bị xóa HOẶC user hiện tại bị gỡ quyền (Stealth Mode):
    Không để lộ tiêu đề/slug/ảnh cũ, trả về trạng thái 'unavailable' kèm post_id để user xóa khỏi thư viện.
    """
    if not post or not check_single_post_access(post, user):
        return {
            "id": item_dict.get("id"),
            "post_id": item_dict.get("post_id"),
            "viewed_at": item_dict.get("viewed_at"),
            "liked_at": item_dict.get("liked_at"),
            "saved_at": item_dict.get("saved_at"),
            "is_unavailable": True,
            "post": {
                "id": item_dict.get("post_id"),
                "title": "Nội dung này không còn khả dụng",
                "slug": "",
                "excerpt": "Bài viết đã bị gỡ hoặc bạn không còn quyền truy cập.",
                "cover_image": "",
                "is_unavailable": True
            }
        }
    return item_dict

# --- 1. LỊCH SỬ XEM BÀI VIẾT (READING HISTORY) ---

@user_library_bp.route("/user/history", methods=["GET"])
@jwt_required()
def get_reading_history():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    page = request.args.get("page", 1, type=int)
    limit = request.args.get("limit", 20, type=int)

    pagination = ReadingHistory.query.filter_by(user_id=user_id)\
        .order_by(ReadingHistory.viewed_at.desc())\
        .paginate(page=page, per_page=limit, error_out=False)

    sanitized_items = [
        sanitize_library_item(h.to_dict(), h.post, user)
        for h in pagination.items
    ]

    return api_response(success=True, data={
        "history": sanitized_items,
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages
    })

@user_library_bp.route("/user/history/<int:post_id>", methods=["POST"])
@jwt_required()
def add_to_history(post_id: int):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    post, err_resp = get_post_or_404(post_id, user)
    if err_resp:
        return err_resp

    history = ReadingHistory.query.filter_by(user_id=user_id, post_id=post.id).first()
    if history:
        history.viewed_at = datetime.utcnow()
    else:
        history = ReadingHistory(user_id=user_id, post_id=post.id)
        db.session.add(history)

    db.session.commit()
    return api_response(success=True, data=history.to_dict(), message="Added to reading history.", status_code=201)

@user_library_bp.route("/user/history", methods=["DELETE"])
@jwt_required()
def clear_all_history():
    user_id = int(get_jwt_identity())
    ReadingHistory.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return api_response(success=True, message="Reading history cleared successfully.")

@user_library_bp.route("/user/history/<int:post_id>", methods=["DELETE"])
@jwt_required()
def delete_single_history(post_id: int):
    user_id = int(get_jwt_identity())
    history = ReadingHistory.query.filter_by(user_id=user_id, post_id=post_id).first()
    if history:
        db.session.delete(history)
        db.session.commit()
    return api_response(success=True, message="Post removed from history.")

# --- 2. BÀI VIẾT ĐÃ THÍCH (LIKED POSTS) ---

@user_library_bp.route("/user/likes", methods=["GET"])
@jwt_required()
def get_liked_posts():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    likes = LikedPost.query.filter_by(user_id=user_id).order_by(LikedPost.liked_at.desc()).all()
    sanitized = [sanitize_library_item(l.to_dict(), l.post, user) for l in likes]
    return api_response(success=True, data=sanitized)

@user_library_bp.route("/user/likes/<int:post_id>", methods=["POST"])
@jwt_required()
def toggle_like_post(post_id: int):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    post, err_resp = get_post_or_404(post_id, user)
    if err_resp:
        return err_resp

    liked = LikedPost.query.filter_by(user_id=user_id, post_id=post.id).first()
    if liked:
        db.session.delete(liked)
        db.session.commit()
        return api_response(success=True, data={"liked": False}, message="Unliked post.")
    else:
        new_like = LikedPost(user_id=user_id, post_id=post.id)
        db.session.add(new_like)
        db.session.commit()
        return api_response(success=True, data={"liked": True}, message="Liked post.", status_code=201)

# --- 3. BÀI VIẾT ĐÃ LƯU (SAVED BOOKMARKS) ---

@user_library_bp.route("/user/bookmarks", methods=["GET"])
@jwt_required()
def get_bookmarks():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    bookmarks = SavedPost.query.filter_by(user_id=user_id).order_by(SavedPost.saved_at.desc()).all()
    sanitized = [sanitize_library_item(b.to_dict(), b.post, user) for b in bookmarks]
    return api_response(success=True, data=sanitized)

@user_library_bp.route("/user/bookmarks/<int:post_id>", methods=["POST"])
@jwt_required()
def add_bookmark(post_id: int):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    post, err_resp = get_post_or_404(post_id, user)
    if err_resp:
        return err_resp

    bookmark = SavedPost.query.filter_by(user_id=user_id, post_id=post.id).first()
    if not bookmark:
        bookmark = SavedPost(user_id=user_id, post_id=post.id)
        db.session.add(bookmark)
        db.session.commit()

    return api_response(success=True, data=bookmark.to_dict(), message="Post bookmarked.", status_code=201)

@user_library_bp.route("/user/bookmarks/<int:post_id>", methods=["DELETE"])
@jwt_required()
def remove_bookmark(post_id: int):
    user_id = int(get_jwt_identity())
    bookmark = SavedPost.query.filter_by(user_id=user_id, post_id=post_id).first()
    if bookmark:
        db.session.delete(bookmark)
        db.session.commit()
    return api_response(success=True, message="Post removed from bookmarks.")
