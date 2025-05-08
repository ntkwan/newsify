from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
import random
from datetime import timedelta
import asyncio

from .models import PodcastResponse
from .services.podcast_service import podcast_service
from .services.redis_service import redis_service
from .services.database import get_digitalocean_db

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("app.main")

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
        
        try:
            data_dict = json.loads(data)
            update_type = data_dict.get('update_type')
            update_time = data_dict.get('timestamp')

            logger.info(f"Processing data update: type={update_type}, time={update_time}")
            
            
            if update_type == 'general' and 'details' in data_dict:
                details = data_dict.get('details', {})
                available_hours = details.get('hours', [])
                date_str = details.get('date')
                
                if available_hours and date_str:
                    selected_hour = random.choice(available_hours)
                    
                    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
                    start_time = date_obj.replace(hour=selected_hour, minute=0, second=0)
                    end_time = start_time + timedelta(hours=1)
                    
                    time_window = {
                        "start": start_time.isoformat(),
                        "end": end_time.isoformat(),
                        "hour": selected_hour,
                        "date": date_str
                    }
                    
                    logger.info(f"Selected time window: {time_window}")
                    
                    lock_key = f"podcast_lock:{date_str}:{selected_hour}"
                    lock_expiry = 3600  # 1 hour in seconds
                    
                    if redis_service.client and redis_service.client.set(lock_key, "1", ex=lock_expiry, nx=True):
                        logger.info(f"Acquired lock for time window: {lock_key}")
                        
                        db = next(get_digitalocean_db())
                        
                        try:
                            logger.info(f"Generating podcast for time window: {time_window['start']} to {time_window['end']}")
                            podcast_result = asyncio.run(podcast_service.generate_podcast(
                                time_window["start"],
                                time_window["end"],
                                db
                            ))
                            logger.info(f"Successfully generated podcast for time window: {selected_hour}h on {date_str}")
                            logger.info(f"Podcast URL: {podcast_result.get('url', 'N/A')}")
                            
                            completion_key = f"podcast_completed:{date_str}:{selected_hour}"
                            redis_service.client.set(completion_key, "1", ex=2 * 3600)  # Keep for 2 hours
                        except Exception as podcast_error:
                            logger.error(f"Failed to generate podcast: {str(podcast_error)}")
                            redis_service.client.delete(lock_key)
                    else:
                        logger.info(f"Lock acquisition failed for {lock_key}, podcast generation already in progress or completed by another instance")
                        completion_key = f"podcast_completed:{date_str}:{selected_hour}"
                        if redis_service.client and redis_service.client.exists(completion_key):
                            logger.info(f"Podcast for {date_str} hour {selected_hour} has already been generated")
                
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