import pytest
from app import create_app
from app.config import TestConfig
from app.extensions import db
from app.models import User, Profile, Post, Project, Video, Album

@pytest.fixture
def app():
    """Khởi tạo Flask test app với database in-memory."""
    app = create_app(TestConfig)
    
    with app.app_context():
        db.create_all()
        
        # Khởi tạo Admin
        admin = User(username="admin_test", email="admin@test.com", role="admin")
        admin.set_password("Admin@123")
        
        # Khởi tạo User
        user = User(username="user_test", email="user@test.com", role="user")
        user.set_password("User@123")
        
        # Khởi tạo Profile
        profile = Profile(full_name="Test Dev", headline="Test Headline")
        
        db.session.add_all([admin, user, profile])
        db.session.commit()
        
        yield app
        
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def admin_token(client):
    res = client.post("/api/auth/login", json={"username": "admin_test", "password": "Admin@123"})
    return res.get_json()["data"]["access_token"]

@pytest.fixture
def user_token(client):
    res = client.post("/api/auth/login", json={"username": "user_test", "password": "User@123"})
    return res.get_json()["data"]["access_token"]
