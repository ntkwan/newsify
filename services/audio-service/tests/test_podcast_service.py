import pytest
from unittest.mock import patch, MagicMock, AsyncMock, mock_open, ANY
import os
import json
from datetime import datetime, timedelta
from fastapi import HTTPException

from app.services.podcast_service import PodcastService
from app.models import Article


@pytest.fixture
def podcast_service():
    """Create a podcast service instance with mocked dependencies."""
    with patch("app.services.podcast_service.upload_service"), patch(
        "app.services.podcast_service.article_service"
    ), patch("app.services.podcast_service.openai.OpenAI"), patch(
        "app.services.podcast_service.genai"
    ), patch(
        "app.services.podcast_service.get_digitalocean_db"
    ):
        service = PodcastService()
        yield service


@pytest.mark.asyncio
async def test_summarize_article(podcast_service, sample_article):
    """Test article summarization."""
    # Setup mock response
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "This is a test summary."
    podcast_service.openai_client.chat.completions.create.return_value = mock_response

    # Call the function
    summary = await podcast_service.summarize_article(sample_article)

    # Verify results
    assert summary == "This is a test summary."
    podcast_service.openai_client.chat.completions.create.assert_called_once()


@pytest.mark.asyncio
async def test_generate_podcast_title(podcast_service):
    """Test podcast title generation."""
    # Setup test data
    articles = [MagicMock()]
    date = datetime.now()

    # Call the function
    title = await podcast_service.generate_podcast_title(articles, date)

    # Verify results
    assert isinstance(title, str)
    assert "Newsify" in title
    assert date.strftime("%B %d, %Y") in title


@pytest.mark.asyncio
async def test_generate_podcast(podcast_service, mock_db, mock_article_service):
    """Test the full podcast generation flow."""
    # Mock article service to return sample articles when called with ANY arguments
    sample_article = Article(
        url="https://example.com/test-article",
        title="Test Article Title",
        content="Test content",
        image_url="https://example.com/image.jpg",
        publish_date="2025-06-14T12:00:00",
    )

    # Create an AsyncMock that returns sample articles
    async def mock_get_articles(*args, **kwargs):
        return [sample_article]

    # Replace the method with our async mock function
    mock_article_service.get_articles_between_dates = AsyncMock(
        side_effect=mock_get_articles
    )

    # Mock summarize_article
    with patch.object(
        podcast_service, "summarize_article", new_callable=AsyncMock
    ) as mock_summarize:
        mock_summarize.return_value = "This is a test summary."

        # Mock generate_podcast_title
        with patch.object(
            podcast_service, "generate_podcast_title", new_callable=AsyncMock
        ) as mock_title:
            mock_title.return_value = "Test Podcast Title"

            # Mock generate_dual_voice_podcasts
            with patch.object(
                podcast_service, "generate_dual_voice_podcasts", new_callable=AsyncMock
            ) as mock_dual_voice:
                mock_dual_voice.return_value = {
                    "male_voice": "/tmp/test-male.mp3",
                    "female_voice": "/tmp/test-female.mp3",
                }

                # Mock generate_transcript_with_timestamps
                with patch.object(
                    podcast_service,
                    "generate_transcript_with_timestamps",
                    new_callable=AsyncMock,
                ) as mock_transcript:
                    mock_transcript.return_value = {
                        "fullTranscript": "Test transcript",
                        "timestampedTranscript": [
                            {"startTime": 0, "endTime": 1, "text": "Test"}
                        ],
                    }

                    # Mock upload_file
                    with patch(
                        "app.services.upload_service.upload_service.upload_file",
                        new_callable=AsyncMock,
                    ) as mock_upload:
                        mock_upload.side_effect = [
                            "https://example.com/podcast-female.mp3",
                            "https://example.com/podcast-male.mp3",
                        ]

                        # Mock file open operations
                        mock_open_manager = patch(
                            "builtins.open", mock_open(read_data=b"test audio data")
                        )

                        # Mock _ensure_table_exists and calculate_audio_length
                        with mock_open_manager, patch.object(
                            podcast_service,
                            "_ensure_table_exists",
                            new_callable=AsyncMock,
                        ) as mock_ensure_table, patch.object(
                            podcast_service, "calculate_audio_length"
                        ) as mock_calc_length:

                            mock_ensure_table.return_value = True
                            mock_calc_length.return_value = 60

                            # Mock os.unlink to prevent file deletion attempts
                            with patch("os.unlink"):

                                # Execute
                                now = datetime.now()
                                start_time = (now - timedelta(hours=1)).isoformat()
                                end_time = now.isoformat()

                                result = await podcast_service.generate_podcast(
                                    start_time, end_time, mock_db
                                )

                                # Verify results
                                assert "url" in result
                                assert isinstance(result["url"], dict)
                                assert "title" in result
                                assert result["title"] == "Test Podcast Title"
                                assert "script" in result
                                assert "timestampedTranscript" in result
                                assert "length_seconds" in result


