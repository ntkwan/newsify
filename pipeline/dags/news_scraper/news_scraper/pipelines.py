# Define your item pipelines here
#
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
        self._open_new_file()
        
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key
        )

    def _open_new_file(self):
        utc_now  = datetime.utcnow()
        vn_tz = pytz.timezone('Asia/Ho_Chi_Minh')
        vn_now = utc_now.replace(tzinfo=pytz.utc).astimezone(vn_tz)
        
        date_folder = vn_now.strftime('%Y-%m-%d')
        file_name = vn_now.strftime('%H-%M-%S') + '.json'
        self.s3_key = f'raw_data/{date_folder}/{file_name}'
        
        self.tmpfile = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
        self.file = open(self.tmpfile.name, 'w', encoding='utf-8')
        self.file.write('[\n')
        self.first_item = True 
         
    def process_item(self, item, spider):
        # self.items.append(dict(item))
        # if len(self.items) >= self.batch_size:
        #     self._save_to_s3(spider)
        if not self.file.closed:
            if not self.first_item:
                self.file.write(',\n')
            else:
                self.first_item = False
            json.dump(item, self.file, ensure_ascii=False, indent=2)
    
        self.item_count += 1
        
        if self.item_count >= self.batch_size:
            self._close_and_upload_file(spider)
            self.current_batch += 1
            self.item_count = 0
            self._open_new_file()
        
        return item
    
    def _close_and_upload_file(self, spider):
        try:
            if not self.file.closed:
                self.file.write('\n]')
                self.file.close()
            
            # Upload file lên S3
            self.s3_client.upload_file(self.tmpfile.name, self.s3_bucket_name, self.s3_key)
            spider.logger.info(f"Successfully uploaded {self.tmpfile.name} to s3://{self.s3_bucket_name}/{self.s3_key}")
        except Exception as e:
            spider.logger.error(f"Failed to upload to S3: {e}")
            raise DropItem(f"S3 upload failed: {e}")
        finally:
            try:
                if not self.file.closed:
                    self.file.close()
                # Xóa file tạm sau khi upload
                self.tmpfile.close()
                os.unlink(self.tmpfile.name)
                spider.logger.info(f"Temporary file {self.tmpfile.name} deleted successfully.")
            except Exception as e:
                spider.logger.warning(f"Failed to delete temp file {self.tmpfile.name}: {e}")
    
    
    def close_spider(self, spider):
        self._close_and_upload_file(spider)
        
        
  #   def _save_to_s3(self, spider):
    #     now = datetime.utcnow()
    #     date_folder = now.strftime('%Y-%m-%d')
    #     file_name = now.strftime('%H-%M-%S') + '.json'
    #     s3_key = f'raw_data/{date_folder}/{file_name}'
    #     json_data = json.dumps(self.items, ensure_ascii=False, indent=2).encode('utf-8')
    #     try:
    #         self.s3_client.put_object(
    #             Bucket=self.s3_bucket_name,
    #             Key=s3_key,
    #             Body=json_data
    #         )
    #         spider.logger.info(f'Successfully uploaded {len(self.items)} items to s3://{self.s3_bucket_name}/{s3_key}')
    #     except Exception as e:
    #         spider.logger.error(f'Failed to upload to S3: {str(e)}')
    #         raise DropItem(f'Failed to upload to S3: {str(e)}')
    #     self.items = []
        
    # def close_spider(self, spider):
    #     if self.items:
    #         self._save_to_s3(spider)