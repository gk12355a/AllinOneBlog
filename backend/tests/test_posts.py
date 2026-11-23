def test_create_and_get_post(client, admin_token):
    # 1. Admin tạo bài viết mới
    res = client.post("/api/posts", json={
        "title": "Bài viết thử nghiệm Unit Test",
        "content": "# Nội dung thử nghiệm\nĐây là đoạn văn bản markdown.",
        "content_type": "markdown",
        "status": "published",
        "tags": "Python,Testing",
        "lang": "vi"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    post_data = res.get_json()["data"]
    slug = post_data["slug"]

    # 2. Public xem danh sách bài viết
    res = client.get("/api/posts?lang=vi")
    assert res.status_code == 200
    assert len(res.get_json()["data"]["posts"]) >= 1

    # 3. Public xem chi tiết bài viết
    res = client.get(f"/api/posts/{slug}")
    assert res.status_code == 200
    assert res.get_json()["data"]["title"] == "Bài viết thử nghiệm Unit Test"
    assert "navigation" in res.get_json()["data"]
    assert "related_posts" in res.get_json()["data"]

def test_draft_post_security_and_preview(client, admin_token):
    # 1. Tạo bài nháp
    res = client.post("/api/posts", json={
        "title": "Bản nháp bí mật",
        "content": "Nội dung chưa công bố.",
        "status": "draft"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    post_id = res.get_json()["data"]["id"]
    slug = res.get_json()["data"]["slug"]

    # 2. Public truy cập bình thường phải bị 404
    res = client.get(f"/api/posts/{slug}")
    assert res.status_code == 404

    # 3. Admin sinh token xem trước
    res = client.post(f"/api/admin/posts/{post_id}/preview-token", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    token = res.get_json()["data"]["token"]

    # 4. Xem trước bằng token thành công
    res = client.get(f"/api/posts/{slug}/preview?token={token}")
    assert res.status_code == 200
    assert res.get_json()["data"]["title"] == "Bản nháp bí mật"

def test_post_reactions(client, admin_token):
    # Tạo bài viết
    res = client.post("/api/posts", json={
        "title": "Bài test Reaction",
        "content": "Nội dung thả tim",
        "status": "published"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    slug = res.get_json()["data"]["slug"]

    # Thả tim
    res = client.post(f"/api/posts/{slug}/reactions", json={"type": "fire"})
    assert res.status_code == 200
    assert res.get_json()["data"]["fire"] >= 1
