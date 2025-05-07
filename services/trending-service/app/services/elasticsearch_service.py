import os
import logging
from elasticsearch import Elasticsearch
from datetime import datetime
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

class ElasticsearchService:
    """Service for interacting with Elasticsearch"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        self.es_host = os.getenv("ELS_IP")
        self.es_user = os.getenv("ELS_USERNAME")
        self.es_password = os.getenv("ELS_PASSWORD")
        self.index_name = "title"
        
        self.client = Elasticsearch(
            self.es_host,
            basic_auth=(self.es_user, self.es_password),
            verify_certs=False,  
        )
        
        self._ensure_index_exists()
    
    def _ensure_index_exists(self) -> None:
        """Create index if it doesn't exist"""
        try:
            if not self.client.indices.exists(index=self.index_name):
                self.client.indices.create(
                    index=self.index_name,
                    body={
                        "settings": {
                            "analysis": {
                                "analyzer": {
                                    "title_analyzer": {
                                        "type": "custom",
                                        "tokenizer": "standard",
                                        "filter": [
                                            "lowercase",
                                            "english_stop",
                                            "english_stemmer",
                                        ],
                                    },
                                },
                                "filter": {
                                    "english_stop": {
                                        "type": "stop",
                                        "stopwords": "_english_",
                                    },
                                    "english_stemmer": {
                                        "type": "stemmer",
                                        "language": "english",
                                    },
                                },
                            },
                        },
                        "mappings": {
                            "properties": {
                                "trendingId": {"type": "keyword"},
                                "articleId": {"type": "keyword"},
                                "title": {
                                    "type": "text",
                                    "analyzer": "title_analyzer",
                                    "fields": {
                                        "keyword": {"type": "keyword"},
                                    },
                                },
                                "content": {"type": "text", "analyzer": "standard"},
                                "summary": {"type": "text", "analyzer": "standard"},
                                "mainCategory": {"type": "keyword"},
                                "categories": {"type": "keyword"},
                                "publishDate": {"type": "date"},
                                "url": {"type": "keyword"},
                                "imageUrl": {"type": "keyword"},
                                "similarityScore": {"type": "float"},
                            }
                        }
                    }
                )
                self.logger.info(f"Created Elasticsearch index '{self.index_name}'")
        except Exception as e:
            self.logger.error(f"Error creating Elasticsearch index: {str(e)}")
    
    async def index_trending_article(self, trending_id: str, article_data: Dict[str, Any]) -> bool:
        """
        Index a trending article in Elasticsearch
        
        Args:
            trending_id: The trending ID (UUID) of the article
            article_data: Article data dictionary
            
        Returns:
            bool: True if successfully indexed, False otherwise
        """
        try:
            doc = {
                "trendingId": trending_id,
                "articleId": article_data.get("article_id", ""),
                "title": article_data.get("title", ""),
                "content": article_data.get("content", ""),
                "summary": article_data.get("summary", ""),
                "mainCategory": article_data.get("main_category", "Uncategorized"),
                "categories": article_data.get("categories", []),
                "publishDate": self._format_date(article_data.get("publish_date")),
                "url": article_data.get("url", ""),
                "imageUrl": article_data.get("image_url", ""),
                "similarityScore": float(article_data.get("similarity_score", 0)),
            }
            
            response = self.client.index(
                index=self.index_name,
                id=trending_id,
                document=doc,
                refresh=True 
            )
            
            self.logger.info(f"Indexed article {trending_id} in Elasticsearch")
            return True
            
        except Exception as e:
            self.logger.error(f"Error indexing article in Elasticsearch: {str(e)}")
            return False
    
    def _format_date(self, date_value) -> Optional[str]:
        """Format date for Elasticsearch"""
        if not date_value:
            return None
            
        if isinstance(date_value, datetime):
            return date_value.isoformat()
        elif isinstance(date_value, str):
            try:
                return datetime.fromisoformat(date_value.replace('Z', '+00:00')).isoformat()
            except (ValueError, TypeError):
                return date_value
        
        return None