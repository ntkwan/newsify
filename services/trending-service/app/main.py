from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from serpapi.google_search import GoogleSearch
from typing import List, Optional, Dict, Any
import os
from datetime import datetime
from pydantic import BaseModel
from dotenv import load_dotenv
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from app.services.trending_service import TrendingService
import uvicorn
import json
import logging
import asyncio
from app.services.redis_service import redis_service

load_dotenv()

ENVIRONMENT = os.getenv("ENV", "unknown")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("app.main")

logger.info(f"Starting trending service in {ENVIRONMENT} environment")

app = FastAPI(
    title="Trending News API",
    description="API for trending news analysis and scoring",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = SentenceTransformer('all-MiniLM-L6-v2')

class TrendingKeyword(BaseModel):
    query: str
    value: str
    extracted_value: int
    link: str
    serpapi_link: str

class TrendingArticle(BaseModel):
    url: str
    title: str
    content: str
    trend: Optional[str] = None
    summary: Optional[str] = None
    similarity_score: float
    article_id: Optional[str] = None
    publish_date: Optional[str] = None
    analyzed_date: Optional[str] = None
    image_url: Optional[str] = None
    categories: List[str] = []
    main_category: Optional[str] = None

class TrendingSavedArticle(BaseModel):
    trending_id: str
    article_id: str
    url: str
    title: str
    trend: str
    summary: Optional[str] = None
    similarity_score: float
    publish_date: Optional[str] = None
    analyzed_date: str
    image_url: Optional[str] = None
    categories: List[str] = []
    main_category: str = "General"

class ArticleAnalysisRequest(BaseModel):
    content: str
    title: Optional[str] = None
    url: Optional[str] = None
    article_id: Optional[str] = None
    publish_date: Optional[str] = None

class ArticleBatchRequest(BaseModel):
    articles: List[ArticleAnalysisRequest]

DATA_UPDATES_CHANNEL = "data-updates"

def get_embedding(text: str):
    return model.encode(text)

def get_trending_keywords(country_code: str = "US", limit: int = 10):
    api_key = os.getenv("SERPAPI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    params = {
        "engine": "google_trends_trending_now",
        "geo": country_code,
        "api_key": api_key
    }
    
    try:
        search = GoogleSearch(params)
        results = search.get_dict()
        trending_searches = results.get("trending_searches", [])
        
        df = pd.DataFrame(trending_searches, index=None)
        df = df[df['active'] == True]
        
        return df['query'].head(limit).tolist()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trending keywords: {str(e)}")

def get_related_queries(keywords: List[str]):
    api_key = os.getenv("SERPAPI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
    
    if not keywords:
        print("Warning: No trending keywords provided to get_related_queries")
        return []
        
    rows = []
    print(f"Processing {len(keywords)} keywords for related queries")
    
    for word in keywords:
        params = {
            "engine": "google_trends",
            "q": word,
            "data_type": "RELATED_QUERIES",
            "date": "now 1-d",
            "api_key": api_key
        }
        
        try:
            word_search = GoogleSearch(params)
            word_results = word_search.get_dict()
            related_word_queries = word_results.get("related_queries", {})
            
            for item in related_word_queries.get('rising', []):
                rows.append({
                    'query': item.get('query'),
                    'value': item.get('value'),
                    'extracted_value': item.get('extracted_value'),
                    'link': item.get('link'),
                    'serpapi_link': item.get('serpapi_link')
                })
            
            for item in related_word_queries.get('top', []):
                rows.append({
                    'query': item.get('query'),
                    'value': item.get('value'),
                    'extracted_value': item.get('extracted_value'),
                    'link': item.get('link'),
                    'serpapi_link': item.get('serpapi_link')
                })
        except Exception as e:
            print(f"Error processing keyword '{word}': {str(e)}")
    
    print(f"Total related queries found: {len(rows)}")
    return rows

def analyze_article_trending(article_content: str, trends_data: List[Dict[str, Any]], threshold: float = 0.5):
    article_embedding = get_embedding(article_content)
    trends_embeddings = np.stack([get_embedding(trend['query']) for trend in trends_data])
    
    similarity_scores = cosine_similarity([article_embedding], trends_embeddings)[0]
    max_score = np.max(similarity_scores)
    max_idx = np.argmax(similarity_scores)
    
    result = {
        "similarity_score": float(max_score),
        "trend": None
    }
    
    if max_score >= threshold:
        result["trend"] = trends_data[max_idx]['query']
    
    return result

@app.get("/")
async def root():
    return {
        "message": "ok",
        "service": "trending-service", 
        "environment": ENVIRONMENT,
        "processing_updates": ENVIRONMENT.lower() == "dev"
    }

@app.get("/trending", response_model=List[str])
async def get_trending(country: str = Query("US", description="Country code for trending data")):
    """Get current trending topics from Google Trends"""
    return get_trending_keywords(country_code=country)

@app.get("/trending/related", response_model=List[TrendingKeyword])
async def get_trending_related(country: str = Query("US", description="Country code for trending data")):
    """Get related queries for trending topics"""
    keywords = get_trending_keywords(country_code=country)
    return get_related_queries(keywords)

@app.post("/analyze", response_model=TrendingArticle)
async def analyze_article(article: ArticleAnalysisRequest):
    """Analyze a single article for trending relevance and save results to database"""
    trends_data = get_related_queries(get_trending_keywords())
    
    analysis = analyze_article_trending(article.content, trends_data)
    
    summary = None
    publish_date = None
    if article.publish_date:
        try:
            publish_date = datetime.fromisoformat(article.publish_date.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            print(f"Invalid publish_date format: {article.publish_date}")
    
    result = {
        "url": article.url or "",
        "title": article.title or "",
        "content": article.content,
        "trend": analysis["trend"],
        "summary": summary,
        "similarity_score": analysis["similarity_score"],
        "article_id": article.article_id,
        "publish_date": article.publish_date,
        "analyzed_date": datetime.now().isoformat()
    }
    
    if article.article_id:
        trending_service = TrendingService()
        await trending_service.save_trending_analysis(
            article_id=article.article_id,
            url=article.url or "",
            title=article.title or "",
            trend=analysis["trend"],
            summary=summary,
            similarity_score=analysis["similarity_score"],
            publish_date=publish_date,
            categories=[],  # Default empty array for categories
            main_category="General",  # Default main category
            image_url=None,  # Default image URL
            content=article.content  # Article content
        )
    
    return result

@app.post("/analyze/batch", response_model=List[TrendingArticle])
async def analyze_articles_batch(request: ArticleBatchRequest):
    """Analyze multiple articles for trending relevance and save results to database"""
    if not request.articles:
        return []
    
    trends_data = get_related_queries(get_trending_keywords())
    trending_service = TrendingService()
    
    results = []
    for article in request.articles:
        analysis = analyze_article_trending(article.content, trends_data)
        
        summary = None
        publish_date = None
        if article.publish_date:
            try:
                publish_date = datetime.fromisoformat(article.publish_date.replace('Z', '+00:00'))
            except (ValueError, TypeError):
                print(f"Invalid publish_date format: {article.publish_date}")
        
        result = {
            "url": article.url or "",
            "title": article.title or "",
            "content": article.content,
            "trend": analysis["trend"],
            "summary": summary,
            "similarity_score": analysis["similarity_score"],
            "article_id": article.article_id,
            "publish_date": article.publish_date,
            "analyzed_date": datetime.now().isoformat()
        }
        
        if article.article_id:
            await trending_service.save_trending_analysis(
                article_id=article.article_id,
                url=article.url or "",
                title=article.title or "",
                trend=analysis["trend"],
                summary=summary,
                similarity_score=analysis["similarity_score"],
                publish_date=publish_date,
                categories=[],  # Default empty array for categories
                main_category="General",  # Default main category
                image_url=None,  # Default image URL
                content=article.content  # Article content
            )
        
        results.append(result)
    
    return results

@app.post("/analyze/latest", response_model=List[TrendingArticle])
async def analyze_latest_articles(
    hours: int = Query(24, description="Hours of recent articles to analyze"),
    limit: int = Query(20, description="Maximum number of articles to analyze"),
    from_time: Optional[str] = Query(None, description="Optional custom start time in ISO format (YYYY-MM-DDTHH:MM:SS)")
):
    """
    Analyze the latest articles from the processed database and save trending results
    
    This endpoint:
    1. Fetches the most recent articles from Supabase within the specified time window
    2. Analyzes them against current trending topics
    3. Saves the results to the Digital Ocean database
    """
    try:
        trending_service = TrendingService()
        
        if from_time:
            try:
                start_time = datetime.fromisoformat(from_time)
                print(f"Using custom start time: {start_time}")
                articles = await trending_service.get_articles_from_time(start_time=start_time, limit=limit)
            except ValueError as e:
                error_msg = f"Invalid from_time format: {e}"
                print(error_msg)
                raise HTTPException(status_code=400, detail=error_msg)
        else:
            print(f"Using hours parameter: {hours} hours ago")
            articles = await trending_service.get_recent_articles_by_time(hours=hours, limit=limit)
        
        print(f"Found {len(articles)} articles to analyze")
        
        if not articles:
            print("No articles found in the specified time range")
            return []
        
        print("Fetching trending keywords...")
        trending_keywords = get_trending_keywords()
        print(f"Got {len(trending_keywords)} trending keywords")
        
        if not trending_keywords:
            print("No trending keywords found, returning articles without trend analysis")
            return [
                {
                    "url": article["url"],
                    "title": article["title"],
                    "content": article["content"],
                    "trend": None,
                    "summary": None,
                    "similarity_score": 0.0,
                    "article_id": article["id"],
                    "publish_date": article["publish_date"],
                    "analyzed_date": datetime.now().isoformat()
                } for article in articles
            ]
        
        print("Getting related queries for trending keywords...")
        trends_data = get_related_queries(trending_keywords)
        print(f"Got {len(trends_data)} related queries")
        
        if not trends_data:
            print("No trend data found, returning articles without trend analysis")
            return [
                {
                    "url": article["url"],
                    "title": article["title"],
                    "content": article["content"],
                    "trend": None,
                    "summary": None,
                    "similarity_score": 0.0,
                    "article_id": article["id"],
                    "publish_date": article["publish_date"],
                    "analyzed_date": datetime.now().isoformat(),
                    "image_url": article["image_url"],
                    "categories": article["categories"],
                    "main_category": article["main_category"]
                } for article in articles
            ]
        
        results = []
        print("Analyzing articles against trends...")
        
        for article in articles:
            try:
                print(f"Analyzing article: {article['id']} - {article['title']}")
                analysis = analyze_article_trending(article["content"], trends_data)
                
                summary = None
                publish_date = None
                
                categories = article.get("categories", [])
                if categories is None:
                    categories = []
                    
                main_category = article.get("main_category", "General")
                if main_category is None:
                    main_category = "General"
                    
                image_url = article.get("image_url")
                
                if "publish_date" in article and article["publish_date"]:
                    if isinstance(article["publish_date"], str):
                        try:
                            publish_date = datetime.fromisoformat(article["publish_date"].replace('Z', '+00:00'))
                        except (ValueError, TypeError):
                            publish_date = None
                    else:
                        publish_date = article["publish_date"]
                
                await trending_service.save_trending_analysis(
                    article_id=article["id"],
                    url=article["url"],
                    title=article["title"],
                    trend=analysis["trend"],
                    similarity_score=analysis["similarity_score"],
                    summary=summary,
                    publish_date=publish_date,
                    categories=categories,
                    main_category=main_category,
                    image_url=image_url,
                    content=article["content"]
                )
                
                results.append({
                    "url": article["url"],
                    "title": article["title"],
                    "content": article["content"],
                    "trend": analysis["trend"],
                    "summary": summary,
                    "similarity_score": analysis["similarity_score"],
                    "article_id": article["id"],
                    "publish_date": article["publish_date"],
                    "analyzed_date": datetime.now().isoformat()
                })
                
                print(f"Article analyzed with score {analysis['similarity_score']}, trend: {analysis['trend']}")
            except Exception as article_error:
                print(f"Error analyzing article {article['id']}: {str(article_error)}")
        
        print(f"Analysis complete: {len(results)} articles processed")
        return results
        
    except Exception as e:
        error_msg = f"Error in analyze_latest_articles: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

def handle_data_update(message: Dict[str, Any]) -> None:
    """
    Handle data update notifications from Redis.
    
    Args:
        message: Redis message with data update information
    """
    try:
        data = message.get('data', '{}')
        logger.info(f"[{ENVIRONMENT}] Received data update notification: {data}")
        
        if ENVIRONMENT.lower() != "dev":
            logger.info(f"[{ENVIRONMENT}] Skipping update processing - this environment is not configured to process updates")
            return
        
        try:
            data_dict = json.loads(data)
            update_type = data_dict.get('update_type')
            update_time = data_dict.get('timestamp')
            
            logger.info(f"[{ENVIRONMENT}] Processing data update: type={update_type}, time={update_time}")
            
            if update_type == 'general' and 'details' in data_dict:
                details = data_dict.get('details', {})
                available_hours = details.get('hours', [])
                date_str = details.get('date')
                
                if available_hours and date_str:
                    first_hour = min(available_hours)
                    cnt_articles = details.get('processed_rows', 0)
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                    start_time = date_obj.replace(hour=first_hour, minute=0, second=0)
                    
                    logger.info(f"[{ENVIRONMENT}] Processing articles from {start_time.isoformat()} for {cnt_articles} articles")
                    
                    lock_key = f"trending_lock:{ENVIRONMENT}:{date_str}:{first_hour}"
                    lock_expiry = 3600  # 1 hour in seconds
                    
                    if redis_service.client and redis_service.client.set(lock_key, "1", ex=lock_expiry, nx=True):
                        logger.info(f"[{ENVIRONMENT}] Acquired lock for time range: {lock_key}")
                        
                        trending_service = TrendingService()
                        
                        try:
                            articles = asyncio.run(trending_service.get_articles_from_time(
                                start_time=start_time,
                                limit=cnt_articles
                            ))
                            
                            if articles:
                                logger.info(f"[{ENVIRONMENT}] Found {len(articles)} articles to analyze")
                                
                                results = asyncio.run(analyze_latest_articles(
                                    from_time=start_time.isoformat(),
                                    limit=len(articles)
                                ))
                                
                                logger.info(f"[{ENVIRONMENT}] Successfully analyzed {len(results)} articles for time range starting at {start_time.isoformat()}")
                                
                                completion_key = f"trending_completed:{ENVIRONMENT}:{date_str}:{first_hour}"
                                redis_service.client.set(completion_key, "1", ex=86400)  # Keep for 24 hours
                            else:
                                logger.warning(f"[{ENVIRONMENT}] No articles found for time range starting at {start_time.isoformat()}")
                        except Exception as processing_error:
                            logger.error(f"[{ENVIRONMENT}] Failed to process articles: {str(processing_error)}")
                            redis_service.client.delete(lock_key)
                    else:
                        logger.info(f"[{ENVIRONMENT}] Lock acquisition failed for {lock_key}, trending analysis already in progress or completed by another instance")
                        
                        completion_key = f"trending_completed:{ENVIRONMENT}:{date_str}:{first_hour}"
                        if redis_service.client and redis_service.client.exists(completion_key):
                            logger.info(f"[{ENVIRONMENT}] Trending analysis for {date_str} starting at hour {first_hour} has already been completed")
                
        except json.JSONDecodeError:
            logger.warning(f"[{ENVIRONMENT}] Received invalid JSON in data update: {data}")
    except Exception as e:
        logger.error(f"[{ENVIRONMENT}] Error handling data update: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """Initialize services when the application starts."""
    redis_service.register_handler(DATA_UPDATES_CHANNEL, handle_data_update)
    
    if not redis_service.start():
        logger.warning(f"[{ENVIRONMENT}] Failed to start Redis service. Data update notifications will not work.")
    else:
        if ENVIRONMENT.lower() == "dev":
            logger.info(f"[{ENVIRONMENT}] Redis service started and ready to process updates")
        else:
            logger.info(f"[{ENVIRONMENT}] Redis service started, but this environment will not process updates")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources when the application shuts down."""
    redis_service.stop()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 