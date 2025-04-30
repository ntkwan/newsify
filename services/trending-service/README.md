# Trending News service

This service provides an API to analyze news articles for trending topics. It uses Google Trends data to identify current trending topics and evaluates how relevant an article is to these trends.

## Features

- Fetch current trending topics from Google Trends
- Get related queries for trending topics
- Analyze articles to determine if they match trending topics
- Calculate similarity scores between articles and trending topics
- Support for batch processing of multiple articles

## Setup

### Prerequisites

- Python 3.11 or higher
- SerpAPI key (for Google Trends data)

### Installation

1. Clone this repository
2. Navigate to the project directory
3. Install dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

4. Create a `.env` file in the project root with the following variables:

```
SERPAPI_API_KEY=your_serpapi_api_key_here
DATA_PATH=
```
The `DATA_PATH` is optional since it will read articles from local json file

### Running the Service

#### Development Mode

```bash
uvicorn app.main:app --reload
```

#### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### Using Docker

Build the Docker image:

```bash
docker build -t trending-service .
```

Run the container:

```bash
docker run -p 8000:8000 --env-file .env trending-service
```

## API Documentation

Once the service is running, access the Swagger UI at:

```
http://localhost:8000/docs
```

### Endpoints

#### GET /trending

Returns a list of current trending topics from Google Trends.

Query Parameters:
- `country` (optional): Country code for trending data (default: "US")

#### GET /trending/related

Returns related queries for current trending topics.

Query Parameters:
- `country` (optional): Country code for trending data (default: "US")

#### POST /analyze

Analyzes a single article for trending relevance.

Request Body:
```json
{
  "content": "Article content here",
  "title": "Article title (optional)",
  "url": "Article URL (optional)"
}
```

Response:
```json
{
  "url": "Article URL",
  "title": "Article title",
  "content": "Article content",
  "trend": "Matching trend (if any)",
  "similarity_score": 0.75
}
```

#### POST /analyze/batch

Analyzes multiple articles for trending relevance.

Request Body:
```json
{
  "articles": [
    {
      "content": "First article content",
      "title": "First article title",
      "url": "First article URL"
    },
    {
      "content": "Second article content",
      "title": "Second article title",
      "url": "Second article URL"
    }
  ]
}
```

Response:
```json
[
  {
    "url": "First article URL",
    "title": "First article title",
    "content": "First article content",
    "trend": "Matching trend (if any)",
    "similarity_score": 0.75
  },
  {
    "url": "Second article URL",
    "title": "Second article title",
    "content": "Second article content",
    "trend": "Matching trend (if any)",
    "similarity_score": 0.62
  }
]
``` 