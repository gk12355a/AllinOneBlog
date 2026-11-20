import os
from flask import Blueprint, request, send_from_directory, current_app
from flask_jwt_extended import jwt_required
from app.extensions import db, limiter
from app.models import Media, Album, AlbumPhoto
from app.services.watermark_service import WatermarkService
from app.utils.helpers import api_response, admin_required, generate_slug

media_bp = Blueprint("media", __name__)

@media_bp.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename: str):
    """Phục vụ file ảnh/tài liệu tĩnh đã tải lên."""
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)

@media_bp.route("/admin/media/upload", methods=["POST"])
@admin_required()
def upload_media():
    if "file" not in request.files:
        return api_response(success=False, message="No file part in request.", status_code=400)
    file = request.files["file"]
    if file.filename == "":
        return api_response(success=False, message="No selected file.", status_code=400)

    if not WatermarkService.allowed_file(file.filename):
        return api_response(success=False, message="File extension not allowed.", status_code=400)

    file_url, wm_url, file_size = WatermarkService.process_and_save_image(file)

    media = Media(
        filename=file.filename,
        file_url=file_url,
        watermark_url=wm_url,
        file_type="image",
        file_size=file_size
    )
    db.session.add(media)
    db.session.commit()

    return api_response(success=True, data=media.to_dict(), message="File uploaded and watermarked successfully.", status_code=201)

@media_bp.route("/media/upload", methods=["POST"])
@jwt_required()
@limiter.limit("20 per minute")
def upload_user_media():
    """Endpoint cho phép người dùng đã đăng nhập upload ảnh đính kèm vào bình luận."""
    if "file" not in request.files:
        return api_response(success=False, message="No file part in request.", status_code=400)
    file = request.files["file"]
    if file.filename == "":
        return api_response(success=False, message="No selected file.", status_code=400)

    if not WatermarkService.allowed_file(file.filename):
        return api_response(success=False, message="Định dạng ảnh không được hỗ trợ (chỉ chấp nhận png, jpg, jpeg, webp, gif).", status_code=400)

    # Đóng dấu bản quyền nhẹ và lưu trữ an toàn
    file_url, wm_url, file_size = WatermarkService.process_and_save_image(file)

    media = Media(
        filename=file.filename,
        file_url=file_url,
        watermark_url=wm_url,
        file_type="image",
        file_size=file_size
    )
    db.session.add(media)
    db.session.commit()

    # Trả về URL để nhúng trực tiếp vào bình luận hoặc cập nhật avatar
    image_url = wm_url if wm_url else file_url
    return api_response(
        success=True, 
        data={
            "url": image_url, 
            "file_url": image_url,
            "filename": file.filename,
            "file_type": "image",
            "file_size": file_size
        }, 
        message="Tải ảnh lên thành công.", 
        status_code=201
    )

@media_bp.route("/chat/upload", methods=["POST"])
@jwt_required()
@limiter.limit("30 per minute")
def upload_chat_attachment():
    """
    Endpoint upload file / hình ảnh đính kèm trong hội thoại chat (Tin nhắn liên hệ).
    Hỗ trợ cả ảnh (jpg, png, webp, gif) và tài liệu (pdf, doc, docx, txt, zip, rar, xls, xlsx).
    """
    import uuid
    from werkzeug.utils import secure_filename

    if "file" not in request.files:
        return api_response(success=False, message="Vui lòng chọn file cần gửi.", status_code=400)
    file = request.files["file"]
    if not file or file.filename == "":
        return api_response(success=False, message="File không hợp lệ.", status_code=400)

    filename = secure_filename(file.filename) or f"file_{uuid.uuid4().hex[:8]}"
    ext = filename.rsplit(".", 1)[1].lower() if "." in filename else ""

    ALLOWED_CHAT_EXTS = {
        "png", "jpg", "jpeg", "webp", "gif", "svg",
        "pdf", "doc", "docx", "xls", "xlsx", "txt", "zip", "rar", "tar", "gz"
    }

    if ext not in ALLOWED_CHAT_EXTS:
        return api_response(
            success=False, 
            message=f"Định dạng .{ext} không được hỗ trợ. Chỉ chấp nhận ảnh và tài liệu văn phòng phổ biến (PDF, Word, Excel, ZIP...).", 
            status_code=400
        )

    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)

    is_image = ext in {"png", "jpg", "jpeg", "webp", "gif"}
    unique_name = f"chat_{uuid.uuid4().hex[:12]}_{filename}"
    file_path = os.path.join(upload_folder, unique_name)

    file.save(file_path)
    file_size = os.path.getsize(file_path)

    # Giới hạn kích thước file 15MB
    if file_size > 15 * 1024 * 1024:
        if os.path.exists(file_path):
            os.remove(file_path)
        return api_response(success=False, message="Kích thước file vượt quá 15MB.", status_code=400)

    file_url = f"/api/uploads/{unique_name}"

    media = Media(
        filename=filename,
        file_url=file_url,
        watermark_url=file_url,
        file_type="image" if is_image else "document",
        file_size=file_size
    )
    db.session.add(media)
    db.session.commit()

    return api_response(
        success=True,
        data={
            "url": file_url,
            "filename": filename,
            "file_type": "image" if is_image else "document",
            "file_size": file_size,
            "ext": ext
        },
        message="Tải lên tệp đính kèm thành công.",
        status_code=201
    )

