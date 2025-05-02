import os
import json
from typing import List, Dict, Any
from datetime import datetime, timezone
from fastapi import HTTPException, Depends
from sqlalchemy.sql import select
from sqlalchemy.orm import Session
from ..models import Article
from .database import get_supabase_session, articles_table
from dotenv import load_dotenv

load_dotenv()

class ArticleService:
    """Service for reading articles from the database."""
    
    def __init__(self):
        """Initialize the article service."""
        self.data_path = os.getenv('DATA_PATH', '/data/19-26-48.json')
        print(f"Using database for article data with fallback to: {self.data_path}")
    
    async def _load_articles_from_db(self, db: Session) -> List[Article]:
        """
        Load all articles from the database.
        
        Args:
            db: Database session
            
        Returns:
            List of Article objects
        """
        try:
            query = select(articles_table)
            result = db.execute(query).fetchall()
            
            articles = []
            for row in result:
                article_dict = dict(row)
                
                article_date = article_dict["publish_date"]
                
                article = Article(
                    url=article_dict["url"],
                    src=article_dict["src"],
                    language=article_dict["language"],
                    categories=article_dict["categories"] if article_dict["categories"] else [],
                    title=article_dict["title"],
                    content=article_dict["content"] or "",
                    image_url=article_dict["image_url"],
                    publish_date=article_date.isoformat() if article_date else None,
                    time=article_date.strftime("%I:%M %p") if article_date else None,
                    timezone=article_date.tzname() if article_date else None,
                    hour=article_date.hour if article_date else None,
                    minute=article_date.minute if article_date else None,
                    day=article_date.day if article_date else None,
                    month=article_date.strftime("%B") if article_date else None,
                    month_number=article_date.month if article_date else None,
                    year=article_date.year if article_date else None,
                    weekday=article_date.strftime("%A") if article_date else None,
                    time_reading=article_dict["time_reading"],
                    author=article_dict["author"]
                )
                articles.append(article)
                
            return articles
        except Exception as e:
            print(f"Error loading articles from database: {str(e)}")
            return await self._load_articles_from_file()
    
    async def _load_articles_from_file(self) -> List[Article]:
        """
        Load all articles from the JSON file as a fallback.
        
        Returns:
            List of Article objects
        """
        try:
            with open(self.data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            articles = [Article(**article) for article in data]
            return articles
        except FileNotFoundError:
            raise HTTPException(
                status_code=500, 
                detail=f"Data file not found: {self.data_path}"
            )
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500, 
                detail=f"Invalid JSON in data file: {self.data_path}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Error loading articles: {str(e)}"
            )
    
    async def get_articles_between_dates(self, start_time: str, end_time: str, db: Session = Depends(get_supabase_session)) -> List[Article]:
        """
        Get articles within a specified date range.
        
        Args:
            start_time: ISO format start date
            end_time: ISO format end date
            db: Database session
            
        Returns:
            List of Article objects
        """
        try:
            start_date = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
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
            
            if not result:
                print("No articles found in database, falling back to file")
                all_articles = await self._load_articles_from_file()
                filtered_articles = self._filter_articles_by_date(all_articles, start_date, end_date)
                return filtered_articles
            
            articles = []
            for row in result:
                article_dict = dict(row)
                
                article_date = article_dict["publish_date"]
                
                article = Article(
                    url=article_dict["url"],
                    src=article_dict["src"],
                    language=article_dict["language"],
                    categories=article_dict["categories"] if article_dict["categories"] else [],
                    title=article_dict["title"],
                    content=article_dict["content"] or "",
                    image_url=article_dict["image_url"],
                    publish_date=article_date.isoformat() if article_date else None,
                    time=article_date.strftime("%I:%M %p") if article_date else None,
                    timezone=article_date.tzname() if article_date else None,
                    hour=article_date.hour if article_date else None,
                    minute=article_date.minute if article_date else None,
                    day=article_date.day if article_date else None,
                    month=article_date.strftime("%B") if article_date else None,
                    month_number=article_date.month if article_date else None,
                    year=article_date.year if article_date else None,
                    weekday=article_date.strftime("%A") if article_date else None,
                    time_reading=article_dict["time_reading"],
                    author=article_dict["author"]
                )
                articles.append(article)
            
            print(f"Found {len(articles)} articles in date range from database")
            return articles
            
        except Exception as e:
            print(f"Error querying database: {str(e)}, falling back to file")
            all_articles = await self._load_articles_from_file()
            filtered_articles = self._filter_articles_by_date(all_articles, start_date, end_date)
            return filtered_articles
    
    def _filter_articles_by_date(self, articles: List[Article], start_date: datetime, end_date: datetime) -> List[Article]:
        """
        Filter articles by date range (fallback method).
        
        Args:
            articles: List of articles to filter
            start_date: Start date
            end_date: End date
            
        Returns:
            Filtered list of articles
        """
        filtered_articles = []
        for article in articles:
            try:
                if article.year and article.month_number and article.day:
                    hour = article.hour or 0
                    minute = article.minute or 0
                    article_date = datetime(
                        int(article.year),
                        int(article.month_number),
                        int(article.day),
                        int(hour),
                        int(minute),
                        tzinfo=timezone.utc
                    )
                elif article.publish_date:
                    cleaned_date = article.publish_date.replace('\n', ' ').strip()
                    cleaned_date = cleaned_date.replace('EDT', '').replace('EST', '').strip()
                    if cleaned_date.startswith('Updated'):
                        cleaned_date = cleaned_date[7:].strip()
                    
                    try:
                        article_date = datetime.strptime(cleaned_date, '%I:%M %p, %a %B %d, %Y')
                    except ValueError:
                        try:
                            article_date = datetime.strptime(cleaned_date, '%I:%M %p %a %B %d, %Y')
                        except ValueError:
                            print(f"Error parsing date for article {article.title}: {article.publish_date}")
                            continue
                    
                    article_date = article_date.replace(tzinfo=timezone.utc)
                else:
                    continue
                
                if start_date <= article_date <= end_date:
                    filtered_articles.append(article)
                    
            except (ValueError, TypeError) as e:
                print(f"Error parsing date for article {article.title}: {e}")
                continue
        
        print(f"Found {len(filtered_articles)} articles in date range from {len(articles)} total (file fallback)")
        return filtered_articles

article_service = ArticleService()