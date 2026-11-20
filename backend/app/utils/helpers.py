import re
import unicodedata
from datetime import datetime, timezone, timedelta
from flask import jsonify
from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt
import bleach

# Múi giờ Việt Nam (UTC+7)
VN_TZ = timezone(timedelta(hours=7))

def format_datetime_utc7(dt):
    """
    Chuyển đổi datetime (thường lưu UTC naive trong DB) sang chuẩn UTC+7 có kèm offset (+07:00).
    """
    if not dt:
        return None
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
        except Exception:
            return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(VN_TZ).isoformat()

def generate_slug(text: str) -> str:
    """Sinh slug chuẩn SEO từ chuỗi tiếng Việt hoặc tiếng Anh."""
    if not text:
        return ""
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def sanitize_html(html_content: str) -> str:
    """Làm sạch HTML chống XSS, chỉ cho phép các thẻ và thuộc tính an toàn."""
    if not html_content:
        return ""
    # Loại bỏ triệt để các thẻ script, style và nội dung bên trong của chúng
    html_content = re.sub(r'<(script|style)\b[^>]*>[\s\S]*?<\/\1>', '', html_content, flags=re.IGNORECASE)
    allowed_tags = [
        'a', 'abbr', 'b', 'blockquote', 'code', 'em', 'i', 'li', 'ol', 'strong', 'ul',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'pre', 'img', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'span', 'div', 'hr', 'br'
    ]
    allowed_attributes = {
        'a': ['href', 'title', 'target', 'rel'],
        'img': ['src', 'alt', 'title', 'width', 'height'],
        '*': ['class', 'id']
    }
    return bleach.clean(html_content, tags=allowed_tags, attributes=allowed_attributes, strip=True)

def api_response(success: bool = True, data=None, message: str = "", status_code: int = 200):
    """Chuẩn hóa cấu trúc JSON response theo Clean Code."""
    response_body = {
        "success": success,
        "message": message,
        "data": data
    }
    return jsonify(response_body), status_code

def admin_required():
    """Decorator bảo vệ route chỉ dành riêng cho Admin còn hiệu lực (chưa bị khóa)."""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            from app.models import User
            verify_jwt_in_request()
            claims = get_jwt()
            user_id = claims.get("sub")
            if not user_id:
                return api_response(success=False, message="Unauthorized access.", status_code=401)
            
            user = User.query.get(int(user_id))
            if not user or not user.is_active:
                return api_response(success=False, message="Tài khoản đã bị vô hiệu hóa hoặc không tồn tại.", status_code=403)
            
            # Kiểm tra token_version nếu có trong claims
            token_ver = claims.get("token_version")
            if token_ver is not None and token_ver != user.token_version:
                return api_response(success=False, message="Phiên đăng nhập đã hết hiệu lực do thay đổi bảo mật.", status_code=401)

            if user.role != "admin":
                return api_response(success=False, message="Admin privilege required.", status_code=403)
            return fn(*args, **kwargs)
        return decorator
    return wrapper
