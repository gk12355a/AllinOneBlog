import os
import time
import uuid
import json
import logging
import traceback
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone, timedelta
from flask import request, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity

# Múi giờ UTC+7
UTC_PLUS_7 = timezone(timedelta(hours=7))

# Các tham số nhạy cảm cần ẩn trong query string
SENSITIVE_KEYS = {"token", "password", "secret", "auth", "access_token", "key"}

def sanitize_query(args):
    """Lọc các tham số nhạy cảm khỏi query string để không lộ trong log."""
    if not args:
        return ""
    sanitized = []
    for k, v in args.items():
        if k.lower() in SENSITIVE_KEYS:
            sanitized.append(f"{k}=[REDACTED]")
        else:
            sanitized.append(f"{k}={v}")
    return "?" + "&".join(sanitized) if sanitized else ""

def format_bytes(num_bytes):
    """Chuyển đổi số bytes sang định dạng người đọc: B, KB, MB."""
    if num_bytes is None:
        return "0B"
    try:
        num = float(num_bytes)
        if num < 1024:
            return f"{int(num)}B"
        elif num < 1024 * 1024:
            return f"{num / 1024:.1f}KB"
        else:
            return f"{num / (1024 * 1024):.2f}MB"
    except Exception:
        return "0B"

class JsonFormatter(logging.Formatter):
    """Format log record thành chuỗi JSON một dòng chuẩn cho Production / ELK / Loki."""
    def format(self, record):
        log_data = record.msg if isinstance(record.msg, dict) else {"message": str(record.msg)}
        if "ts" not in log_data:
            log_data["ts"] = datetime.now(UTC_PLUS_7).isoformat()
        if "level" not in log_data:
            log_data["level"] = record.levelname
        
        # Bổ sung exception / stack trace nếu có
        if record.exc_info and "traceback" not in log_data:
            log_data["traceback"] = "".join(traceback.format_exception(*record.exc_info))
        
        return json.dumps(log_data, ensure_ascii=False)

class ColoredConsoleFormatter(logging.Formatter):
    """Format hiển thị trực quan, đầy đủ thông số và màu sắc trên Console/Terminal."""
    COLORS = {
        "DEBUG": "\033[36m",    # Cyan
        "INFO": "\033[32m",     # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",    # Red
        "CRITICAL": "\033[35m", # Magenta
        "RESET": "\033[0m"
    }

    def format(self, record):
        color = self.COLORS.get(record.levelname, self.COLORS["RESET"])
        reset = self.COLORS["RESET"]
        
        if isinstance(record.msg, dict):
            d = record.msg
            method = d.get("method", "")
            path = d.get("path", "")
            query_str = d.get("query_str", "")
            full_path = f"{path}{query_str}"
            status = d.get("status", 200)
            duration_num = d.get("duration_ms", 0)
            duration = f"{duration_num}ms"
            size = d.get("size_formatted", "0B")
            req_id = d.get("request_id", "")
            user_info = f"user={d.get('user_id') or 'anon'}({d.get('role') or 'guest'})"
            ip = d.get("ip", "")
            
            # Tô màu Status Code
            status_color = "\033[32m" if status < 400 else ("\033[33m" if status < 500 else "\033[31m")
            
            # Cảnh báo màu vàng cho request chậm (> 300ms)
            duration_color = "\033[33m" if duration_num >= 300 else ""
            duration_reset = reset if duration_color else ""
            
            error_note = f" -> {d.get('error')}" if d.get("error") else ""

            return (
                f"[{d.get('ts')}] {color}[{record.levelname}]{reset} "
                f"[{req_id}] {method} {full_path} -> {status_color}{status}{reset} "
                f"({duration_color}{duration}{duration_reset}, {size}) {user_info} {ip}{error_note}"
            )
        return f"{color}[{record.levelname}]{reset} {record.msg}"

class SafeRotatingFileHandler(RotatingFileHandler):
    """
    Kế thừa RotatingFileHandler có cơ chế mở file với newline='\n' chuẩn Linux
    và bắt ngoại lệ an toàn khi xoay vòng log trong môi trường đa tiến trình (multi-process).
    """
    def _open(self):
        return open(self.baseFilename, self.mode, encoding=self.encoding, errors=self.errors, newline="\n")

    def doRollover(self):
        try:
            super().doRollover()
        except (PermissionError, FileExistsError, OSError):
            pass

