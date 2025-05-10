#!/usr/bin/env python3

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from tqdm import tqdm
import pandas as pd
from serpapi.google_search import GoogleSearch

load_dotenv()

print(f"Database connection variables: DO_DB_NAME={os.getenv('DO_DB_NAME')}, DO_DB_HOST={os.getenv('DO_DB_HOST')}")

DIGITALOCEAN_DATABASE_URL = f"postgresql://{os.getenv('DO_DB_USERNAME')}:{os.getenv('DO_DB_PASSWORD')}@{os.getenv('DO_DB_HOST')}:{os.getenv('DO_DB_PORT')}/{os.getenv('DO_DB_NAME')}?sslmode=require"

# Initialize the new model
model = SentenceTransformer('multi-qa-mpnet-base-cos-v1')

def get_embedding(text):
    return model.encode(text, convert_to_numpy=True)

def get_trending_keywords(country_code="US", limit=10):
    api_key = os.getenv("SERPAPI_API_KEY")
    if not api_key:
        print("Error: SERPAPI_API_KEY not set in environment variables")
        return []
    
    params = {
        "engine": "google_trends_trending_now",
        "geo": country_code,
        "api_key": api_key
    }
    
    try:
        search = GoogleSearch(params)
        results = search.get_dict()
        trending_searches = results.get("trending_searches", [])
        
        df = pd.DataFrame(trending_searches, index=None)
        df = df[df['active'] == True]
        
        return df['query'].head(limit).tolist()
    except Exception as e:
        print(f"Error fetching trending keywords: {str(e)}")
        return []

def get_related_queries(keywords):
    api_key = os.getenv("SERPAPI_API_KEY")
    if not api_key:
        print("Error: SERPAPI_API_KEY not set in environment variables")
        return []
    
    if not keywords:
        print("Warning: No trending keywords provided to get_related_queries")
        return []
        
    rows = []
    print(f"Processing {len(keywords)} keywords for related queries")
    
    for word in keywords:
        params = {
            "engine": "google_trends",
            "q": word,
            "data_type": "RELATED_QUERIES",
            "date": "now 1-d",
            "api_key": api_key
        }
        
        try:
            word_search = GoogleSearch(params)
            word_results = word_search.get_dict()
            related_word_queries = word_results.get("related_queries", {})
            
            for item in related_word_queries.get('rising', []):
                rows.append({
                    'query': item.get('query'),
                    'value': item.get('value'),
                    'extracted_value': item.get('extracted_value'),
                    'link': item.get('link'),
                    'serpapi_link': item.get('serpapi_link')
                })
            
            for item in related_word_queries.get('top', []):
                rows.append({
                    'query': item.get('query'),
                    'value': item.get('value'),
                    'extracted_value': item.get('extracted_value'),
                    'link': item.get('link'),
                    'serpapi_link': item.get('serpapi_link')
                })
        except Exception as e:
            print(f"Error processing keyword '{word}': {str(e)}")
    
    print(f"Total related queries found: {len(rows)}")
    return rows

def update_trending_scores():
    """
    Update trending scores for all articles in the TrendingArticles table
    using the new multi-qa-mpnet-base-cos-v1 model.
    """
    try:
        print("Connecting to DigitalOcean database...")
        engine = create_engine(DIGITALOCEAN_DATABASE_URL)
        conn = engine.connect()
        print("Successfully connected to DigitalOcean database")
        
        # Get all trending articles
        print("Fetching all articles from TrendingArticles...")
        query = text('SELECT trending_id, content FROM "TrendingArticles"')
        articles = conn.execute(query).fetchall()
        
        total_articles = len(articles)
        print(f"Found {total_articles} articles in TrendingArticles")
        
        if total_articles == 0:
            print("No articles to update")
            conn.close()
            return True
        
        # Get trending keywords and related queries
        print("Fetching trending keywords...")
        trending_keywords = get_trending_keywords()
        print(f"Got {len(trending_keywords)} trending keywords")
        
        if not trending_keywords:
            print("No trending keywords found, cannot update scores")
            conn.close()
            return False
        
        print("Getting related queries for trending keywords...")
        trends_data = get_related_queries(trending_keywords)
        print(f"Got {len(trends_data)} related queries")
        
        if not trends_data:
            print("No trend data found, cannot update scores")
            conn.close()
            return False
        
        # Get embeddings for all trends
        print("Generating embeddings for trends...")
        trends_df = pd.DataFrame(trends_data)
        trends_df['Embedding'] = trends_df['query'].apply(get_embedding)
        trends_embeddings = np.stack(trends_df['Embedding'].values)
        
        # Process articles in batches
        batch_size = 50
        updated_count = 0
        
        for i in range(0, total_articles, batch_size):
            batch = articles[i:i+batch_size]
            print(f"Processing batch {i//batch_size + 1}/{(total_articles+batch_size-1)//batch_size}")
            
            for article in tqdm(batch, desc="Updating articles"):
                trending_id = article.trending_id
                content = article.content
                
                # Generate embedding for article content
                article_embedding = get_embedding(content)
                
                # Calculate similarity scores
                similarity_scores = cosine_similarity([article_embedding], trends_embeddings)[0]
                max_score = float(np.max(similarity_scores))
                max_idx = np.argmax(similarity_scores)
                
                # Determine trend (if above threshold)
                threshold = 0.5
                trend = None
                if max_score >= threshold:
                    trend = trends_data[max_idx]['query']
                
                # Update the database
                update_query = text("""
                    UPDATE "TrendingArticles" 
                    SET similarity_score = :score, trend = :trend
                    WHERE trending_id = :trending_id
                """)
                
                conn.execute(update_query, {
                    'score': max_score,
                    'trend': trend,
                    'trending_id': trending_id
                })
                
                updated_count += 1
            
            # Commit after each batch
            conn.commit()
        
        print(f"Successfully updated {updated_count} articles with new similarity scores")
        
        conn.close()
        print("Database connection closed")
        
        return True
    
    except Exception as e:
        print(f"Error updating trending scores: {str(e)}")
        return False

if __name__ == "__main__":
    success = update_trending_scores()
    sys.exit(0 if success else 1) 