import os
from sqlalchemy import create_engine, MetaData
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
        
        connection.close()
        print("Database connection closed")
        
        return True
        
    except Exception as e:
        print(f"Error creating Digital Ocean tables: {str(e)}")
        return False

if __name__ == "__main__":
    success = create_tables()
    sys.exit(0 if success else 1) 