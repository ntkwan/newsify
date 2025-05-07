import os
from sqlalchemy import create_engine, MetaData
from dotenv import load_dotenv
import sys
from sqlalchemy.sql import text

load_dotenv()

print(f"DO Database variables: DO_DB_NAME={os.getenv('DO_DB_NAME')}, DO_DB_HOST={os.getenv('DO_DB_HOST')}")
    
DIGITALOCEAN_DATABASE_URL = f"postgresql://{os.getenv('DO_DB_USERNAME')}:{os.getenv('DO_DB_PASSWORD')}@{os.getenv('DO_DB_HOST')}:{os.getenv('DO_DB_PORT')}/{os.getenv('DO_DB_NAME')}?sslmode=require"
    
digitalocean_engine = create_engine(DIGITALOCEAN_DATABASE_URL)

def create_index():
    print("Creating index on publish_date column...")
    with digitalocean_engine.connect() as conn:
        # Check if index already exists
        result = conn.execute(text("""
            SELECT indexname FROM pg_indexes 
            WHERE indexname = 'ix_trending_articles_publish_date'
        """))
        
        if result.fetchone():
            print("Index already exists.")
        else:
            conn.execute(text('CREATE INDEX ix_trending_articles_publish_date ON "TrendingArticles" (publish_date)'))
            conn.commit()
            print("Index created successfully.")


def create_tables():
    """Create the TrendingArticles table in Digital Ocean database if it doesn't exist."""
    try:
        print("Connecting to Digital Ocean database...")
        engine = create_engine(DIGITALOCEAN_DATABASE_URL, echo=True)
        connection = engine.connect()
        print("Successfully connected to Digital Ocean database")
        
        from app.services.database import trending_articles_table, metadata
        
        print("Creating TrendingArticles table if it doesn't exist...")
        metadata.create_all(engine, tables=[trending_articles_table])
        print("Table creation complete")
        
        connection.close()
        print("Database connection closed")
        
        return True
        
    except Exception as e:
        print(f"Error creating Digital Ocean tables: {str(e)}")
        return False

if __name__ == "__main__":
    success = create_tables()
    sys.exit(0 if success else 1) 
    create_index()