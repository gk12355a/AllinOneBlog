import json
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from app.utils.helpers import format_datetime_utc7

class User(db.Model):
    __tablename__ = "users"
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user", nullable=False)  # "admin" | "user"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    avatar_url = db.Column(db.String(500), default="")
    display_name = db.Column(db.String(120), default="")
    bio = db.Column(db.String(255), default="")
    location = db.Column(db.String(100), default="")
    website = db.Column(db.String(255), default="")
    github_url = db.Column(db.String(255), default="")
    linkedin_url = db.Column(db.String(255), default="")
    settings_json = db.Column(db.Text, default="{}")

    # Quản lý trạng thái, bảo mật & khóa tài khoản
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    disabled_reason = db.Column(db.String(255), default="")
    disabled_by = db.Column(db.String(80), default="")
    disabled_at = db.Column(db.DateTime, nullable=True)
    failed_login_attempts = db.Column(db.Integer, default=0, nullable=False)
    locked_until = db.Column(db.DateTime, nullable=True)
    last_login_at = db.Column(db.DateTime, nullable=True)
    last_login_ip = db.Column(db.String(45), default="")
    token_version = db.Column(db.Integer, default=1, nullable=False)

    history = db.relationship("ReadingHistory", backref="user", cascade="all, delete-orphan", lazy="dynamic")
    likes = db.relationship("LikedPost", backref="user", cascade="all, delete-orphan", lazy="dynamic")
    bookmarks = db.relationship("SavedPost", backref="user", cascade="all, delete-orphan", lazy="dynamic")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)
        self.token_version = (self.token_version or 1) + 1

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def is_currently_locked(self) -> bool:
        """Kiểm tra xem tài khoản có đang bị khóa (thủ công hoặc tạm thời)."""
        if not self.is_active:
            return True
        if self.locked_until and self.locked_until > datetime.utcnow():
            return True
        return False

    def to_dict(self):
        try:
            settings = json.loads(self.settings_json or "{}")
        except Exception:
            settings = {}
        return {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name or self.username,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url or "",
            "bio": self.bio or "",
            "location": self.location or "",
            "website": self.website or "",
            "github_url": self.github_url or "",
            "linkedin_url": self.linkedin_url or "",
            "is_active": bool(self.is_active),
            "disabled_reason": self.disabled_reason or "",
            "disabled_by": self.disabled_by or "",
            "disabled_at": format_datetime_utc7(self.disabled_at),
            "is_locked": self.is_currently_locked(),
            "locked_until": format_datetime_utc7(self.locked_until),
            "last_login_at": format_datetime_utc7(self.last_login_at),
            "last_login_ip": self.last_login_ip or "",
            "settings": settings,
            "created_at": format_datetime_utc7(self.created_at)
        }

class Profile(db.Model):
    __tablename__ = "profile"
    
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), default="Kiên Nguyễn")
    headline = db.Column(db.String(255), default="Full-stack Developer & Tech Enthusiast")
    bio = db.Column(db.Text, default="")
    avatar_url = db.Column(db.String(255), default="")
    resume_url = db.Column(db.String(255), default="")
    live_status = db.Column(db.String(100), default="🟢 Sẵn sàng nhận dự án mới")
    social_links_json = db.Column(db.Text, default="{}")
    skills_json = db.Column(db.Text, default="[]")
    timeline_json = db.Column(db.Text, default="[]")
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "headline": self.headline,
            "bio": self.bio,
            "avatar_url": self.avatar_url,
            "resume_url": self.resume_url,
            "live_status": self.live_status,
            "social_links": json.loads(self.social_links_json or "{}"),
            "skills": json.loads(self.skills_json or "[]"),
            "timeline": json.loads(self.timeline_json or "[]"),
            "updated_at": format_datetime_utc7(self.updated_at)
        }

