from flask import Blueprint, request
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from app.extensions import db, limiter
from app.models import Project, Video, Message, Certificate
from app.services.ai_search_service import SearchEngineService
from app.utils.helpers import api_response, admin_required

content_bp = Blueprint("content", __name__)

def is_admin_request() -> bool:
    """Helper to safely determine if current request is authenticated as admin."""
    try:
        verify_jwt_in_request(optional=True)
        claims = get_jwt()
        return bool(claims and claims.get("role") == "admin")
    except Exception:
        return False

# --- 1. PROJECTS ---

@content_bp.route("/projects", methods=["GET"])
def get_projects():
    featured = request.args.get("featured", "").lower()
    query = Project.query
    if featured in ["true", "1"]:
        query = query.filter_by(is_featured=True)
    projects = query.order_by(Project.sort_order.asc(), Project.created_at.desc()).all()
    # If explicitly requested with ?admin=true by an authenticated admin, return full data
    is_admin = request.args.get("admin", "").lower() in ["true", "1"] and is_admin_request()
    return api_response(success=True, data=[p.to_dict(is_admin=is_admin) for p in projects])

@content_bp.route("/projects/<int:project_id>", methods=["GET"])
def get_project_detail(project_id: int):
    project = Project.query.get(project_id)
    if not project:
        return api_response(success=False, message="Project not found.", status_code=404)
    is_admin = request.args.get("admin", "").lower() in ["true", "1"] and is_admin_request()
    return api_response(success=True, data=project.to_dict(is_admin=is_admin))

@content_bp.route("/projects", methods=["POST"])
@admin_required()
def create_project():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    if not title:
        return api_response(success=False, message="Title is required.", status_code=400)

    tech = ",".join([t.strip() for t in data.get("tech_stack", [])]) if isinstance(data.get("tech_stack"), list) else data.get("tech_stack", "").strip()

    project = Project(
        title=title,
        description=data.get("description", "").strip(),
        image_url=data.get("image_url", "").strip(),
        demo_link=data.get("demo_link", "").strip(),
        github_link=data.get("github_link", "").strip(),
        show_demo=bool(data.get("show_demo", True)),
        show_github=bool(data.get("show_github", True)),
        tech_stack=tech,
        is_featured=bool(data.get("is_featured", False)),
        sort_order=data.get("sort_order", 0)
    )
    db.session.add(project)
    db.session.commit()

    return api_response(success=True, data=project.to_dict(is_admin=True), message="Project created successfully.", status_code=201)

@content_bp.route("/projects/<int:project_id>", methods=["PUT"])
@admin_required()
def update_project(project_id: int):
    project = Project.query.get(project_id)
    if not project:
        return api_response(success=False, message="Project not found.", status_code=404)

    data = request.get_json() or {}
    if "title" in data:
        project.title = data["title"].strip()
    if "description" in data:
        project.description = data["description"].strip()
    if "image_url" in data:
        project.image_url = data["image_url"].strip()
    if "demo_link" in data:
        project.demo_link = data["demo_link"].strip()
    if "github_link" in data:
        project.github_link = data["github_link"].strip()
    if "show_demo" in data:
        project.show_demo = bool(data["show_demo"])
    if "show_github" in data:
        project.show_github = bool(data["show_github"])
    if "tech_stack" in data:
        project.tech_stack = ",".join([t.strip() for t in data["tech_stack"]]) if isinstance(data["tech_stack"], list) else data["tech_stack"].strip()
    if "is_featured" in data:
        project.is_featured = bool(data["is_featured"])
    if "sort_order" in data:
        project.sort_order = int(data["sort_order"])

    db.session.commit()
    return api_response(success=True, data=project.to_dict(is_admin=True), message="Project updated successfully.")