def setup_logger(app):
    """Thiết lập Structured Logging chuyên nghiệp cho Flask (General Log + Error Log riêng biệt)."""
    # 1. Tắt log mặc định quá ngắn của werkzeug
    logging.getLogger("werkzeug").setLevel(logging.WARNING)

    # 2. Tạo thư mục logs nếu chưa có
    logs_dir = os.path.join(app.root_path, "..", "logs")
    os.makedirs(logs_dir, exist_ok=True)
    app_log_path = os.path.join(logs_dir, "app.log")
    error_log_path = os.path.join(logs_dir, "error.log")

    # 3. Tạo logger chính
    logger = logging.getLogger("app")
    logger.setLevel(logging.INFO)
    logger.propagate = False

    # Xóa handler cũ nếu có
    if logger.hasHandlers():
        logger.handlers.clear()

    # 4. Handler ghi file JSON thông thường: app.log (Tối đa 10MB, lưu 5 file backup)
    app_handler = SafeRotatingFileHandler(
        app_log_path,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8"
    )
    app_handler.setLevel(logging.INFO)
    app_handler.setFormatter(JsonFormatter())
    logger.addHandler(app_handler)

    # 5. Handler ghi file lỗi riêng biệt: error.log (Chỉ ghi ERROR và CRITICAL, tối đa 10MB, lưu 10 backup)
    error_handler = SafeRotatingFileHandler(
        error_log_path,
        maxBytes=10 * 1024 * 1024,
        backupCount=10,
        encoding="utf-8"
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JsonFormatter())
    logger.addHandler(error_handler)

    # 6. Handler in ra Terminal (Console) định dạng trực quan và có màu sắc
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(ColoredConsoleFormatter())
    logger.addHandler(console_handler)

    # 7. Middleware: Trước mỗi request
    @app.before_request
    def before_request_logger():
        g.start_time = time.time()
        g.request_id = request.headers.get("X-Request-ID", uuid.uuid4().hex[:8])

        g.user_id = None
        g.user_role = "guest"
        try:
            verify_jwt_in_request(optional=True)
            claims = get_jwt()
            if claims:
                g.user_id = get_jwt_identity()
                g.user_role = claims.get("role", "user")
        except Exception:
            pass

    # 8. Middleware: Sau mỗi request
    @app.after_request
    def after_request_logger(response):
        if request.path.startswith("/socket.io"):
            return response

        duration_ms = round((time.time() - getattr(g, "start_time", time.time())) * 1000, 2)
        status_code = response.status_code

        # Xác định Level tương ứng (tự nâng lên WARNING nếu API chậm >= 300ms)
        level = logging.INFO
        if status_code >= 500:
            level = logging.ERROR
        elif status_code >= 400 or duration_ms >= 300:
            level = logging.WARNING

        ip = request.headers.get("CF-Connecting-IP") or request.headers.get("X-Forwarded-For", request.remote_addr)
        if ip and "," in ip:
            ip = ip.split(",")[0].strip()

        # Fix bug User-Agent rỗng: Lấy trực tiếp từ header HTTP_USER_AGENT
        raw_ua = request.headers.get("User-Agent", "").strip()

        content_len = response.calculate_content_length()
        query_str = sanitize_query(request.args)

        log_payload = {
            "ts": datetime.now(UTC_PLUS_7).isoformat(),
            "level": logging.getLevelName(level),
            "request_id": getattr(g, "request_id", ""),
            "method": request.method,
            "path": request.path,
            "query_str": query_str,
            "query": request.args.to_dict() if request.args else None,
            "status": status_code,
            "duration_ms": duration_ms,
            "bytes": content_len,
            "size_formatted": format_bytes(content_len),
            "user_id": getattr(g, "user_id", None),
            "role": getattr(g, "user_role", "guest"),
            "ip": ip,
            "user_agent": raw_ua[:150]
        }

        # Nếu có lỗi (status >= 400) hoặc ngoại lệ được bắt, đồng bộ ghi đầy đủ vào cả error.log
        if hasattr(g, "error_detail"):
            log_payload["error"] = g.error_detail
        if hasattr(g, "error_traceback"):
            log_payload["traceback"] = g.error_traceback

        logger.log(level, log_payload)

        # Gắn X-Request-ID vào response header
        response.headers["X-Request-ID"] = getattr(g, "request_id", "")
        return response

    return logger