class Series(db.Model):
    __tablename__ = "series"
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, default="")
    cover_image = db.Column(db.String(255), default="")
    level = db.Column(db.String(50), default="beginner")  # "beginner" | "intermediate" | "advanced"
    status = db.Column(db.String(50), default="updating")  # "updating" | "completed" | "upcoming"
    is_published = db.Column(db.Boolean, default=True)  # Hiển thị hoặc ẩn series với độc giả
    upcoming_lessons = db.Column(db.Text, default="[]")  # JSON string danh sách bài học dự kiến sắp ra mắt
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    posts = db.relationship("Post", backref="series", lazy="dynamic")
    videos = db.relationship("Video", backref="series", lazy="dynamic")
    items = db.relationship("SeriesItem", backref="series", cascade="all, delete-orphan", lazy="dynamic", order_by="SeriesItem.position.asc()")

    def to_dict(self, include_items: bool = False, current_user=None):
        import json
        from app.models import Post, Video
        from app.services.post_access_service import check_single_post_access

        # Lấy tất cả items theo thứ tự
        all_items = self.items.order_by(SeriesItem.position.asc()).all()

        # Stealth Mode: Lọc bỏ các bài viết mà current_user không có quyền xem
        filtered_items = []
        for it in all_items:
            if it.item_type == 'post' and it.post:
                if check_single_post_access(it.post, current_user):
                    filtered_items.append(it)
            else:
                filtered_items.append(it)

        post_count = 0
        video_count = 0
        placeholder_count = 0
        total_minutes = 0
        all_tags = set()
        items_payload = []

        # Đánh lại số thứ tự position liên tục cho người xem (tránh lộ số thứ tự nhảy cóc)
        for idx, it in enumerate(filtered_items, start=1):
            item_data = it.to_dict()
            item_data["position"] = idx

            if it.item_type == 'post' and it.post:
                post_count += 1
                word_count = len(it.post.content.split()) if it.post.content else 0
                read_time = max(1, round(word_count / 200))
                total_minutes += read_time
                if it.post.tags:
                    for t in it.post.tags.split(","):
                        if t.strip():
                            all_tags.add(t.strip().lower())
            elif it.item_type == 'video' and it.video:
                video_count += 1
                dur_str = it.video.duration or "10:00"
                try:
                    parts = dur_str.split(":")
                    mins = int(parts[0]) if len(parts) > 0 else 5
                except Exception:
                    mins = 5
                total_minutes += mins
            elif it.item_type == 'placeholder':
                placeholder_count += 1

            if include_items:
                items_payload.append(item_data)

        # Fallback tính theo posts nếu items rỗng
        if not all_items:
            published_posts = [p for p in self.posts.filter_by(status="published").order_by(Post.order_index.asc()).all() if check_single_post_access(p, current_user)]
            post_count = len(published_posts)
            total_minutes = sum([max(1, round((len(p.content.split()) if p.content else 0) / 200)) for p in published_posts])

        res = {
            "id": self.id,
            "title": self.title,
            "slug": self.slug,
            "description": self.description,
            "cover_image": self.cover_image,
            "level": self.level or "beginner",
            "status": self.status or "updating",
            "is_published": self.is_published if self.is_published is not None else True,
            "total_items": len(filtered_items),
            "total_posts": post_count,
            "total_videos": video_count,
            "total_placeholders": placeholder_count,
            "total_duration_minutes": total_minutes,
            "tags": sorted(list(all_tags)),
            "updated_at": format_datetime_utc7(self.created_at),
            "created_at": format_datetime_utc7(self.created_at)
        }
        if include_items:
            res["items"] = items_payload
            res["posts"] = [it.post.to_dict(include_content=False) for it in filtered_items if it.item_type == 'post' and it.post]
            res["videos"] = [it.video.to_dict() for it in filtered_items if it.item_type == 'video' and it.video]

        return res

