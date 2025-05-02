from sqlalchemy import create_engine, Column, DateTime, String, Integer, BigInteger, Text, Table, MetaData
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
import os
from dotenv import load_dotenv
import uuid
from contextlib import contextmanager

load_dotenv()

print(f"Database connection variables: DB_NAME={os.getenv('DB_NAME')}, DATABASE={os.getenv('DATABASE')}")
print(f"DO Database variables: DO_DB_NAME={os.getenv('DO_DB_NAME')}, DO_DB_HOST={os.getenv('DO_DB_HOST')}")

SUPABASE_DATABASE_URL = f"postgresql://{os.getenv('DB_USERNAME')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DATABASE')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}?sslmode=require"

DIGITALOCEAN_DATABASE_URL = f"postgresql://{os.getenv('DO_DB_USERNAME')}:{os.getenv('DO_DB_PASSWORD')}@{os.getenv('DO_DB_HOST')}:{os.getenv('DO_DB_PORT')}/{os.getenv('DO_DB_NAME')}?sslmode=require"

supabase_engine = create_engine(SUPABASE_DATABASE_URL, echo=True)
digitalocean_engine = create_engine(DIGITALOCEAN_DATABASE_URL, echo=True)

SupabaseSession = sessionmaker(bind=supabase_engine, autocommit=False, autoflush=False)
DigitalOceanSession = sessionmaker(bind=digitalocean_engine, autocommit=False, autoflush=False)

metadata = MetaData()

articles_table = Table(
    'Articles', 
    metadata,
    Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('src', Text, nullable=False),
    Column('url', Text, nullable=False, unique=True),
    Column('title', Text, nullable=False),
    Column('summary', Text),
    Column('image_url', Text),
    Column('publish_date', DateTime(timezone=True), nullable=False),
    Column('author', Text),
    Column('time_reading', Text),
    Column('language', Text),
    Column('categories', ARRAY(Text)),
    Column('content', Text),
    Column('views', BigInteger, default=0),
    Column('main_category', String),
    schema='public'
)

podcasts_table = Table(
    'Podcast',
    metadata,
    Column('podcast_id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    Column('publish_date', DateTime(timezone=True)),
    Column('script', Text),
    Column('timestamp_script', JSONB),
    Column('audio_url', Text, nullable=False),
    Column('generated_date', DateTime(timezone=True), nullable=False, server_default=func.now()),
    schema='public'
)

@contextmanager
def get_supabase_session():
    """
    Get a database session for Supabase.
    
    Returns:
        Session: SQLAlchemy session object
    """
    session = SupabaseSession()
    try:
        yield session
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

@contextmanager
def get_digitalocean_session():
    """
    Get a database session for Digital Ocean.
    
    Returns:
        Session: SQLAlchemy session object
    """
    session = DigitalOceanSession()
    try:
        yield session
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()

def get_supabase_db():
    """FastAPI dependency for Supabase database session"""
    with get_supabase_session() as session:
        yield session

def get_digitalocean_db():
    """FastAPI dependency for DigitalOcean database session"""
    with get_digitalocean_session() as session:
        yield session