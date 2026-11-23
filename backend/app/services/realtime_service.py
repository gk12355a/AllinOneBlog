from flask import request
from flask_jwt_extended import decode_token
from flask_socketio import join_room, leave_room, disconnect
from app.extensions import socketio, db
from app.models import User, Message

# Lưu trữ danh sách user đang online: { user_id: set(session_ids) }
ONLINE_USERS = {}

def get_online_user_ids():
    """Trả về danh sách ID người dùng đang online."""
    return [uid for uid, sids in ONLINE_USERS.items() if len(sids) > 0]

def verify_token(token_str):
    if not token_str:
        return None
    try:
        # Token có thể có prefix Bearer
        if token_str.startswith("Bearer "):
            token_str = token_str[7:]
        decoded = decode_token(token_str)
        user_id = decoded.get("sub")
        token_ver = decoded.get("token_version")
        if user_id:
            user = User.query.get(int(user_id))
            if user and getattr(user, "is_active", True):
                # Kiểm tra token_version nếu có
                current_ver = getattr(user, "token_version", 1) or 1
                if token_ver is not None and token_ver != current_ver:
                    return None
                return user
    except Exception as e:
        print("Socket Auth Error:", e)
    return None

@socketio.on("connect")
def handle_connect(auth):
    """
    Xác thực token khi handshake kết nối WebSocket.
    Tự động đưa client vào room riêng biệt theo user.id hoặc admins.
    Theo dõi trạng thái online của user.
    """
    token = None
    if isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        token = request.args.get("token")

    user = verify_token(token)
    if not user:
        return

    sid = getattr(request, "sid", None)
    if sid:
        if user.id not in ONLINE_USERS:
            ONLINE_USERS[user.id] = set()
        ONLINE_USERS[user.id].add(sid)

    # Join room cá nhân của user
    user_room = f"user:{user.id}"
    join_room(user_room)

    # Nếu là admin -> Join room admins
    if user.role == "admin":
        join_room("admins")

    # Phát tín hiệu user online tới admins
    socketio.emit("users:online", {"online_user_ids": get_online_user_ids()}, room="admins")

@socketio.on("disconnect")
def handle_disconnect():
    sid = getattr(request, "sid", None)
    if not sid:
        return

    user_id_to_remove = None
    for uid, sids in list(ONLINE_USERS.items()):
        if sid in sids:
            sids.remove(sid)
            if len(sids) == 0:
                user_id_to_remove = uid
                ONLINE_USERS.pop(uid, None)
            break

    if user_id_to_remove is not None:
        socketio.emit("users:online", {"online_user_ids": get_online_user_ids()}, room="admins")

@socketio.on("admin:get_online_users")
def handle_get_online_users(data=None):
    """Admin có thể chủ động query danh sách ID đang online."""
    token = (data or {}).get("token") or request.args.get("token")
    user = verify_token(token)
    if user and user.role == "admin":
        socketio.emit("users:online", {"online_user_ids": get_online_user_ids()}, room=getattr(request, "sid", None))

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
