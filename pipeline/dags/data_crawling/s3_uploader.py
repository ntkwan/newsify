import boto3
import json
import tempfile
import pytz
from datetime import datetime
from nanoid import generate
import os
from dotenv import load_dotenv

class S3BatchUploader:
    def __init__(self):
        load_dotenv()
        self.bucket_name =os.getenv('S3_BUCKET_NAME')
        self.batch_size = 1000
        self.prefix = 'raw_data'
        self.client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_DEFAULT_REGION')
        )
        self.items = []
        self.batch_number = 1

    def _get_s3_key(self):
        vn_now = datetime.utcnow().replace(tzinfo=pytz.utc).astimezone(pytz.timezone('Asia/Ho_Chi_Minh'))
        date_folder = vn_now.strftime('%Y-%m-%d')
        nanoid = generate(size=10)
        return f"{self.prefix}/{date_folder}/batch_{self.batch_number}_{nanoid}.json"

    def _upload_batch(self):
        if not self.items:
            return
        tmpfile = tempfile.NamedTemporaryFile(delete=False, suffix='.json', mode='w', encoding='utf-8')
        json.dump(self.items, tmpfile, ensure_ascii=False, indent=2)
        tmpfile.close()

        s3_key = self._get_s3_key()
        self.client.upload_file(tmpfile.name, self.bucket_name, s3_key)
        print(f"Uploaded batch of {len(self.items)} items to s3://{self.bucket_name}/{s3_key}")

        os.unlink(tmpfile.name)
        self.items = []
        self.batch_number += 1

    def add_item(self, item):
        self.items.append(item)
        if len(self.items) >= self.batch_size:
            self._upload_batch()

    def finish(self):
        self._upload_batch()