class Post(db.Model):
    __tablename__ = "posts"
    
    id = db.Column(db.Integer, primary_key=True)
    author_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    series_id = db.Column(db.Integer, db.ForeignKey("series.id"), nullable=True)
    order_index = db.Column(db.Integer, default=0)
    lang = db.Column(db.String(10), default="vi", index=True)  # "vi" | "en"
    title = db.Column(db.String(255), nullable=False)
    slug = db.Column(db.String(255), unique=True, nullable=False, index=True)
    excerpt = db.Column(db.Text, default="")
    content = db.Column(db.Text, nullable=False)
    content_type = db.Column(db.String(20), default="markdown")  # "markdown" | "richtext"
    cover_image = db.Column(db.String(255), default="")
    status = db.Column(db.String(20), default="draft", index=True)  # "draft" | "published"
    visibility = db.Column(db.String(20), default="public", index=True)  # "public" | "logged_in" | "role" | "custom" | "unlisted"
    tags = db.Column(db.String(255), default="")  # Phân tách bởi dấu phẩy
    views = db.Column(db.Integer, default=0)
    reactions_json = db.Column(db.Text, default='{"fire": 0, "heart": 0, "idea": 0, "rocket": 0}')
    published_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    author = db.relationship("User", foreign_keys=[author_id], backref=db.backref("authored_posts", lazy="dynamic"))
    access_users = db.relationship("PostAccessUser", backref="post", cascade="all, delete-orphan", lazy="dynamic")
    access_roles = db.relationship("PostAccessRole", backref="post", cascade="all, delete-orphan", lazy="dynamic")
    excluded_users = db.relationship("PostExcludedUser", backref="post", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self, include_content: bool = True, include_access: bool = False):
        tags_list = [t.strip() for t in self.tags.split(",") if t.strip()] if self.tags else []
        word_count = len(self.content.split()) if self.content else 0
        reading_time = max(1, round(word_count / 200))
        
        data = {
            "id": self.id,
            "author_id": self.author_id,
            "author": {
                "id": self.author.id,
                "username": self.author.username,
                "display_name": self.author.display_name,
                "avatar_url": self.author.avatar_url
            } if self.author else None,
            "series_id": self.series_id,
            "series": {
                "id": self.series.id,
                "title": self.series.title,
                "slug": self.series.slug,
                "total_posts": self.series.posts.filter_by(status="published").count()
            } if self.series else None,
            "order_index": self.order_index,
            "lang": self.lang,
            "language": self.lang,
            "title": self.title,
            "slug": self.slug,
            "excerpt": self.excerpt,
            "content_type": self.content_type,
            "cover_image": self.cover_image,
            "thumbnail": self.cover_image,
            "status": self.status,
            "visibility": self.visibility or "public",
            "tags": tags_list,
            "views": self.views,
            "reactions": json.loads(self.reactions_json or '{"fire": 0, "heart": 0, "idea": 0, "rocket": 0}'),
            "reading_time": reading_time,
            "published_at": format_datetime_utc7(self.published_at),
            "created_at": format_datetime_utc7(self.created_at),
            "updated_at": format_datetime_utc7(self.updated_at)
        }
        if include_content:
            data["content"] = self.content

        if include_access:
            data["allowed_users"] = [
                {
                    "user_id": u.user_id,
                    "username": u.user.username if u.user else None,
                    "display_name": u.user.display_name if u.user else None,
                    "avatar_url": u.user.avatar_url if u.user else None
                }
                for u in self.access_users.all()
            ]
            data["allowed_roles"] = [r.role for r in self.access_roles.all()]
            data["excluded_users"] = [
                {
                    "user_id": u.user_id,
                    "username": u.user.username if u.user else None,
                    "display_name": u.user.display_name if u.user else None,
                    "avatar_url": u.user.avatar_url if u.user else None
                }
                for u in self.excluded_users.all()
            ]

        return data

class PostAccessUser(db.Model):
    __tablename__ = "post_access_users"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    granted_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])
    granter = db.relationship("User", foreign_keys=[granted_by])

class PostAccessRole(db.Model):
    __tablename__ = "post_access_roles"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    role = db.Column(db.String(50), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PostExcludedUser(db.Model):
    __tablename__ = "post_excluded_users"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])

