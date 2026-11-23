import re
import time
from datetime import datetime, timedelta
from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from app.extensions import db, limiter
from app.models import User
from app.utils.helpers import api_response
from app.services.audit_service import AuditService
from app.utils.device_detector import get_client_ip

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute; 20 per hour")
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
@limiter.limit("5 per minute; 30 per hour")
def login():
    data = request.get_json() or {}
    identifier = data.get("identifier", "").strip()
    username = data.get("username", "").strip() or identifier
    password = data.get("password", "")
    client_ip = get_client_ip(request)

    if not username or not password:
        return api_response(success=False, message="Username and password are required.", status_code=400)

    user = User.query.filter((User.username == username) | (User.email == username)).first()

    # 1. Nếu tài khoản tồn tại, kiểm tra xem có đang bị khóa không
    if user:
        now = datetime.utcnow()
        # Kiểm tra khóa thủ công bởi Admin
        if not user.is_active:
            AuditService.log(
                action=f"{user.username} đăng nhập",
                feature="Xác thực",
                status="failed",
                user_id=user.id,
                username=user.username,
                failure_reason=f"Tài khoản đã bị vô hiệu hóa. Lý do: {user.disabled_reason or 'Không có'}",
                req=request
            )
            return api_response(
                success=False, 
                message="Tài khoản này hiện đang bị tạm khóa. Vui lòng liên hệ Quản trị viên để được hỗ trợ.", 
                status_code=403
            )

        # Kiểm tra khóa tạm thời do nhập sai nhiều lần
        if user.locked_until and user.locked_until > now:
            remaining_mins = max(1, int((user.locked_until - now).total_seconds() // 60))
            AuditService.log(
                action=f"{user.username} đăng nhập",
                feature="Xác thực",
                status="failed",
                user_id=user.id,
                username=user.username,
                failure_reason=f"Tài khoản đã bị khóa do nhập sai quá số lần cho phép. Khóa đến {user.locked_until.strftime('%H:%M:%S %d/%m/%Y')}",
                req=request
            )
            return api_response(
                success=False, 
                message=f"Tài khoản tạm thời bị khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau {remaining_mins} phút.", 
                status_code=403
            )

    # 2. Kiểm tra mật khẩu
    if not user or not user.check_password(password):
        if user:
            # Tăng số lần đăng nhập sai
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            reason = "Mật khẩu không chính xác."
            
            # Nếu nhập sai 5 lần liên tiếp -> Khóa tạm thời 15 phút
            if user.failed_login_attempts >= 5:
                lock_duration = 15  # 15 phút
                user.locked_until = datetime.utcnow() + timedelta(minutes=lock_duration)
                reason = f"Tài khoản đã bị khóa do nhập sai quá số lần cho phép. Vui lòng liên hệ Quản trị viên hoặc thử lại sau {lock_duration} phút."

            db.session.commit()

            AuditService.log(
                action=f"{user.username} đăng nhập",
                feature="Xác thực",
                status="failed",
                user_id=user.id,
                username=user.username,
                failure_reason=reason,
                req=request
            )
        else:
            # Ghi log đăng nhập thất bại cho user không tồn tại
            AuditService.log(
                action=f"{username} đăng nhập",
                feature="Xác thực",
                status="failed",
                username=username,
                failure_reason="Tài khoản không tồn tại trong hệ thống.",
                req=request
            )

        return api_response(success=False, message="Thông tin đăng nhập không chính xác.", status_code=401)

    # 3. Đăng nhập thành công -> Reset failed_login_attempts và cập nhật last_login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    user.last_login_ip = client_ip
    db.session.commit()

    # Cấp phát JWT token kèm role và token_version
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role, 
            "username": user.username,
            "token_version": user.token_version or 1
        }
    )

    # Ghi log thành công
    AuditService.log(
        action=f"{user.username} đăng nhập",
        feature="Xác thực",
        status="success",
        user_id=user.id,
        username=user.username,
        req=request
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
