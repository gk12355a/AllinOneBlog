import re
from datetime import datetime
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
@limiter.limit("10 per hour")
def submit_contact():
    data = request.get_json() or {}
    
    # 0. Yêu cầu bắt buộc: Chỉ người dùng đã đăng nhập trong hệ thống mới được gửi tin nhắn liên hệ
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    from app.models import User
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        current_user = User.query.get(user_id)
        if not current_user:
            return api_response(
                success=False, 
                message="Bạn cần đăng nhập vào tài khoản để gửi tin nhắn liên hệ.",
                message_en="You need to sign in to send a contact message.",
                message_vi="Bạn cần đăng nhập vào tài khoản để gửi tin nhắn liên hệ.",
                status_code=401
            )
    except Exception:
        return api_response(
            success=False, 
            message="Vui lòng đăng nhập để gửi tin nhắn trao đổi.",
            message_en="Please sign in to send a contact message.",
            message_vi="Vui lòng đăng nhập để gửi tin nhắn trao đổi.",
            status_code=401
        )

    # 1. Chống Spam: Honeypot trap
    # Nếu bot tự điền ô ẩn honeypot -> âm thầm coi như thành công nhưng không lưu
    honeypot = data.get("website_hp", "").strip()
    if honeypot:
        return api_response(success=True, message="Message sent successfully.", status_code=201)

    # 2. Chống Bot: Thời gian hoàn thành form (Form completion duration)
    # Form được mở và submit dưới 2 giây -> Bot gửi request tự động
    fill_time_ms = data.get("fill_time_ms")
    if fill_time_ms is not None and isinstance(fill_time_ms, (int, float)):
        if fill_time_ms < 1800:  # Dưới 1.8 giây
            return api_response(success=True, message="Message sent successfully.", status_code=201)

    target_user_id = data.get("target_user_id")
    target_user = None
    if target_user_id and current_user.role == "admin":
        target_user = User.query.get(int(target_user_id))

    if target_user:
        # Admin chủ động nhắn tin tới thành viên cụ thể
        name = current_user.display_name or current_user.username
        email = current_user.email
        sender_id = current_user.id
        recipient_id = target_user.id
    else:
        # User bình thường gửi liên hệ tới Admin
        name = data.get("name", "").strip() or current_user.display_name or current_user.username
        email = data.get("email", "").strip() or current_user.email
        sender_id = current_user.id
        recipient_id = None # Gửi tới Admin tổng

    subject = data.get("subject", "").strip()
    category = data.get("category", "general").strip()
    message_text = data.get("message", "").strip()

    # 3. Validation Backend chặt chẽ
    if not name or not email or not message_text:
        return api_response(success=False, message="Họ tên, email và nội dung tin nhắn là bắt buộc.", status_code=400)

    if len(name) > 100:
        return api_response(success=False, message="Họ tên không được vượt quá 100 ký tự.", status_code=400)

    if len(subject) > 150:
        return api_response(success=False, message="Tiêu đề không được vượt quá 150 ký tự.", status_code=400)

    if len(message_text) < 5 or len(message_text) > 5000:
        return api_response(success=False, message="Nội dung tin nhắn phải từ 5 đến 5.000 ký tự.", status_code=400)

    # Kiểm tra email format
    email_regex = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(email_regex, email):
        return api_response(success=False, message="Địa chỉ email không đúng định dạng.", status_code=400)

    # Chống header injection
    name = name.replace("\r", "").replace("\n", "")
    subject = subject.replace("\r", "").replace("\n", "")

    # Bóc tách IP, thiết bị người gửi
    from app.utils.device_detector import get_client_ip, parse_user_agent
    ip_addr = get_client_ip(request)
    ua_raw = request.headers.get("User-Agent", "")[:255]
    ua_info = parse_user_agent(ua_raw)
    dev_type = ua_info.get("device_type", "Desktop")

    attachments = data.get("attachments", [])
    import json

    msg = Message(
        user_id=sender_id, # Người tạo tin nhắn gốc
        sender_id=sender_id,
        recipient_id=recipient_id,
        name=name,
        email=email,
        subject=subject,
        category=category,
        message=message_text,
        attachments=json.dumps(attachments) if isinstance(attachments, list) else "[]",
        status="new",
        is_read=False,
        ip_address=ip_addr,
        user_agent=ua_raw,
        device_type=dev_type
    )
    db.session.add(msg)
    db.session.flush()

    from app.models import Notification
    if target_user:
        # Admin chủ động mở hội thoại gửi tới User -> Gửi thông báo tới User
        user_notif = Notification(
            user_id=target_user.id,
            title=f"Quản trị viên đã gửi cho bạn một tin nhắn",
            message=f"Chủ đề: {subject or 'Trao đổi liên hệ'} ({category})",
            type="contact",
            link=f"/inbox?msgId={msg.id}",
            is_read=False
        )
        db.session.add(user_notif)
    else:
        # User gửi tới Admin -> Tạo thông báo cho Admin
        admin_notif = Notification(
            user_id=None, # Broadcast to Admin
            title=f"Tin nhắn mới từ {name}",
            message=f"Chủ đề: {subject or 'Liên hệ hợp tác'} ({category})",
            type="contact",
            link=f"/admin?tab=messages&msgId={msg.id}",
            is_read=False
        )
        db.session.add(admin_notif)

    db.session.commit()

    # Phát sự kiện thời gian thực an toàn qua RealtimeService
    try:
        from app.services.realtime_service import RealtimeService
        RealtimeService.notify_conversation_updated(msg.id)
    except Exception as e:
        print("Socket notify error:", e)

    return api_response(
        success=True, 
        data=msg.to_dict(), 
        message="Cảm ơn bạn! Tin nhắn đã được gửi thành công. Chúng tôi sẽ phản hồi sớm nhất có thể.", 
        status_code=201
    )