class Video(db.Model):
    __tablename__ = "videos"
    
    id = db.Column(db.Integer, primary_key=True)
    slug = db.Column(db.String(255), unique=True, index=True, nullable=True)
    series_id = db.Column(db.Integer, db.ForeignKey("series.id"), nullable=True)
    order_index = db.Column(db.Integer, default=0)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default="")
    platform = db.Column(db.String(50), default="youtube")  # "youtube" | "vimeo" | "custom"
    video_url = db.Column(db.String(500), nullable=False)
    thumbnail_url = db.Column(db.String(500), default="")
    duration = db.Column(db.String(20), default="")  # e.g. "12:45"
    status = db.Column(db.String(20), default="published")  # "published" | "draft"
    language = db.Column(db.String(10), default="vi")  # "vi" | "en"
    featured = db.Column(db.Boolean, default=False)
    view_count = db.Column(db.Integer, default=0)
    chapters_json = db.Column(db.Text, default="[]")
    related_post_id = db.Column(db.Integer, nullable=True)
    category = db.Column(db.String(100), default="Lập trình")
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        import json
        try:
            chapters = json.loads(self.chapters_json or "[]")
        except Exception:
            chapters = []

        return {
            "id": self.id,
            "slug": self.slug or f"video-{self.id}",
            "series_id": self.series_id,
            "order_index": self.order_index,
            "title": self.title,
            "description": self.description,
            "platform": self.platform,
            "video_url": self.video_url,
            "thumbnail_url": self.thumbnail_url,
            "duration": self.duration or "",
            "status": self.status or "published",
            "language": self.language or "vi",
            "featured": bool(self.featured),
            "view_count": self.view_count or 0,
            "chapters": chapters,
            "related_post_id": self.related_post_id,
            "category": self.category,
            "sort_order": self.sort_order,
            "created_at": format_datetime_utc7(self.created_at)
        }

class Project(db.Model):
    __tablename__ = "projects"
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    image_url = db.Column(db.String(500), default="")
    demo_link = db.Column(db.String(500), default="")
    github_link = db.Column(db.String(500), default="")
    show_demo = db.Column(db.Boolean, default=True)
    show_github = db.Column(db.Boolean, default=True)
    tech_stack = db.Column(db.String(255), default="")  # Phân tách bởi dấu phẩy
    is_featured = db.Column(db.Boolean, default=False, index=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self, is_admin: bool = False):
        # DevTools & security protection: do not leak raw links if author has disabled visibility
        demo = self.demo_link if (is_admin or self.show_demo) else ""
        github = self.github_link if (is_admin or self.show_github) else ""

        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "image_url": self.image_url,
            "demo_link": demo,
            "github_link": github,
            "show_demo": self.show_demo if self.show_demo is not None else True,
            "show_github": self.show_github if self.show_github is not None else True,
            "tech_stack": [t.strip() for t in self.tech_stack.split(",") if t.strip()] if self.tech_stack else [],
            "is_featured": self.is_featured,
            "sort_order": self.sort_order,
            "created_at": format_datetime_utc7(self.created_at),
            "updated_at": format_datetime_utc7(self.updated_at)
        }
        return data

class Certificate(db.Model):
    __tablename__ = "certificates"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    issuer = db.Column(db.String(255), nullable=False)  # Ví dụ: Cloud Native Computing Foundation / Linux Foundation
    issue_date = db.Column(db.String(100), default="")
    credential_id = db.Column(db.String(150), default="")
    credential_url = db.Column(db.String(500), default="")
    image_url = db.Column(db.String(500), default="")
    pdf_url = db.Column(db.String(500), default="")
    description = db.Column(db.Text, default="")
    skills = db.Column(db.String(255), default="")  # Kubernetes, Docker, Linux, v.v.
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "issuer": self.issuer,
            "issue_date": self.issue_date,
            "credential_id": self.credential_id,
            "credential_url": self.credential_url,
            "image_url": self.image_url,
            "pdf_url": self.pdf_url,
            "description": self.description,
            "skills": [s.strip() for s in self.skills.split(",") if s.strip()] if self.skills else [],
            "sort_order": self.sort_order,
            "created_at": format_datetime_utc7(self.created_at)
        }

