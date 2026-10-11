# CivicPin (Django) container image.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Fallback build deps: Pillow and psycopg[binary] normally install from
# wheels, so these are only exercised on a platform with no wheel available.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install gunicorn

COPY . .

# Collected with DEBUG off so the hashed-filename manifest is written; the
# real secret key is supplied at runtime.
RUN DJANGO_DEBUG=False DJANGO_SECRET_KEY=build-time-only \
    python manage.py collectstatic --noinput

EXPOSE 8000

# Apply migrations, then serve. Static files are served by WhiteNoise.
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn civicpin.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120"]
