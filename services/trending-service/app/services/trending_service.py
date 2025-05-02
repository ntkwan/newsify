from typing import List, Optional, Dict, Any
from sqlalchemy import inspect, func, select
from sqlalchemy.orm import Session
from uuid import UUID
import json
from datetime import datetime
from .database import trending_articles_table, articles_table, get_supabase_db, get_digitalocean_db, digitalocean_engine, metadata

class TrendingService:
    """Service for working with trending articles."""
    
    def __init__(self):
        self._supabase_session = None
        self._digitalocean_session = None
    
    def _get_supabase_session(self) -> Optional[Session]:
        """Get a singleton Supabase database session."""
        if self._supabase_session is None:
            try:
                self._supabase_session = get_supabase_db()
                return self._supabase_session
            except Exception as e:
                print(f"Error creating Supabase session: {str(e)}")
                return None
        return self._supabase_session
    
    def _get_digitalocean_session(self) -> Optional[Session]:
        """Get a singleton Digital Ocean database session."""
        if self._digitalocean_session is None:
            try:
                self._digitalocean_session = get_digitalocean_db()
                return self._digitalocean_session
            except Exception as e:
                print(f"Error creating Digital Ocean session: {str(e)}")
                return None
        return self._digitalocean_session
    
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
            session = self._get_supabase_session()
            if not session:
                print("Could not get Supabase session")
                return []
            
            query = select([
                articles_table.c.id,
                articles_table.c.url,
                articles_table.c.title,
                articles_table.c.content,
                articles_table.c.publish_date
            ]).order_by(
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
                                     trend: Optional[str], similarity_score: float) -> bool:
        """
        Save trending analysis results to Digital Ocean database.
        
        Args:
            article_id: UUID of the article
            url: URL of the article
            title: Title of the article
            trend: Identified trend (or None if below threshold)
            similarity_score: Similarity score (0-1)
            
        Returns:
            True if save was successful, False otherwise
        """
        try:
            # Ensure the table exists
            await self._ensure_table_exists()
            
            session = self._get_digitalocean_session()
            if not session:
                print("Could not get Digital Ocean session")
                return False
            
            stmt = trending_articles_table.insert().values(
                article_id=article_id,
                url=url,
                title=title,
                trend=trend,
                similarity_score=similarity_score,
                analyzed_date=func.now()
            )
            session.execute(stmt)
            session.commit()
            print(f"Trending analysis saved to database for article {article_id}")
            return True
            
        except Exception as e:
            print(f"Error saving trending analysis to database: {str(e)}")
            return False
        """
        Get trending articles from Digital Ocean database.
        
        Args:
            limit: Maximum number of articles to return
            
        Returns:
            List of trending article dictionaries
        """
        try:
            # Ensure the table exists
            await self._ensure_table_exists()
            
            session = self._get_digitalocean_session()
            if not session:
                print("Could not get Digital Ocean session")
                return []
            
            query = select([
                trending_articles_table.c.trending_id,
                trending_articles_table.c.article_id,
                trending_articles_table.c.url,
                trending_articles_table.c.title,
                trending_articles_table.c.trend,
                trending_articles_table.c.similarity_score,
                trending_articles_table.c.analyzed_date
            ]).where(
                trending_articles_table.c.trend.isnot(None)
            ).order_by(
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
                    "similarity_score": float(row.similarity_score),
                    "analyzed_date": row.analyzed_date.isoformat() if row.analyzed_date else None
                })
            
            return trending_articles
        except Exception as e:
            print(f"Error fetching trending articles from database: {str(e)}")
            return [] 