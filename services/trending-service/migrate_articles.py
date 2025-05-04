#!/usr/bin/env python3

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine, select, text, MetaData, Table, Column, DateTime, String, Text, BigInteger, Float
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
import uuid
from tqdm import tqdm

load_dotenv()

print(f"Database connection variables: DB_NAME={os.getenv('DB_NAME')}, DATABASE={os.getenv('DATABASE')}")
print(f"DO Database variables: DO_DB_NAME={os.getenv('DO_DB_NAME')}, DO_DB_HOST={os.getenv('DO_DB_HOST')}")

SUPABASE_DATABASE_URL = f"postgresql://{os.getenv('DB_USERNAME')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DATABASE')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}?sslmode=require"
DIGITALOCEAN_DATABASE_URL = f"postgresql://{os.getenv('DO_DB_USERNAME')}:{os.getenv('DO_DB_PASSWORD')}@{os.getenv('DO_DB_HOST')}:{os.getenv('DO_DB_PORT')}/{os.getenv('DO_DB_NAME')}?sslmode=require"

def create_trending_articles_table_if_not_exists(do_engine):
    """Create the TrendingArticles table in DigitalOcean if it doesn't exist."""
    metadata = MetaData()
    
    trending_articles_table = Table(
        'TrendingArticles',
        metadata,
        Column('trending_id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        Column('article_id', UUID(as_uuid=True), nullable=False),
        Column('url', Text, nullable=False),
        Column('image_url', Text),
        Column('categories', ARRAY(Text), nullable=False),
        Column('main_category', String, nullable=False),
        Column('title', Text, nullable=False),
        Column('trend', Text),
        Column('content', Text, nullable=False),
        Column('summary', Text, nullable=True),
        Column('similarity_score', Float, nullable=False),
        Column('publish_date', DateTime(timezone=True), nullable=True),
        Column('analyzed_date', DateTime(timezone=True), nullable=False, server_default=text('CURRENT_TIMESTAMP')),
        schema='public'
    )
    
    metadata.create_all(do_engine, tables=[trending_articles_table])
    print("TrendingArticles table created or already exists")
    
    with do_engine.connect() as conn:
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_trending_articles_publish_date 
            ON "TrendingArticles" (publish_date)
        """))
        conn.commit()
    
    return trending_articles_table

def get_existing_article_ids(do_conn):
    """Get a set of all article IDs that already exist in DigitalOcean TrendingArticles table."""
    result = do_conn.execute(text('SELECT article_id FROM "TrendingArticles"'))
    return {str(row[0]) for row in result}

def migrate_articles():
    """Migrate articles from Supabase to DigitalOcean, skipping duplicates."""
    try:
        print("Connecting to Supabase database...")
        sb_engine = create_engine(SUPABASE_DATABASE_URL)
        sb_conn = sb_engine.connect()
        print("Successfully connected to Supabase database")
        
        print("Connecting to DigitalOcean database...")
        do_engine = create_engine(DIGITALOCEAN_DATABASE_URL)
        do_conn = do_engine.connect()
        print("Successfully connected to DigitalOcean database")
        
        trending_articles_table = create_trending_articles_table_if_not_exists(do_engine)
        
        print("Checking for existing articles in DigitalOcean...")
        existing_ids = get_existing_article_ids(do_conn)
        print(f"Found {len(existing_ids)} existing articles in TrendingArticles")
        
        print("Fetching articles from Supabase...")
        articles_query = text('SELECT * FROM "Articles"')
        supabase_articles = sb_conn.execute(articles_query).fetchall()
        
        total_articles = len(supabase_articles)
        print(f"Found {total_articles} articles in Supabase")
        
        inserted_count = 0
        skipped_count = 0
        error_count = 0
        
        print("Starting migration...")
        for article in tqdm(supabase_articles, desc="Migrating articles"):
            try:
                article_id = str(article.id)
                
                if article_id in existing_ids:
                    skipped_count += 1
                    continue
                
                # Default values for fields that might not exist in source
                summary = article.summary if hasattr(article, 'summary') else None
                categories = article.categories if hasattr(article, 'categories') and article.categories is not None else []
                main_category = article.main_category if hasattr(article, 'main_category') and article.main_category is not None else 'General'
                image_url = article.image_url if hasattr(article, 'image_url') else None
                
                insert_query = text("""
                    INSERT INTO "TrendingArticles" (
                        trending_id, article_id, url, image_url, categories, main_category,
                        title, summary, similarity_score, publish_date, content
                    ) VALUES (
                        :trending_id, :article_id, :url, :image_url, :categories, :main_category,
                        :title, :summary, :similarity_score, :publish_date, :content
                    )
                """)
                
                article_data = {
                    'trending_id': uuid.uuid4(),
                    'article_id': article.id,
                    'url': article.url,
                    'image_url': image_url,
                    'categories': categories,
                    'main_category': main_category,
                    'title': article.title,
                    'summary': summary,
                    'similarity_score': 0.0,  
                    'publish_date': article.publish_date if hasattr(article, 'publish_date') else None,
                    'content': article.content if hasattr(article, 'content') else article.title if hasattr(article, 'title') else 'No content'
                }
                
                do_conn.execute(insert_query, article_data) 
                do_conn.commit()
                inserted_count += 1
                
            except Exception as e:
                error_count += 1
                print(f"Error migrating article {getattr(article, 'id', 'unknown')}: {str(e)}")
        
        print("\nMigration complete!")
        print(f"Total articles in Supabase: {total_articles}")
        print(f"Articles inserted: {inserted_count}")
        print(f"Articles skipped (duplicates): {skipped_count}")
        print(f"Errors: {error_count}")
        
        sb_conn.close()
        do_conn.close()
        print("Database connections closed")
        
        return True
    
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        return False

if __name__ == "__main__":
    success = migrate_articles()
    sys.exit(0 if success else 1) 