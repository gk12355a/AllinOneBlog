def test_posts_extra_coverage(client, admin_token):
    # 1. Tạo bài viết với tags dạng list
    res = client.post("/api/posts", json={
        "title": "Bài viết nâng cao Coverage",
        "content": "<p>Nội dung HTML sạch</p>",
        "content_type": "richtext",
        "status": "published",
        "tags": ["Python", "Flask", "AI"],
        "lang": "en"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    post_id = res.get_json()["data"]["id"]

    # 2. Cập nhật bài viết
    res = client.put(f"/api/posts/{post_id}", json={
        "title": "Bài viết nâng cao Coverage Đã sửa",
        "content": "<p>Nội dung mới</p>",
        "status": "published",
        "tags": ["Python", "CleanCode"]
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # 3. Lấy tags
    res = client.get("/api/tags")
    assert res.status_code == 200

    # 4. Lấy admin posts
    res = client.get("/api/admin/posts", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # 5. Xóa bài viết
    res = client.delete(f"/api/posts/{post_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

def test_user_likes_and_single_history_delete(client, user_token, admin_token):
    res = client.post("/api/posts", json={
        "title": "Bài test Likes",
        "content": "Nội dung",
        "status": "published"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    post_id = res.get_json()["data"]["id"]

    # Toggle like
    res = client.post(f"/api/user/likes/{post_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 201
    assert res.get_json()["data"]["liked"] is True

    # Xem danh sách liked
    res = client.get("/api/user/likes", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200

    # Bỏ like
    res = client.post(f"/api/user/likes/{post_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    assert res.get_json()["data"]["liked"] is False

    # Thêm và xóa 1 history
    client.post(f"/api/user/history/{post_id}", headers={"Authorization": f"Bearer {user_token}"})
    res = client.delete(f"/api/user/history/{post_id}", headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
