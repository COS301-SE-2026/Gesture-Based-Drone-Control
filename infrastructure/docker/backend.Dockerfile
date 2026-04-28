FROM python:3.11-slim

WORKDIR /app

#install dependencies needed by opencv and mediapipe
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY ./apps/backend/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY ./apps/backend .

CMD ["python", "test_mediapipe.py"]