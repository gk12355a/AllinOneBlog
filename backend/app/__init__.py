import os
from flask import Flask, jsonify
from app.config import Config
from app.extensions import db, jwt, limiter, cors

def create_app(config_class=Config):
    """Application Factory Pattern khởi tạo Flask App."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Đảm bảo thư mục uploads tồn tại
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Khởi tạo các extensions
    db.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)
    
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

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(profile_bp, url_prefix="/api")
    app.register_blueprint(posts_bp, url_prefix="/api")
    app.register_blueprint(user_library_bp, url_prefix="/api")
    app.register_blueprint(series_bp, url_prefix="/api")
    app.register_blueprint(media_bp, url_prefix="/api")
    app.register_blueprint(content_bp, url_prefix="/api")
    app.register_blueprint(system_bp, url_prefix="")

    # Thiết lập Security Headers (Chống Clickjacking, MIME-sniffing, XSS)
    @app.after_request
    def set_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response

    # Global Error Handlers (Xử lý lỗi an toàn không để lộ Stack Trace)
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"success": False, "message": "Bad request.", "error": str(error)}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"success": False, "message": "Unauthorized access."}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"success": False, "message": "Access forbidden."}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "message": "Resource not found."}), 404

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({"success": False, "message": f"Rate limit exceeded: {e.description}"}), 429

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"success": False, "message": "Internal server error."}), 500

    return app
