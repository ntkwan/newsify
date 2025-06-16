import pytest
from unittest.mock import patch, MagicMock
import json
from datetime import datetime, timedelta

from app.services.article_service import ArticleService
from app.models import Article


@pytest.fixture
def article_service():
    """Create an ArticleService instance."""
    service = ArticleService()
    return service


@pytest.mark.asyncio
async def test_get_articles_between_dates(article_service, mock_db):
    """Test retrieving articles by time range."""
    # Mock the database response
    mock_result = MagicMock()
    mock_result.fetchall.return_value = [
        {
            "url": "https://example.com/article1",
            "title": "Test Article 1",
            "content": "Test content 1",
            "image_url": "https://example.com/image1.jpg",
            "publish_date": datetime.fromisoformat("2025-06-14T10:00:00"),
            "author": "Author 1",
            "src": "Source 1",
            "language": "en",
            "categories": ["Technology"],
            "main_category": "Technology",
            "summary": "Summary 1",
            "uploaded_date": datetime.fromisoformat("2025-06-14T10:30:00"),
        },
        {
            "url": "https://example.com/article2",
            "title": "Test Article 2",
            "content": "Test content 2",
            "image_url": "https://example.com/image2.jpg",
            "publish_date": datetime.fromisoformat("2025-06-14T11:00:00"),
            "author": "Author 2",
            "src": "Source 2",
            "language": "en",
            "categories": ["Science"],
            "main_category": "Science",
            "summary": "Summary 2",
            "uploaded_date": datetime.fromisoformat("2025-06-14T11:30:00"),
        },
    ]

    # Mock the database execution
    mock_db.execute.return_value = mock_result

    # Define time range
    now = datetime.now()
    start_time = (now - timedelta(hours=2)).isoformat()
    end_time = now.isoformat()

    # Call the function
    articles = await article_service.get_articles_between_dates(
        start_time, end_time, mock_db
    )

    # Verify results
    assert len(articles) == 2
    assert articles[0].url == "https://example.com/article1"
    assert articles[0].title == "Test Article 1"
    assert articles[1].url == "https://example.com/article2"
    assert articles[1].title == "Test Article 2"

    # Verify database was called with correct parameters
    mock_db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_articles_between_dates_empty(article_service, mock_db):
    """Test retrieving articles when none are available in the time range."""
    # Mock the database response
    mock_result = MagicMock()
    mock_result.fetchall.return_value = []

    # Mock the database execution
    mock_db.execute.return_value = mock_result

    # Define time range
    now = datetime.now()
    start_time = (now - timedelta(hours=2)).isoformat()
    end_time = now.isoformat()

    # Call the function
    articles = await article_service.get_articles_between_dates(
        start_time, end_time, mock_db
    )

    # Verify results
    assert len(articles) == 0

    # Verify database was called with correct parameters
    mock_db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_articles_between_dates_invalid_dates(article_service, mock_db):
    """Test error handling for invalid date formats."""
    # Call with invalid dates
    with pytest.raises(Exception):
        await article_service.get_articles_between_dates("invalid", "invalid", mock_db)

    # Verify DB was not called
    mock_db.execute.assert_not_called()


def test_select_diverse_articles(article_service):
    """Test selecting diverse articles from different categories."""
    # Create test articles
    articles = [
        Article(
            url="https://example.com/article1",
            title="Tech Article 1",
            content="Content 1",
            main_category="Technology",
            publish_date="2025-06-14T10:00:00",
        ),
        Article(
            url="https://example.com/article2",
            title="Tech Article 2",
            content="Content 2",
            main_category="Technology",
            publish_date="2025-06-14T09:00:00",
        ),
        Article(
            url="https://example.com/article3",
            title="Science Article",
            content="Content 3",
            main_category="Science",
            publish_date="2025-06-14T08:00:00",
        ),
        Article(
            url="https://example.com/article4",
            title="Politics Article",
            content="Content 4",
            main_category="Politics",
            publish_date="2025-06-14T07:00:00",
        ),
        Article(
            url="https://example.com/article5",
            title="Sports Article",
            content="Content 5",
            main_category="Sports",
            publish_date="2025-06-14T06:00:00",
        ),
    ]

    # Test case 1: Select fewer articles than available
    selected = article_service.select_diverse_articles(articles, 3)
    assert len(selected) == 3

    # Verify we have diverse categories
    categories = [article.main_category for article in selected]
    assert len(set(categories)) == 3

    # Test case 2: Select more articles than available
    selected = article_service.select_diverse_articles(articles, 10)
    assert len(selected) == 5

    # Test case 3: Select same number of articles as available
    selected = article_service.select_diverse_articles(articles, 5)
    assert len(selected) == 5
