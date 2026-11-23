from datetime import datetime, date
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db, limiter
from app.models import User, AuditLog, CycleSetting
from app.utils.helpers import api_response, admin_required
from app.services.audit_service import AuditService

admin_users_bp = Blueprint("admin_users", __name__)

# --- 1. QUẢN LÝ NGƯỜI DÙNG ---

@admin_users_bp.route("/admin/users", methods=["GET"])
@admin_required()
@limiter.limit("60 per minute")
def get_users():
    """Lấy danh sách người dùng kèm bộ lọc và tìm kiếm."""
    search = request.args.get("q", "").strip()
    role = request.args.get("role", "").strip()
    status = request.args.get("status", "").strip()

    query = User.query

    if search:
        query = query.filter((User.username.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%")) | (User.display_name.ilike(f"%{search}%")))

    if role and role != "all":
        query = query.filter_by(role=role)

    if status == "active":
        query = query.filter_by(is_active=True)
    elif status == "disabled":
        query = query.filter_by(is_active=False)

    users = query.order_by(User.created_at.desc()).all()
    
    # Kèm theo danh sách ID người dùng đang online
    try:
        from app.services.realtime_service import get_online_user_ids
        online_ids = get_online_user_ids()
    except Exception:
        online_ids = []

    user_dicts = []
    for u in users:
        d = u.to_dict()
        d["is_online"] = (u.id in online_ids)
        user_dicts.append(d)

    return api_response(success=True, data=user_dicts, meta={"online_user_ids": online_ids})

@admin_users_bp.route("/admin/users/<int:user_id>/status", methods=["PUT"])
@admin_required()
def update_user_status(user_id: int):
    """
    Cập nhật trạng thái kích hoạt/vô hiệu hóa tài khoản (Idempotent).
    Yêu cầu lý do khi vô hiệu hóa.
    Chống tự khóa chính mình và chống khóa Admin duy nhất.
    """
    current_admin_id = int(get_jwt_identity())
    admin_claims = get_jwt()
    admin_username = admin_claims.get("username", "admin")

    target_user = User.query.get(user_id)
    if not target_user:
        return api_response(success=False, message="Người dùng không tồn tại.", status_code=404)

    # 1. Chống tự khóa tài khoản của chính mình
    if target_user.id == current_admin_id:
        return api_response(success=False, message="Bạn không thể tự vô hiệu hóa tài khoản của chính mình.", status_code=403)

    data = request.get_json() or {}
    active = data.get("active", True)
    reason = data.get("reason", "").strip()

    # 2. Nếu đang cố vô hiệu hóa tài khoản admin, kiểm tra xem còn admin nào khác đang active không
    if not active and target_user.role == "admin":
        active_admins_count = User.query.filter_by(role="admin", is_active=True).count()
        if active_admins_count <= 1:
            return api_response(
                success=False, 
                message="Không thể vô hiệu hóa Quản trị viên duy nhất đang hoạt động của hệ thống.", 
                status_code=403
            )

    old_status = target_user.is_active
    target_user.is_active = bool(active)
    
    if not active:
        target_user.disabled_reason = reason or "Vô hiệu hóa bởi Quản trị viên"
        target_user.disabled_by = admin_username
        target_user.disabled_at = datetime.utcnow()
        # Tăng token_version để lập tức thu hồi mọi JWT token đang hoạt động của user này
        target_user.token_version = (target_user.token_version or 1) + 1
        action_name = f"Vô hiệu hóa tài khoản @{target_user.username}"
    else:
        target_user.disabled_reason = ""
        target_user.disabled_by = ""
        target_user.disabled_at = None
        target_user.failed_login_attempts = 0
        target_user.locked_until = None
        action_name = f"Mở khóa tài khoản @{target_user.username}"

    db.session.commit()

    # Ghi Audit Log
    AuditService.log(
        action=action_name,
        feature="Quản trị người dùng",
        status="success",
        user_id=current_admin_id,
        username=admin_username,
        target_type="user",
        target_id=str(target_user.id),
        target_name=target_user.username,
        details={
            "old_active": old_status,
            "new_active": target_user.is_active,
            "reason": reason
        },
        req=request
    )

    return api_response(
        success=True, 
        data=target_user.to_dict(), 
        message=f"{action_name} thành công."
    )

@admin_users_bp.route("/admin/users/<int:user_id>/role", methods=["PUT"])
@admin_required()
def update_user_role(user_id: int):
    """
    Phân quyền người dùng (chuyển đổi giữa 'admin' và 'user').
    Bảo vệ chống tự hạ quyền chính mình và hạ quyền admin cuối cùng.
    """
    current_admin_id = int(get_jwt_identity())
    admin_claims = get_jwt()
    admin_username = admin_claims.get("username", "admin")

    target_user = User.query.get(user_id)
    if not target_user:
        return api_response(success=False, message="Người dùng không tồn tại.", status_code=404)

    data = request.get_json() or {}
    new_role = data.get("role", "").strip().lower()
    if new_role not in ["admin", "user"]:
        return api_response(success=False, message="Vai trò không hợp lệ. Chỉ chấp nhận 'admin' hoặc 'user'.", status_code=400)

    # 1. Chống tự hạ quyền của chính mình
    if target_user.id == current_admin_id and new_role != "admin":
        return api_response(success=False, message="Bạn không thể tự hạ quyền Quản trị viên của chính mình.", status_code=403)

    # 2. Chống hạ quyền admin cuối cùng
    if target_user.role == "admin" and new_role != "admin":
        active_admins_count = User.query.filter_by(role="admin", is_active=True).count()
        if active_admins_count <= 1:
            return api_response(
                success=False, 
                message="Hệ thống phải có ít nhất một Quản trị viên đang hoạt động.", 
                status_code=403
            )

    old_role = target_user.role
    target_user.role = new_role
    # Tăng token_version để user bắt buộc phải nhận lại token với role mới
    target_user.token_version = (target_user.token_version or 1) + 1
    db.session.commit()

    # Ghi Audit Log
    AuditService.log(
        action=f"Thay đổi vai trò cho @{target_user.username}",
        feature="Quản trị người dùng",
        status="success",
        user_id=current_admin_id,
        username=admin_username,
        target_type="user",
        target_id=str(target_user.id),
        target_name=target_user.username,
        details={
            "old_role": old_role,
            "new_role": new_role
        },
        req=request
    )

    return api_response(
        success=True, 
        data=target_user.to_dict(), 
        message=f"Đã cập nhật vai trò của @{target_user.username} thành '{new_role}'."
    )

@admin_users_bp.route("/admin/users/<int:user_id>/reset-password", methods=["POST"])
@admin_required()
def admin_reset_password(user_id: int):
    """
    Admin đặt lại mật khẩu cho thành viên.
    Tự động tăng token_version để thu hồi ngay lập tức mọi phiên đăng nhập cũ,
    và reset số lần thử đăng nhập sai.
    """
    current_admin_id = int(get_jwt_identity())
    admin_claims = get_jwt()
    admin_username = admin_claims.get("username", "admin")

    target_user = User.query.get(user_id)
    if not target_user:
        return api_response(success=False, message="Người dùng không tồn tại.", status_code=404)

    data = request.get_json() or {}
    new_password = data.get("password", "").strip()

    if not new_password or len(new_password) < 6:
        return api_response(
            success=False, 
            message="Mật khẩu mới phải có ít nhất 6 ký tự.", 
            status_code=400
        )

    # Đặt mật khẩu mới
    target_user.set_password(new_password)
    # Thu hồi toàn bộ phiên đăng nhập cũ trên mọi thiết bị
    target_user.token_version = (target_user.token_version or 1) + 1
    # Reset các giới hạn brute-force nếu có
    target_user.failed_login_attempts = 0
    target_user.locked_until = None
    target_user.updated_at = datetime.utcnow()

    db.session.commit()

    # Ghi Audit Log
    AuditService.log(
        action=f"Đặt lại mật khẩu cho @{target_user.username}",
        feature="Quản trị người dùng",
        status="success",
        user_id=current_admin_id,
        username=admin_username,
        target_type="user",
        target_id=str(target_user.id),
        target_name=target_user.username,
        details={
            "revoked_sessions": True,
            "reset_by_admin": admin_username
        },
        req=request
    )

    return api_response(
        success=True,
        data=target_user.to_dict(),
        message=f"Đã đặt lại mật khẩu cho @{target_user.username} thành công. Toàn bộ phiên cũ đã được thu hồi."
    )

# --- 2. NHẬT KÝ HOẠT ĐỘNG (AUDIT LOGS) ---

@admin_users_bp.route("/admin/audit-logs", methods=["GET"])
@admin_required()
def get_audit_logs():
    """
    Lấy danh sách nhật ký hoạt động có lọc theo tính năng, trạng thái, IP, username và phân trang.
    """
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    feature = request.args.get("feature", "").strip()
    status = request.args.get("status", "").strip()
    q = request.args.get("q", "").strip()

    query = AuditLog.query

    if feature and feature != "all":
        query = query.filter_by(feature=feature)

    if status and status != "all":
        query = query.filter_by(status=status)

    if q:
        query = query.filter(
            (AuditLog.username.ilike(f"%{q}%")) |
            (AuditLog.action.ilike(f"%{q}%")) |
            (AuditLog.ip_address.ilike(f"%{q}%")) |
            (AuditLog.failure_reason.ilike(f"%{q}%"))
        )

    total_count = query.count()
    logs = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())\
        .offset((page - 1) * per_page)\
        .limit(per_page)\
        .all()

    return api_response(
        success=True,
        data={
            "items": [log.to_dict() for log in logs],
            "total": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": (total_count + per_page - 1) // per_page
        }
    )

@admin_users_bp.route("/admin/audit-logs/stats", methods=["GET"])
@admin_required()
def get_audit_stats():
    """Lấy thống kê nhanh về nhật ký hoạt động trong 24 giờ qua."""
    now = datetime.utcnow()
    total_logs = AuditLog.query.count()
    failed_auth_count = AuditLog.query.filter_by(feature="Xác thực", status="failed").count()
    disabled_users_count = User.query.filter_by(is_active=False).count()

    return api_response(
        success=True,
        data={
            "total_logs": total_logs,
            "failed_auth_24h": failed_auth_count,
            "disabled_users": disabled_users_count
        }
    )

# --- 3. THEO DÕI CHU KỲ BẢO MẬT (SECRET 28-DAY CYCLE TRACKER) ---

@admin_users_bp.route("/admin/cycle/verify", methods=["POST"])
@admin_required()
@limiter.limit("10 per minute")
def verify_cycle_pin():
    """Xác thực mã PIN bảo vệ để mở khóa tab chu kỳ."""
    data = request.get_json() or {}
    pin = str(data.get("pin", "")).strip()
    
    setting = CycleSetting.query.first()
    if not setting:
        setting = CycleSetting(partner_name="Em Bé", cycle_length=28, period_length=5)
        setting.set_pin("123456")
        db.session.add(setting)
        db.session.commit()

    if setting.check_pin(pin):
        return api_response(
            success=True,
            data=setting.to_dict(),
            message="Xác thực mã PIN thành công."
        )
    return api_response(
        success=False,
        message="Mã PIN không chính xác. Vui lòng thử lại.",
        status_code=401
    )

@admin_users_bp.route("/admin/cycle", methods=["GET"])
@admin_required()
def get_cycle_data():
    """Lấy dữ liệu chu kỳ hiện tại."""
    setting = CycleSetting.query.first()
    if not setting:
        setting = CycleSetting(partner_name="Em Bé", cycle_length=28, period_length=5)
        setting.set_pin("123456")
        db.session.add(setting)
        db.session.commit()
    return api_response(success=True, data=setting.to_dict())

@admin_users_bp.route("/admin/cycle", methods=["PUT"])
@admin_required()
def update_cycle_data():
    """Cập nhật ngày bắt đầu kỳ kinh, độ dài chu kỳ, tên hoặc đổi mã PIN."""
    setting = CycleSetting.query.first()
    if not setting:
        setting = CycleSetting()
        db.session.add(setting)

    data = request.get_json() or {}

    if "partner_name" in data:
        setting.partner_name = str(data.get("partner_name", "")).strip() or "Em Bé"
    if "cycle_length" in data:
        try:
            setting.cycle_length = max(20, min(45, int(data.get("cycle_length"))))
        except (ValueError, TypeError):
            pass
    if "period_length" in data:
        try:
            setting.period_length = max(2, min(10, int(data.get("period_length"))))
        except (ValueError, TypeError):
            pass
    if "last_period_date" in data:
        raw_date = data.get("last_period_date")
        if raw_date:
            try:
                setting.last_period_date = datetime.strptime(raw_date[:10], "%Y-%m-%d").date()
            except ValueError:
                pass
        else:
            setting.last_period_date = None
    if "notes" in data:
        setting.notes = str(data.get("notes", "")).strip()
    
    # Đổi PIN mới nếu được cung cấp
    if "new_pin" in data and data.get("new_pin"):
        new_pin = str(data.get("new_pin")).strip()
        if len(new_pin) >= 4:
            setting.set_pin(new_pin)

    db.session.commit()
    return api_response(success=True, data=setting.to_dict(), message="Đã cập nhật thông tin chu kỳ thành công.")
