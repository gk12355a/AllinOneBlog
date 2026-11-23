import io
from PIL import Image

def test_health_check(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert data["status"] == "ok"
    assert data["database"] == "connected"

def test_sitemap_and_rss(client):
    res = client.get("/sitemap.xml")
    assert res.status_code == 200
    assert "urlset" in res.data.decode()

    res = client.get("/rss.xml")
    assert res.status_code == 200
    assert "rss" in res.data.decode()

def test_global_search(client, admin_token):
    # Tạo dữ liệu mẫu
    client.post("/api/projects", json={
        "title": "React Awesome Portfolio",
        "description": "Dự án portfolio đỉnh cao",
        "tech_stack": "React,Vite"
    }, headers={"Authorization": f"Bearer {admin_token}"})

    res = client.get("/api/search?q=React")
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data["projects"]) >= 1

def test_media_upload_and_watermark(client, admin_token):
    # Tạo ảnh giả lập in-memory
    file_bytes = io.BytesIO()
    img = Image.new("RGB", (300, 300), color=(73, 109, 137))
    img.save(file_bytes, format="PNG")
    file_bytes.seek(0)

    data = {
        "file": (file_bytes, "test_image.png")
    }
    res = client.post("/api/admin/media/upload", data=data, content_type="multipart/form-data", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    media_data = res.get_json()["data"]
    assert "watermark_url" in media_data
    assert media_data["watermark_url"] != ""

def test_xss_sanitization(client, admin_token):
    # Test chống Stored XSS trong Rich Text
    res = client.post("/api/posts", json={
        "title": "Bài viết chứa mã độc XSS",
        "content": "<p>Nội dung an toàn</p><script>alert('hack');</script>",
        "content_type": "richtext",
        "status": "published"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    content = res.get_json()["data"]["content"]
    assert "<script>" not in content
    assert "alert('hack')" not in content
