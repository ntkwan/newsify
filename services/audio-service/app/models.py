from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Article(BaseModel):
    """Model representing an article from the articles service."""
    url: str
    src: Optional[str] = None
    language: Optional[str] = None
    categories: Optional[List[str]] = None
    title: str
    content: str
    image_url: Optional[str] = None
    publish_date: Optional[str] = None
    author: Optional[str] = None

class TranscriptLine(BaseModel):
    """Model representing a line in the podcast transcript with timestamps."""
    startTime: float = Field(..., description="Start time of this line in seconds")
    endTime: float = Field(..., description="End time of this line in seconds")
    text: str = Field(..., description="Text content of this line")


class PodcastResponse(BaseModel):
    """Model representing a response from the podcast generation API."""
    url: str = Field(..., description="URL to the generated podcast audio file")
    title: str = Field(..., description="Title of the podcast")
    transcript: str = Field(..., description="Complete transcript of the podcast")
    timestampedTranscript: List[TranscriptLine] = Field(..., description="Transcript with timestamps for each line")
    length_seconds: int = Field(..., description="Length of the podcast in seconds")


class GeneratePodcastRequest(BaseModel):
    """Model representing a request to generate a podcast."""
    startTime: str = Field(..., description="Start time in ISO string format (YYYY-MM-DDTHH:mm:ss)")
    endTime: str = Field(..., description="End time in ISO string format (YYYY-MM-DDTHH:mm:ss)")


class ScriptSection:
    """Class representing a section of the podcast script."""
    def __init__(self, text: str, type: str, article_title: Optional[str] = None):
        self.text = text
        self.type = type  # 'intro', 'article', or 'outro'
        self.article_title = article_title 