import os
from sqlalchemy import create_engine, MetaData, Index, text
from dotenv import load_dotenv
import sys

load_dotenv()

def create_tables():
    """Create the Podcast table in Digital Ocean database if it doesn't exist."""
    
    print(f"DO Database variables: DO_DB_NAME={os.getenv('DO_DB_NAME')}, DO_DB_HOST={os.getenv('DO_DB_HOST')}")
    
    DIGITALOCEAN_DATABASE_URL = f"postgresql://{os.getenv('DO_DB_USERNAME')}:{os.getenv('DO_DB_PASSWORD')}@{os.getenv('DO_DB_HOST')}:{os.getenv('DO_DB_PORT')}/{os.getenv('DO_DB_NAME')}?sslmode=require"
    
    try:
        print("Connecting to Digital Ocean database...")
        engine = create_engine(DIGITALOCEAN_DATABASE_URL, echo=True)
        connection = engine.connect()
        print("Successfully connected to Digital Ocean database")
        
        from app.services.database import podcasts_table, metadata
        
        print("Creating Podcast table if it doesn't exist...")
        metadata.create_all(engine, tables=[podcasts_table])
        print("Table creation complete")
        
        print("Checking if index on publish_date exists...")
        result = connection.execute(text("""
            SELECT indexname FROM pg_indexes 
            WHERE indexname = 'ix_podcast_publish_date'
            AND tablename = 'Podcast'
        """))
        
        if not result.fetchone():
            print("Creating index on publish_date column...")
            connection.execute(text('CREATE INDEX ix_podcast_publish_date ON "Podcast" (publish_date)'))
            connection.commit()
            print("Index creation complete")
        else:
            print("Index on publish_date already exists")
        
        connection.close()
        print("Database connection closed")
        
        return True
        
    except Exception as e:
        print(f"Error creating Digital Ocean tables: {str(e)}")
        return False

if __name__ == "__main__":
    success = create_tables()
    sys.exit(0 if success else 1) 