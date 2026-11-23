import os
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models import Post, Project, Video, Album

class RecommendationService:
    """Mô hình AI Content Recommendation sử dụng TF-IDF & Cosine Similarity."""
    
    @staticmethod
    def get_related_posts(current_post_id: int, limit: int = 4, user=None) -> List[Dict[str, Any]]:
        from app.services.post_access_service import visible_posts
        posts = visible_posts(user).all()
        if len(posts) <= 1:
            return []
            
        current_post = next((p for p in posts if p.id == current_post_id), None)
        if not current_post:
            return []
            
        corpus = []
        post_indices = []
        target_idx = 0
        
        for idx, p in enumerate(posts):
            text = f"{p.title} {p.tags or ''} {p.excerpt or ''}"
            corpus.append(text)
            post_indices.append(p)
            if p.id == current_post_id:
                target_idx = idx
                
        try:
            vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
            tfidf_matrix = vectorizer.fit_transform(corpus)
            similarity_matrix = cosine_similarity(tfidf_matrix[target_idx:target_idx+1], tfidf_matrix).flatten()
            
            sim_indices = similarity_matrix.argsort()[::-1]
            related = []
            for i in sim_indices:
                if post_indices[i].id != current_post_id:
                    related.append(post_indices[i].to_dict(include_content=False))
                    if len(related) >= limit:
                        break
            return related
        except Exception:
            fallback_posts = [p.to_dict(include_content=False) for p in posts if p.id != current_post_id][:limit]
            return fallback_posts

class SearchEngineService:
    """Search Engine riêng cho Spotlight Ctrl+K, tìm kiếm toàn văn đa phân hệ."""
    
    @staticmethod
    def search_all(query: str, limit: int = 6, user=None) -> Dict[str, List[Dict[str, Any]]]:
        if not query or not query.strip():
            return {"projects": [], "posts": [], "videos": [], "albums": []}
            
        q = f"%{query.strip()}%"
        
        # 1. Tìm trong Posts (Title, Excerpt, Content, Tags) - Bắt buộc qua visible_posts
        from app.services.post_access_service import visible_posts
        post_query = visible_posts(user)
        posts = post_query.filter(
            (Post.title.ilike(q) | Post.tags.ilike(q) | Post.excerpt.ilike(q))
        ).limit(limit).all()
        
        # 2. Tìm trong Projects (Title, Description, Tech Stack)
        projects = Project.query.filter(
            Project.title.ilike(q) | Project.description.ilike(q) | Project.tech_stack.ilike(q)
        ).limit(limit).all()
        
        # 3. Tìm trong Videos (Title, Description, Category)
        videos = Video.query.filter(
            Video.title.ilike(q) | Video.description.ilike(q) | Video.category.ilike(q)
        ).limit(limit).all()
        
        # 4. Tìm trong Albums (Title, Description)
        albums = Album.query.filter(
            Album.title.ilike(q) | Album.description.ilike(q)
        ).limit(limit).all()
        
        return {
            "posts": [p.to_dict(include_content=False) for p in posts],
            "projects": [pr.to_dict() for pr in projects],
            "videos": [v.to_dict() for v in videos],
            "albums": [a.to_dict() for a in albums]
        }
