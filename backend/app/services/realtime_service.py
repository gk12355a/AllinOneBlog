from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import join_room, leave_room, disconnect
from app.extensions import socketio, db
from app.models import User, Message

def verify_token(token_str):
    if not token_str:
        return None
    try:
        # Token có thể có prefix Bearer
        if token_str.startswith("Bearer "):
            token_str = token_str[7:]
        decoded = decode_token(token_str)
        user_id = decoded.get("sub")
        if user_id:
            user = User.query.get(int(user_id))
            if user and getattr(user, "is_active", True):
                return user
    except Exception as e:
        print("Socket Auth Error:", e)
    return None

@socketio.on("connect")
def handle_connect(auth):
    """
    Xác thực token khi handshake kết nối WebSocket.
    Tự động đưa client vào room riêng biệt theo user.id hoặc admins.
    """
    token = None
    if isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        token = request.args.get("token")

    user = verify_token(token)
    if not user:
        # Cho phép kết nối ẩn danh (nếu cần xem thông báo công khai), nhưng không join room nhạy cảm
        return

    # Join room cá nhân của user
    user_room = f"user:{user.id}"
    join_room(user_room)

    # Nếu là admin -> Join room admins
    if user.role == "admin":
        join_room("admins")

@socketio.on("conversation:join")
def handle_conversation_join(data):
    """
    Kiểm tra quyền truy cập nghiêm ngặt tại Server trước khi cho phép client lắng nghe room hội thoại.
    Tránh lỗ hổng IDOR.
    """
    if not isinstance(data, dict):
        return

    conv_id = data.get("conversation_id") or data.get("id")
    token = data.get("token")
    if not conv_id:
        return

    user = verify_token(token)
    if not user:
        return

    conv = Message.query.get(int(conv_id))
    if not conv or conv.deleted_at is not None:
        return

    # Kiểm tra quyền: Phải là Admin hoặc chính người tạo hội thoại (qua user_id hoặc email)
    can_access = (user.role == "admin") or (conv.user_id == user.id) or (conv.email == user.email)
    if can_access:
        room_name = f"conv:{conv.id}"
        join_room(room_name)

@socketio.on("conversation:leave")
def handle_conversation_leave(data):
    if not isinstance(data, dict):
        return
    conv_id = data.get("conversation_id") or data.get("id")
    if conv_id:
        leave_room(f"conv:{conv_id}")

class RealtimeService:
    @staticmethod
    def notify_conversation_updated(conversation_id, last_message_dict=None):
        """
        Phát tín hiệu an toàn vào Room hội thoại và Room admins.
        Chỉ truyền payload tối thiểu (conv_id, last_message_id) hoặc bản ghi đã sanitize.
        """
        conv = Message.query.get(conversation_id)
        if not conv:
            return

        room_name = f"conv:{conv.id}"

        # 1. Phát tới Room hội thoại (User + Admin đang xem hội thoại này)
        socketio.emit(
            "message:new",
            {
                "conversation_id": conv.id,
                "data": conv.to_dict(is_admin=False)
            },
            room=room_name
        )

        # 2. Phát tới Room admins (để Admin tab cập nhật danh sách và huy hiệu)
        socketio.emit(
            "inbox:changed",
            {
                "conversation_id": conv.id,
                "data": conv.to_dict(is_admin=True)
            },
            room="admins"
        )

        # 3. Phát tới Room cá nhân của User nếu có tài khoản
        if conv.user_id:
            socketio.emit(
                "inbox:changed",
                {
                    "conversation_id": conv.id,
                    "data": conv.to_dict(is_admin=False)
                },
                room=f"user:{conv.user_id}"
            )
