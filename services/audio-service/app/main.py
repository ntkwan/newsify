from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from .models import PodcastResponse, Article
from .services.podcast_service import podcast_service
from .services.article_service import article_service
from .services.redis_service import redis_service
from .services.database import get_supabase_db, get_digitalocean_db

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("app.main")

load_dotenv()

app = FastAPI(
    title="Audio Service API",
    description="API for generating podcasts from articles",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_UPDATES_CHANNEL = "data-updates"

def handle_data_update(message: Dict[str, Any]) -> None:
    """
    Handle data update notifications from Redis.
    
    Args:
        message: Redis message with data update information
    """
    try:
        data = message.get('data', '{}')
        logger.info(f"Received data update notification: {data}")
        
        try:
            data_dict = json.loads(data)
            update_type = data_dict.get('type')
            update_time = data_dict.get('timestamp')
            
            logger.info(f"Processing data update: type={update_type}, time={update_time}")
                
        except json.JSONDecodeError:
            logger.warning(f"Received invalid JSON in data update: {data}")
    except Exception as e:
        logger.error(f"Error handling data update: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """Initialize services when the application starts."""
    redis_service.register_handler(DATA_UPDATES_CHANNEL, handle_data_update)
    
    if not redis_service.start():
        logger.warning("Failed to start Redis service. Data update notifications will not work.")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources when the application shuts down."""
    redis_service.stop()

@app.get("/")
async def root():
    return {"status": "ok", "service": "audio-service"}
        
@app.post("/podcast", response_model=PodcastResponse, status_code=201)
async def generate_podcast(
    startTime: str = Query(..., description="Start time in ISO format (YYYY-MM-DDTHH:mm:ss)"),
    endTime: str = Query(..., description="End time in ISO format (YYYY-MM-DDTHH:mm:ss)"),
    db: Session = Depends(get_digitalocean_db)
):
    """
    Generate a podcast from articles within a date range.
    
    - **startTime**: Start time in ISO format (YYYY-MM-DDTHH:mm:ss)
    - **endTime**: End time in ISO format (YYYY-MM-DDTHH:mm:ss)
    
    Returns the URL to the generated podcast, full transcript, and timestamped transcript.
    """
    try:
        try:
            datetime.fromisoformat(startTime.replace('Z', '+00:00'))
            datetime.fromisoformat(endTime.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Invalid date format. Use ISO format (YYYY-MM-DDTHH:mm:ss)"
            )
        
        result = await podcast_service.generate_podcast(
            startTime,
            endTime,
            db
        )
        
        return result
        
    except HTTPException as e:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while generating the podcast: {str(e)}"
        )

@app.post("/process-updates", status_code=202)
async def process_updates():
    """
    Manually trigger processing of recent data updates.
    This endpoint can be called to process data without waiting for Redis notifications.
    """
    try:
        logger.info("Manual update processing triggered")
        return {"status": "processing", "message": "Update processing initiated"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process updates: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True) 