import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import asyncio
import sys
import os

# Add project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.database import get_digitalocean_db
from app.models import Article


@pytest.fixture
def mock_db():
    """Fixture to mock the database session."""
    mock_session = MagicMock()
    return mock_session


@pytest.fixture
def mock_db_dependency():
    """Fixture to mock the database session dependency."""
    with patch("app.services.database.get_digitalocean_db") as mock_get_db:
        mock_session = MagicMock()
        mock_get_db.return_value = mock_session
        yield mock_get_db


@pytest.fixture
def sample_article():
    """Return a sample article for testing."""
    return Article(
        url="https://example.com/test-article",
        title="Test Article Title",
        content="This is the content of the test article. It contains enough text to test the service.",
        image_url="https://example.com/image.jpg",
        publish_date="2025-06-14T12:00:00",
        author="Test Author",
        src="Example News",
        language="en",
        categories=["Technology", "Science"],
        main_category="Technology",
        summary="This is a summary of the test article.",
        uploaded_date="2025-06-14T12:30:00",
    )


@pytest.fixture
def mock_redis_client():
    """Fixture to mock Redis client."""
    mock_client = MagicMock()
    with patch("app.services.redis_service.redis_service.client", mock_client):
        yield mock_client


@pytest.fixture
def mock_openai_client():
    """Fixture to mock OpenAI client."""
    mock_client = MagicMock()
    with patch("app.services.podcast_service.openai.OpenAI") as mock_openai:
        mock_openai.return_value = mock_client
        yield mock_client


@pytest.fixture
def mock_genai():
    """Fixture to mock Google Generative AI."""
    with patch("app.services.podcast_service.genai") as mock_genai:
        yield mock_genai


@pytest.fixture
def mock_upload_service():
    """Fixture to mock the upload service."""
    with patch("app.services.podcast_service.upload_service") as mock_service:
        yield mock_service


@pytest.fixture
def mock_article_service():
    """Fixture to mock the article service."""
    with patch("app.services.podcast_service.article_service") as mock_service:
        mock_service.get_articles_between_dates = AsyncMock()
        mock_service.get_articles_between_dates.return_value = []
        yield mock_service


@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for each test."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
