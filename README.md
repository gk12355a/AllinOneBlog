# AllinOneBlog - Personal Portfolio & Modern Tech Blog

> Nền tảng Portfolio & Blog công nghệ cá nhân hiện đại được xây dựng theo tiêu chuẩn Clean Architecture, bảo mật chuẩn OWASP và tích hợp đầy đủ hệ thống quản trị, xác thực, tương tác xã hội.

---

## 🚀 Tính năng nổi bật

- **Portfolio & Hồ sơ chuyên nghiệp**: Giới thiệu bản thân, bộ kỹ năng, timeline quá trình học tập & làm việc, mục tiêu nghề nghiệp DevOps Engineer.
- **Trang Chứng chỉ (Certifications)**: Trưng bày chứng chỉ uy tín (CKA - Certified Kubernetes Administrator, DEVOPS EDU, Google Coursera) kèm tính năng xem phóng to và liên kết xác thực online chính thức.
- **Blog & Chuỗi bài viết (Series)**: Soạn thảo Markdown, ước tính thời gian đọc, mục lục tự động (TOC), chế độ đọc tập trung (Reader Mode) và chuyển đổi ngôn ngữ (VI/EN).
- **Tương tác xã hội & Bình luận Facebook-style**:
  - Tương tác thả tim, chia sẻ đa nền tảng (Facebook, X, LinkedIn, Telegram, Copy Link).
  - Bình luận đa cấp (Nested Replies) lồng nhau như Facebook kèm chức năng tag `@username`.
  - Hỗ trợ tải ảnh trực tiếp từ máy lên Cloudinary trong bình luận.
- **Thư viện cá nhân (My Library)**: Lưu bài viết yêu thích (Bookmarks), xem lịch sử đã đọc (Reading History) và danh sách bài viết đã thích (Liked Posts).
- **Quản trị đa phương tiện & Album ảnh**: Quản lý video, album hình ảnh sự kiện, tích hợp watermark ảnh.
- **Hệ thống Quản trị Toàn diện (Admin Workspace)**:
  - **Phân trang phổ quát (Universal Pagination)**: Tùy chỉnh số lượng dòng (rows per page: 5, 10, 20, 50) và phân trang mượt mà trên tất cả 9 phân hệ quản trị (Users, Posts, Series, Videos, Albums, Media, Projects, Messages, Audit Logs).
  - **Quản lý Thành viên & Phân quyền**: Đổi vai trò Admin/User, khóa/mở khóa tài khoản, giám sát trạng thái trực tuyến (Realtime Online Presence với Socket.IO).
  - **Reset Mật khẩu User cho Admin**: Tự động sinh mật khẩu ngẫu nhiên an toàn, sao chép nhanh, thu hồi phiên đăng nhập tức thì trên mọi thiết bị qua cơ chế `token_version`.
  - **Bảo vệ L7 Anti-DDoS & Rate Limiting**: Nhận diện IP thực qua `ProxyFix`, rate limit thông minh theo `user_id` và IP, phản hồi chuẩn kèm `Retry-After` và ghi nhật ký Audit Log.
  - **Tab Ẩn Bí Mật (Secret 28-Day Cycle Tracker)**: Vô hình trên thanh menu, mở bằng phím tắt `Ctrl + Shift + H`, bảo vệ bằng mã PIN độc lập, đồng hồ tròn 28 ngày trực quan hóa 4 giai đoạn sinh học và gợi ý chăm sóc tâm lý cho người yêu.
- **Bảo mật & Tối ưu hóa**:
  - JWT Authentication & RBAC (Role-Based Access Control).
  - Chống XSS (Bleach sanitization), Rate Limiting (Flask-Limiter), CSRF protection.
  - Tối ưu bộ nhớ đệm tăng view thông minh chống đếm trùng khi tải trang.

---

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide Icons, Axios, React Router v7.
- **Backend**: Python 3.11, Flask, SQLAlchemy ORM, Flask-JWT-Extended, Flask-Limiter, Pillow, Bleach.
- **Cloud & Storage**: Cloudinary (Image & PDF storage).
- **Cơ sở dữ liệu**: SQLite / PostgreSQL ready.

---

## 🌿 Cấu trúc nhánh Git (Branch Strategy)

- **`main`**: Nhánh chính, tài liệu dự án và thông tin tổng quan.
- **`develop`**: Nhánh phát triển chính chứa toàn bộ mã nguồn Frontend, Backend và tài liệu kỹ thuật chi tiết.

Để xem toàn bộ mã nguồn dự án, vui lòng chuyển sang nhánh **`develop`**:
```bash
git checkout develop
```

---

## 💻 Hướng dẫn chạy thử dự án (Local Development)

Vui lòng checkout sang nhánh `develop` để xem chi tiết mã nguồn và cài đặt:

```bash
# 1. Chuyển sang nhánh develop
git checkout develop

# 2. Khởi chạy Backend (Flask)
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python seed.py
python app.py

# 3. Khởi chạy Frontend (Vite)
cd ../frontend
npm install
npm run dev
```

---

## 👤 Tác giả

**Đỗ Trí Kiên**  
*DevOps Engineer \| Cloud & Infrastructure Specialist*  
- **GitHub**: [@gk12355a](https://github.com/gk12355a)  
- **Email**: kiendotri@gmail.com
