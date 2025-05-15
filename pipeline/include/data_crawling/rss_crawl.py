from newspaper import Article
import feedparser
from datetime import datetime
import yaml
import os
from dateutil import parser as dateparser
from s3_uploader import S3BatchUploader
import requests
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
]

PROXIES = [
    # "http://50.217.226.42:80"
]

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
        user_agent = random.choice(USER_AGENTS)
        headers = {'User-Agent': user_agent}
        proxy = random.choice(PROXIES) if PROXIES else None
        proxies = {"http": proxy, "https": proxy} if proxy else None
        
        # set time sleep to avoid being banned
        time.sleep(random.uniform(1.0, 3.0))
        
        response = requests.get(article_url, headers=headers, proxies=proxies, timeout=20, verify=True)
        response.raise_for_status()
        
        if response.status_code == 200:
            article = Article(article_url)
            article.set_html(response.text)
            article.download_state = 2 
            # article.download()
            article.parse()
            
            return {
                "src": article.source_url or "No source",
                "title": article.title or "No title",
                "authors": article.authors[0] if article.authors else "No author",
                "content": article.text or "No content",
                "image_url": article.top_image or "",
                "publish_date": article.publish_date.isoformat() if article.publish_date else None,
            }
            
        else:
            print(f"[!] Failed to retrieve content from {article_url} with status code {response.status_code}")
            return None
        
    except Exception as e:
        print(f"[!] Failed to extract {article_url}: {e}")
        return None

def normalize_and_enrich(entry, category):
    url = entry.get("link", "")
    meta = extract_content(url)
    
    if not meta: 
        return None
    
    publish_date = (meta or {}).get("publish_date") or entry.get("published")
    
    parsed_date = parse_date_fields(publish_date) or {
        "publish_date": None, "time": None, "timezone": None,
        "hour": None, "minute": None, "day": None, "month": None,
        "month_number": None, "year": None, "weekday": None
    }
            
    return {
        "url": url,
        "src": meta.get("src", ""),
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
            
    def process_entry(entry, category):
        url = entry.get("link", "")
        if not url or url in visited_urls:
            return None
        visited_urls.add(url)
        
        # set time sleep to avoid being banned
        time.sleep(random.uniform(0.5, 1.5)) 
        
        return normalize_and_enrich(entry, category)
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for category, rss_url in sorted_categories:
            feed = feedparser.parse(rss_url)
            for entry in feed.entries:
                futures.append(executor.submit(process_entry, entry, category))

        for future in as_completed(futures):
            try:
                result = future.result()
                if result:
                    res.append(result)
            except Exception as e:
                print(f"[!] Error processing entry: {e}")
                    
    return res

if __name__ == "__main__":
    articles = get_articles_full()
    print(f"Total articles fetched: {len(articles)}")
   
    uploader = S3BatchUploader()
    
    for article in articles:
        uploader.add_item(article)
        
    uploader.finish()

    
    