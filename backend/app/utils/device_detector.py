import re
from flask import request

def get_client_ip(req=None) -> str:
    """
    Lấy IP client an toàn.
    Hỗ trợ proxy nếu có X-Forwarded-For (lấy IP đầu tiên), fallback sang remote_addr.
    """
    if req is None:
        req = request
    if req.headers.getlist("X-Forwarded-For"):
        # Format: client, proxy1, proxy2
        forwarded = req.headers.getlist("X-Forwarded-For")[0]
        ip = forwarded.split(",")[0].strip()
        if ip:
            return ip
    if req.headers.get("X-Real-IP"):
        return req.headers.get("X-Real-IP").strip()
    return req.remote_addr or "127.0.0.1"

def parse_user_agent(ua_string: str) -> dict:
    """
    Phân tích User-Agent chính xác bằng regex nhẹ, an toàn, không phụ thuộc thư viện ngoài.
    Trả về: { device_type, os_name, browser_name, is_bot }
    """
    if not ua_string:
        return {
            "device_type": "Unknown",
            "os_name": "Unknown",
            "browser_name": "Unknown",
            "is_bot": False
        }

    ua = ua_string.lower()

    # 1. Phát hiện Bot / Crawler
    is_bot = bool(re.search(r'bot|crawler|spider|slurp|curl|wget|python|httpclient|postman', ua))

    # 2. Phát hiện Loại thiết bị
    if re.search(r'ipad|tablet|playbook|silk', ua):
        device_type = "Tablet"
    elif re.search(r'mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini', ua):
        device_type = "Mobile"
    elif re.search(r'android', ua):
        device_type = "Tablet"
    elif re.search(r'windows|macintosh|linux|x11', ua):
        device_type = "Desktop"
    else:
        device_type = "Unknown"

    # 3. Phát hiện Hệ điều hành
    if 'windows nt 10.0' in ua or 'windows nt 11.0' in ua:
        os_name = "Windows 10/11"
    elif 'windows nt 6.3' in ua:
        os_name = "Windows 8.1"
    elif 'windows nt 6.1' in ua:
        os_name = "Windows 7"
    elif 'windows' in ua:
        os_name = "Windows"
    elif 'iphone' in ua or 'ipad' in ua or 'ipod' in ua:
        os_name = "iOS"
    elif 'macintosh' in ua or 'mac os x' in ua:
        os_name = "macOS"
    elif 'android' in ua:
        os_name = "Android"
    elif 'linux' in ua:
        os_name = "Linux"
    else:
        os_name = "Unknown"

    # 4. Phát hiện Trình duyệt
    if 'edg/' in ua or 'edge/' in ua:
        browser_name = "Edge"
    elif 'opr/' in ua or 'opera' in ua:
        browser_name = "Opera"
    elif 'chrome/' in ua and 'safari/' in ua:
        browser_name = "Chrome"
    elif 'firefox/' in ua:
        browser_name = "Firefox"
    elif 'safari/' in ua and not 'chrome' in ua:
        browser_name = "Safari"
    else:
        browser_name = "Unknown"

    return {
        "device_type": device_type,
        "os_name": os_name,
        "browser_name": browser_name,
        "is_bot": is_bot
    }
