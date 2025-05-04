FROM python:3.11-slim

WORKDIR /app

RUN echo ".env\n__pycache__\n*.pyc\n*.pyo\n*.pyd\n.Python\n.coverage\nenv/\nvenv/\n.git/\n.gitignore" > .dockerignore

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "audio_service.main:app", "--host", "0.0.0.0", "--port", "8001"] 