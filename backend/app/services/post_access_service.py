from datetime import datetime
from flask import request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from sqlalchemy import or_, and_, exists
from app.models import Post, User, PostAccessUser, PostAccessRole, PostExcludedUser
from app.utils.helpers import api_response

def get_current_user_optional():
    """
    Lấy thông tin người dùng từ JWT (nếu có gửi kèm header Authorization).
    Nếu không có token, token hết hạn, sai hoặc user bị vô hiệu hóa -> Trả về None (coi như khách ẩn danh).
    Đặc biệt: Không raise exception hay trả 401 để đảm bảo Stealth Mode tuyệt đối.
    """
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if not user_id:
            return None
        user = User.query.get(int(user_id))
        if user and user.is_active:
            return user
        return None
    except Exception:
        return None

def visible_posts(user=None, base_query=None):
    """
    Single Source of Truth: Truy vấn lọc bài viết được phép xem.
    Áp dụng đồng bộ cho: Danh sách bài viết, Trang chủ, Spotlight Search, Tags, Series, RSS, Sitemap, Related posts.
    
    Quy tắc:
    1. status == 'published'
    2. Admin: Xem được tất cả.
    3. User thường / Khách:
       - visibility == 'public'
       - visibility == 'unlisted' (Chỉ xem được nếu biết link trực tiếp, KHÔNG xuất hiện trong danh sách)
       - visibility == 'logged_in' (khi user đã đăng nhập & active)
       - visibility == 'role' (khi role của user nằm trong post_access_roles)
       - visibility == 'custom' (khi user_id nằm trong post_access_users và chưa hết hạn)
       - author_id == user.id (tác giả luôn thấy bài của mình)
    """
    if base_query is None:
        q = Post.query.filter(Post.status == 'published')
    else:
        q = base_query.filter(Post.status == 'published')

    # Nếu là Admin: xem được toàn bộ
    if user and user.role == 'admin':
        return q

    now = datetime.utcnow()
    conds = [Post.visibility == 'public']

    if user and user.is_active:
        conds.append(Post.visibility == 'logged_in')
        
        # Check Role
        conds.append(and_(
            Post.visibility == 'role',
            exists().where(
                and_(
                    PostAccessRole.post_id == Post.id,
                    PostAccessRole.role == user.role
                )
            )
        ))

        # Check Whitelist User (kèm expires_at)
        conds.append(and_(
            Post.visibility == 'custom',
            exists().where(
                and_(
                    PostAccessUser.post_id == Post.id,
                    PostAccessUser.user_id == user.id,
                    or_(
                        PostAccessUser.expires_at == None,
                        PostAccessUser.expires_at > now
                    )
                )
            )
        ))

        # Tác giả bài viết
        conds.append(Post.author_id == user.id)

    # Note: 'unlisted' không bao giờ xuất hiện trong query danh sách chung visible_posts
    filtered_q = q.filter(or_(*conds))

    # LOẠI TRỪ (EXCLUDE) CHO NGƯỜI DÙNG:
    # 1. Nếu khách chưa đăng nhập / chưa có tài khoản: loại bỏ các bài có danh sách exclude (yêu cầu tài khoản để xét)
    # 2. Nếu đã đăng nhập: loại bỏ các bài mà user_id nằm trong PostExcludedUser
    if user and user.is_active:
        filtered_q = filtered_q.filter(
            ~exists().where(
                and_(
                    PostExcludedUser.post_id == Post.id,
                    PostExcludedUser.user_id == user.id
                )
            )
        )
    else:
        # Khách vãng lai: không xem được bài có exclude list (vì chưa có tài khoản)
        filtered_q = filtered_q.filter(
            ~exists().where(PostExcludedUser.post_id == Post.id)
        )

    return filtered_q

def check_single_post_access(post, user=None) -> bool:
    """Kiểm tra quyền truy cập của một bài viết cụ thể."""
    if not post:
        return False

    # Bài nháp (draft) chỉ Admin mới xem được (hoặc qua preview-token)
    if post.status != 'published':
        if user and user.role == 'admin':
            return True
        return False

    # Admin luôn có quyền
    if user and user.role == 'admin':
        return True

    # KIỂM TRA QUYỀN LOẠI TRỪ (EXCLUDE):
    # Những người chưa có tài khoản (user is None / anonymous) không xem được bài có exclude
    has_excluded = PostExcludedUser.query.filter_by(post_id=post.id).first() is not None
    if has_excluded:
        if not user or not user.is_active:
            return False
        # Tài khoản nằm trong danh sách loại trừ -> Bị chặn
        is_blocked = PostExcludedUser.query.filter_by(post_id=post.id, user_id=user.id).first() is not None
        if is_blocked:
            return False

    # Tác giả luôn có quyền
    if user and post.author_id and post.author_id == user.id:
        return True

    vis = post.visibility or 'public'
    if vis == 'public':
        return True

    if vis == 'unlisted':
        # Unlisted: Ai có link trực tiếp đều xem được
        return True

    # Các mức yêu cầu đăng nhập:
    if not user or not user.is_active:
        return False

    if vis == 'logged_in':
        return True

    if vis == 'role':
        return PostAccessRole.query.filter_by(post_id=post.id, role=user.role).first() is not None

    if vis == 'custom':
        now = datetime.utcnow()
        rule = PostAccessUser.query.filter_by(post_id=post.id, user_id=user.id).first()
        if not rule:
            return False
        if rule.expires_at and rule.expires_at <= now:
            return False
        return True

    # Default deny
    return False

def get_post_or_404(identifier, user=None):
    """
    Lấy bài viết theo ID hoặc Slug và kiểm tra quyền truy cập.
    Nếu không tìm thấy hoặc người dùng không có quyền:
    -> Trả về (None, response_404) với mã 404 Not Found đồng nhất tuyệt đối.
    Nếu hợp lệ -> Trả về (post, None).
    """
    if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
        post = Post.query.filter_by(id=int(identifier)).first()
    else:
        post = Post.query.filter_by(slug=str(identifier)).first()

    if not post or not check_single_post_access(post, user):
        response, code = api_response(
            success=False,
            message="Bài viết không tồn tại hoặc đã được chuyển đi.",
            status_code=404
        )
        # Thêm header no-store bảo vệ
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        return None, (response, code)

    return post, None
