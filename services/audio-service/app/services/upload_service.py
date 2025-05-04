import os
import boto3
from fastapi import UploadFile, HTTPException
import uuid
from dotenv import load_dotenv

load_dotenv()

class UploadService:
    """Service for handling file uploads to S3-compatible storage."""
    
    def __init__(self):
        """Initialize the S3 client with configuration from environment variables."""
        self.s3 = boto3.client(
            's3',
            endpoint_url=os.getenv('DO_SPACES_ENDPOINT'),
            aws_access_key_id=os.getenv('DO_SPACES_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('DO_SPACES_SECRET_KEY'),
            region_name='singapore-1'  # DigitalOcean Spaces default region
        )
        self.bucket = os.getenv('DO_SPACES_BUCKET')
        
        if not self.bucket:
            print("Warning: DO_SPACES_BUCKET is not configured")
    
    async def upload_file(self, file_data: bytes, original_filename: str, folder_name: str) -> str:
        """
        Upload a file to the configured S3 bucket.
        
        Args:
            file_data: The binary content of the file
            original_filename: The original filename
            folder_name: The folder to store the file in
            
        Returns:
            URL of the uploaded file
        """
        try:
            if not self.bucket:
                raise HTTPException(status_code=500, detail="Bucket name is not configured")
            
            file_key = f"{folder_name}/{uuid.uuid4()}-{original_filename}"
            
            self.s3.put_object(
                Bucket=self.bucket,
                Key=file_key,
                Body=file_data,
                ContentType='audio/mpeg',
                ACL='public-read'
            )
            
            endpoint = os.getenv('DO_SPACES_ENDPOINT').replace('https://', '')
            url = f"https://{self.bucket}.{endpoint}/{file_key}"
            
            return url
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

upload_service = UploadService() 