from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import random
from datetime import timedelta
import asyncio
import os

from .models import PodcastResponse
from .services.podcast_service import podcast_service
from .services.redis_service import redis_service
from .services.database import get_digitalocean_db

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("app.main")

load_dotenv()

ENVIRONMENT = os.getenv("ENV", "unknown")

logger.info(f"Starting audio service in {ENVIRONMENT} environment")

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
        logger.info(f"[{ENVIRONMENT}] Received data update notification: {data}")
        
        if ENVIRONMENT.lower() != "dev":
            logger.info(f"[{ENVIRONMENT}] Skipping update processing - this environment is not configured to process updates")
            return
        
        try:
            data_dict = json.loads(data)
            print(data_dict)
            update_type = data_dict.get('update_type')
            update_time = data_dict.get('timestamp')

            logger.info(f"[{ENVIRONMENT}] Processing data update: type={update_type}, time={update_time}")
            if update_type == 'general' and 'details' in data_dict:
                details = data_dict.get('details', {})
                available_hours = details.get('hours', [])
                date_str = details.get('date')
                time_range = data_dict.get('time_range', {})
                
                if available_hours and date_str and time_range:
                    time_from = time_range.get('from', '')  
                    time_to = time_range.get('to', '')      
                    
                    logger.info(f"[{ENVIRONMENT}] Using time range from: {time_from} to: {time_to}")
                    
                    try:
                        start_time = datetime.fromisoformat(time_from.replace('Z', '+00:00'))
                        end_time = datetime.fromisoformat(time_to.replace('Z', '+00:00'))
                        
                        if not start_time or not end_time:
                            raise ValueError("Failed to parse time_range")
                        
                        time_window = {
                            "start": start_time.isoformat(),
                            "end": end_time.isoformat(),
                            "from": time_from,
                            "to": time_to
                        }
                        
                        logger.info(f"[{ENVIRONMENT}] Using time window from time_range: {time_window}")
                    except Exception as time_parse_error:
                        logger.warning(f"[{ENVIRONMENT}] Failed to parse time_range: {str(time_parse_error)}")
                        raise time_parse_error
                    
                    lock_key = f"podcast_lock:{ENVIRONMENT}:{date_str}:{start_time.date()}_{start_time.hour}-{end_time.date()}_{end_time.hour}"
                    lock_expiry = 3600  # 1 hour in seconds
                    
                    if redis_service.client and redis_service.client.set(lock_key, "1", ex=lock_expiry, nx=True):
                        logger.info(f"[{ENVIRONMENT}] Acquired lock for time window: {lock_key}")
                        
                        db = next(get_digitalocean_db())
                        
                        try:
                            logger.info(f"[{ENVIRONMENT}] Generating podcast for time window: {time_window['start']} to {time_window['end']}")
                            podcast_result = asyncio.run(podcast_service.generate_podcast(
                                time_window["end"],
                                time_window["end"],
                                db
                            ))
                            logger.info(f"[{ENVIRONMENT}] Successfully generated podcast for time range {start_time.isoformat()} to {end_time.isoformat()}")
                            logger.info(f"[{ENVIRONMENT}] Podcast URL: {podcast_result.get('url', 'N/A')}")
                            
                            completion_key = f"podcast_completed:{ENVIRONMENT}:{date_str}:{start_time.date()}_{start_time.hour}-{end_time.date()}_{end_time.hour}"
                            redis_service.client.set(completion_key, "1", ex=2 * 3600)  # Keep for 2 hours
                        except Exception as podcast_error:
                            logger.error(f"[{ENVIRONMENT}] Failed to generate podcast: {str(podcast_error)}")
                            redis_service.client.delete(lock_key)
                    else:
                        logger.info(f"[{ENVIRONMENT}] Lock acquisition failed for {lock_key}, podcast generation already in progress or completed by another instance")
                        completion_key = f"podcast_completed:{ENVIRONMENT}:{date_str}:{start_time.date()}_{start_time.hour}-{end_time.date()}_{end_time.hour}"
                        if redis_service.client and redis_service.client.exists(completion_key):
                            logger.info(f"[{ENVIRONMENT}] Podcast for time range {time_from} to {time_to} has already been generated")
                
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

@app.get("/")
async def root():
    return {
        "status": "ok", 
        "service": "audio-service", 
        "environment": ENVIRONMENT,
        "processing_updates": ENVIRONMENT.lower() == "dev"
    }
        
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
    
    Returns:
    - **url**: Dictionary with URLs for different voice types (male_voice, female_voice)
    - **title**: Podcast title
    - **script**: Full podcast script
    - **timestampedTranscript**: Dictionary with transcript for each voice type
    - **length_seconds**: Dictionary with length for each voice type in seconds
    - **links**: List of URLs to the original articles
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True) 