class Album(db.Model):
    __tablename__ = "albums"
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, default="")
    cover_image = db.Column(db.String(500), default="")
    event_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    photos = db.relationship("AlbumPhoto", backref="album", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self, include_photos: bool = False):
        res = {
            "id": self.id,
            "title": self.title,
            "slug": self.slug,
            "description": self.description,
            "cover_image": self.cover_image,
            "photo_count": self.photos.count(),
            "event_date": format_datetime_utc7(self.event_date),
            "created_at": format_datetime_utc7(self.created_at),
            "preview_photos": [p.photo_url for p in self.photos.order_by(AlbumPhoto.sort_order.asc()).limit(4)]
        }
        if include_photos:
            res["photos"] = [p.to_dict() for p in self.photos.order_by(AlbumPhoto.sort_order.asc())]
        return res

class AlbumPhoto(db.Model):
    __tablename__ = "album_photos"
    
    id = db.Column(db.Integer, primary_key=True)
    album_id = db.Column(db.Integer, db.ForeignKey("albums.id"), nullable=False)
    photo_url = db.Column(db.String(500), nullable=False)
    caption = db.Column(db.String(255), default="")
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "album_id": self.album_id,
            "photo_url": self.photo_url,
            "caption": self.caption,
            "sort_order": self.sort_order,
            "created_at": format_datetime_utc7(self.created_at)
        }

class Media(db.Model):
    __tablename__ = "media"
    
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    file_url = db.Column(db.String(500), nullable=False)
    watermark_url = db.Column(db.String(500), default="")
    file_type = db.Column(db.String(50), default="image")
    file_size = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "file_url": self.file_url,
            "watermark_url": self.watermark_url,
            "url": self.watermark_url or self.file_url,
            "file_type": self.file_type,
            "file_size": self.file_size,
            "created_at": format_datetime_utc7(self.created_at)
        }

