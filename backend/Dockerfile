# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Ngăn Python ghi file .pyc và bật unbuffered log
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    FLASK_ENV=production

WORKDIR /app

# Cài đặt build tools nhẹ nếu cần compile package C
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Cache dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code backend
COPY . .

# Tạo thư mục uploads và instance nếu chưa có
RUN mkdir -p /app/uploads /app/instance /app/logs

EXPOSE 5000

# Chạy backend qua Gunicorn worker gthread hỗ trợ đa luồng và WebSocket native
CMD ["gunicorn", "--worker-class", "gthread", "-w", "1", "--threads", "8", "--bind", "0.0.0.0:5000", "run:app"]