@content_bp.route("/projects/<int:project_id>", methods=["DELETE"])
@admin_required()
def delete_project(project_id: int):
    project = Project.query.get(project_id)
    if not project:
        return api_response(success=False, message="Project not found.", status_code=404)
    db.session.delete(project)
    db.session.commit()
    return api_response(success=True, message="Project deleted successfully.")

# --- 2. VIDEOS ---

@content_bp.route("/videos", methods=["GET"])
def get_videos():
    admin = request.args.get("admin", "false").lower() == "true"
    category = request.args.get("category", "").strip()
    status = request.args.get("status", "").strip()
    series_id = request.args.get("series_id", "").strip()
    q = request.args.get("q", "").strip()

    query = Video.query

    if not admin:
        query = query.filter_by(status="published")
    elif status:
        query = query.filter_by(status=status)

    if category and category != "all":
        query = query.filter_by(category=category)

    if series_id:
        try:
            query = query.filter_by(series_id=int(series_id))
        except ValueError:
            pass

    if q:
        query = query.filter((Video.title.ilike(f"%{q}%")) | (Video.description.ilike(f"%{q}%")))

    videos = query.order_by(Video.sort_order.asc(), Video.created_at.desc()).all()
    return api_response(success=True, data=[v.to_dict() for v in videos])

@content_bp.route("/videos/<slug_or_id>", methods=["GET"])
def get_video_detail(slug_or_id):
    if slug_or_id.isdigit():
        video = Video.query.get(int(slug_or_id))
    else:
        video = Video.query.filter_by(slug=slug_or_id).first()

    if not video:
        return api_response(success=False, message="Video not found.", status_code=404)

    data = video.to_dict()
    # Lấy thông tin series nếu có
    if video.series_id:
        from app.models import Series
        series = Series.query.get(video.series_id)
        if series:
            data["series_info"] = {
                "id": series.id,
                "title": series.title,
                "slug": series.slug
            }
            # Lấy các video cùng trong series này
            sibling_videos = Video.query.filter_by(series_id=series.id, status="published")\
                .order_by(Video.order_index.asc()).all()
            data["series_videos"] = [{
                "id": sv.id,
                "slug": sv.slug,
                "title": sv.title,
                "duration": sv.duration,
                "order_index": sv.order_index
            } for sv in sibling_videos]

    # Lấy bài viết liên quan nếu có
    if video.related_post_id:
        from app.models import Post
        post = Post.query.get(video.related_post_id)
        if post:
            data["related_post"] = {
                "id": post.id,
                "title": post.title,
                "slug": post.slug,
                "summary": post.summary or "",
                "cover_image": post.cover_image or ""
            }

    return api_response(success=True, data=data)

@content_bp.route("/videos/<int:video_id>/view", methods=["POST"])
def increment_video_view(video_id: int):
    video = Video.query.get(video_id)
    if not video:
        return api_response(success=False, message="Video not found.", status_code=404)
    video.view_count = (video.view_count or 0) + 1
    db.session.commit()
    return api_response(success=True, data={"view_count": video.view_count})

@content_bp.route("/videos", methods=["POST"])
@admin_required()
def create_video():
    import json
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    video_url = data.get("video_url", "").strip()
    if not title or not video_url:
        return api_response(success=False, message="Title and video URL are required.", status_code=400)

    slug = data.get("slug", "").strip()
    if not slug:
        slug = generate_slug(title)

    # Đảm bảo slug là duy nhất
    orig_slug = slug
    counter = 1
    while Video.query.filter_by(slug=slug).first():
        slug = f"{orig_slug}-{counter}"
        counter += 1

    chapters_raw = data.get("chapters", [])
    chapters_str = json.dumps(chapters_raw) if isinstance(chapters_raw, list) else "[]"

    video = Video(
        slug=slug,
        title=title,
        description=data.get("description", "").strip(),
        platform=data.get("platform", "youtube"),
        video_url=video_url,
        thumbnail_url=data.get("thumbnail_url", "").strip(),
        duration=data.get("duration", "").strip(),
        status=data.get("status", "published"),
        language=data.get("language", "vi"),
        featured=bool(data.get("featured", False)),
        chapters_json=chapters_str,
        related_post_id=data.get("related_post_id"),
        category=data.get("category", "Lập trình"),
        series_id=data.get("series_id"),
        order_index=int(data.get("order_index", 0) or 0),
        sort_order=int(data.get("sort_order", 0) or 0)
    )
    db.session.add(video)
    db.session.commit()

    return api_response(success=True, data=video.to_dict(), message="Video added successfully.", status_code=201)