@content_bp.route("/admin/messages", methods=["GET"])
@admin_required()
def list_messages():
    """
    Lấy danh sách tin nhắn kèm lọc status, category, search, gán sao, trạng thái SLA và phân loại.
    """
    status = request.args.get("status", "").strip()
    category = request.args.get("category", "").strip()
    filter_type = request.args.get("filter_type", "").strip() # 'waiting_me', 'waiting_user', 'resolved', 'starred', 'unassigned'
    q = request.args.get("q", "").strip()
    sort = request.args.get("sort", "newest").strip() # 'newest', 'oldest_unreplied', 'sla'

    query = Message.query.filter(Message.deleted_at == None)

    # Lọc nhanh theo filter_type
    if filter_type == "waiting_me":
        # Cần admin phản hồi (status là new hoặc unread hoặc chưa đóng và tin cuối từ user)
        query = query.filter(Message.is_closed == False, Message.status.in_(["new", "read"]))
    elif filter_type == "waiting_user":
        # Admin đã trả lời, đang chờ user xem / phản hồi tiếp
        query = query.filter(Message.is_closed == False, Message.status == "replied")
    elif filter_type == "resolved":
        query = query.filter(db.or_(Message.is_closed == True, Message.status == "closed"))
    elif filter_type == "starred":
        query = query.filter(Message.is_starred == True)
    elif filter_type == "unassigned":
        query = query.filter(Message.assigned_to == None)
    elif status and status != "all":
        if status == "unread":
            query = query.filter(Message.is_read == False)
        elif status == "read":
            query = query.filter(Message.is_read == True)
        elif status == "closed":
            query = query.filter(Message.is_closed == True)
        elif status in ["new", "replied", "spam", "archived"]:
            query = query.filter(Message.status == status)

    if category and category != "all":
        query = query.filter(Message.category == category)

    if q:
        query = query.filter(
            (Message.name.ilike(f"%{q}%")) |
            (Message.email.ilike(f"%{q}%")) |
            (Message.subject.ilike(f"%{q}%")) |
            (Message.message.ilike(f"%{q}%"))
        )

    if sort == "oldest_unreplied":
        query = query.order_by(Message.is_read.asc(), Message.created_at.asc())
    else:
        query = query.order_by(Message.is_starred.desc(), Message.created_at.desc(), Message.id.desc())

    messages = query.all()
    return api_response(success=True, data=[m.to_dict(is_admin=True) for m in messages])

