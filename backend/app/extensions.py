from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, get_jwt_identity, verify_jwt_in_request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_socketio import SocketIO
from flask import request, g

db = SQLAlchemy()
jwt = JWTManager()

def smart_limit_key() -> str:
    """
    Xác định key định danh cho rate limiter:
    1. Nếu request có token JWT hợp lệ: dùng user_id (tránh ảnh hưởng toàn bộ mạng NAT/Văn phòng khi 1 người spam).
    2. Nếu request chưa đăng nhập: dùng IP thực tế của client (kết hợp ProxyFix).
    """
    try:
        # Kiểm tra nhanh nếu g đã lưu user_id từ auth decorator
        if hasattr(g, 'user_id') and g.user_id:
            return f"user:{g.user_id}"
        # Hoặc kiểm tra JWT nếu có Authorization header
        if request.headers.get("Authorization"):
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                return f"user:{user_id}"
    except Exception:
        pass
    
    return f"ip:{get_remote_address()}"

limiter = Limiter(
    key_func=smart_limit_key,
    default_limits=["300 per minute"]
)
cors = CORS()
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode="threading",
    manage_session=False,
    ping_timeout=60,
    ping_interval=25
)
