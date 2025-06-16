import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import json

from app.main import app


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


def test_root_endpoint(test_client):
    """Test the root endpoint returns the correct status."""
    with patch("app.main.ENVIRONMENT", "test"):
        response = test_client.get("/")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert response.json()["service"] == "audio-service"
        assert response.json()["environment"] == "test"
        assert response.json()["processing_updates"] == False


@pytest.mark.asyncio
async def test_generate_podcast_endpoint(test_client, mock_db, mock_article_service):
    """Test the podcast generation endpoint."""
    # Mock the podcast service to return a predefined response
    podcast_result = {
        "url": {
            "male_voice": "https://example.com/podcast-male.mp3",
            "female_voice": "https://example.com/podcast-female.mp3"
        },
        "title": "Test Podcast",
        "script": "This is a test podcast script.",
        "timestampedTranscript": {
            "male_voice": [{"start_time": 0, "end_time": 2, "text": "Test"}],
            "female_voice": [{"start_time": 0, "end_time": 2, "text": "Test"}]
        },
        "length_seconds": {
            "male_voice": 60,
            "female_voice": 55
        },
        "links": ["https://example.com/article1"]
    }
    
    with patch("app.main.podcast_service.generate_podcast", return_value=podcast_result):
        # Current time for testing
        now = datetime.now()
        start_time = (now - timedelta(hours=1)).isoformat()
        end_time = now.isoformat()
        
        response = test_client.post(f"/podcast?startTime={start_time}&endTime={end_time}")
        
        assert response.status_code == 201
        result = response.json()
        assert result["title"] == "Test Podcast"
        assert result["url"]["male_voice"] == "https://example.com/podcast-male.mp3"
        assert result["url"]["female_voice"] == "https://example.com/podcast-female.mp3"
        assert len(result["links"]) == 1


def test_generate_podcast_invalid_dates(test_client):
    """Test podcast generation with invalid date formats."""
    response = test_client.post("/podcast?startTime=invalid&endTime=invalid")
    
    assert response.status_code == 400
    assert "Invalid date format" in response.json()["detail"]


@pytest.mark.asyncio
async def test_handle_data_update(mock_redis_client):
    """Test handling data update from Redis."""
    from app.main import handle_data_update
    
    with patch("app.main.ENVIRONMENT", "dev"):
        with patch("app.main.get_digitalocean_db") as mock_get_db:
            db_session = MagicMock()
            mock_get_db.return_value = db_session
            
            # Create a mock message with data update info
            now = datetime.now()
            start_time = (now - timedelta(hours=1)).isoformat()
            end_time = now.isoformat()
            
            message = {
                "data": json.dumps({
                    "update_type": "general",
                    "timestamp": now.isoformat(),
                    "details": {
                        "hours": [10, 11, 12],
                        "date": now.strftime("%Y-%m-%d")
                    },
                    "time_range": {
                        "from": start_time,
                        "to": end_time
                    }
                })
            }
            
            # Mock the Redis set function to return True (indicating lock acquisition)
            mock_redis_client.set.return_value = True
            
            # Mock the podcast generation
            with patch("app.main.asyncio.run") as mock_run:
                mock_run.return_value = {"url": "https://example.com/podcast.mp3"}
                
                # Call the handler
                handle_data_update(message)
                
                # Verify podcast generation was called
                mock_run.assert_called_once()
