from newspaper import Article
import feedparser
from datetime import datetime
import yaml
import os
from dateutil import parser as dateparser
from s3_uploader import S3BatchUploader

def get_rss_urls():
    base_dir = os.path.dirname(__file__)  
    file_path = os.path.join(base_dir, 'rss_sources.yaml')
    with open(file_path, 'r') as f:
        rss_map = yaml.safe_load(f)
    return rss_map

def parse_date_fields(raw_date):
    try:
        dt = dateparser.parse(raw_date, fuzzy=True)
        return {
            "publish_date": dt.isoformat(),
            "time": dt.strftime("%H:%M:%S"),
            "timezone": dt.tzname() or "",
            "hour": dt.hour,
            "minute": dt.minute,
            "day": dt.day,
            "month": dt.strftime("%B"),
            "month_number": dt.month,
            "year": dt.year,
            "weekday": dt.strftime("%A")
        }
    except Exception:
        return {
            "publish_date": raw_date,
            "time": "",
            "timezone": "",
            "hour": "",
            "minute": "",
            "day": "",
            "month": "",
            "month_number": "",
            "year": "",
            "weekday": ""
        }

def get_article_links():
    rss_map = get_rss_urls()
    list_articles = []
    
    for category, url in rss_map.items():
        feed = feedparser.parse(url)
        entries = feed.entries
        articles = [normalize_rss_entry(entry, category) for entry in feed.entries]  
        list_articles.extend(articles)
    
    return list_articles

def extract_content(article_url):
    try:
        article = Article(article_url)
        article.download()
        article.parse()
        return {
            "src": article.source_url or "No source",
            "title": article.title or "No title",
            "authors": article.authors[0] if article.authors else "No author",
            "content": article.text or "No content",
            "image_url": article.top_image or "",
            "publish_date": article.publish_date.isoformat() if article.publish_date else None,
        }
    except Exception as e:
        print(f"[!] Failed to extract {article_url}: {e}")
        return None

def normalize_and_enrich(entry, category):
    url = entry.get("link", "")
    meta = extract_content(url)
    parsed_date = parse_date_fields(meta["publish_date"] or entry.get("published")) or entry.get("updated", "")
    
    return {
        "url": url,
        "src": meta["src"],
        "language": "english",
        "categories": [category],
        "title": meta["title"],
        "content": meta["content"],
        "image_url": meta["image_url"],
        "publish_date": parsed_date["publish_date"],
        "time": parsed_date["time"],
        "timezone": parsed_date["timezone"],
        "hour": parsed_date["hour"],
        "minute": parsed_date["minute"],
        "day": parsed_date["day"],
        "month": parsed_date["month"],
        "month_number": parsed_date["month_number"],
        "year": parsed_date["year"],
        "weekday": parsed_date["weekday"],
        "time_reading": "No reading time",
        "author": meta["authors"],
    }
    
def get_articles_full():
    rss_map = get_rss_urls()
    res = [] 
    visited_urls = set()
    
    sorted_categories = sorted(rss_map.items(), key=lambda x: 0 if 'top_stories' in x[0] else 1)
   
    for category, rss_url in sorted_categories:
        feed = feedparser.parse(rss_url)
        
        for entry in feed.entries:
            url = entry.get("link", "")
            if url in visited_urls:
                continue
            visited_urls.add(url)
            
            enriched_article = normalize_and_enrich(entry, category)
            if enriched_article:
                res.append(enriched_article)
                    
    return res

if __name__ == "__main__":
    articles = get_articles_full()
    print(f"Total articles fetched: {len(articles)}")
   
    uploader = S3BatchUploader()
    for article in articles:
        uploader.add_item(article)
    uploader.finish()

    
    