@content_bp.route("/videos/<int:video_id>", methods=["PUT"])
@admin_required()
def update_video(video_id: int):
    import json
    video = Video.query.get(video_id)
    if not video:
        return api_response(success=False, message="Video not found.", status_code=404)

    data = request.get_json() or {}
    if "title" in data:
        video.title = data["title"].strip()
    if "slug" in data and data["slug"].strip():
        new_slug = data["slug"].strip()
        if new_slug != video.slug:
            existing = Video.query.filter_by(slug=new_slug).first()
            if existing and existing.id != video.id:
                return api_response(success=False, message="Slug already exists.", status_code=409)
            video.slug = new_slug
    if "description" in data:
        video.description = data["description"].strip()
    if "platform" in data:
        video.platform = data["platform"]
    if "video_url" in data:
        video.video_url = data["video_url"].strip()
    if "thumbnail_url" in data:
        video.thumbnail_url = data["thumbnail_url"].strip()
    if "duration" in data:
        video.duration = data["duration"].strip()
    if "status" in data:
        video.status = data["status"]
    if "language" in data:
        video.language = data["language"]
    if "featured" in data:
        video.featured = bool(data["featured"])
    if "chapters" in data:
        video.chapters_json = json.dumps(data["chapters"]) if isinstance(data["chapters"], list) else "[]"
    if "related_post_id" in data:
        video.related_post_id = data["related_post_id"]
    if "category" in data:
        video.category = data["category"].strip()
    if "series_id" in data:
        video.series_id = data["series_id"]
    if "order_index" in data:
        video.order_index = int(data["order_index"] or 0)
    if "sort_order" in data:
        video.sort_order = int(data["sort_order"] or 0)

    db.session.commit()
    return api_response(success=True, data=video.to_dict(), message="Video updated successfully.")

@content_bp.route("/videos/<int:video_id>", methods=["DELETE"])
@admin_required()
def delete_video(video_id: int):
    video = Video.query.get(video_id)
    if not video:
        return api_response(success=False, message="Video not found.", status_code=404)
    db.session.delete(video)
    db.session.commit()
    return api_response(success=True, message="Video deleted successfully.")

# --- 3. CONTACT MESSAGES ---

@content_bp.route("/contact", methods=["POST"])
@limiter.limit("10 per minute")
def submit_contact():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    message_text = data.get("message", "").strip()

    if not name or not email or not message_text:
        return api_response(success=False, message="Name, email, and message are required.", status_code=400)

    msg = Message(
        name=name,
        email=email,
        subject=data.get("subject", "").strip(),
        message=message_text
    )
    db.session.add(msg)
    db.session.commit()

    return api_response(success=True, data=msg.to_dict(), message="Message sent successfully.", status_code=201)

@content_bp.route("/admin/messages", methods=["GET"])
@admin_required()
def list_messages():
    messages = Message.query.order_by(Message.created_at.desc()).all()
    return api_response(success=True, data=[m.to_dict() for m in messages])

@content_bp.route("/admin/messages/<int:message_id>/read", methods=["PUT"])
@admin_required()
def mark_message_read(message_id: int):
    msg = Message.query.get(message_id)
    if not msg:
        return api_response(success=False, message="Message not found.", status_code=404)
    msg.is_read = True
    db.session.commit()
    return api_response(success=True, data=msg.to_dict(), message="Message marked as read.")

