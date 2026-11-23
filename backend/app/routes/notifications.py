from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models import Notification, User
from app.utils.helpers import api_response

notifications_bp = Blueprint("notifications", __name__)

@notifications_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_user_notifications():
    """
    Lấy danh sách thông báo của người dùng hiện tại (hoặc thông báo admin nếu là admin).
    """
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    if not user or not user.is_active:
        return api_response(success=False, message="User not found or disabled.", status_code=403)

    query = Notification.query
    if user.role == "admin":
        # Admin xem thông báo riêng của mình HOẶC thông báo dành cho admin (user_id IS NULL)
        query = query.filter((Notification.user_id == current_user_id) | (Notification.user_id == None))
    else:
        query = query.filter(Notification.user_id == current_user_id)

    notifications = query.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(30).all()
    unread_count = query.filter(Notification.is_read == False).count()

    return api_response(
        success=True,
        data={
            "items": [n.to_dict() for n in notifications],
            "unread_count": unread_count
        }
    )

@notifications_bp.route("/notifications/<int:notification_id>/read", methods=["PUT"])
@jwt_required()
def mark_notification_read(notification_id: int):
    """Đánh dấu một thông báo là đã đọc."""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    if not user:
        return api_response(success=False, message="User not found.", status_code=403)

    notif = Notification.query.get(notification_id)
    if not notif:
        return api_response(success=False, message="Notification not found.", status_code=404)

    # Kiểm tra quyền: chỉ chủ sở hữu hoặc admin (với notif admin)
    if notif.user_id is not None and notif.user_id != current_user_id and user.role != "admin":
        return api_response(success=False, message="Forbidden.", status_code=403)

    notif.is_read = True
    db.session.commit()
    return api_response(success=True, message="Notification marked as read.")

@notifications_bp.route("/notifications/read-all", methods=["PUT"])
@jwt_required()
def mark_all_notifications_read():
    """Đánh dấu tất cả thông báo là đã đọc."""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    if not user:
        return api_response(success=False, message="User not found.", status_code=403)

    query = Notification.query.filter(Notification.is_read == False)
    if user.role == "admin":
        query = query.filter((Notification.user_id == current_user_id) | (Notification.user_id == None))
    else:
        query = query.filter(Notification.user_id == current_user_id)

    query.update({Notification.is_read: True}, synchronize_session=False)
    db.session.commit()
    return api_response(success=True, message="All notifications marked as read.")

@notifications_bp.route("/notifications/<int:notification_id>", methods=["DELETE"])
@jwt_required()
def delete_notification(notification_id: int):
    """Xóa một thông báo."""
    current_user_id = int(get_jwt_identity())
    user = User.query.get(current_user_id)
    if not user:
        return api_response(success=False, message="User not found.", status_code=403)

    notif = Notification.query.get(notification_id)
    if not notif:
        return api_response(success=False, message="Notification not found.", status_code=404)

    if notif.user_id is not None and notif.user_id != current_user_id and user.role != "admin":
        return api_response(success=False, message="Forbidden.", status_code=403)

    db.session.delete(notif)
    db.session.commit()
    return api_response(success=True, message="Notification deleted.")
