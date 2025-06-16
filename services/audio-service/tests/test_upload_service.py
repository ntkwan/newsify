import pytest
from unittest.mock import patch, MagicMock, mock_open
import os
import tempfile
from fastapi import HTTPException

from app.services.upload_service import UploadService


@pytest.fixture
def upload_service():
    """Create an UploadService instance."""
    with patch("boto3.client") as mock_boto3_client:
        service = UploadService()
        service.s3 = MagicMock()
        yield service


@pytest.mark.asyncio
async def test_upload_file(upload_service):
    """Test uploading a file to S3."""
    # Create test data
    file_data = b"test audio data"
    filename = "test.mp3"
    folder = "podcasts"

    # Mock environment variables and reset bucket
    with patch.dict(
        "os.environ",
        {
            "DO_SPACES_ENDPOINT": "https://test.digitaloceanspaces.com",
            "DO_SPACES_BUCKET": "test-bucket",
        },
    ):
        # Set the bucket manually to ensure it matches our test value
        upload_service.bucket = "test-bucket"

        # Mock the S3 put_object method
        upload_service.s3.put_object = MagicMock()

        # Call the method
        result = await upload_service.upload_file(file_data, filename, folder)

        # Verify results - check parts of the URL instead of the exact match
        assert "test-bucket.test.digitaloceanspaces.com" in result
        assert "podcasts/" in result
        assert filename in result
        upload_service.s3.put_object.assert_called_once()


@pytest.mark.asyncio
async def test_upload_file_error(upload_service):
    """Test error handling in file upload."""
    # Create test data
    file_data = b"test audio data"
    filename = "test.mp3"
    folder = "podcasts"

    # Mock environment variables and manually set empty bucket to trigger error
    with patch.dict(
        "os.environ",
        {
            "DO_SPACES_ENDPOINT": "https://test.digitaloceanspaces.com",
            "DO_SPACES_BUCKET": "",  # Empty bucket name to trigger error
        },
    ):
        # Explicitly set the bucket to empty
        upload_service.bucket = ""

        # Call the method and expect an exception
        with pytest.raises(HTTPException) as excinfo:
            await upload_service.upload_file(file_data, filename, folder)

        # Verify the exception message
        assert "Bucket name is not configured" in str(excinfo.value.detail)


@pytest.mark.asyncio
async def test_upload_file_s3_exception(upload_service):
    """Test error handling when S3 raises an exception."""
    # Create test data
    file_data = b"test audio data"
    filename = "test.mp3"
    folder = "podcasts"

    # Mock environment variables
    with patch.dict(
        "os.environ",
        {
            "DO_SPACES_ENDPOINT": "https://test.digitaloceanspaces.com",
            "DO_SPACES_BUCKET": "test-bucket",
        },
    ):
        # Setup S3 to raise an exception
        upload_service.s3.put_object.side_effect = Exception("Upload failed")

        # Call the method and expect an exception
        with pytest.raises(HTTPException) as excinfo:
            await upload_service.upload_file(file_data, filename, folder)

        # Verify the exception message
        assert "Error uploading file: Upload failed" in str(excinfo.value.detail)
