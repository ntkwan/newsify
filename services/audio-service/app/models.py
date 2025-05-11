from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class Article(BaseModel):
    """Model for an article."""
    url: str
    src: Optional[str] = None
    language: Optional[str] = None
    categories: Optional[List[str]] = None
    main_category: Optional[str] = None
    title: str
    content: str
    image_url: Optional[str] = None
    publish_date: Optional[str] = None
    author: Optional[str] = None
    summary: Optional[str] = None
    uploaded_date: Optional[str] = None


class TranscriptLine(BaseModel):
    """Model for a line in a transcript."""
    start_time: float
    end_time: float
    text: str


class PodcastResponse(BaseModel):
    """Response model for podcast generation."""
    url: Dict[str, str] = Field(
        ..., 
        description="URLs for different voices with voice types as keys (e.g., 'male_voice', 'female_voice')"
    )
    title: str
    script: str
    timestampedTranscript: Dict[str, List[Dict[str, Any]]] = Field(
        ..., 
        description="Timestamped transcript for each voice type with voice types as keys"
    )
    length_seconds: Optional[Dict[str, int]] = Field(
        None, 
        description="Length in seconds for each voice type with voice types as keys"
    )
    links: Optional[List[str]] = None


class GeneratePodcastRequest(BaseModel):
    """Model representing a request to generate a podcast."""
    startTime: str = Field(..., description="Start time in ISO string format (YYYY-MM-DDTHH:mm:ss)")
    endTime: str = Field(..., description="End time in ISO string format (YYYY-MM-DDTHH:mm:ss)")


class ScriptSection(BaseModel):
    """Model for a section of a podcast script."""
    text: str
    type: str
    article_title: Optional[str] = None 