@content_bp.route("/admin/messages/<int:message_id>/status", methods=["PUT"])
@admin_required()
def update_message_status(message_id: int):
    """Cập nhật trạng thái tin nhắn (read, unread, spam, archived, starred, assign, close)."""
    msg = Message.query.get(message_id)
    if not msg:
        return api_response(success=False, message="Tin nhắn không tồn tại.", status_code=404)

    data = request.get_json() or {}
    if "is_read" in data:
        msg.is_read = bool(data["is_read"])
        if msg.is_read:
            msg.read_at = datetime.utcnow()
            if msg.status == "new":
                msg.status = "read"
        else:
            msg.status = "new"

    if "status" in data:
        new_status = data["status"]
        if new_status in ["new", "read", "replied", "spam", "archived", "closed"]:
            msg.status = new_status
            if new_status == "read":
                msg.is_read = True
                msg.read_at = datetime.utcnow()
            elif new_status == "closed":
                msg.is_closed = True
                msg.closed_at = datetime.utcnow()

    if "is_starred" in data:
        msg.is_starred = bool(data["is_starred"])

    if "assigned_to" in data:
        assign_id = data["assigned_to"]
        msg.assigned_to = int(assign_id) if assign_id else None

    if "is_closed" in data:
        msg.is_closed = bool(data["is_closed"])
        if msg.is_closed:
            msg.closed_at = datetime.utcnow()
            msg.status = "closed"
        else:
            msg.closed_at = None
            msg.status = "replied" if msg.replied_at else "read"

    if "user_can_reopen" in data:
        msg.user_can_reopen = bool(data["user_can_reopen"])

    db.session.commit()
    return api_response(success=True, data=msg.to_dict(is_admin=True), message="Cập nhật trạng thái thành công.")

@content_bp.route("/admin/messages/bulk", methods=["POST"])
@admin_required()
def bulk_message_action():
    """
    Thao tác hàng loạt trên nhiều tin nhắn: đánh dấu đã đọc, giải quyết (đóng), lưu trữ, spam, xóa.
    """
    data = request.get_json() or {}
    ids = data.get("ids", [])
    action = data.get("action", "")

    if not ids or not isinstance(ids, list):
        return api_response(success=False, message="Vui lòng chọn ít nhất một tin nhắn.", status_code=400)

    messages = Message.query.filter(Message.id.in_(ids), Message.deleted_at == None).all()
    now = datetime.utcnow()

    for m in messages:
        if action == "mark_read":
            m.is_read = True
            m.read_at = now
            if m.status == "new":
                m.status = "read"
        elif action == "resolve":
            m.is_closed = True
            m.status = "closed"
            m.closed_at = now
        elif action == "archive":
            m.status = "archived"
        elif action == "spam":
            m.status = "spam"
        elif action == "delete":
            m.deleted_at = now

    db.session.commit()
    return api_response(success=True, message=f"Đã thực hiện thao tác '{action}' cho {len(messages)} tin nhắn.")

