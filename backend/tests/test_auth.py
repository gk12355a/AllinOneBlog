def test_register_success(client):
    res = client.post("/api/auth/register", json={
        "username": "newuser",
        "email": "newuser@test.com",
        "password": "Password@123"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert data["data"]["username"] == "newuser"
    assert data["data"]["role"] == "user"

def test_register_duplicate(client):
    res = client.post("/api/auth/register", json={
        "username": "user_test",
        "email": "duplicate@test.com",
        "password": "Password@123"
    })
    assert res.status_code == 409
    assert res.get_json()["success"] is False

def test_login_success(client):
    res = client.post("/api/auth/login", json={
        "username": "admin_test",
        "password": "Admin@123"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "access_token" in data["data"]
    assert data["data"]["user"]["role"] == "admin"

def test_login_invalid_credentials(client):
    res = client.post("/api/auth/login", json={
        "username": "admin_test",
        "password": "WrongPassword"
    })
    assert res.status_code == 401
    assert res.get_json()["success"] is False

def test_get_me_protected(client, user_token):
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    assert res.get_json()["data"]["username"] == "user_test"

def test_admin_rbac_forbidden_for_user(client, user_token):
    # User token không được phép gọi endpoint tạo Project của Admin
    res = client.post("/api/projects", json={"title": "Hacked Project"}, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 403
    assert res.get_json()["success"] is False
