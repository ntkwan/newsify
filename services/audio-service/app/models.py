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
    url: str
    title: str
    transcript: str
    timestampedTranscript: List[Dict[str, Any]]
    length_seconds: Optional[int] = None
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