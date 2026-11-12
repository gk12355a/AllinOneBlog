import os
import uuid
import cloudinary
import cloudinary.uploader
from PIL import Image, ImageDraw, ImageFont
from werkzeug.utils import secure_filename
from flask import current_app

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}

class WatermarkService:
    """Service xử lý upload ảnh và tự động đóng dấu bản quyền Watermark bằng Pillow (Hỗ trợ Local & Cloudinary Hybrid)."""
    
    @staticmethod
    def allowed_file(filename: str) -> bool:
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

    @staticmethod
    def _is_cloudinary_configured() -> bool:
        cloud_name = current_app.config.get('CLOUDINARY_CLOUD_NAME')
        api_key = current_app.config.get('CLOUDINARY_API_KEY')
        api_secret = current_app.config.get('CLOUDINARY_API_SECRET')
        return bool(cloud_name and api_key and api_secret)
        
    @staticmethod
    def process_and_save_image(file_storage, custom_text: str = None) -> tuple[str, str, int]:
        """
        Lưu ảnh gốc và sinh ảnh đã đóng dấu Watermark tinh tế ở góc phải dưới.
        Nếu có cấu hình Cloudinary trong .env, sẽ tự động upload ảnh lên Cloudinary CDN.
        Trả về: (file_url, watermark_url, file_size)
        """
        filename = secure_filename(file_storage.filename)
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'jpg'
        unique_name = f"{uuid.uuid4().hex}.{ext}"
        watermark_name = f"wm_{unique_name}"
        
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        
        raw_path = os.path.join(upload_folder, unique_name)
        wm_path = os.path.join(upload_folder, watermark_name)
        
        # Lưu file gốc tạm thời để xử lý watermark
        file_storage.save(raw_path)
        file_size = os.path.getsize(raw_path)
        
        text = custom_text or current_app.config.get('WATERMARK_TEXT', '© allinoneblog.dev')
        
        try:
            with Image.open(raw_path).convert("RGBA") as base:
                # Tạo lớp phủ trong suốt cho watermark
                txt_layer = Image.new("RGBA", base.size, (255, 255, 255, 0))
                draw = ImageDraw.Draw(txt_layer)
                
                # Ước lượng kích thước font theo chiều ngang của ảnh
                font_size = max(14, int(base.size[0] / 35))
                try:
                    font = ImageFont.truetype("arial.ttf", font_size)
                except Exception:
                    font = ImageFont.load_default()
                    
                # Tính toạ độ góc dưới bên phải (cách lề 20px)
                bbox = draw.textbbox((0, 0), text, font=font)
                textwidth = bbox[2] - bbox[0]
                textheight = bbox[3] - bbox[1]
                
                margin = 20
                x = base.size[0] - textwidth - margin
                y = base.size[1] - textheight - margin
                
                # Vẽ bóng mờ và chữ watermark trắng với độ trong suốt 170/255
                draw.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, 100))
                draw.text((x, y), text, font=font, fill=(255, 255, 255, 170))
                
                # Hợp nhất ảnh và lưu
                out = Image.alpha_composite(base, txt_layer)
                if ext in ['jpg', 'jpeg']:
                    out = out.convert("RGB")
                    out.save(wm_path, "JPEG", quality=90)
                else:
                    out.save(wm_path, "PNG")
                    
            wm_url = f"/api/uploads/{watermark_name}"
        except Exception:
            wm_url = f"/api/uploads/{unique_name}"
            
        file_url = f"/api/uploads/{unique_name}"

        # Kiểm tra nếu có Cloudinary cấu hình -> Upload thẳng lên Cloudinary CDN
        if WatermarkService._is_cloudinary_configured():
            try:
                cloudinary.config(
                    cloud_name=current_app.config.get('CLOUDINARY_CLOUD_NAME'),
                    api_key=current_app.config.get('CLOUDINARY_API_KEY'),
                    api_secret=current_app.config.get('CLOUDINARY_API_SECRET'),
                    secure=True
                )
                # Upload ảnh đã watermark lên Cloudinary
                upload_target = wm_path if os.path.exists(wm_path) else raw_path
                res = cloudinary.uploader.upload(upload_target, folder="allinoneblog")
                cloud_url = res.get("secure_url")
                if cloud_url:
                    wm_url = cloud_url
                    file_url = cloud_url
            except Exception as e:
                # Nếu upload Cloudinary lỗi -> tự động fallback về link local an toàn
                print(f"[Cloudinary Warning] Upload failed, falling back to local: {e}")

        return file_url, wm_url, file_size
