# Stage 1: Build & Dependencies
FROM python:3.12-slim as builder

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev libjpeg62-turbo-dev zlib1g-dev default-libmysqlclient-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Stage 2: Production Container
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev libjpeg62-turbo-dev zlib1g-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*

COPY . .

# Run as non-root user
RUN useradd -m myuser
USER myuser

# Healthcheck targeting integrations route 
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl --fail http://localhost:8000/api/v1/integrations/health || exit 1

EXPOSE 8000

# Execute migrations prior to boot binding explicitly using Gunicorn over UvicornWorker
ENTRYPOINT ["sh", "-c", "alembic upgrade head && exec gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000"]
