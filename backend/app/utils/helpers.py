import re
import unicodedata
from flask import jsonify
from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt
import bleach

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
    """Decorator bảo vệ route chỉ dành riêng cho Admin."""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") != "admin":
                return api_response(success=False, message="Admin privilege required.", status_code=403)
            return fn(*args, **kwargs)
        return decorator
    return wrapper
