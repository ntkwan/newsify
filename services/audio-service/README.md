# Audio Service

This service provides an API to generate podcasts from news articles. It takes a date range, fetches relevant articles, summarizes them, and creates an audio podcast with transcripts.

## Features

- Generate podcasts from articles in a specified date range
- Fetch articles from Supabase database with robust fallback to local files
- Store podcast information in Digital Ocean database
- Text-to-speech conversion using OpenAI's TTS API
- Transcription with timestamps using Google Gemini
- File uploading to S3-compatible storage (Digital Ocean Spaces)

## Prerequisites

- Python 3.11 or higher
- PostgreSQL database connection (Supabase)
- Secondary PostgreSQL database for podcast storage (Digital Ocean)
- OpenAI API key
- Google Gemini API key
- Digital Ocean Spaces (or other S3-compatible storage) credentials

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

## Database Setup

The service needs tables to be created in both databases. The Supabase database should already have an Articles table created. For the Digital Ocean database, you need to create the Podcast table:

```bash
python sync_do_tables.py
```

If you encounter database connection errors like `relation "public.Podcast" does not exist`, run the initialization script to create the table automatically.

## API Endpoints

### Generate Podcast

```
POST /podcast?startTime=2025-04-18T00:00:00&endTime=2025-04-19T00:00:00
```

Query Parameters:

- `startTime`: Start time in ISO format (YYYY-MM-DDTHH:mm:ss)
- `endTime`: End time in ISO format (YYYY-MM-DDTHH:mm:ss)

Response:

```json
{
    "url": "https://storage.example.com/podcasts/newsify-podcast-2025-04-18.mp3",
    "transcript": "Welcome to Newsify Breaking News. Here are today's top stories...",
    "timestampedTranscript": [
        {
            "startTime": 0,
            "endTime": 5.2,
            "text": "Welcome to Newsify Breaking News."
        },
        {
            "startTime": 5.5,
            "endTime": 10.8,
            "text": "Here are today's top stories."
        }
    ]
}
```

## Running the Service

### Development Mode

```bash
uvicorn app.main:app --reload
```

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Using Docker

```bash
docker-compose up
```

## Troubleshooting

If you encounter errors about missing tables or database connection issues:

1. Verify your database credentials in the `.env` file
2. Run the `initialize_do_db.py` script to create the Podcast table
3. Check if the table was created successfully
4. If problems persist, inspect the detailed error messages in the logs
5. Ensure your environment variables match the expected format and values

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

### Digital Ocean Podcasts Table

```sql
create table public."Podcast" (
  podcast_id uuid not null default gen_random_uuid(),
  title text not null,
  publish_date timestamp with time zone null,
  script text null,
  timestamp_script jsonb null,
  audio_url text not null,
  length_seconds int not null,
  constraint Podcast_pkey primary key (podcast_id)
)
```

## Recent Updates

### Physical Audio Length Calculation

The podcast service now calculates audio length by directly analyzing the audio file, instead of relying solely on transcript timestamps. This provides more accurate duration information.

Features:
- Primary method uses `ffprobe` to get precise audio duration
- Fallback to `wave` module for WAV files if ffprobe is unavailable
- Additional fallback to file size estimation for MP3 files
- Final fallback to transcript-based calculation for complete reliability

Requirements:
- FFmpeg/ffprobe (recommended but optional) - provides the most accurate timing
- Python's built-in `wave` module used as fallback

If using the physical audio measurement, make sure ffmpeg is installed on your system for best results:

```bash
# Ubuntu/Debian
apt-get install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```
