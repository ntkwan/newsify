import pandas as pd
from newspaper import Article
import sys
from datetime import datetime
import calendar
import json
from nanoid import generate
import os

def safe_get(value, fallback=""):
    return value if pd.notna(value) else fallback

def process_article(url, row):
    try:
        article = Article(url)
        article.download()
        article.parse()
        return {
            "title": article.title or "No title",
            "content": article.text or "No content",
            "image_url": article.top_image or safe_get(row.get('url_to_image'), 'No image available'),
            "author": article.authors[0] if article.authors else "No author",
        }
    except Exception as e:
        print(f"Error processing {url}: {str(e)}")
        return None

def parse_publish_date(date_str: str) -> dict:
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S.%f")
    except ValueError:
        return {
            "publish_date": date_str,
            "time": None,
            "timezone": None,
            "hour": None,
            "minute": None,
            "day": None,
            "month": None,
            "month_number": None,
            "year": None,
            "weekday": None
        }

    return {
        "publish_date": date_str,
        "time": dt.time().strftime("%H:%M:%S"),
        "timezone": "UTC+0",
        "hour": dt.hour,
        "minute": dt.minute,
        "day": dt.day,
        "month": calendar.month_name[dt.month],
        "month_number": dt.month,
        "year": dt.year,
        "weekday": calendar.day_name[dt.weekday()]
    }

def main():
    try:
        df = pd.read_csv('raw-data.csv')
        print(f"Found {len(df)} rows in CSV")

        results = []
        chunk_size = 5000
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        output_dir = "output_json"
        os.makedirs(output_dir, exist_ok=True)

        for index, row in df.iterrows():
            print(f"\nProcessing row {index + 1}/{len(df)}")

            url = safe_get(row.get('url'), 'No URL')
            publish_date = safe_get(row.get('published_at'))
            parsed_date = parse_publish_date(publish_date)

            results.append({
                "url": url,
                "src": safe_get(row.get('source_name'), 'No source'),
                "language": "english",
                "categories": [safe_get(row.get('category'), '')],
                "title": safe_get(row.get('title'), 'No title'),
                "content": safe_get(row.get('content'), 'No content'),
                "image_url": safe_get(row.get('url_to_image'), 'No image available'),
                **parsed_date,
                "time_reading": 'No reading time',
                "author": safe_get(row.get('author'), 'No author'),
            })

            if len(results) % chunk_size == 0:
                filename = f'{generate(size=10)}.json'
                output_file = os.path.join(output_dir, filename)
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(results[-chunk_size:], f, ensure_ascii=False, indent=4)
                print(f"Saved chunk to {output_file}")

        # Save remaining records
        remainder = len(results) % chunk_size
        if remainder > 0:
            filename = f'{generate(size=10)}.json'
            output_file = os.path.join(output_dir, filename)
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(results[-remainder:], f, ensure_ascii=False, indent=4)
            print(f"Saved final chunk to {output_file}")

        print(f"\nProcessed {len(results)} articles")

    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
