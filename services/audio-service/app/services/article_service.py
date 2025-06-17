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
                    author=row_dict.get("author"),
                    uploaded_date=row_dict.get("uploaded_date")
                )
                articles.append(article)
                
            return articles
        except Exception as e:
            print(f"Error loading articles from database: {str(e)}")
            return []  # Return empty list if database access fails
    
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
                articles_table.c.uploaded_date.between(start_date, end_date)
            ).order_by(articles_table.c.publish_date.desc())
            
            result = db.execute(query).fetchall()
            print(f"Query result count: {len(result)}")

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
                    main_category=row_dict.get("main_category"),
                    title=row_dict.get("title", ""),
                    content=row_dict.get("content", ""),
                    image_url=row_dict.get("image_url"),
                    publish_date=article_date.isoformat() if article_date else None,
                    author=row_dict.get("author"),
                )
                articles.append(article)
            
            # Select unique articles by category if we have more than 5
            if len(articles) > 5:
                articles = self.select_diverse_articles(articles, 5)
                print(f"Selected 5 diverse articles from different categories")
            
            print(f"Found {len(articles)} articles in date range from database")
            return articles
            
        except Exception as e:
            print(f"Error querying database: {str(e)}")
            raise e
    
    def select_diverse_articles(self, articles: List[Article], count: int = 5) -> List[Article]:
        """
        Select a diverse set of articles from different categories.
        
        Args:
            articles: List of all available articles
            count: Number of articles to select (default 5)
            
        Returns:
            List of selected articles from diverse categories
        """
        if len(articles) <= count:
            return articles
            
        # Group articles by main category
        category_map = {}
        for article in articles:
            main_category = getattr(article, 'main_category', None) or "Uncategorized"
            if main_category not in category_map:
                category_map[main_category] = []
            category_map[main_category].append(article)
        
        # Sort categories by the number of articles (most popular first)
        sorted_categories = sorted(category_map.keys(), key=lambda k: len(category_map[k]), reverse=True)
        
        # Select one article from each of the top categories
        selected_articles = []
        for category in sorted_categories:
            if len(selected_articles) < count:
                # Take the most recent article from this category
                category_articles = sorted(
                    category_map[category],
                    key=lambda a: getattr(a, 'publish_date', ''),
                    reverse=True
                )
                selected_articles.append(category_articles[0])
            else:
                break
        
        # If we don't have enough categories, add more articles from the most popular categories
        while len(selected_articles) < count and sorted_categories:
            for category in sorted_categories:
                if len(selected_articles) < count and len(category_map[category]) > 1:
                    # Take the second most recent article from this category
                    category_articles = sorted(
                        category_map[category],
                        key=lambda a: getattr(a, 'publish_date', ''),
                        reverse=True
                    )
                    if len(category_articles) > 1:
                        selected_articles.append(category_articles[1])
                        # Remove the article we just added
                        category_map[category] = category_articles[2:]
                
                if len(selected_articles) >= count:
                    break
        
        return selected_articles

article_service = ArticleService()