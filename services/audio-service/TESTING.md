# Audio Service

## Testing

This project uses pytest for testing. The test suite includes:

- Unit tests for all services
- Integration tests
- API tests

### Running Tests

To run the tests, make sure you have installed all dependencies including the testing packages:

```bash
pip install -r requirements.txt
```

Then run the tests using:

```bash
./run_tests.sh
```

Or directly using pytest:

```bash
python -m pytest
```

For more detailed output and coverage information:

```bash
python -m pytest --verbose --cov=app --cov-report=term-missing
```

### Test Structure

Tests are organized by service:

- `tests/test_main.py` - Tests for the FastAPI application
- `tests/test_podcast_service.py` - Tests for the podcast generation service
- `tests/test_article_service.py` - Tests for article retrieval
- `tests/test_redis_service.py` - Tests for Redis functionality
- `tests/test_upload_service.py` - Tests for S3 uploads

### Writing New Tests

When adding new functionality, please add corresponding tests:

1. Use fixtures from `conftest.py` when possible
2. Mock external dependencies
3. Use `@pytest.mark.asyncio` for async functions
4. Add proper assertions

### Environment Variables

For testing, the following environment variables should be set:

```
OPENAI_API_KEY=test-key
GOOGLE_GEMINI_API_KEY=test-key
DO_SPACES_KEY=test-key
DO_SPACES_SECRET=test-secret
DO_SPACES_ENDPOINT=https://test.digitaloceanspaces.com
DO_SPACES_BUCKET=test-bucket
DO_SPACES_REGION=test-region
```

For local testing, you can create a `.env.test` file with these values.