@pytest.mark.asyncio
async def test_ensure_table_exists(podcast_service):
    """Test the function that ensures the podcast table exists."""
    with patch("app.services.podcast_service.inspect") as mock_inspect:
        # Setup mock inspector
        mock_inspector = MagicMock()
        mock_inspect.return_value = mock_inspector
        mock_inspector.get_table_names.return_value = ["Podcast"]

        # Call function
        result = await podcast_service._ensure_table_exists(None)

        # Verify results
        assert result == True
        mock_inspector.get_table_names.assert_called_once()


@pytest.mark.asyncio
async def test_ensure_table_doesnt_exist(podcast_service):
    """Test table creation when it doesn't exist."""
    with patch("app.services.podcast_service.inspect") as mock_inspect:
        # Setup mock inspector that indicates table doesn't exist
        mock_inspector = MagicMock()
        mock_inspect.return_value = mock_inspector
        mock_inspector.get_table_names.return_value = ["OtherTable"]

        # Setup metadata and engine mocks
        with patch("app.services.database.metadata") as mock_metadata, patch(
            "app.services.database.digitalocean_engine"
        ) as mock_engine:

            # Call function
            result = await podcast_service._ensure_table_exists(None)

            # Verify results
            assert result == True
            mock_metadata.create_all.assert_called_once()


@pytest.mark.asyncio
async def test_text_to_speech(podcast_service):
    """Test text-to-speech conversion."""
    # Mock OpenAI client response
    mock_response = MagicMock()
    podcast_service.openai_client.audio.speech.create.return_value = mock_response

    # Mock tempfile
    mock_temp_file = MagicMock()
    mock_temp_file.name = "/tmp/test-audio.mp3"

    # Mock NamedTemporaryFile
    with patch("tempfile.NamedTemporaryFile", return_value=mock_temp_file):
        # Call the function
        result = await podcast_service.text_to_speech("This is a test text", "alloy")

        # Verify the results
        assert result == "/tmp/test-audio.mp3"
        podcast_service.openai_client.audio.speech.create.assert_called_once_with(
            model=podcast_service.openai_tts_model,
            voice="alloy",
            input="This is a test text",
            speed=1.0,
        )
        mock_response.stream_to_file.assert_called_once_with(mock_temp_file.name)


@pytest.mark.asyncio
async def test_text_to_speech_error(podcast_service):
    """Test error handling in text-to-speech conversion."""
    # Mock OpenAI client to throw an exception
    podcast_service.openai_client.audio.speech.create.side_effect = Exception(
        "API error"
    )

    # Call the function and expect exception
    with pytest.raises(HTTPException) as excinfo:
        await podcast_service.text_to_speech("This is a test text")

    # Verify the error message
    assert "Error converting text to speech: API error" in str(excinfo.value.detail)


@pytest.mark.asyncio
async def test_generate_dual_voice_podcasts(podcast_service):
    """Test generating podcasts with dual voices."""
    # Mock the text_to_speech method
    with patch.object(
        podcast_service, "text_to_speech", new_callable=AsyncMock
    ) as mock_tts:
        mock_tts.side_effect = ["/tmp/female.mp3", "/tmp/male.mp3"]

        # Call the function
        result = await podcast_service.generate_dual_voice_podcasts(
            "Test podcast script"
        )

        # Verify the results
        assert result == {
            "female_voice": "/tmp/female.mp3",
            "male_voice": "/tmp/male.mp3",
        }

        # Verify text_to_speech calls
        assert mock_tts.call_count == 2
        mock_tts.assert_any_call("Test podcast script", voice="alloy")
        mock_tts.assert_any_call("Test podcast script", voice="echo")


@pytest.mark.asyncio
async def test_generate_transcript_with_timestamps(podcast_service):
    """Test generating transcript with timestamps."""
    # Mock file operations
    mock_file_data = b"mock audio data"
    mock_file = mock_open(read_data=mock_file_data)

    # Mock Gemini model and responses
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_timestamp_response = MagicMock()

    mock_response.text = "This is a test transcript"

    mock_timestamp_response.text = """```json
{
  "fullTranscript": "This is a test transcript",
  "timestampedTranscript": [
    {
      "startTime": 0.0,
      "endTime": 2.5,
      "text": "This is a test transcript"
    }
  ]
}
```"""

    mock_model.generate_content.side_effect = [mock_response, mock_timestamp_response]

    # Mock genai.GenerativeModel
    with patch(
        "app.services.podcast_service.genai.GenerativeModel", return_value=mock_model
    ), patch("builtins.open", mock_file):

        # Call the function
        result = await podcast_service.generate_transcript_with_timestamps(
            "/tmp/test-audio.mp3"
        )

        # Verify results
        assert result["fullTranscript"] == "This is a test transcript"
        assert len(result["timestampedTranscript"]) == 1
        assert result["timestampedTranscript"][0]["startTime"] == 0.0
        assert result["timestampedTranscript"][0]["endTime"] == 2.5
        assert result["timestampedTranscript"][0]["text"] == "This is a test transcript"

        # Verify that the model was called twice
        assert mock_model.generate_content.call_count == 2