class Message(db.Model):
    __tablename__ = "messages"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    recipient_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(200), default="")
    category = db.Column(db.String(50), default="general") # 'general' | 'project' | 'question' | 'feedback' | 'bug'
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="new", index=True) # 'new' | 'read' | 'replied' | 'spam' | 'archived' | 'closed'
    is_read = db.Column(db.Boolean, default=False, index=True)
    is_starred = db.Column(db.Boolean, default=False, index=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    is_closed = db.Column(db.Boolean, default=False, index=True)
    user_can_reopen = db.Column(db.Boolean, default=True)
    closed_at = db.Column(db.DateTime, nullable=True)
    last_reply_at = db.Column(db.DateTime, nullable=True)
    ip_address = db.Column(db.String(50), default="")
    user_agent = db.Column(db.String(255), default="")
    device_type = db.Column(db.String(50), default="")
    read_at = db.Column(db.DateTime, nullable=True)
    replied_at = db.Column(db.DateTime, nullable=True)
    deleted_at = db.Column(db.DateTime, nullable=True)
    attachments = db.Column(db.Text, default="[]") # JSON list các file / ảnh đính kèm ban đầu
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", foreign_keys=[user_id])
    sender = db.relationship("User", foreign_keys=[sender_id])
    recipient = db.relationship("User", foreign_keys=[recipient_id])
    assignee = db.relationship("User", foreign_keys=[assigned_to])
    replies = db.relationship("MessageReply", backref="message", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self, is_admin=False):
        # Thông tin user chi tiết nếu là admin xem (tránh subquery count N+1)
        user_info = None
        target_u = self.user or self.sender or self.recipient
        if is_admin and target_u:
            user_info = {
                "id": target_u.id,
                "username": target_u.username,
                "display_name": target_u.display_name or target_u.username,
                "email": target_u.email,
                "avatar_url": target_u.avatar_url or "",
                "role": target_u.role,
                "is_active": getattr(target_u, "is_active", True),
                "created_at": format_datetime_utc7(target_u.created_at)
            }

        # Lọc replies: user bình thường không thấy internal notes
        rep_query = self.replies.order_by(MessageReply.sent_at.asc())
        if not is_admin:
            rep_query = rep_query.filter(MessageReply.is_internal == False)

        sender_info = None
        if self.sender:
            sender_info = {
                "id": self.sender.id,
                "username": self.sender.username,
                "display_name": self.sender.display_name or self.sender.username,
                "role": self.sender.role
            }

        recipient_info = None
        if self.recipient:
            recipient_info = {
                "id": self.recipient.id,
                "username": self.recipient.username,
                "display_name": self.recipient.display_name or self.recipient.username,
                "role": self.recipient.role
            }

        parsed_attachments = []
        try:
            parsed_attachments = json.loads(self.attachments or "[]")
        except Exception:
            parsed_attachments = []

        return {
            "id": self.id,
            "user_id": self.user_id,
            "sender_id": self.sender_id,
            "recipient_id": self.recipient_id,
            "sender_info": sender_info,
            "recipient_info": recipient_info,
            "name": self.name,
            "email": self.email,
            "subject": self.subject,
            "category": self.category or "general",
            "message": self.message,
            "attachments": parsed_attachments,
            "status": "closed" if self.is_closed else (self.status or ("read" if self.is_read else "new")),
            "is_read": bool(self.is_read),
            "is_starred": bool(self.is_starred),
            "is_closed": bool(self.is_closed),
            "user_can_reopen": bool(self.user_can_reopen),
            "closed_at": format_datetime_utc7(self.closed_at),
            "last_reply_at": format_datetime_utc7(self.last_reply_at or self.replied_at),
            "assigned_to": self.assigned_to,
            "assignee_name": (self.assignee.display_name or self.assignee.username) if self.assignee else None,
            "ip_address": self.ip_address or "",
            "device_type": self.device_type or "Desktop",
            "user_agent": self.user_agent or "",
            "read_at": format_datetime_utc7(self.read_at),
            "replied_at": format_datetime_utc7(self.replied_at),
            "created_at": format_datetime_utc7(self.created_at),
            "user_info": user_info,
            "replies": [r.to_dict() for r in rep_query.all()]
        }

class MessageReply(db.Model):
    __tablename__ = "message_replies"

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey("messages.id"), nullable=False, index=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    sender_type = db.Column(db.String(20), default="admin") # 'admin' | 'user'
    is_internal = db.Column(db.Boolean, default=False, index=True) # Ghi chú nội bộ
    attachments = db.Column(db.Text, default="[]") # JSON list các file đính kèm
    reply_content = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)

    admin = db.relationship("User", foreign_keys=[admin_id])
    user = db.relationship("User", foreign_keys=[user_id])

    def to_dict(self):
        sender_name = "Admin"
        avatar_url = ""
        actual_sender = self.user if self.sender_type == "user" else self.admin
        if actual_sender:
            sender_name = actual_sender.display_name or actual_sender.username
            avatar_url = actual_sender.avatar_url or ""
        elif self.user:
            sender_name = self.user.display_name or self.user.username
            avatar_url = self.user.avatar_url or ""
        elif self.admin:
            sender_name = self.admin.display_name or self.admin.username
            avatar_url = self.admin.avatar_url or ""

        parsed_attachments = []
        try:
            parsed_attachments = json.loads(self.attachments or "[]")
        except Exception:
            parsed_attachments = []

        return {
            "id": self.id,
            "message_id": self.message_id,
            "admin_id": self.admin_id,
            "user_id": self.user_id,
            "sender_type": self.sender_type or ("user" if self.user_id and not self.admin_id else "admin"),
            "sender_name": sender_name,
            "avatar_url": avatar_url,
            "is_internal": bool(self.is_internal),
            "attachments": parsed_attachments,
            "reply_content": self.reply_content,
            "sent_at": format_datetime_utc7(self.sent_at)
        }

class ReadingHistory(db.Model):
    __tablename__ = "reading_history"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False, index=True)
    viewed_at = db.Column(db.DateTime, default=datetime.utcnow)

    post = db.relationship("Post")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "post_id": self.post_id,
            "viewed_at": format_datetime_utc7(self.viewed_at),
            "post": self.post.to_dict(include_content=False) if self.post else None
        }

class LikedPost(db.Model):
    __tablename__ = "liked_posts"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False, index=True)
    liked_at = db.Column(db.DateTime, default=datetime.utcnow)

    post = db.relationship("Post")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "post_id": self.post_id,
            "liked_at": format_datetime_utc7(self.liked_at),
            "created_at": format_datetime_utc7(self.liked_at),
            "post": self.post.to_dict(include_content=False) if self.post else None
        }

