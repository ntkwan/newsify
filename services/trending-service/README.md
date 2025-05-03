# Trending Service

This service provides an API for analyzing article content for trending relevance. It takes articles and compares them to current trending topics from Google Trends to identify which articles match current trends.

## Features

- Fetch trending topics from Google Trends
- Analyze articles for trending relevance using semantic similarity
- Score article content against trending topics
- Store trending analysis results in Digital Ocean database
- Read articles from Supabase database
- Batch processing for multiple articles at once

## Prerequisites

- Python 3.11 or higher
- PostgreSQL database connection (Supabase)
- Secondary PostgreSQL database for trending storage (Digital Ocean)
- SerpAPI API key for Google Trends access
- Sentence Transformer model for semantic similarity

## Installation

1. Clone this repository
2. Navigate to the project directory
3. Install dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. Create a `.env` file with the following variables:

```
# SerpAPI Settings
SERPAPI_API_KEY=your_serpapi_api_key

# Supabase Database Settings (Articles)
DB_NAME=
DB_PORT=
DATABASE=
DB_USERNAME=
DB_PASSWORD=
DB_DIALECT=postgres

# Digital Ocean Database Settings (TrendingArticles)
DO_DB_USERNAME=
DO_DB_PASSWORD=
DO_DB_HOST=
DO_DB_PORT=
DO_DB_NAME=
```

## Database Setup

The service needs tables to be created in both databases. The Supabase database should already have an Articles table created. For the Digital Ocean database, you need to create the TrendingArticles table:

```bash
# Initialize the Digital Ocean database with required tables
python sync_do_tables.py
```

If you encounter database connection errors like `relation "public.TrendingArticles" does not exist`, run the initialization script to create the table automatically.

## API Endpoints

### Get Trending Topics

```
GET /trending?country=US
```

Query Parameters:
- `country`: Country code for trending data (default: US)

Returns a list of current trending topics from Google Trends.

### Get Related Queries

```
GET /trending/related?country=US
```

Query Parameters:
- `country`: Country code for trending data (default: US)

Returns related queries for trending topics from Google Trends.

### Analyze Latest Articles

```
POST /analyze/latest?hours=24&limit=20&from_time=2023-05-01T08:00:00
```

Query Parameters:
- `hours`: Number of hours to look back for articles (default: 24) - used if from_time is not provided
- `limit`: Maximum number of articles to analyze (default: 20)
- `from_time`: Optional custom start time in ISO format (YYYY-MM-DDTHH:MM:SS) - overrides hours parameter when provided

This endpoint automatically:
1. Fetches the most recent articles published within the specified time window
2. Analyzes each article against current trending topics
3. Saves the analysis results to the Digital Ocean database
4. Returns the list of analyzed articles with trending information

This endpoint is designed to be triggered by a scheduled CronJob to automate trending analysis at specific times of day, but can also be manually called with custom time parameters.

### Analyze Article

```
POST /analyze
```

Request Body:
```json
{
  "content": "Article content to analyze",
  "title": "Article title",
  "url": "https://example.com/article",
  "article_id": "uuid-of-article"
}
```

Response:
```json
{
  "url": "https://example.com/article",
  "title": "Article title",
  "content": "Article content to analyze",
  "trend": "Trending Topic",
  "similarity_score": 0.85,
  "article_id": "uuid-of-article"
}
```

### Analyze Multiple Articles

```
POST /analyze/batch
```

Request Body:
```json
{
  "articles": [
    {
      "content": "First article content",
      "title": "First article title",
      "url": "https://example.com/article1",
      "article_id": "uuid-of-article1"
    },
    {
      "content": "Second article content",
      "title": "Second article title",
      "url": "https://example.com/article2",
      "article_id": "uuid-of-article2"
    }
  ]
}
```

Returns an array of trending analysis results.

## Running the Service

### Development Mode

```bash
uvicorn app.main:app --reload
```

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Using Docker

```bash
docker-compose up
```

## Database Schema

### Supabase Articles Table
```sql
create table public."Articles" (
  id uuid not null default gen_random_uuid(),
  src text not null,
  url text not null,
  title text not null,
  summary text null,
  image_url text null,
  publish_date timestamp with time zone not null,
  author text null,
  time_reading text null,
  language text null,
  categories text[] null,
  content text null,
  views bigint null default '0'::bigint,
  main_category character varying null,
  constraint Article_pkey primary key (id),
  constraint Article_url_key unique (url)
)
```

### Digital Ocean TrendingArticles Table
```sql
create table public."TrendingArticles" (
  trending_id uuid not null default gen_random_uuid(),
  article_id uuid not null,
  url text not null,
  title text not null,
  trend text null,
  similarity_score float not null,
  analyzed_date timestamp with time zone not null default now(),
  constraint TrendingArticles_pkey primary key (trending_id)
)
```

## Troubleshooting

If you encounter errors about missing tables or database connection issues:

1. Verify your database credentials in the `.env` file
2. Run the `sync_do_tables.py` script to create the TrendingArticles table
3. Check if the table was created successfully
4. If problems persist, inspect the detailed error messages in the logs
5. Ensure your environment variables match the expected format and values 