import pytest

def test_admin_reset_password_flow(client, admin_token):
    # 1. Đăng ký một user thử nghiệm
    res = client.post("/api/auth/register", json={
        "username": "test_reset_user",
        "email": "reset_user@example.com",
        "password": "OldPassword@123"
    })
    assert res.status_code == 201
    user_id = res.get_json()["data"]["id"]

    # 2. User đăng nhập thử với mật khẩu cũ
    res = client.post("/api/auth/login", json={
        "username": "test_reset_user",
        "password": "OldPassword@123"
    })
    assert res.status_code == 200
    user_token = res.get_json()["data"]["access_token"]

    # 3. Admin thực hiện reset mật khẩu
    new_password = "NewRandomPassword!@#123"
    res = client.post(f"/api/admin/users/{user_id}/reset-password", json={
        "password": new_password
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "thành công" in res.get_json()["message"]

    # 4. Mật khẩu cũ không còn đăng nhập được
    res = client.post("/api/auth/login", json={
        "username": "test_reset_user",
        "password": "OldPassword@123"
    })
    assert res.status_code == 401

    # 5. Mật khẩu mới đăng nhập thành công
    res = client.post("/api/auth/login", json={
        "username": "test_reset_user",
        "password": new_password
    })
    assert res.status_code == 200

def test_cycle_tracker_pin_and_flow(client, admin_token):
    # 1. Thử xác thực với mã PIN mặc định (123456)
    res = client.post("/api/admin/cycle/verify", json={
        "pin": "123456"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert "partner_name" in res.get_json()["data"]

    # 2. Thử xác thực với mã PIN sai -> 401
    res = client.post("/api/admin/cycle/verify", json={
        "pin": "wrong_pin"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 401

    # 3. Lấy dữ liệu chu kỳ hiện tại
    res = client.get("/api/admin/cycle", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # 4. Cập nhật dữ liệu chu kỳ và đổi PIN mới sang '999999'
    res = client.put("/api/admin/cycle", json={
        "partner_name": "Công Chúa Nhỏ",
        "cycle_length": 30,
        "period_length": 6,
        "last_period_date": "2026-11-10",
        "notes": "Thích trà đào cam sả ít đường",
        "new_pin": "999999"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert res.get_json()["data"]["partner_name"] == "Công Chúa Nhỏ"

    # 5. Xác thực với PIN mới '999999' thành công
    res = client.post("/api/admin/cycle/verify", json={
        "pin": "999999"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # PIN cũ '123456' bị từ chối
    res = client.post("/api/admin/cycle/verify", json={
        "pin": "123456"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 401
