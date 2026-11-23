import pytest

def test_comment_lifecycle(client, user_token, admin_token):
    # 1. Tạo bài viết mẫu qua admin
    res = client.post("/api/posts", json={
        "title": "Post for Comment Testing",
        "content": "This is content for comments.",
        "status": "published",
        "lang": "en"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    slug = res.get_json()["data"]["slug"]

    # 2. Đăng comment không đăng nhập -> Bị chặn 401
    res = client.post(f"/api/posts/{slug}/comments", json={"content": "Anonymous comment"})
    assert res.status_code == 401

    # 3. User đăng comment hợp lệ kèm markdown/html -> Thành công 201
    res = client.post(f"/api/posts/{slug}/comments", json={
        "content": "<b>Bài viết rất hữu ích!</b> <script>alert('xss')</script>"
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 201
    comment_data = res.get_json()["data"]
    comment_id = comment_data["id"]
    # Kiểm tra XSS đã bị lọc
    assert "<script>" not in comment_data["content"]
    assert "alert" not in comment_data["content"]
    assert "<b>Bài viết rất hữu ích!</b>" in comment_data["content"]

    # 4. Lấy danh sách comment của bài viết
    res = client.get(f"/api/posts/{slug}/comments")
    assert res.status_code == 200
    comments_list = res.get_json()["data"]
    assert len(comments_list) >= 1
    assert comments_list[0]["id"] == comment_id
    assert "replies" in comments_list[0]

    # 4.1. Admin trả lời comment (Nested reply / Facebook style)
    res = client.post(f"/api/posts/{slug}/comments", json={
        "content": "@demouser Cảm ơn bạn đã phản hồi!",
        "parent_id": comment_id
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 201
    reply_data = res.get_json()["data"]
    assert reply_data["parent_id"] == comment_id

    # 4.2. Kiểm tra cây bình luận chứa reply
    res = client.get(f"/api/posts/{slug}/comments")
    assert res.status_code == 200
    root_comments = res.get_json()["data"]
    assert len(root_comments) == 1
    assert len(root_comments[0]["replies"]) == 1
    assert root_comments[0]["replies"][0]["id"] == reply_data["id"]

    # 5. User sửa comment của chính mình
    res = client.put(f"/api/comments/{comment_id}", json={
        "content": "<i>Nội dung đã được cập nhật!</i>"
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert res.status_code == 200
    assert "<i>Nội dung đã được cập nhật!</i>" in res.get_json()["data"]["content"]

    # 6. Admin có quyền xóa comment
    res = client.delete(f"/api/comments/{comment_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200

    # 7. Kiểm tra lại danh sách comment sau khi xóa
    res = client.get(f"/api/posts/{slug}/comments")
    assert res.status_code == 200
    assert len(res.get_json()["data"]) == 0