@content_bp.route("/admin/messages/<int:message_id>", methods=["DELETE"])
@admin_required()
def delete_message(message_id: int):
    msg = Message.query.get(message_id)
    if not msg:
        return api_response(success=False, message="Message not found.", status_code=404)
    db.session.delete(msg)
    db.session.commit()
    return api_response(success=True, message="Message deleted successfully.")

# --- 4. CERTIFICATES ---

@content_bp.route("/certificates", methods=["GET"])
def get_certificates():
    certs = Certificate.query.order_by(Certificate.sort_order.asc(), Certificate.created_at.desc()).all()
    return api_response(success=True, data=[c.to_dict() for c in certs])

@content_bp.route("/certificates/<int:cert_id>", methods=["GET"])
def get_certificate_detail(cert_id: int):
    cert = Certificate.query.get(cert_id)
    if not cert:
        return api_response(success=False, message="Certificate not found.", status_code=404)
    return api_response(success=True, data=cert.to_dict())

@content_bp.route("/certificates", methods=["POST"])
@admin_required()
def create_certificate():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    issuer = data.get("issuer", "").strip()
    if not title or not issuer:
        return api_response(success=False, message="Title and issuer are required.", status_code=400)

    skills = ",".join([s.strip() for s in data.get("skills", [])]) if isinstance(data.get("skills"), list) else data.get("skills", "").strip()

    cert = Certificate(
        title=title,
        issuer=issuer,
        issue_date=data.get("issue_date", "").strip(),
        credential_id=data.get("credential_id", "").strip(),
        credential_url=data.get("credential_url", "").strip(),
        image_url=data.get("image_url", "").strip(),
        pdf_url=data.get("pdf_url", "").strip(),
        description=data.get("description", "").strip(),
        skills=skills,
        sort_order=data.get("sort_order", 0)
    )
    db.session.add(cert)
    db.session.commit()
    return api_response(success=True, data=cert.to_dict(), message="Certificate created successfully.", status_code=201)

@content_bp.route("/certificates/<int:cert_id>", methods=["PUT"])
@admin_required()
def update_certificate(cert_id: int):
    cert = Certificate.query.get(cert_id)
    if not cert:
        return api_response(success=False, message="Certificate not found.", status_code=404)

    data = request.get_json() or {}
    if "title" in data:
        cert.title = data["title"].strip()
    if "issuer" in data:
        cert.issuer = data["issuer"].strip()
    if "issue_date" in data:
        cert.issue_date = data["issue_date"].strip()
    if "credential_id" in data:
        cert.credential_id = data["credential_id"].strip()
    if "credential_url" in data:
        cert.credential_url = data["credential_url"].strip()
    if "image_url" in data:
        cert.image_url = data["image_url"].strip()
    if "pdf_url" in data:
        cert.pdf_url = data["pdf_url"].strip()
    if "description" in data:
        cert.description = data["description"].strip()
    if "skills" in data:
        cert.skills = ",".join([s.strip() for s in data["skills"]]) if isinstance(data["skills"], list) else data["skills"].strip()
    if "sort_order" in data:
        cert.sort_order = data["sort_order"]

    db.session.commit()
    return api_response(success=True, data=cert.to_dict(), message="Certificate updated successfully.")

@content_bp.route("/certificates/<int:cert_id>", methods=["DELETE"])
@admin_required()
def delete_certificate(cert_id: int):
    cert = Certificate.query.get(cert_id)
    if not cert:
        return api_response(success=False, message="Certificate not found.", status_code=404)
    db.session.delete(cert)
    db.session.commit()
    return api_response(success=True, message="Certificate deleted successfully.")

# --- 5. GLOBAL SEARCH (SPOTLIGHT CTRL+K) ---

@content_bp.route("/search", methods=["GET"])
def global_search():
    q = request.args.get("q", "").strip()
    results = SearchEngineService.search_all(q, limit=6)
    return api_response(success=True, data=results)
