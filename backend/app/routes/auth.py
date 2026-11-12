import re
from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from app.extensions import db, limiter
from app.models import User
from app.utils.helpers import api_response

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return api_response(success=False, message="Username, email, and password are required.", status_code=400)
        
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return api_response(success=False, message="Invalid email format.", status_code=400)
        
    if len(password) < 6:
        return api_response(success=False, message="Password must be at least 6 characters.", status_code=400)

    if User.query.filter_by(username=username).first():
        return api_response(success=False, message="Username already exists.", status_code=409)

    if User.query.filter_by(email=email).first():
        return api_response(success=False, message="Email already exists.", status_code=409)

    user = User(username=username, email=email, role="user")
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return api_response(success=True, data=user.to_dict(), message="User registered successfully.", status_code=201)

@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    data = request.get_json() or {}
    identifier = data.get("identifier", "").strip()
    username = data.get("username", "").strip() or identifier
    password = data.get("password", "")

    if not username or not password:
        return api_response(success=False, message="Username and password are required.", status_code=400)

    user = User.query.filter((User.username == username) | (User.email == username)).first()
    if not user or not user.check_password(password):
        return api_response(success=False, message="Invalid username or password.", status_code=401)

    # Cấp phát JWT token kèm role
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "username": user.username}
    )

    return api_response(
        success=True,
        data={
            "access_token": access_token,
            "user": user.to_dict()
        },
        message="Login successful."
    )

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return api_response(success=False, message="User not found.", status_code=404)
    return api_response(success=True, data=user.to_dict())
