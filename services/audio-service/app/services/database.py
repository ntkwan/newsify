from sqlalchemy import create_engine, Column, DateTime, String, Integer, BigInteger, Text, Table, MetaData
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import func
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

SUPABASE_DATABASE_URL = f"postgresql://{os.getenv('DB_USERNAME')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DATABASE')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}?sslmode=require"

DIGITALOCEAN_DATABASE_URL = f"postgresql://{os.getenv('DO_DB_USERNAME')}:{os.getenv('DO_DB_PASSWORD')}@{os.getenv('DO_DB_HOST')}:{os.getenv('DO_DB_PORT')}/{os.getenv('DO_DB_NAME')}?sslmode=require"

supabase_engine = create_engine(SUPABASE_DATABASE_URL)
digitalocean_engine = create_engine(DIGITALOCEAN_DATABASE_URL)

SupabaseSession = sessionmaker(bind=supabase_engine)
DigitalOceanSession = sessionmaker(bind=digitalocean_engine)

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

def get_supabase_session():
    session = SupabaseSession()
    try:
        yield session
    finally:
        session.close()

def get_digitalocean_session():
    session = DigitalOceanSession()
    try:
        yield session
    finally:
        session.close()