from typing import List, Optional, Dict, Any
from sqlalchemy import inspect, func, select
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, timedelta
from .database import trending_articles_table, articles_table, get_supabase_session, get_digitalocean_session, digitalocean_engine, metadata
from .elasticsearch_service import ElasticsearchService


class TrendingService:
    """Service for working with trending articles."""
    
    def __init__(self):
        self._supabase_session = None
        self._digitalocean_session = None
        self.es_service = ElasticsearchService()
    
    async def save_trending_analysis(
        self,
        article_id,
        url,
        title,
        trend,
        similarity_score,
        summary,
        publish_date,
        categories,
        main_category,
        image_url,
        content
    ):
        trending_id = await self._save_to_database(
            article_id,
            url,
            title,
            trend,
            similarity_score,
            summary,
            publish_date,
            categories,
            main_category,
            image_url,
            content
        )
        
        if trending_id:
            article_data = {
                "article_id": article_id,
                "url": url,
                "title": title,
                "trend": trend,
                "similarity_score": similarity_score,
                "summary": summary,
                "publish_date": publish_date,
                "categories": categories,
                "main_category": main_category,
                "image_url": image_url,
                "content": content
            }
            
            await self.es_service.index_trending_article(trending_id, article_data)
        
        print(f"Saved trending article to database: ID={trending_id}, article_id={article_id}")
        return trending_id
            
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
        
    async def get_articles_between_times(self, start_time: datetime, end_time: datetime) -> List[Dict]:
        """
        Fetch articles from Supabase published between two specific datetimes.
        
        Args:
            start_time: Start time to fetch articles from (inclusive)
            end_time: End time to fetch articles to (inclusive)
            
        Returns:
            List of article dictionaries
        """
        try:
            with self._get_supabase_session() as session:
                print(f"Fetching articles between {start_time.isoformat()} and {end_time.isoformat()}")
                
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
                    articles_table.c.publish_date.between(start_time, end_time)
                ).order_by(
                    articles_table.c.publish_date.desc()
                )
                
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
                
                print(f"Found {len(articles)} articles between the specified times")
                return articles
        except Exception as e:
            print(f"Error fetching articles from Supabase between times: {str(e)}")
            return []

    async def _save_to_database(
        self,
        article_id,
        url,
        title,
        trend,
        similarity_score,
        summary,
        publish_date,
        categories,
        main_category,
        image_url,
        content
    ):
        """
        Private method to save trending article data to the Digital Ocean database.
        
        Args:
            article_id: UUID of the article
            url: URL of the article
            title: Title of the article
            trend: Identified trend (or None if below threshold)
            similarity_score: Similarity score (0-1)
            summary: Summary of the article content
            publish_date: Publication date of the article
            categories: List of categories the article belongs to
            main_category: Main category of the article
            image_url: URL to the article's image
            content: Full article content
            
        Returns:
            str: The trending_id (UUID) if successful, None otherwise
        """
        try:
            table_exists = await self._ensure_table_exists()
            if not table_exists:
                self.logger.error("Could not ensure TrendingArticles table exists")
                return None
            
            if categories is None:
                categories = []
            
            if main_category is None or main_category == "":
                main_category = "General"
            
            import uuid
            trending_id = str(uuid.uuid4())
            
            with self._get_digitalocean_session() as session:
                # Create insert statement
                from sqlalchemy.sql import text
                
                # Insert the record
                stmt = trending_articles_table.insert().values(
                    trending_id=trending_id,
                    article_id=article_id,
                    url=url,
                    title=title,
                    trend=trend,
                    summary=summary,
                    similarity_score=float(similarity_score),
                    publish_date=publish_date,
                    image_url=image_url,
                    categories=categories,
                    main_category=main_category,
                    content=content,
                    analyzed_date=func.now() # Using SQL function for current timestamp
                )
                
                result = session.execute(stmt)
                session.commit()
                
                return trending_id
        except Exception as e:
            self.logger.error(f"Error saving to database: {str(e)}")
            import traceback
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            return None