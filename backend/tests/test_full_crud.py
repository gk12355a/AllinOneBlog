def test_profile_flow(client, admin_token):
    # 1. Lấy profile
    res = client.get("/api/profile")
    assert res.status_code == 200
    assert res.get_json()["data"]["full_name"] == "Test Dev"

    # 2. Cập nhật profile bằng Admin
    res = client.put(
        "/api/admin/profile",
        json={
            "full_name": "Kiên Đỗ Cập Nhật",
            "headline": "Lead Architect",
            "live_status": "🟢 Sẵn sàng làm việc",
            "skills": [{"category": "Backend", "items": ["Python", "Flask"]}],
            "timeline": [{"year": "2026", "title": "Lead", "company": "Tech Corp"}],
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.get_json()["data"]["full_name"] == "Kiên Đỗ Cập Nhật"

    # 3. Lấy stats Dashboard
    res = client.get(
        "/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert "total_posts" in res.get_json()["data"]


def test_series_crud(client, admin_token):
    # 1. Tạo series
    res = client.post(
        "/api/admin/series",
        json={
            "title": "Chuỗi bài viết Master React",
            "description": "Lộ trình học React 19 từ cơ bản đến nâng cao",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    series_id = res.get_json()["data"]["id"]
    slug = res.get_json()["data"]["slug"]

    # 2. Xem danh sách series (Admin hoặc đã có bài học)
    res = client.get("/api/series", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    assert len(res.get_json()["data"]) >= 1

    # 3. Xem chi tiết series
    res = client.get(f"/api/series/{slug}")
    assert res.status_code == 200
    assert res.get_json()["data"]["title"] == "Chuỗi bài viết Master React"

    # 4. Cập nhật series
    res = client.put(
        f"/api/admin/series/{series_id}",
        json={"title": "Master React 19 Updated"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.get_json()["data"]["title"] == "Master React 19 Updated"

    # 5. Xóa series
    res = client.delete(
        f"/api/admin/series/{series_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200


def test_projects_crud(client, admin_token):
    # 1. Tạo project
    res = client.post(
        "/api/projects",
        json={
            "title": "Dự án Thương mại điện tử",
            "description": "Website bán hàng đa kênh",
            "tech_stack": "React,NodeJS",
            "is_featured": True,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    proj_id = res.get_json()["data"]["id"]

    # 2. Lấy danh sách projects (có lọc featured)
    res = client.get("/api/projects?featured=true")
    assert res.status_code == 200
    assert len(res.get_json()["data"]) >= 1

    # 3. Xem chi tiết
    res = client.get(f"/api/projects/{proj_id}")
    assert res.status_code == 200

    # 4. Cập nhật
    res = client.put(
        f"/api/projects/{proj_id}",
        json={"title": "E-Commerce V2"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.get_json()["data"]["title"] == "E-Commerce V2"

    # 5. Xóa
    res = client.delete(
        f"/api/projects/{proj_id}", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200


def test_videos_and_messages(client, admin_token):
    # 1. Thêm video
    res = client.post(
        "/api/videos",
        json={
            "title": "Video Demo App",
            "video_url": "https://youtube.com/watch?v=123",
            "category": "Frontend",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    vid_id = res.get_json()["data"]["id"]

    # Lấy danh sách video
    res = client.get("/api/videos?category=Frontend")
    assert res.status_code == 200
    assert len(res.get_json()["data"]) >= 1

    # Cập nhật video
    res = client.put(
        f"/api/videos/{vid_id}",
        json={"title": "Video Demo Updated"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200

    # Xóa video
    res = client.delete(
        f"/api/videos/{vid_id}", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200

    # 2. Gửi tin nhắn liên hệ (Contact) - Phải đăng nhập
    res = client.post(
        "/api/contact",
        json={
            "name": "Khách tuyển dụng",
            "email": "hr@recruiter.com",
            "subject": "Cơ hội việc làm",
            "message": "Chào bạn, chúng tôi muốn mời bạn phỏng vấn.",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    msg_id = res.get_json()["data"]["id"]

    # Admin đọc tin nhắn
    res = client.get(
        "/api/admin/messages", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert len(res.get_json()["data"]) >= 1

    # Đánh dấu đã đọc
    res = client.put(
        f"/api/admin/messages/{msg_id}/status",
        json={"is_read": True},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.get_json()["data"]["is_read"] is True

    # Xóa tin nhắn
    res = client.delete(
        f"/api/admin/messages/{msg_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200


def test_albums_crud(client, admin_token):
    # Tạo album
    res = client.post(
        "/api/admin/albums",
        json={
            "title": "Album Du lịch Hà Nội",
            "description": "Khoảnh khắc đẹp tại thủ đô",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    album_id = res.get_json()["data"]["id"]
    slug = res.get_json()["data"]["slug"]

    # Xem danh sách album
    res = client.get("/api/albums")
    assert res.status_code == 200

    # Xem chi tiết album
    res = client.get(f"/api/albums/{slug}")
    assert res.status_code == 200

    # Cập nhật album
    res = client.put(
        f"/api/admin/albums/{album_id}",
        json={"title": "Hà Nội Mùa Thu"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200

    # Xóa album
    res = client.delete(
        f"/api/admin/albums/{album_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
