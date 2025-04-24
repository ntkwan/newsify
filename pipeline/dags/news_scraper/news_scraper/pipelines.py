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

class SaveToS3Pipeline:
    def __init__(self, aws_access_key_id, aws_secret_access_key, s3_bucket_name, batch_size):
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.s3_bucket_name = s3_bucket_name
        self.batch_size = batch_size
        self.items = []  

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            aws_access_key_id=crawler.settings.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=crawler.settings.get('AWS_SECRET_ACCESS_KEY'),
            s3_bucket_name=crawler.settings.get('S3_BUCKET_NAME'),
            batch_size=crawler.settings.getint('S3_BATCH_SIZE', 100)
        )

    def open_spider(self, spider):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=self.aws_access_key_id,
            aws_secret_access_key=self.aws_secret_access_key
        )

    def close_spider(self, spider):
        if self.items:
            self._save_to_s3(spider)

    def process_item(self, item, spider):
        self.items.append(dict(item))
        if len(self.items) >= self.batch_size:
            self._save_to_s3(spider)
        return item

    def _save_to_s3(self, spider):
        now = datetime.utcnow()
        date_folder = now.strftime('%Y-%m-%d')
        file_name = now.strftime('%H-%M-%S') + '.json'
        s3_key = f'raw_data/{date_folder}/{file_name}'

        json_data = json.dumps(self.items, ensure_ascii=False, indent=2).encode('utf-8')

        try:
            self.s3_client.put_object(
                Bucket=self.s3_bucket_name,
                Key=s3_key,
                Body=json_data
            )
            spider.logger.info(f'Successfully uploaded {len(self.items)} items to s3://{self.s3_bucket_name}/{s3_key}')
        except Exception as e:
            spider.logger.error(f'Failed to upload to S3: {str(e)}')
            raise DropItem(f'Failed to upload to S3: {str(e)}')

        self.items = []