@media_bp.route("/admin/media", methods=["GET"])
@admin_required()
def list_media():
    media_list = Media.query.order_by(Media.created_at.desc()).all()
    return api_response(success=True, data=[m.to_dict() for m in media_list])

@media_bp.route("/admin/media/<int:media_id>", methods=["DELETE"])
@admin_required()
def delete_media(media_id: int):
    media = Media.query.get(media_id)
    if not media:
        return api_response(success=False, message="Media not found.", status_code=404)

    # Xóa file vật lý nếu có
    upload_folder = current_app.config['UPLOAD_FOLDER']
    try:
        raw_name = media.file_url.split("/")[-1]
        raw_path = os.path.join(upload_folder, raw_name)
        if os.path.exists(raw_path):
            os.remove(raw_path)

        if media.watermark_url:
            wm_name = media.watermark_url.split("/")[-1]
            wm_path = os.path.join(upload_folder, wm_name)
            if os.path.exists(wm_path):
                os.remove(wm_path)
    except Exception:
        pass

    db.session.delete(media)
    db.session.commit()
    return api_response(success=True, message="Media deleted successfully.")

# --- ALBUMS (PHOTO GALLERY) ---

@media_bp.route("/albums", methods=["GET"])
def get_albums():
    albums = Album.query.order_by(Album.created_at.desc()).all()
    return api_response(success=True, data=[a.to_dict(include_photos=False) for a in albums])

@media_bp.route("/albums/<string:slug>", methods=["GET"])
def get_album_detail(slug: str):
    album = Album.query.filter_by(slug=slug).first()
    if not album:
        return api_response(success=False, message="Album not found.", status_code=404)
    data = album.to_dict(include_photos=True)

    prev_album = Album.query.filter(Album.created_at < album.created_at).order_by(Album.created_at.desc()).first()
    next_album = Album.query.filter(Album.created_at > album.created_at).order_by(Album.created_at.asc()).first()
    data["prev_album"] = {
        "title": prev_album.title,
        "slug": prev_album.slug,
        "cover_image": prev_album.cover_image,
        "photo_count": prev_album.photos.count()
    } if prev_album else None
    data["next_album"] = {
        "title": next_album.title,
        "slug": next_album.slug,
        "cover_image": next_album.cover_image,
        "photo_count": next_album.photos.count()
    } if next_album else None

    return api_response(success=True, data=data)

@media_bp.route("/admin/albums", methods=["POST"])
@admin_required()
def create_album():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    if not title:
        return api_response(success=False, message="Album title is required.", status_code=400)

    slug = data.get("slug", "").strip() or generate_slug(title)
    if Album.query.filter_by(slug=slug).first():
        return api_response(success=False, message="Album slug already exists.", status_code=409)

    album = Album(
        title=title,
        slug=slug,
        description=data.get("description", "").strip(),
        cover_image=data.get("cover_image", "").strip()
    )
    db.session.add(album)
    db.session.commit()

    return api_response(success=True, data=album.to_dict(include_photos=False), message="Album created successfully.", status_code=201)

@media_bp.route("/admin/albums/<int:album_id>", methods=["PUT"])
@admin_required()
def update_album(album_id: int):
    album = Album.query.get(album_id)
    if not album:
        return api_response(success=False, message="Album not found.", status_code=404)

    data = request.get_json() or {}
    if "title" in data:
        album.title = data["title"].strip()
    if "description" in data:
        album.description = data["description"].strip()
    if "cover_image" in data:
        album.cover_image = data["cover_image"].strip()
    if "slug" in data and data["slug"].strip():
        new_slug = generate_slug(data["slug"].strip())
        if new_slug != album.slug and not Album.query.filter_by(slug=new_slug).first():
            album.slug = new_slug

    db.session.commit()
    return api_response(success=True, data=album.to_dict(include_photos=False), message="Album updated successfully.")

@media_bp.route("/admin/albums/<int:album_id>", methods=["DELETE"])
@admin_required()
def delete_album(album_id: int):
    album = Album.query.get(album_id)
    if not album:
        return api_response(success=False, message="Album not found.", status_code=404)

    db.session.delete(album)
    db.session.commit()
    return api_response(success=True, message="Album deleted successfully.")

@media_bp.route("/admin/albums/<int:album_id>/photos", methods=["POST"])
@admin_required()
def add_photo_to_album(album_id: int):
    album = Album.query.get(album_id)
    if not album:
        return api_response(success=False, message="Album not found.", status_code=404)

    if "file" not in request.files:
        return api_response(success=False, message="No file attached.", status_code=400)
    file = request.files["file"]
    caption = request.form.get("caption", "").strip()
    apply_watermark = request.form.get("apply_watermark", "true").lower() in ["true", "1"]

    file_url, wm_url, _ = WatermarkService.process_and_save_image(file)
    selected_url = wm_url if (apply_watermark and wm_url) else file_url

    photo = AlbumPhoto(
        album_id=album.id,
        photo_url=selected_url,
        caption=caption,
        sort_order=album.photos.count() + 1
    )
    db.session.add(photo)
    db.session.commit()

    return api_response(success=True, data=photo.to_dict(), message="Photo added to album.", status_code=201)

@media_bp.route("/admin/photos/<int:photo_id>", methods=["DELETE"])
@admin_required()
def delete_album_photo(photo_id: int):
    photo = AlbumPhoto.query.get(photo_id)
    if not photo:
        return api_response(success=False, message="Photo not found.", status_code=404)

    db.session.delete(photo)
    db.session.commit()
    return api_response(success=True, message="Photo removed from album.")
