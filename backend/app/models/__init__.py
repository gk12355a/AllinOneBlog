import json
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

class User(db.Model):
    __tablename__ = "users"
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user", nullable=False)  # "admin" | "user"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    history = db.relationship("ReadingHistory", backref="user", cascade="all, delete-orphan", lazy="dynamic")
    likes = db.relationship("LikedPost", backref="user", cascade="all, delete-orphan", lazy="dynamic")
    bookmarks = db.relationship("SavedPost", backref="user", cascade="all, delete-orphan", lazy="dynamic")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None
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
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

class Series(db.Model):
    __tablename__ = "series"
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, default="")
    cover_image = db.Column(db.String(255), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    posts = db.relationship("Post", backref="series", lazy="dynamic")
    videos = db.relationship("Video", backref="series", lazy="dynamic")

    def to_dict(self, include_items: bool = False):
        res = {
            "id": self.id,
            "title": self.title,
            "slug": self.slug,
            "description": self.description,
            "cover_image": self.cover_image,
            "total_posts": self.posts.filter_by(status="published").count(),
            "total_videos": self.videos.count(),
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
        if include_items:
            res["posts"] = [p.to_dict(include_content=False) for p in self.posts.filter_by(status="published").order_by(Post.order_index.asc())]
            res["videos"] = [v.to_dict() for v in self.videos.order_by(Video.order_index.asc())]
        return res

class Post(db.Model):
    __tablename__ = "posts"
    
    id = db.Column(db.Integer, primary_key=True)
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
    tags = db.Column(db.String(255), default="")  # Phân tách bởi dấu phẩy
    views = db.Column(db.Integer, default=0)
    reactions_json = db.Column(db.Text, default='{"fire": 0, "heart": 0, "idea": 0, "rocket": 0}')
    published_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self, include_content: bool = True):
        tags_list = [t.strip() for t in self.tags.split(",") if t.strip()] if self.tags else []
        word_count = len(self.content.split()) if self.content else 0
        reading_time = max(1, round(word_count / 200))
        
        data = {
            "id": self.id,
            "series_id": self.series_id,
            "order_index": self.order_index,
            "lang": self.lang,
            "title": self.title,
            "slug": self.slug,
            "excerpt": self.excerpt,
            "content_type": self.content_type,
            "cover_image": self.cover_image,
            "status": self.status,
            "tags": tags_list,
            "views": self.views,
            "reactions": json.loads(self.reactions_json or '{"fire": 0, "heart": 0, "idea": 0, "rocket": 0}'),
            "reading_time": reading_time,
            "published_at": self.published_at.isoformat() if self.published_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        if include_content:
            data["content"] = self.content
        return data

class Video(db.Model):
    __tablename__ = "videos"
    
    id = db.Column(db.Integer, primary_key=True)
    series_id = db.Column(db.Integer, db.ForeignKey("series.id"), nullable=True)
    order_index = db.Column(db.Integer, default=0)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default="")
    platform = db.Column(db.String(50), default="youtube")  # "youtube" | "vimeo" | "custom"
    video_url = db.Column(db.String(500), nullable=False)
    thumbnail_url = db.Column(db.String(500), default="")
    category = db.Column(db.String(100), default="Lập trình")
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "series_id": self.series_id,
            "order_index": self.order_index,
            "title": self.title,
            "description": self.description,
            "platform": self.platform,
            "video_url": self.video_url,
            "thumbnail_url": self.thumbnail_url,
            "category": self.category,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Project(db.Model):
    __tablename__ = "projects"
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default="")
    image_url = db.Column(db.String(500), default="")
    demo_link = db.Column(db.String(500), default="")
    github_link = db.Column(db.String(500), default="")
    tech_stack = db.Column(db.String(255), default="")  # Phân tách bởi dấu phẩy
    is_featured = db.Column(db.Boolean, default=False, index=True)
    sort_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "image_url": self.image_url,
            "demo_link": self.demo_link,
            "github_link": self.github_link,
            "tech_stack": [t.strip() for t in self.tech_stack.split(",") if t.strip()] if self.tech_stack else [],
            "is_featured": self.is_featured,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

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
            "created_at": self.created_at.isoformat() if self.created_at else None
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
            "event_date": self.event_date.isoformat() if self.event_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
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
            "created_at": self.created_at.isoformat() if self.created_at else None
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
            "file_type": self.file_type,
            "file_size": self.file_size,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class Message(db.Model):
    __tablename__ = "messages"
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    subject = db.Column(db.String(200), default="")
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "subject": self.subject,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None
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
            "viewed_at": self.viewed_at.isoformat() if self.viewed_at else None,
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
            "liked_at": self.liked_at.isoformat() if self.liked_at else None,
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
            "saved_at": self.saved_at.isoformat() if self.saved_at else None,
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
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
        if include_replies:
            data["replies"] = [r.to_dict(include_replies=False) for r in self.replies.order_by(Comment.created_at.asc()).all()]
        return data
