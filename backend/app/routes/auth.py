import re
from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from app.extensions import db, limiter
from app.models import User
from app.utils.helpers import api_response

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return api_response(success=False, message="Username, email, and password are required.", status_code=400)
        
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return api_response(success=False, message="Invalid email format.", status_code=400)
        
    if len(password) < 6:
        return api_response(success=False, message="Password must be at least 6 characters.", status_code=400)

    if User.query.filter_by(username=username).first():
        return api_response(success=False, message="Username already exists.", status_code=409)

    if User.query.filter_by(email=email).first():
        return api_response(success=False, message="Email already exists.", status_code=409)

    user = User(username=username, email=email, role="user")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return api_response(success=True, data=user.to_dict(), message="User registered successfully.", status_code=201)

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}
    identifier = data.get("identifier", "").strip()
    username = data.get("username", "").strip() or identifier
    password = data.get("password", "")

    if not username or not password:
        return api_response(success=False, message="Username and password are required.", status_code=400)

    user = User.query.filter((User.username == username) | (User.email == username)).first()
    if not user or not user.check_password(password):
        return api_response(success=False, message="Invalid username or password.", status_code=401)

    # Cấp phát JWT token kèm role
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "username": user.username}
    )

    return api_response(
        success=True,
        data={
            "access_token": access_token,
            "user": user.to_dict()
        },
        message="Login successful."
    )

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return api_response(success=False, message="User not found.", status_code=404)
    return api_response(success=True, data=user.to_dict())

@auth_bp.route("/profile", methods=["PUT", "PATCH"])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return api_response(success=False, message="User not found.", status_code=404)

    data = request.get_json() or {}
    new_username = data.get("username", "").strip()
    if new_username and new_username != user.username:
        if len(new_username) < 3:
            return api_response(success=False, message="Username phải có ít nhất 3 ký tự.", status_code=400)
        existing = User.query.filter_by(username=new_username).first()
        if existing and existing.id != user.id:
            return api_response(success=False, message="Username này đã có người sử dụng.", status_code=409)
        user.username = new_username

    if "display_name" in data:
        user.display_name = str(data.get("display_name", "")).strip()[:120]
    if "bio" in data:
        user.bio = str(data.get("bio", "")).strip()[:160]
    if "avatar_url" in data:
        user.avatar_url = str(data.get("avatar_url", "")).strip()
    if "location" in data:
        user.location = str(data.get("location", "")).strip()[:100]
    if "website" in data:
        user.website = str(data.get("website", "")).strip()[:255]
    if "github_url" in data:
        user.github_url = str(data.get("github_url", "")).strip()[:255]
    if "linkedin_url" in data:
        user.linkedin_url = str(data.get("linkedin_url", "")).strip()[:255]

    db.session.commit()
    return api_response(success=True, data=user.to_dict(), message="Hồ sơ đã được cập nhật thành công.")

@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
@limiter.limit("5 per minute")
def change_password():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return api_response(success=False, message="User not found.", status_code=404)

    data = request.get_json() or {}
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")

    if not current_password or not new_password:
        return api_response(success=False, message="Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.", status_code=400)

    if not user.check_password(current_password):
        return api_response(success=False, message="Mật khẩu hiện tại không chính xác.", status_code=400)

    if len(new_password) < 8:
        return api_response(success=False, message="Mật khẩu mới phải có tối thiểu 8 ký tự.", status_code=400)

    user.set_password(new_password)
    db.session.commit()
    return api_response(success=True, message="Đổi mật khẩu thành công.")

@auth_bp.route("/settings", methods=["PUT", "PATCH"])
@jwt_required()
def update_settings():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return api_response(success=False, message="User not found.", status_code=404)

    data = request.get_json() or {}
    try:
        curr = json.loads(user.settings_json or "{}")
    except Exception:
        curr = {}

    curr.update(data)
    import json
    user.settings_json = json.dumps(curr)
    db.session.commit()
    return api_response(success=True, data=user.to_dict(), message="Cài đặt đã được lưu.")

@auth_bp.route("/export-data", methods=["POST", "GET"])
@jwt_required()
def export_data():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return api_response(success=False, message="User not found.", status_code=404)

    history = [h.to_dict() for h in user.history.all()]
    likes = [l.to_dict() for l in user.likes.all()]
    bookmarks = [b.to_dict() for b in user.bookmarks.all()]

    export_bundle = {
        "user_profile": user.to_dict(),
        "exported_at": datetime.utcnow().isoformat(),
        "statistics": {
            "history_count": len(history),
            "liked_count": len(likes),
            "saved_count": len(bookmarks)
        },
        "reading_history": history,
        "liked_posts": likes,
        "saved_bookmarks": bookmarks
    }

    return api_response(success=True, data=export_bundle, message="Dữ liệu cá nhân đã sẵn sàng tải về.")

@auth_bp.route("/delete-account", methods=["POST", "DELETE"])
@jwt_required()
def delete_account():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return api_response(success=False, message="User not found.", status_code=404)

    # Nếu là admin duy nhất, không cho phép xóa
    if user.role == "admin":
        admin_count = User.query.filter_by(role="admin").count()
        if admin_count <= 1:
            return api_response(success=False, message="Không thể xóa tài khoản Quản trị viên duy nhất của hệ thống.", status_code=403)

    data = request.get_json() or {}
    password = data.get("password", "")
    if not user.check_password(password):
        return api_response(success=False, message="Mật khẩu xác nhận không chính xác.", status_code=400)

    db.session.delete(user)
    db.session.commit()
    return api_response(success=True, message="Tài khoản đã được xóa vĩnh viễn.")
