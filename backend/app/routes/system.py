import time
from xml.sax.saxutils import escape
from flask import Blueprint, Response, current_app
from sqlalchemy import text
from app.extensions import db
from app.models import Post, Project
from app.utils.helpers import api_response

system_bp = Blueprint("system", __name__)
START_TIME = time.time()

@system_bp.route("/api/health", methods=["GET"])
def health_check():
    """Endpoint giám sát kiểm tra trạng thái Backend và kết nối SQLite Database."""
    db_status = "connected"
    try:
        db.session.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    uptime_seconds = int(time.time() - START_TIME)
    
    return api_response(
        success=(db_status == "connected"),
        data={
            "status": "ok" if db_status == "connected" else "error",
            "database": db_status,
            "uptime_seconds": uptime_seconds,
            "version": "1.0.0"
        }
    )

@system_bp.route("/sitemap.xml", methods=["GET"])
def sitemap():
    """Tự động sinh dynamic XML Sitemap cho SEO. CHỈ chứa bài viết công khai (Public) để chống rò rỉ Stealth."""
    base_url = "http://localhost:5173"
    
    posts = Post.query.filter_by(status="published", visibility="public").all()
    projects = Project.query.all()
    
    urls = [
        {"loc": f"{base_url}/", "changefreq": "daily", "priority": "1.0"},
        {"loc": f"{base_url}/blog", "changefreq": "daily", "priority": "0.9"},
        {"loc": f"{base_url}/videos", "changefreq": "weekly", "priority": "0.8"},
        {"loc": f"{base_url}/album", "changefreq": "weekly", "priority": "0.8"},
        {"loc": f"{base_url}/series", "changefreq": "weekly", "priority": "0.8"}
    ]
    
    for p in posts:
        lastmod = p.updated_at.strftime("%Y-%m-%d") if p.updated_at else p.created_at.strftime("%Y-%m-%d")
        urls.append({
            "loc": f"{base_url}/blog/{p.slug}",
            "lastmod": lastmod,
            "changefreq": "weekly",
            "priority": "0.8"
        })
        
    xml_content = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        xml_content.append("  <url>")
        xml_content.append(f"    <loc>{u['loc']}</loc>")
        if "lastmod" in u:
            xml_content.append(f"    <lastmod>{u['lastmod']}</lastmod>")
        xml_content.append(f"    <changefreq>{u['changefreq']}</changefreq>")
        xml_content.append(f"    <priority>{u['priority']}</priority>")
        xml_content.append("  </url>")
    xml_content.append("</urlset>")
    
    return Response("\n".join(xml_content), mimetype="application/xml")

@system_bp.route("/rss.xml", methods=["GET"])
def rss_feed():
    """Tự động sinh RSS 2.0 Feed bài viết. CHỈ chứa bài viết công khai (Public) để chống rò rỉ Stealth."""
    base_url = "http://localhost:5173"
    posts = Post.query.filter_by(status="published", visibility="public").order_by(Post.created_at.desc()).limit(20).all()
    
    rss = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0">',
        '  <channel>',
        '    <title>AllinOneBlog - Personal Portfolio &amp; Blog</title>',
        f'    <link>{base_url}</link>',
        '    <description>Chia sẻ kiến thức lập trình, kỹ thuật và cuộc sống.</description>',
        '    <language>vi</language>'
    ]
    
    for p in posts:
        rss.append('    <item>')
        rss.append(f'      <title>{escape(p.title or "")}</title>')
        rss.append(f'      <link>{base_url}/blog/{p.slug}</link>')
        rss.append(f'      <description>{escape(p.excerpt or p.title or "")}</description>')
        rss.append(f'      <guid>{base_url}/blog/{p.slug}</guid>')
        pub_date = p.published_at.strftime("%a, %d %b %Y %H:%M:%S GMT") if p.published_at else p.created_at.strftime("%a, %d %b %Y %H:%M:%S GMT")
        rss.append(f'      <pubDate>{pub_date}</pubDate>')
        rss.append('    </item>')
        
    rss.append('  </channel>')
    rss.append('</rss>')
    
    return Response("\n".join(rss), mimetype="application/xml")
