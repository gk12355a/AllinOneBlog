import json
from datetime import datetime
from app import create_app
from app.extensions import db
from app.models import User, Profile, Series, Post, Project, Video, Album, AlbumPhoto, Certificate

app = create_app()

def seed_database():
    with app.app_context():
        # Xóa và tạo mới toàn bộ bảng
        db.create_all()
        print("Creating SQLite database tables...")

        # 1. Tạo tài khoản Admin mặc định
        admin = User.query.filter_by(username="admin").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@allinoneblog.dev",
                role="admin"
            )
            admin.set_password("Admin@123456")
            db.session.add(admin)
            print("Default admin created: admin / Admin@123456")

        # 2. Tạo tài khoản User mẫu
        demo_user = User.query.filter_by(username="demouser").first()
        if not demo_user:
            demo_user = User(
                username="demouser",
                email="user@allinoneblog.dev",
                role="user"
            )
            demo_user.set_password("User@123456")
            db.session.add(demo_user)
            print("Default demo user created: demouser / User@123456")

        # 3. Khởi tạo Profile cá nhân
        profile = Profile.query.first()
        if not profile:
            skills_data = [
                {"category": "Container & Orchestration", "items": ["Kubernetes (CKA)", "Docker", "Proxmox", "VMware"]},
                {"category": "CI/CD & GitOps", "items": ["GitLab CI", "Jenkins", "ArgoCD", "Git"]},
                {"category": "Cloud & Web Server", "items": ["AWS", "Nginx", "Apache", "Cloudflare Zero Trust"]},
                {"category": "Monitoring & Security", "items": ["Prometheus", "Grafana", "Trivy", "SonarQube", "AppArmor"]},
                {"category": "Databases & Message Queue", "items": ["MySQL", "MongoDB", "ElasticSearch", "Kafka", "RabbitMQ"]}
            ]
            timeline_data = [
                {
                    "year": "09/2025 - 12/2025",
                    "title": "Thực tập sinh lập trình viên & Triển khai",
                    "company": "CMC Global",
                    "description": "Phát triển backend Java Spring Boot, RESTful APIs, tối ưu hóa cơ sở dữ liệu MySQL và hỗ trợ triển khai hệ thống bằng Docker, phối hợp với Frontend ReactJS."
                },
                {
                    "year": "2023 - 2024",
                    "title": "Trainee Member & DevOps Research",
                    "company": "All in blessing",
                    "description": "Nghiên cứu chuyên sâu về Linux, Docker, Git, Kubernetes, GitLab CI. Xây dựng Dockerfile đa nền tảng, thiết lập pipeline CI/CD và giải pháp High Availability cho MongoDB, ElasticSearch, Kafka."
                },
                {
                    "year": "2023 - 2026",
                    "title": "Sinh viên Khoa học Máy tính (GPA 3.54/4)",
                    "company": "Trường Đại học CMC",
                    "description": "Nhận học bổng 70% toàn khóa học. Đạt giải Khuyến khích Hội nghị Nghiên cứu Khoa học Sinh viên (05/2025)."
                }
            ]
            social_links = {
                "github": "https://github.com/gk12355a",
                "email": "kiendotri@gmail.com",
                "phone": "0946312372",
                "linkedin": "https://linkedin.com/in/kiendotri"
            }
            profile = Profile(
                full_name="Đỗ Trí Kiên",
                headline="DevOps Engineer | Cloud & Infrastructure Specialist",
                bio="As a DevOps Engineer, I am passionate about containerization (Docker, Kubernetes), virtualization, and automating CI/CD pipelines (GitLab CI, Jenkins, ArgoCD) to ensure resilient, high-availability, secure, and scalable infrastructure.",
                avatar_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794477463/avatars/kien_do_avatar.jpg",
                resume_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794477884/resumes/kien_do_cv.pdf",
                live_status="🟢 Available for new projects",
                social_links_json=json.dumps(social_links),
                skills_json=json.dumps(skills_data),
                timeline_json=json.dumps(timeline_data)
            )
            db.session.add(profile)
            print("Default profile seeded.")

        # 4. Khởi tạo Series
        series_flask = Series.query.filter_by(slug="xay-dung-web-flask-tu-a-z").first()
        if not series_flask:
            series_flask = Series(
                title="Lộ trình Xây dựng Web Python Flask từ A-Z",
                slug="xay-dung-web-flask-tu-a-z",
                description="Chuỗi bài viết hướng dẫn lập trình Web Backend với Python Flask, SQLAlchemy, JWT và bảo mật toàn diện.",
                cover_image="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80"
            )
            db.session.add(series_flask)
            db.session.flush()

        # 5. Khởi tạo Bài viết Blog mẫu
        if Post.query.count() == 0:
            post1 = Post(
                title="Kiến trúc Clean Code trong Lập trình Web với Python Flask",
                slug="kien-truc-clean-code-trong-lap-trinh-web-flask",
                excerpt="Khám phá các nguyên lý SOLID, Application Factory Pattern và tổ chức cấu trúc dự án Flask chuyên nghiệp.",
                content="""# Kiến trúc Clean Code trong Lập trình Web với Python Flask

Việc xây dựng một ứng dụng web không chỉ dừng lại ở việc chạy được, mà còn phải **dễ đọc, dễ mở rộng và dễ bảo trì**. Trong bài viết này, chúng ta sẽ tìm hiểu cách áp dụng các nguyên lý Clean Code vào dự án Flask thực tế.

## 1. Nguyên lý Single Responsibility Principle (SRP)
Mỗi module, class hoặc function chỉ nên có một lý do duy nhất để thay đổi. Trong Flask:
- **Routes / Controllers**: Chỉ chịu trách nhiệm tiếp nhận request HTTP, validate đầu vào và trả về response.
- **Services**: Chứa toàn bộ logic nghiệp vụ (Business logic).
- **Models**: Định nghĩa cấu trúc dữ liệu và tương tác trực tiếp với cơ sở dữ liệu.

```python
# Ví dụ về chuẩn hóa Controller sạch
@posts_bp.route("/posts", methods=["POST"])
@admin_required()
def create_post():
    data = request.get_json() or {}
    post, error = PostService.create_post(data)
    if error:
        return api_response(success=False, message=error, status_code=400)
    return api_response(success=True, data=post.to_dict(), status_code=201)
```

## 2. Phòng chống 10 lỗ hổng OWASP Top 10
Bảo mật không phải là tính năng thêm vào sau cùng, mà phải được tích hợp ngay từ kiến trúc ban đầu:
1. **Broken Access Control**: Bảo vệ các route nhạy cảm bằng JWT Claims.
2. **Injection**: Tuyệt đối sử dụng SQLAlchemy ORM Parameterized Queries.
3. **Cross-Site Scripting (XSS)**: Làm sạch mã HTML độc hại bằng thư viện `bleach` và `DOMPurify`.

Chúc các bạn xây dựng được những dự án vững chắc và tinh gọn!
""",
                content_type="markdown",
                cover_image="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80",
                status="published",
                tags="Python,Flask,Clean Code,Architecture",
                lang="vi",
                series_id=series_flask.id,
                order_index=1,
                views=152,
                reactions_json=json.dumps({"fire": 24, "heart": 45, "idea": 18, "rocket": 30}),
                published_at=datetime.utcnow()
            )

            post2 = Post(
                title="Ứng dụng AI Recommendation System đơn giản với TF-IDF",
                slug="ung-dung-ai-recommendation-system-tf-idf",
                excerpt="Hướng dẫn tích hợp mô hình gợi ý bài viết liên quan sử dụng thuật toán TF-IDF và Cosine Similarity trong Scikit-learn.",
                content="""# Ứng dụng AI Recommendation System đơn giản với TF-IDF

Một trong những tính năng giúp giữ chân người đọc lâu hơn trên blog kỹ thuật là **Gợi ý bài viết liên quan (Related Posts)** dựa trên sự tương đồng nội dung.

## Cơ chế hoạt động của TF-IDF và Cosine Similarity
- **TF (Term Frequency)**: Tần suất xuất hiện của một từ trong tài liệu.
- **IDF (Inverse Document Frequency)**: Đánh giá mức độ quan trọng của từ trên toàn bộ kho văn bản.
- **Cosine Similarity**: Tính góc cosine giữa hai vector đại diện cho hai bài viết để xác định độ tương đồng.

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

vectorizer = TfidfVectorizer(stop_words='english')
tfidf_matrix = vectorizer.fit_transform(corpus)
similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix)
```

Thuật toán chạy hoàn toàn cục bộ, phản hồi dưới 10ms và không tốn bất kỳ chi phí API nào!
""",
                content_type="markdown",
                cover_image="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
                status="published",
                tags="AI,Machine Learning,Python,NLP",
                lang="vi",
                views=89,
                reactions_json=json.dumps({"fire": 15, "heart": 32, "idea": 28, "rocket": 12}),
                published_at=datetime.utcnow()
            )

            post3 = Post(
                title="Building Modern Web Applications with React 19 & Tailwind CSS",
                slug="building-modern-web-applications-react-tailwind",
                excerpt="Explore the new capabilities of React 19, Vite bundler speed, and the seamless styling power of Tailwind CSS v4.",
                content="""# Building Modern Web Applications with React 19 & Tailwind CSS

Frontend development has advanced rapidly. In this article, we explore the cutting-edge tech stack: **React 19, Vite 8, and Tailwind CSS v4**.

## Key Highlights
- **Vite 8**: Ultra-fast hot module replacement (HMR) and instantaneous build times.
- **Tailwind CSS v4**: Streamlined `@import "tailwindcss";` setup with zero-config CSS-first engine.
- **Clean Components**: Clean separation between presentational cards and data fetching logic.

Stay tuned for more web engineering insights!
""",
                content_type="markdown",
                cover_image="https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80",
                status="published",
                tags="React,TailwindCSS,Frontend,Vite",
                lang="en",
                views=64,
                reactions_json=json.dumps({"fire": 18, "heart": 20, "idea": 15, "rocket": 22}),
                published_at=datetime.utcnow()
            )

            db.session.add_all([post1, post2, post3])
            print("Sample blog posts seeded.")

        # 6. Khởi tạo Projects mẫu
        if Project.query.count() == 0:
            proj1 = Project(
                title="All-in-One Developer Portfolio & Blog Platform",
                description="Nền tảng website cá nhân toàn diện tích hợp Portfolio, Blog engine hỗ trợ Dual-Editor, Video Showcase, AI Recommendation và Spotlight Search Ctrl+K.",
                image_url="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
                demo_link="https://allinoneblog.dev",
                github_link="https://github.com/kiennguyen/AllinOneBlog",
                tech_stack="React,Vite,TailwindCSS,Python,Flask,SQLite,Scikit-Learn",
                is_featured=True,
                sort_order=1
            )
            proj2 = Project(
                title="AI Automated Content Generator & Analyzer",
                description="Công cụ phân tích ngữ nghĩa văn bản, tự động tóm tắt bài viết và trích xuất từ khóa SEO thông minh sử dụng NLP.",
                image_url="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
                demo_link="https://demo-ai.dev",
                github_link="https://github.com/kiennguyen/ai-analyzer",
                tech_stack="Python,FastAPI,Transformers,PyTorch,React",
                is_featured=True,
                sort_order=2
            )
            db.session.add_all([proj1, proj2])
            print("Sample projects seeded.")

        # 7. Khởi tạo Videos mẫu
        if Video.query.count() == 0:
            vid1 = Video(
                title="Hướng dẫn khởi tạo dự án React Vite kết hợp Tailwind CSS v4 cực nhanh",
                description="Video hướng dẫn từng bước cấu hình môi trường phát triển hiện đại và các thủ thuật tối ưu giao diện.",
                platform="youtube",
                video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                thumbnail_url="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
                category="Frontend",
                sort_order=1
            )
            db.session.add(vid1)
            print("Sample videos seeded.")

        # 8. Khởi tạo Album ảnh mẫu
        if Album.query.count() == 0:
            album1 = Album(
                title="Khoảnh khắc Hội thảo Công nghệ & Đời sống 2026",
                slug="khoanh-khac-hoi-thao-cong-nghe-2026",
                description="Bộ sưu tập hình ảnh ghi lại các buổi chia sẻ kỹ thuật, hackathon và những chuyến đi trải nghiệm thú vị.",
                cover_image="https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80"
            )
            db.session.add(album1)
            db.session.flush()

            photo1 = AlbumPhoto(
                album_id=album1.id,
                photo_url="https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
                caption="Chia sẻ tại Tech Talks Summit 2026",
                sort_order=1
            )
            photo2 = AlbumPhoto(
                album_id=album1.id,
                photo_url="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
                caption="Thảo luận kiến trúc hệ thống cùng cộng đồng",
                sort_order=2
            )
            db.session.add_all([photo1, photo2])
            print("Sample albums seeded.")

        # 9. Khởi tạo Chứng chỉ (Certificates) mẫu
        if Certificate.query.count() == 0:
            certs = [
                Certificate(
                    title="Certified Kubernetes Administrator (CKA)",
                    issuer="Cloud Native Computing Foundation (CNCF) & The Linux Foundation",
                    issue_date="June 19, 2026",
                    credential_id="LF-f5jrh502j1",
                    credential_url="http://training.linuxfoundation.org/certification/verify",
                    image_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794477864/certificates/cka_certificate.png",
                    pdf_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794477864/certificates/cka_certificate.pdf",
                    description="Chứng chỉ chứng minh năng lực chuyên sâu trong việc thiết kế, cài đặt, cấu hình, quản trị, bảo mật và khắc phục sự cố các cụm Kubernetes trong môi trường sản xuất thực tế.",
                    skills="Kubernetes, Container Orchestration, Linux, Cluster Administration, Troubleshooting, Networking, Security",
                    sort_order=1
                ),
                Certificate(
                    title="Khóa học DevOps thực tế doanh nghiệp",
                    issuer="DEVOPS EDU (devopsedu.vn)",
                    issue_date="April 24, 2025",
                    credential_id="75f5af1a416ebf79",
                    credential_url="https://devopsedu.vn/certificate?cert_hash=75f5af1a416ebf79",
                    image_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794478767/certificates/devops_thuc_te_doanh_nghiep.jpg",
                    pdf_url="",
                    description="Ứng dụng quy trình DevOps vào mô hình vận hành kinh doanh thực tế, triển khai CI/CD nâng cao, quản trị hạ tầng Cloud, monitoring với Prometheus/Grafana và tự động hóa toàn diện.",
                    skills="DevOps Practices, CI/CD Pipeline, Cloud Infra, Prometheus, Grafana, High Availability",
                    sort_order=3
                ),
                Certificate(
                    title="DevOps for Freshers",
                    issuer="DEVOPS EDU (devopsedu.vn)",
                    issue_date="May 15, 2024",
                    credential_id="c5f4be43d2b10baf",
                    credential_url="https://devopsedu.vn/certificate?cert_hash=c5f4be43d2b10baf",
                    image_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794478765/certificates/devops_for_freshers.jpg",
                    pdf_url="",
                    description="Nền tảng vững chắc về hệ điều hành Linux, mạng máy tính (Networking), Git workflow, Docker containerization cơ bản và xây dựng pipeline tự động ban đầu.",
                    skills="Linux, Docker, Git, CI/CD Fundamentals, Bash Scripting",
                    sort_order=4
                ),
                Certificate(
                    title="Kubernetes in Practice",
                    issuer="DEVOPS EDU (devopsedu.vn)",
                    issue_date="January 1, 2025",
                    credential_id="7559c1fd671bc1b3",
                    credential_url="https://devopsedu.vn/certificate?cert_hash=7559c1fd671bc1b3",
                    image_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794478768/certificates/kubernetes_in_practice.jpg",
                    pdf_url="",
                    description="Kỹ năng thực chiến chuyên sâu với Kubernetes: Pods, Deployments, StatefulSets, Services, Ingress, Persistent Volumes, Helm charts và triển khai ứng dụng microservices thực tế.",
                    skills="Kubernetes, Helm, Container Orchestration, Microservices, Cluster Management",
                    sort_order=2
                ),
                Certificate(
                    title="Configuration Management and the Cloud",
                    issuer="Google (via Coursera)",
                    issue_date="Apr 28, 2024",
                    credential_id="2LMBLPJ6XXWN",
                    credential_url="https://coursera.org/verify/2LMBLPJ6XXWN",
                    image_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794478956/certificates/google_configuration_management_cloud.png",
                    pdf_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794478956/certificates/google_configuration_management_cloud.pdf",
                    description="Khóa học chuyên sâu được ủy quyền bởi Google: Quản trị cấu hình tự động (Puppet, Ansible), tự động hóa cơ sở hạ tầng đám mây (Infrastructure as Code) và quản lý phi tập trung trên Cloud.",
                    skills="Configuration Management, Cloud Automation, Puppet, Infrastructure as Code (IaC), Google Cloud",
                    sort_order=5
                ),
                Certificate(
                    title="Troubleshooting and Debugging Techniques",
                    issuer="Google (via Coursera)",
                    issue_date="May 27, 2024",
                    credential_id="BEWCADHHMSU8",
                    credential_url="https://coursera.org/verify/BEWCADHHMSU8",
                    image_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794478957/certificates/google_troubleshooting_debugging.png",
                    pdf_url="https://res.cloudinary.com/dmthdtph6/image/upload/v1794478957/certificates/google_troubleshooting_debugging.pdf",
                    description="Phương pháp khoa học giải quyết sự cố và debug hệ thống: cô lập nguyên nhân gốc rễ (Root Cause Analysis), tối ưu hóa hiệu năng tài nguyên (CPU, Memory, Disk, Network) và giải quyết nút thắt cổ chai (bottlenecks).",
                    skills="Troubleshooting, Root Cause Analysis (RCA), Debugging, System Performance, Linux Internals",
                    sort_order=6
                )
            ]
            db.session.add_all(certs)
            print("Sample certificates seeded.")

        db.session.commit()
        print("Database successfully seeded with comprehensive mock data!")

if __name__ == "__main__":
    seed_database()
