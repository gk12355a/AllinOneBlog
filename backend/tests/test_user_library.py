def test_reading_history_flow(client, user_token, admin_token):
    # Tạo bài viết
    res = client.post("/api/posts", json={
        "title": "Bài đọc lưu lịch sử",
        "content": "Nội dung bài viết",
        "status": "published"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    post_id = res.get_json()["data"]["id"]

    # 1. Ghi nhận lịch sử
    res = client.post(f"/api/user/history/{post_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 201

    # 2. Xem lịch sử
    res = client.get("/api/user/history", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    assert len(res.get_json()["data"]["history"]) == 1

    # 3. Xóa lịch sử
    res = client.delete("/api/user/history", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200

    res = client.get("/api/user/history", headers={"Authorization": f"Bearer {user_token}"})
    assert len(res.get_json()["data"]["history"]) == 0

def test_bookmarks_flow(client, user_token, admin_token):
    res = client.post("/api/posts", json={
        "title": "Bài cần bookmark",
        "content": "Lưu lại đọc sau",
        "status": "published"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    post_id = res.get_json()["data"]["id"]

    # 1. Thêm bookmark
    res = client.post(f"/api/user/bookmarks/{post_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 201

    # 2. Lấy bookmarks
    res = client.get("/api/user/bookmarks", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    assert len(res.get_json()["data"]) == 1

    # 3. Gỡ bookmark
    res = client.delete(f"/api/user/bookmarks/{post_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200

    res = client.get("/api/user/bookmarks", headers={"Authorization": f"Bearer {user_token}"})
    assert len(res.get_json()["data"]) == 0