@pytest.mark.asyncio
async def test_generate_transcript_with_timestamps_json_error(podcast_service):
    """Test handling JSON parsing errors in transcript generation."""
    # Mock file operations
    mock_file_data = b"mock audio data"
    mock_file = mock_open(read_data=mock_file_data)

    # Mock Gemini model and responses
    mock_model = MagicMock()
    mock_response = MagicMock()
    mock_timestamp_response = MagicMock()

    mock_response.text = "This is a test transcript"
    mock_timestamp_response.text = "Invalid JSON"  # This will cause a JSON parse error

    mock_model.generate_content.side_effect = [mock_response, mock_timestamp_response]

    # Mock generate_smart_timestamps
    with patch(
        "app.services.podcast_service.genai.GenerativeModel", return_value=mock_model
    ), patch("builtins.open", mock_file), patch.object(
        podcast_service, "generate_smart_timestamps"
    ) as mock_smart_timestamps:

        mock_smart_timestamps.return_value = {
            "fullTranscript": "This is a test transcript",
            "timestampedTranscript": [
                {"startTime": 0, "endTime": 3, "text": "This is a test transcript"}
            ],
        }

        # Call the function
        result = await podcast_service.generate_transcript_with_timestamps(
            "/tmp/test-audio.mp3"
        )

        # Verify fallback was called
        mock_smart_timestamps.assert_called_once_with("This is a test transcript")

        # Verify results from fallback
        assert result["fullTranscript"] == "This is a test transcript"
        assert len(result["timestampedTranscript"]) == 1


def test_calculate_audio_length_ffprobe(podcast_service):
    """Test calculating audio length using ffprobe."""
    # Mock subprocess
    mock_output = b"60.5\n"  # 60.5 seconds

    with patch("subprocess.check_output", return_value=mock_output):
        # Call the function
        length = podcast_service.calculate_audio_length("/tmp/test-audio.mp3")

        # Verify the result
        assert length == 60  # int(60.5) = 60


def test_calculate_audio_length_wav(podcast_service):
    """Test calculating audio length for WAV files."""
    # Mock subprocess to fail
    with patch("subprocess.check_output", side_effect=Exception("Command failed")):
        # Mock wave module
        mock_wave_file = MagicMock()
        mock_wave_file.getnframes.return_value = 48000  # 1 second at 48kHz
        mock_wave_file.getframerate.return_value = 48000

        # Mock wave.open and os.path functions
        with patch("wave.open", return_value=mock_wave_file), patch(
            "os.path.exists", return_value=True
        ), patch("os.path.isfile", return_value=True):
            # Call the function
            length = podcast_service.calculate_audio_length("/tmp/test-audio.wav")

            # Verify the result
            assert length == 1  # 48000 / 48000 = 1


def test_calculate_audio_length_fallback(podcast_service):
    """Test calculating audio length with the file size fallback method."""
    # Mock subprocess to fail
    with patch("subprocess.check_output", side_effect=Exception("Command failed")):
        # Mock file size and file existence
        with patch("os.path.getsize", return_value=128 * 1024), patch(
            "os.path.exists", return_value=True
        ), patch("os.path.isfile", return_value=True), patch(
            "wave.open", side_effect=Exception("Not a WAV file")
        ):  # Force fallback method
            # Call the function with non-WAV file
            length = podcast_service.calculate_audio_length("/tmp/test-audio.mp3")

            # Verify the result (128KB at 128kbps = 8 seconds)
            assert length == 8


def test_calculate_audio_length_error(podcast_service):
    """Test error handling in audio length calculation."""
    # Mock all methods to throw exceptions
    with patch(
        "subprocess.check_output", side_effect=Exception("Command failed")
    ), patch("os.path.getsize", side_effect=Exception("File error")), patch(
        "wave.open", side_effect=Exception("Wave error")
    ):

        # Call the function
        length = podcast_service.calculate_audio_length("/tmp/test-audio.mp3")

        # Verify fallback to 0
        assert length == 0