@content_bp.route("/admin/messages/<int:message_id>/reply", methods=["POST"])
@admin_required()
def reply_message(message_id: int):
    """
    Lưu phản hồi hoặc ghi chú nội bộ của Admin.
    - is_internal: True -> Chỉ admin thấy (ghi chú nội bộ)
    - attachments: Danh sách file đính kèm
    - Dedupe notification gửi tới user
    """
    import json
    from flask_jwt_extended import get_jwt_identity
    admin_id = int(get_jwt_identity())

    msg = Message.query.get(message_id)
    if not msg:
        return api_response(success=False, message="Tin nhắn không tồn tại.", status_code=404)

    data = request.get_json() or {}
    reply_content = data.get("reply_content", "").strip()
    is_internal = bool(data.get("is_internal", False))
    attachments = data.get("attachments", [])
    close_after_reply = bool(data.get("close_after_reply", False))

    if not reply_content:
        return api_response(success=False, message="Vui lòng nhập nội dung.", status_code=400)

    from app.models import MessageReply, Notification
    reply = MessageReply(
        message_id=msg.id,
        admin_id=admin_id,
        sender_type="admin",
        is_internal=is_internal,
        attachments=json.dumps(attachments) if isinstance(attachments, list) else "[]",
        reply_content=reply_content,
        sent_at=datetime.utcnow()
    )
    db.session.add(reply)

    if not is_internal:
        msg.status = "replied"
        msg.replied_at = datetime.utcnow()
        msg.last_reply_at = datetime.utcnow()
        msg.is_read = True

        if close_after_reply:
            msg.is_closed = True
            msg.closed_at = datetime.utcnow()
            msg.status = "closed"

        # Nếu người gửi có tài khoản trên blog -> Gửi thông báo kèm dedupe_key để tránh ngập chuông
        if msg.user_id:
            dedupe_k = f"contact_{msg.id}"
            existing_notif = Notification.query.filter_by(
                user_id=msg.user_id,
                dedupe_key=dedupe_k,
                is_read=False
            ).first()

            if existing_notif:
                existing_notif.message = f"Chủ đề: {msg.subject or 'Liên hệ'}\nPhản hồi mới: {reply_content[:100]}..."
                existing_notif.created_at = datetime.utcnow()
            else:
                user_notif = Notification(
                    user_id=msg.user_id,
                    title="Quản trị viên đã phản hồi tin nhắn của bạn",
                    message=f"Chủ đề: {msg.subject or 'Liên hệ'}\nPhản hồi: {reply_content[:100]}...",
                    type="contact",
                    dedupe_key=dedupe_k,
                    link=f"/inbox?msgId={msg.id}",
                    is_read=False
                )
                db.session.add(user_notif)

    db.session.commit()

    # Phát sự kiện thời gian thực an toàn qua RealtimeService
    try:
        from app.services.realtime_service import RealtimeService
        RealtimeService.notify_conversation_updated(msg.id)
    except Exception as e:
        print("Socket notify error:", e)

    return api_response(success=True, data=msg.to_dict(is_admin=True), message="Đã lưu thành công.")

@content_bp.route("/admin/messages/<int:message_id>", methods=["DELETE"])
@admin_required()
def delete_message(message_id: int):
    msg = Message.query.get(message_id)
    if not msg:
        return api_response(success=False, message="Message not found.", status_code=404)
    # Xóa mềm (soft-delete) để có thể phục hồi nếu cần
    msg.deleted_at = datetime.utcnow()
    db.session.commit()
    return api_response(success=True, message="Message deleted successfully.")

# --- 3B. USER INBOX & REPLIES ---

@content_bp.route("/user/messages", methods=["GET"])
def get_user_messages():
    """
    Lấy danh sách các tin nhắn và phản hồi thuộc tài khoản của người dùng đang đăng nhập.
    """
    from flask_jwt_extended import jwt_required, get_jwt_identity
    from app.models import User
    
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception:
        return api_response(success=False, message="Yêu cầu đăng nhập để xem hộp thư.", status_code=401)

    current_user = User.query.get(user_id)
    if not current_user:
        return api_response(success=False, message="Người dùng không hợp lệ.", status_code=401)

    # Tìm tin nhắn mà người dùng là:
    # 1. Người tạo (user_id / sender_id == user_id hoặc email trùng)
    # 2. Hoặc người nhận (recipient_id == user_id)
    query = Message.query.filter(
        Message.deleted_at == None,
        db.or_(
            Message.user_id == user_id,
            Message.sender_id == user_id,
            Message.recipient_id == user_id,
            Message.email == current_user.email
        )
    ).order_by(Message.created_at.desc())

    messages = query.all()
    return api_response(success=True, data=[m.to_dict() for m in messages])