class SavedPost(db.Model):
    __tablename__ = "saved_posts"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False, index=True)
    saved_at = db.Column(db.DateTime, default=datetime.utcnow)

    post = db.relationship("Post")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "post_id": self.post_id,
            "saved_at": format_datetime_utc7(self.saved_at),
            "created_at": format_datetime_utc7(self.saved_at),
            "post": self.post.to_dict(include_content=False) if self.post else None
        }

class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("posts.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    parent_id = db.Column(db.Integer, db.ForeignKey("comments.id"), nullable=True, index=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("comments", lazy="dynamic"))
    post = db.relationship("Post", backref=db.backref("comments", lazy="dynamic", cascade="all, delete-orphan"))
    replies = db.relationship("Comment", backref=db.backref("parent", remote_side=[id]), cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self, include_replies: bool = True):
        data = {
            "id": self.id,
            "post_id": self.post_id,
            "user_id": self.user_id,
            "parent_id": self.parent_id,
            "content": self.content,
            "author": {
                "id": self.user.id,
                "username": self.user.username,
                "role": self.user.role
            } if self.user else None,
            "created_at": format_datetime_utc7(self.created_at),
            "updated_at": format_datetime_utc7(self.updated_at)
        }
        if include_replies:
            data["replies"] = [r.to_dict(include_replies=False) for r in self.replies.order_by(Comment.created_at.asc()).all()]
        return data

class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True, index=True)
    username = db.Column(db.String(80), default="", index=True)
    action = db.Column(db.String(120), nullable=False)
    feature = db.Column(db.String(80), nullable=False, index=True)  # "Xác thực", "Quản trị người dùng", "Quản lý bài viết", ...
    status = db.Column(db.String(20), nullable=False, index=True)   # "success" | "failed"
    failure_reason = db.Column(db.Text, default="")
    target_type = db.Column(db.String(50), default="")
    target_id = db.Column(db.String(50), default="")
    target_name = db.Column(db.String(150), default="")
    details_json = db.Column(db.Text, default="{}")
    ip_address = db.Column(db.String(45), default="", index=True)
    user_agent = db.Column(db.String(255), default="")
    device_type = db.Column(db.String(30), default="Unknown")
    os_name = db.Column(db.String(50), default="Unknown")
    browser_name = db.Column(db.String(50), default="Unknown")
    is_bot = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        try:
            details = json.loads(self.details_json or "{}")
        except Exception:
            details = {}

        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.username or "Ẩn danh",
            "action": self.action,
            "feature": self.feature,
            "status": self.status,
            "failure_reason": self.failure_reason or "",
            "target_type": self.target_type or "",
            "target_id": self.target_id or "",
            "target_name": self.target_name or "",
            "details": details,
            "ip_address": self.ip_address or "127.0.0.1",
            "user_agent": self.user_agent or "",
            "device_type": self.device_type or "Unknown",
            "os_name": self.os_name or "Unknown",
            "browser_name": self.browser_name or "Unknown",
            "is_bot": bool(self.is_bot),
            "created_at": format_datetime_utc7(self.created_at)
        }

