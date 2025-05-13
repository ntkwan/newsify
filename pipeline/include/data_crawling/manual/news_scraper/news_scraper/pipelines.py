# Define your item pipelines here

# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html
# useful for handling different item types with a single interface
# from itemadapter import ItemAdapter
import boto3
import json
from datetime import datetime
from scrapy.exceptions import DropItem
import os
import tempfile
from scrapy.exporters import JsonLinesItemExporter
import pytz
import logging
from botocore.exceptions import ClientError
from nanoid import generate

class SaveToS3Pipeline:
    def __init__(self, aws_access_key_id, aws_secret_access_key, s3_bucket_name, batch_size):
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.s3_bucket_name = s3_bucket_name
        self.batch_size = batch_size

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            aws_access_key_id=crawler.settings.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=crawler.settings.get('AWS_SECRET_ACCESS_KEY'),
            s3_bucket_name=crawler.settings.get('S3_BUCKET_NAME'),
            batch_size=crawler.settings.getint('S3_BATCH_SIZE', 100)
        )

    def open_spider(self, spider):
        self.current_batch = 1
        self.item_count = 0 
        self._open_new_file(spider)
        
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key
        )
        self._open_new_file(spider)

    def _open_new_file(self, spider):
        utc_now  = datetime.utcnow()
        vn_tz = pytz.timezone('Asia/Ho_Chi_Minh')
        vn_now = utc_now.replace(tzinfo=pytz.utc).astimezone(vn_tz)
        
        date_folder = vn_now.strftime('%Y-%m-%d')
        nanoid = generate(size=10)
        file_name = f"{nanoid}.json"
        self.s3_key = f'raw_data/{date_folder}/{spider.name}/{file_name}'
        
        self.tmpfile = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
        self.file = open(self.tmpfile.name, 'w', encoding='utf-8')
        self.file.write('[\n')
        self.first_item = True 
         
    def process_item(self, item, spider):
        if not self.file.closed:
            if not self.first_item:
                self.file.write(',\n')
            else:
                self.first_item = False
            json.dump(dict(item), self.file, ensure_ascii=False, indent=2)
            
        self.item_count += 1
        
        if self.item_count >= self.batch_size:
            self._close_and_upload_file(spider)
            self.current_batch += 1
            self.item_count = 0
            self._open_new_file(spider)
        
        return item
    
    def _close_and_upload_file(self, spider):
        if self.item_count == 0 and self.first_item:
            self.file.close()
            os.unlink(self.tmpfile.name)
            return
        
        try:
            self.file.write('\n]')
            self.file.close()
            
            for attemp in range(3):
                try:
                    # Upload file lên S3
                    self.s3_client.upload_file(self.tmpfile.name, self.s3_bucket_name, self.s3_key)
                    spider.logger.info(f"Successfully uploaded {self.item_count} to s3://{self.s3_bucket_name}/{self.s3_key}")
                    break
                except ClientError as e:
                    if attemp == 2:
                        spider.logger.error(f"Failed to upload to S3 after 3 retries: {e}")
                        raise DropItem(f"S3 upload failed: {e}")
        finally:
            try:
                if not self.file.closed:
                    self.file.close()
                os.unlink(self.tmpfile.name)
                spider.logger.info(f"Temporary file {self.tmpfile.name} deleted successfully.")
            except Exception as e:
                spider.logger.warning(f"Failed to delete temp file {self.tmpfile.name}: {e}")
            
    
    def close_spider(self, spider):
        self._close_and_upload_file(spider)
        