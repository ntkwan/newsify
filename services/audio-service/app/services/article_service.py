import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import HTTPException, Depends
from sqlalchemy.sql import select
from sqlalchemy.orm import Session
from ..models import Article
from .database import get_supabase_db, get_supabase_session, articles_table
from dotenv import load_dotenv

load_dotenv()

class ArticleService:
    """Service for reading articles from the database."""
    
    def __init__(self):
        """Initialize the article service."""
        self._db_session = None
    
    def _get_db_session(self) -> Session:
        """Get a database session."""
        if self._db_session is None:
            with get_supabase_session() as session:
                self._db_session = session
        return self._db_session
    
    async def _load_articles_from_db(self, db: Optional[Session] = None) -> List[Article]:
        """
        Load all articles from the database.
        
        Args:
            db: Database session
            
        Returns:
            List of Article objects
        """
        if db is None:
            db = self._get_db_session()
            
        try:
            query = select(articles_table)
            result = db.execute(query).fetchall()
            print(f"result: {result}")
            
            articles = []
            for row in result:
                # Convert row to dictionary properly
                row_dict = {}
                for column, value in zip(articles_table.columns.keys(), row):
                    row_dict[column] = value
                
                article_date = row_dict.get("publish_date")
                print(f"article_date: {article_date}")
                
                article = Article(
                    url=row_dict.get("url", ""),
                    src=row_dict.get("src", ""),
                    language=row_dict.get("language"),
                    categories=row_dict.get("categories", []),
                    title=row_dict.get("title", ""),
                    content=row_dict.get("content", ""),
                    image_url=row_dict.get("image_url"),
                    publish_date=article_date.isoformat() if article_date else None,
                    author=row_dict.get("author")
                )
                articles.append(article)
                
            return articles
        except Exception as e:
            print(f"Error loading articles from database: {str(e)}")
            return await self._load_articles_from_file()
    
    async def get_articles_between_dates(self, start_time: str, end_time: str, db: Optional[Session] = None) -> List[Article]:
        """
        Get articles within a specified date range.
        
        Args:
            start_time: ISO format start date
            end_time: ISO format end date
            db: Database session
            
        Returns:
            List of Article objects
        """
        if db is None:
            db = self._get_db_session()
            
        try:
            start_date = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            print(f"start_date: {start_date}, end_date: {end_date}")
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Invalid date format. Use ISO format (YYYY-MM-DDTHH:mm:ss)"
            )
        
        try:
            query = select(articles_table).where(
                articles_table.c.publish_date.between(start_date, end_date)
            ).order_by(articles_table.c.publish_date.desc())
            
            result = db.execute(query).fetchall()
            print(f"Query result count: {len(result)}")
            
            if not result:
                print("No articles found in database, falling back to file")
                return await self._filter_articles_from_file(start_date, end_date)
            
            articles = []
            for row in result:
                row_dict = {}
                for column, value in zip(articles_table.columns.keys(), row):
                    row_dict[column] = value
                
                article_date = row_dict.get("publish_date")
                
                article = Article(
                    url=row_dict.get("url", ""),
                    src=row_dict.get("src", ""),
                    language=row_dict.get("language"),
                    categories=row_dict.get("categories", []),
                    title=row_dict.get("title", ""),
                    content=row_dict.get("content", ""),
                    image_url=row_dict.get("image_url"),
                    publish_date=article_date.isoformat() if article_date else None,
                    author=row_dict.get("author")
                )
                articles.append(article)
            
            print(f"Found {len(articles)} articles in date range from database")
            return articles
            
        except Exception as e:
            print(f"Error querying database: {str(e)}, falling back to file")
            return await self._filter_articles_from_file(start_date, end_date)

article_service = ArticleService()