@content_bp.route("/user/messages/<int:message_id>/reply", methods=["POST"])
def user_reply_message(message_id: int):
    """
    Người dùng phản hồi lại trong luồng trao đổi tin nhắn.
    Tự động thông báo tới Admin.
    """
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    from app.models import User, MessageReply, Notification

    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception:
        return api_response(success=False, message="Yêu cầu đăng nhập.", status_code=401)

    current_user = User.query.get(user_id)
    if not current_user:
        return api_response(success=False, message="Người dùng không hợp lệ.", status_code=401)

    msg = Message.query.get(message_id)
    if not msg or msg.deleted_at is not None:
        return api_response(success=False, message="Tin nhắn không tồn tại hoặc đã bị xóa.", status_code=404)

    # Đảm bảo người dùng có quyền tham gia hội thoại (là người tạo, người gửi, người nhận, hoặc admin)
    can_reply = (
        current_user.role == "admin" or
        msg.user_id == user_id or
        msg.sender_id == user_id or
        msg.recipient_id == user_id or
        msg.email == current_user.email
    )
    if not can_reply:
        return api_response(success=False, message="Bạn không có quyền phản hồi tin nhắn này.", status_code=403)

    if msg.is_closed and not msg.user_can_reopen:
        return api_response(success=False, message="Hội thoại này đã được đóng và không thể gửi thêm tin nhắn.", status_code=400)

    data = request.get_json() or {}
    reply_content = data.get("reply_content", "").strip()
    attachments = data.get("attachments", [])
    if not reply_content:
        return api_response(success=False, message="Vui lòng nhập nội dung phản hồi.", status_code=400)

    import json
    # Thêm reply
    reply = MessageReply(
        message_id=msg.id,
        user_id=user_id,
        sender_type="user",
        attachments=json.dumps(attachments) if isinstance(attachments, list) else "[]",
        reply_content=reply_content,
        sent_at=datetime.utcnow()
    )
    db.session.add(reply)

    # Đánh dấu trạng thái tin nhắn
    msg.status = "new"  # Admin cần xem phản hồi mới của user
    msg.is_read = False # Đánh dấu chưa đọc cho admin
    msg.last_reply_at = datetime.utcnow()
    if msg.is_closed and msg.user_can_reopen:
        msg.is_closed = False # Tự động mở lại hội thoại khi user nhắn tiếp

    # Gửi thông báo tới Admin (gom theo hội thoại với dedupe_key để tránh ngập chuông)
    sender_name = current_user.display_name or current_user.username
    dedupe_k = f"admin_contact_{msg.id}"
    existing_admin_notif = Notification.query.filter_by(
        user_id=None,
        dedupe_key=dedupe_k,
        is_read=False
    ).first()

    if existing_admin_notif:
        existing_admin_notif.title = f"Phản hồi mới từ {sender_name}"
        existing_admin_notif.message = f"Chủ đề: {msg.subject or 'Tin nhắn liên hệ'}\nNội dung: {reply_content[:100]}..."
        existing_admin_notif.created_at = datetime.utcnow()
    else:
        admin_notif = Notification(
            user_id=None, # Broadcast to Admin
            title=f"Phản hồi mới từ {sender_name}",
            message=f"Chủ đề: {msg.subject or 'Tin nhắn liên hệ'}\nNội dung: {reply_content[:100]}...",
            type="contact",
            dedupe_key=dedupe_k,
            link=f"/admin?tab=messages&msgId={msg.id}",
            is_read=False
        )
        db.session.add(admin_notif)

    db.session.commit()

    # Phát sự kiện thời gian thực an toàn qua RealtimeService
    try:
        from app.services.realtime_service import RealtimeService
        RealtimeService.notify_conversation_updated(msg.id)
    except Exception as e:
        print("Socket notify error:", e)

    return api_response(success=True, data=msg.to_dict(), message="Đã gửi phản hồi thành công.")

@content_bp.route("/user/messages/<int:message_id>", methods=["DELETE"])
def user_delete_message(message_id: int):
    """
    Quyền riêng tư: Cho phép user xóa hội thoại của mình khỏi hộp thư.
    """
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    from app.models import User

    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception:
        return api_response(success=False, message="Yêu cầu đăng nhập.", status_code=401)

    current_user = User.query.get(user_id)
    msg = Message.query.get(message_id)
    if not msg or msg.deleted_at is not None:
        return api_response(success=False, message="Tin nhắn không tồn tại.", status_code=404)

    if msg.user_id != user_id and msg.email != current_user.email:
        return api_response(success=False, message="Bạn không có quyền xóa tin nhắn này.", status_code=403)

    msg.deleted_at = datetime.utcnow()
    db.session.commit()
    return api_response(success=True, message="Đã xóa hội thoại thành công.")

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
    from app.services.post_access_service import get_current_user_optional
    user = get_current_user_optional()
    q = request.args.get("q", "").strip()
    results = SearchEngineService.search_all(q, limit=6, user=user)
    return api_response(success=True, data=results)
