import pandas as pd
from newspaper import Article
import sys
from datetime import datetime
import calendar
import json
from nanoid import generate
import os
import re

def safe_get(value, fallback=""):
    return value if pd.notna(value) else fallback

def parse_vietnamese_date(date_str: str) -> dict:
    try:
        match = re.search(r"(\d{2}/\d{2}/\d{4}) (\d{2}:\d{2})", date_str)
        if not match:
            raise ValueError("Cannot parse date string")
        
        date_part = match.group(1)
        time_part = match.group(2)
        dt = datetime.strptime(f"{date_part} {time_part}", "%d/%m/%Y %H:%M")
        
        return {
            "publish_date": date_str,
            "time": dt.strftime("%H:%M:%S"),
            "timezone": "GMT+7",
            "hour": dt.hour,
            "minute": dt.minute,
            "day": dt.day,
            "month": calendar.month_name[dt.month],
            "month_number": dt.month,
            "year": dt.year,
            "weekday": calendar.day_name[dt.weekday()]  # English weekday
        }
    except Exception as e:
        print(f"Error parsing date: {e}")
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

def main():
    try:
        df = pd.read_csv('Dataset_articles_NoID.csv')
        print(f"Found {len(df)} rows in CSV")

        results = []
        chunk_size = 5000
        output_dir = "vietnam_json"
        os.makedirs(output_dir, exist_ok=True)

        for index, row in df.iterrows():
            print(f"\nProcessing row {index + 1}/{len(df)}")

            publish_date = safe_get(row.get('Date'))
            parsed_date = parse_vietnamese_date(publish_date)

            results.append({
                "url": safe_get(row.get('URL'), 'No URL'),
                "src": safe_get(row.get('URL'), 'No source'),
                "language": "vietnamese",
                "categories": [safe_get(row.get('Category'), '')],
                "title": safe_get(row.get('Title'), 'No title'),
                "content": safe_get(row.get('Contents'), 'No content'),
                "image_url": '',
                **parsed_date,
                "time_reading": 'No reading time',
                "author": safe_get(row.get('Author(s)'), 'No author'),
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
