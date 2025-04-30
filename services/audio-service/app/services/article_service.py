import os
import json
from typing import List, Dict, Any
from datetime import datetime
from fastapi import HTTPException
from ..models import Article
from dotenv import load_dotenv

load_dotenv()

class ArticleService:
    """Service for reading articles from local JSON file."""
    
    def __init__(self):
        """Initialize the article service with the data file path."""
        self.data_path = os.getenv('DATA_PATH', '/data/19-26-48.json')
        print(f"Using data file: {self.data_path}")
    
    async def _load_articles(self) -> List[Article]:
        """
        Load all articles from the JSON file.
        
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
    
    async def get_articles_between_dates(self, start_time: str, end_time: str) -> List[Article]:
        """
        Get articles within a specified date range.
        
        Args:
            start_time: ISO format start date
            end_time: ISO format end date
            
        Returns:
            List of Article objects
        """
        # Validate the date format
        try:
            start_date = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Invalid date format. Use ISO format (YYYY-MM-DDTHH:mm:ss)"
            )
        
        all_articles = await self._load_articles()
        
        filtered_articles = []
        for article in all_articles:
            try:
                if article.year and article.month_number and article.day:
                    hour = article.hour or 0
                    minute = article.minute or 0
                    article_date = datetime(
                        int(article.year),
                        int(article.month_number),
                        int(article.day),
                        int(hour),
                        int(minute)
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
                else:
                    continue
                
                if start_date <= article_date <= end_date:
                    filtered_articles.append(article)
                    
            except (ValueError, TypeError) as e:
                print(f"Error parsing date for article {article.title}: {e}")
                continue
        
        print(f"Found {len(filtered_articles)} articles in date range from {len(all_articles)} total")
        return filtered_articles

article_service = ArticleService() 