class SeriesItem(db.Model):
    __tablename__ = "series_items"

    id = db.Column(db.Integer, primary_key=True)
    series_id = db.Column(db.Integer, db.ForeignKey("series.id"), nullable=False, index=True)
    item_type = db.Column(db.String(20), nullable=False)  # 'post' | 'video' | 'placeholder'
    item_id = db.Column(db.Integer, nullable=True)        # Post.id hoặc Video.id
    position = db.Column(db.Integer, default=1, nullable=False)
    section_title = db.Column(db.String(150), default="")
    title_override = db.Column(db.String(255), default="")
    note = db.Column(db.Text, default="")
    duration = db.Column(db.String(30), default="")
    is_required = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships linh hoạt
    post = db.relationship("Post", primaryjoin="and_(SeriesItem.item_type=='post', foreign(SeriesItem.item_id)==Post.id)", uselist=False, viewonly=True)
    video = db.relationship("Video", primaryjoin="and_(SeriesItem.item_type=='video', foreign(SeriesItem.item_id)==Video.id)", uselist=False, viewonly=True)

    def to_dict(self):
        title = self.title_override
        slug = ""
        duration = self.duration
        thumbnail_url = ""
        status = "published"

        if self.item_type == "post" and self.post:
            title = self.title_override or self.post.title
            slug = self.post.slug
            status = self.post.status
            thumbnail_url = self.post.cover_image or ""
            word_count = len(self.post.content.split()) if self.post.content else 0
            read_mins = max(1, round(word_count / 200))
            duration = f"{read_mins} phút đọc"
        elif self.item_type == "video" and self.video:
            title = self.title_override or self.video.title
            slug = self.video.slug
            status = self.video.status
            thumbnail_url = self.video.thumbnail_url or ""
            duration = self.video.duration or "Video"
        elif self.item_type == "placeholder":
            status = "upcoming"
            duration = self.duration or "Sắp ra mắt"

        return {
            "id": self.id,
            "series_id": self.series_id,
            "item_type": self.item_type,
            "item_id": self.item_id,
            "position": self.position,
            "section_title": self.section_title or "",
            "title": title or f"Mục {self.position}",
            "slug": slug,
            "duration": duration,
            "thumbnail_url": thumbnail_url,
            "status": status,
            "note": self.note or "",
            "is_required": bool(self.is_required)
        }

class SeriesProgress(db.Model):
    __tablename__ = "series_progress"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    series_id = db.Column(db.Integer, db.ForeignKey("series.id"), nullable=False, index=True)
    item_id = db.Column(db.Integer, nullable=True)
    item_type = db.Column(db.String(20), default="post")
    status = db.Column(db.String(20), default="completed")  # 'completed'
    percent = db.Column(db.Integer, default=100)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "series_id": self.series_id,
            "item_id": self.item_id,
            "item_type": self.item_type,
            "status": self.status,
            "percent": self.percent,
            "completed_at": format_datetime_utc7(self.completed_at)
        }

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True) # None = Admin broadcast
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default="info") # 'contact' | 'post' | 'security' | 'system'
    dedupe_key = db.Column(db.String(100), nullable=True, index=True) # conversation_id + type
    link = db.Column(db.String(500), default="")
    is_read = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("notifications", cascade="all, delete-orphan", lazy="dynamic"))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "dedupe_key": self.dedupe_key,
            "link": self.link,
            "is_read": bool(self.is_read),
            "created_at": format_datetime_utc7(self.created_at)
        }

class CycleSetting(db.Model):
    __tablename__ = "cycle_settings"

    id = db.Column(db.Integer, primary_key=True)
    pin_hash = db.Column(db.String(255), nullable=True) # Mã PIN bảo vệ (mặc định '123456')
    partner_name = db.Column(db.String(100), default="Em Bé") # Tên người yêu
    cycle_length = db.Column(db.Integer, default=28) # Độ dài chu kỳ (thường 28 ngày)
    period_length = db.Column(db.Integer, default=5) # Số ngày hành kinh (thường 4-7 ngày)
    last_period_date = db.Column(db.Date, nullable=True) # Ngày bắt đầu kỳ kinh gần nhất (YYYY-MM-DD)
    notes = db.Column(db.Text, default="") # Ghi chú cá nhân
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_pin(self, pin: str):
        self.pin_hash = generate_password_hash(str(pin).strip())

    def check_pin(self, pin: str) -> bool:
        if not self.pin_hash:
            # Nếu chưa đổi PIN, PIN mặc định là 123456
            return str(pin).strip() == "123456"
        return check_password_hash(self.pin_hash, str(pin).strip())

    def to_dict(self):
        return {
            "partner_name": self.partner_name or "Em Bé",
            "cycle_length": self.cycle_length or 28,
            "period_length": self.period_length or 5,
            "last_period_date": self.last_period_date.isoformat() if self.last_period_date else None,
            "notes": self.notes or "",
            "updated_at": format_datetime_utc7(self.updated_at)
        }
