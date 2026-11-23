import os
from flask import Flask, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix
from app.config import Config
from app.extensions import db, jwt, limiter, cors, socketio

def create_app(config_class=Config):
    """Application Factory Pattern khởi tạo Flask App."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Đảm bảo nhận diện đúng IP client đằng sau Reverse Proxy / Cloudflare / Nginx
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

    # Đảm bảo thư mục uploads tồn tại
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Khởi tạo các extensions
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    socketio.init_app(app)

    # Thiết lập Structured Logging chuyên nghiệp
    from app.utils.logger import setup_logger
    setup_logger(app)
    
    # Cấu hình CORS chặt chẽ theo origins quy định trong Config / .env
    cors.init_app(
        app,
        resources={r"/*": {"origins": app.config['CORS_ORIGINS']}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"]
    )

    # Đăng ký Blueprints với tiền tố /api
    from app.routes.auth import auth_bp
    from app.routes.profile import profile_bp
    from app.routes.posts import posts_bp
    from app.routes.user_library import user_library_bp
    from app.routes.series import series_bp
    from app.routes.media import media_bp
    from app.routes.content import content_bp
    from app.routes.system import system_bp
    from app.routes.admin_users import admin_users_bp
    from app.routes.notifications import notifications_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(profile_bp, url_prefix="/api")
    app.register_blueprint(posts_bp, url_prefix="/api")
    app.register_blueprint(user_library_bp, url_prefix="/api")
    app.register_blueprint(series_bp, url_prefix="/api")
    app.register_blueprint(media_bp, url_prefix="/api")
    app.register_blueprint(content_bp, url_prefix="/api")
    app.register_blueprint(admin_users_bp, url_prefix="/api")
    app.register_blueprint(notifications_bp, url_prefix="/api")
    app.register_blueprint(system_bp, url_prefix="")

    # Đăng ký SocketIO event handlers & Realtime Service
    from app.services import realtime_service

    # Thiết lập Security Headers (Chống Clickjacking, MIME-sniffing, XSS)
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response

    # Global Error Handlers (Xử lý lỗi an toàn không để lộ Stack Trace & Ghi log chi tiết)
    import traceback
    from flask import g

    @app.errorhandler(400)
    def bad_request(error):
        g.error_detail = str(error)
        return jsonify({"success": False, "message": "Bad request.", "error": str(error)}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        g.error_detail = "Unauthorized access"
        return jsonify({"success": False, "message": "Unauthorized access."}), 401

    @app.errorhandler(403)
    def forbidden(error):
        g.error_detail = "Access forbidden"
        return jsonify({"success": False, "message": "Access forbidden."}), 403

    @app.errorhandler(404)
    def not_found(error):
        g.error_detail = "Resource not found"
        return jsonify({"success": False, "message": "Resource not found."}), 404

    @app.errorhandler(429)
    def ratelimit_handler(e):
        desc = getattr(e, 'description', '')
        g.error_detail = f"Rate limit exceeded: {desc}"
        
        # Ghi log audit an toàn nếu bị spam tần suất cao
        try:
            from app.services.audit_service import AuditService
            AuditService.log(
                action="Rate limit exceeded",
                feature="Bảo mật / Chống DDoS",
                status="failed",
                failure_reason=desc or "Vượt quá ngưỡng request cho phép",
                req=None
            )
        except Exception:
            pass

        response = jsonify({
            "success": False, 
            "message": "Too many requests. Please try again in a few minutes.",
            "message_en": f"Rate limit exceeded: {desc}. Please try again later.",
            "message_vi": "Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau ít phút.",
            "error": "rate_limit_exceeded"
        })
        response.status_code = 429
        # Bổ sung Retry-After header (mặc định 60s hoặc theo window của limiter)
        retry_after = getattr(e, 'retry_after', 60)
        response.headers['Retry-After'] = str(retry_after)
        return response

    @app.errorhandler(500)
    def internal_error(error):
        g.error_detail = str(error)
        g.error_traceback = traceback.format_exc()
        return jsonify({"success": False, "message": "Internal server error."}), 500

    return app
