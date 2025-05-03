from typing import List, Optional, Dict, Any
from sqlalchemy import inspect, func, select
from sqlalchemy.orm import Session
from uuid import UUID
import json
from datetime import datetime, timedelta
from .database import trending_articles_table, articles_table, get_supabase_session, get_digitalocean_session, digitalocean_engine, metadata

class TrendingService:
    """Service for working with trending articles."""
    
    def __init__(self):
        self._supabase_session = None
        self._digitalocean_session = None
    
    def _get_supabase_session(self) -> Optional[Session]:
        """Get a Supabase database session."""
        try:
            return get_supabase_session()
        except Exception as e:
            print(f"Error creating Supabase session: {str(e)}")
            return None
    
    def _get_digitalocean_session(self) -> Optional[Session]:
        """Get a Digital Ocean database session."""
        try:
            return get_digitalocean_session()
        except Exception as e:
            print(f"Error creating Digital Ocean session: {str(e)}")
            return None
    
    async def _ensure_table_exists(self):
        """Ensure that the TrendingArticles table exists in the Digital Ocean database."""
        try:
            inspector = inspect(digitalocean_engine)
            table_exists = "TrendingArticles" in inspector.get_table_names()
            
            if not table_exists:
                print("TrendingArticles table does not exist. Creating...")
                metadata.create_all(digitalocean_engine, tables=[trending_articles_table])
                print("TrendingArticles table created successfully.")
            
            return True
        except Exception as e:
            print(f"Error ensuring table exists: {str(e)}")
            return False
    
    async def get_articles_from_supabase(self, limit: int = 10) -> List[Dict]:
        """
        Fetch recent articles from Supabase.
        
        Args:
            limit: Maximum number of articles to fetch
            
        Returns:
            List of article dictionaries
        """
        try:
            with self._get_supabase_session() as session:
                query = select(
                    articles_table.c.id,
                    articles_table.c.url,
                    articles_table.c.title,
                    articles_table.c.content,
                    articles_table.c.publish_date
                ).order_by(
                    articles_table.c.publish_date.desc()
                ).limit(limit)
                
                result = session.execute(query)
                
                articles = []
                for row in result:
                    articles.append({
                        "id": str(row.id),
                        "url": row.url,
                        "title": row.title,
                        "content": row.content,
                        "publish_date": row.publish_date.isoformat() if row.publish_date else None
                    })
                
                return articles
        except Exception as e:
            print(f"Error fetching articles from Supabase: {str(e)}")
            return []
    
    async def save_trending_analysis(self, article_id: str, url: str, title: str, 
                                     trend: Optional[str], similarity_score: float, 
                                     publish_date: Optional[datetime] = None,
                                     summary: Optional[str] = None,
                                     image_url: Optional[str] = None,
                                     categories: Optional[list] = None,
                                     main_category: Optional[str] = None,
                                     content: Optional[str] = None) -> bool:
        """
        Save trending analysis results to Digital Ocean database.
        
        Args:
            article_id: UUID of the article
            url: URL of the article
            title: Title of the article
            trend: Identified trend (or None if below threshold)
            similarity_score: Similarity score (0-1)
            publish_date: Publication date of the article
            summary: Summary of the article content
            image_url: URL to the article's image
            categories: List of categories the article belongs to
            main_category: Main category of the article
            content: Full article content
            
        Returns:
            True if save was successful, False otherwise
        """
        try:
            await self._ensure_table_exists()
            
            if categories is None:
                categories = []
            
            if main_category is None:
                main_category = 'Other'
            
            with self._get_digitalocean_session() as session:
                stmt = trending_articles_table.insert().values(
                    article_id=article_id,
                    url=url,
                    title=title,
                    trend=trend,
                    summary=summary,
                    image_url=image_url,
                    categories=categories,
                    main_category=main_category,
                    similarity_score=similarity_score,
                    publish_date=publish_date,
                    content=content,
                    analyzed_date=func.now()
                )
                session.execute(stmt)
                session.commit()
                print(f"Trending analysis saved to database for article {article_id}")
                return True
            
        except Exception as e:
            print(f"Error saving trending analysis to database: {str(e)}")
            return False
    
    async def get_recent_articles_by_time(self, hours: int = 24, limit: int = 20) -> List[Dict]:
        """
        Fetch articles from Supabase published within the last X hours.
        
        Args:
            hours: Number of hours to look back
            limit: Maximum number of articles to fetch
            
        Returns:
            List of article dictionaries
        """
        try:
            with self._get_supabase_session() as session:
                cutoff_time = datetime.now() - timedelta(hours=hours) 
                
                query = select(
                    articles_table.c.id,
                    articles_table.c.url,
                    articles_table.c.title,
                    articles_table.c.content,
                    articles_table.c.publish_date
                ).where(
                    articles_table.c.publish_date >= cutoff_time
                ).order_by(
                    articles_table.c.publish_date.desc()
                ).limit(limit)
                
                result = session.execute(query)
                
                articles = []
                for row in result:
                    articles.append({
                        "id": str(row.id),
                        "url": row.url,
                        "title": row.title,
                        "content": row.content,
                        "publish_date": row.publish_date.isoformat() if row.publish_date else None
                    })
                
                return articles
        except Exception as e:
            print(f"Error fetching recent articles from Supabase: {str(e)}")
            return []
    
    async def get_articles_from_time(self, start_time: datetime, limit: int = 20) -> List[Dict]:
        """
        Fetch articles from Supabase published after a specific datetime.
        
        Args:
            start_time: Specific start time to fetch articles from
            limit: Maximum number of articles to fetch
            
        Returns:
            List of article dictionaries
        """
        try:
            with self._get_supabase_session() as session:
                query = select(
                    articles_table.c.id,
                    articles_table.c.url,
                    articles_table.c.title,
                    articles_table.c.content,
                    articles_table.c.publish_date,
                    articles_table.c.image_url,
                    articles_table.c.categories,
                    articles_table.c.main_category
                ).where(
                    articles_table.c.publish_date >= start_time
                ).order_by(
                    articles_table.c.publish_date.desc()
                ).limit(limit)
                
                result = session.execute(query)
                
                articles = []
                for row in result:
                    articles.append({
                        "id": str(row.id),
                        "url": row.url,
                        "title": row.title,
                        "content": row.content,
                        "image_url": row.image_url,
                        "categories": row.categories,
                        "main_category": row.main_category,
                        "publish_date": row.publish_date.isoformat() if row.publish_date else None
                    })
                
                return articles
        except Exception as e:
            print(f"Error fetching articles from Supabase with custom start time: {str(e)}")
            return []
    
    async def get_trending_articles(self, limit: int = 10) -> List[Dict]:
        """
        Get trending articles from Digital Ocean database.
        
        Args:
            limit: Maximum number of articles to return
            
        Returns:
            List of trending article dictionaries
        """
        try:
            await self._ensure_table_exists()
            
            with self._get_digitalocean_session() as session:
                query = select(
                    trending_articles_table.c.trending_id,
                    trending_articles_table.c.article_id,
                    trending_articles_table.c.url,
                    trending_articles_table.c.title,
                    trending_articles_table.c.trend,
                    trending_articles_table.c.summary,
                    trending_articles_table.c.image_url,
                    trending_articles_table.c.categories,
                    trending_articles_table.c.main_category,
                    trending_articles_table.c.similarity_score,
                    trending_articles_table.c.publish_date,
                    trending_articles_table.c.analyzed_date
                ).where(
                    trending_articles_table.c.trend.isnot(None)
                ).order_by(
                    trending_articles_table.c.publish_date.desc(),
                    trending_articles_table.c.similarity_score.desc()
                ).limit(limit)
                
                result = session.execute(query)
                
                trending_articles = []
                for row in result:
                    trending_articles.append({
                        "trending_id": str(row.trending_id),
                        "article_id": str(row.article_id),
                        "url": row.url,
                        "title": row.title,
                        "trend": row.trend,
                        "summary": row.summary,
                        "similarity_score": float(row.similarity_score),
                        "publish_date": row.publish_date.isoformat() if row.publish_date else None,
                        "analyzed_date": row.analyzed_date.isoformat() if row.analyzed_date else None,
                        "image_url": row.image_url,
                        "categories": row.categories if row.categories else [],
                        "main_category": row.main_category if row.main_category else "General"
                    })
                
                return trending_articles
        except Exception as e:
            print(f"Error fetching trending articles from database: {str(e)}")
            return [] 