from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import os
from typing import List
from dotenv import load_dotenv

from .models import PodcastResponse, GeneratePodcastRequest
from .services.podcast_service import podcast_service

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

@app.get("/")
async def root():
    return {"status": "ok", "service": "audio-service"}

@app.post("/podcast", response_model=PodcastResponse, status_code=201)
async def generate_podcast(request: GeneratePodcastRequest):
    """
    Generate a podcast from articles within a date range.
    
    - **startTime**: Start time in ISO format (YYYY-MM-DDTHH:mm:ss)
    - **endTime**: End time in ISO format (YYYY-MM-DDTHH:mm:ss)
    
    Returns the URL to the generated podcast, full transcript, and timestamped transcript.
    """
    try:
        # Validate date format
        try:
            datetime.fromisoformat(request.startTime.replace('Z', '+00:00'))
            datetime.fromisoformat(request.endTime.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Invalid date format. Use ISO format (YYYY-MM-DDTHH:mm:ss)"
            )
        
        result = await podcast_service.generate_podcast(
            request.startTime,
            request.endTime
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