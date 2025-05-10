#!/usr/bin/env python3

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from collections import defaultdict
import uuid
from tqdm import tqdm

load_dotenv()

print(f"Database connection variables: DO_DB_NAME={os.getenv('DO_DB_NAME')}, DO_DB_HOST={os.getenv('DO_DB_HOST')}")

DIGITALOCEAN_DATABASE_URL = f"postgresql://{os.getenv('DO_DB_USERNAME')}:{os.getenv('DO_DB_PASSWORD')}@{os.getenv('DO_DB_HOST')}:{os.getenv('DO_DB_PORT')}/{os.getenv('DO_DB_NAME')}?sslmode=require"

def remove_duplicate_articles():
    """
    Remove duplicate articles from TrendingArticles table based on article_id.
    If there are duplicates, keep the one with a similarity score > 0.
    If both have similarity_score = 0 or both have similarity_score > 0, keep any one.
    """
    try:
        print("Connecting to DigitalOcean database...")
        engine = create_engine(DIGITALOCEAN_DATABASE_URL)
        conn = engine.connect()
        print("Successfully connected to DigitalOcean database")
        
        # Get all articles and group by article_id
        print("Fetching all articles from TrendingArticles...")
        query = text('SELECT trending_id, article_id, similarity_score FROM "TrendingArticles"')
        articles = conn.execute(query).fetchall()
        
        total_articles = len(articles)
        print(f"Found {total_articles} articles in TrendingArticles")
        
        # Group articles by article_id
        article_groups = defaultdict(list)
        for article in articles:
            article_id = str(article.article_id)
            article_groups[article_id].append({
                'trending_id': article.trending_id,
                'similarity_score': article.similarity_score
            })
        
        # Find duplicates
        duplicates = {article_id: articles for article_id, articles in article_groups.items() if len(articles) > 1}
        
        if not duplicates:
            print("No duplicate articles found!")
            conn.close()
            return True
        
        print(f"Found {len(duplicates)} article_ids with duplicates")
        
        # For each group of duplicates, determine which to keep and which to delete
        trending_ids_to_delete = []
        
        for article_id, duplicate_list in tqdm(duplicates.items(), desc="Processing duplicates"):
            # Sort by similarity_score (higher first)
            duplicate_list.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            # Keep the first one (highest similarity score)
            keep = duplicate_list[0]
            
            # Mark the rest for deletion
            for dup in duplicate_list[1:]:
                trending_ids_to_delete.append(str(dup['trending_id']))
        
        if not trending_ids_to_delete:
            print("No articles to delete after analysis")
            conn.close()
            return True
        
        print(f"Preparing to delete {len(trending_ids_to_delete)} duplicate articles")
        
        # Delete in batches of 100 to avoid potential issues with very long IN clauses
        batch_size = 100
        deleted_count = 0
        
        for i in range(0, len(trending_ids_to_delete), batch_size):
            batch = trending_ids_to_delete[i:i+batch_size]
            placeholders = ', '.join([f"'{id}'" for id in batch])
            
            delete_query = text(f'DELETE FROM "TrendingArticles" WHERE trending_id IN ({placeholders})')
            result = conn.execute(delete_query)
            conn.commit()
            
            deleted_count += result.rowcount
        
        print(f"Successfully deleted {deleted_count} duplicate articles")
        
        conn.close()
        print("Database connection closed")
        
        return True
    
    except Exception as e:
        print(f"Error removing duplicate articles: {str(e)}")
        return False

if __name__ == "__main__":
    success = remove_duplicate_articles()
    sys.exit(0 if success else 1) 