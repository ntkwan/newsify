# Audio Service

This service provides an API to generate podcasts from news articles. It takes a date range, fetches relevant articles, summarizes them, and creates an audio podcast with transcripts.

## Features

- Generate podcasts from articles in a specified date range
- Text-to-speech conversion using OpenAI's TTS API
- Transcription with timestamps using Google Gemini
- File uploading to S3-compatible storage (Digital Ocean Spaces)

## Prerequisites

- Python 3.11 or higher
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
pip install -r requirements.txt || python3 -m pip install -r requirements.txt
```

4. Create a `.env` file with the following variables:

```
# OpenAI API Settings
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o
OPENAI_TTS_MODEL=tts-1

# Google Gemini API Settings
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
GOOGLE_GEMINI_MODEL=gemini-1.5-pro-latest

# Digital Ocean Spaces (S3 compatible storage)
DO_SPACES_ENDPOINT=your_spaces_endpoint
DO_SPACES_ACCESS_KEY=your_spaces_access_key
DO_SPACES_SECRET_KEY=your_spaces_secret_key
DO_SPACES_BUCKET=your_spaces_bucket

# Local data path
DATA_PATH=

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
