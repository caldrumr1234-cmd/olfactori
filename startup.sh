#!/bin/bash
DB_VOLUME="/data/sillage.db"
DB_REPO="/app/data/sillage.db"

if [ ! -f "$DB_VOLUME" ] || [ ! -s "$DB_VOLUME" ]; then
  echo "No database on Volume — copying from repo..."
  mkdir -p /data
  cp "$DB_REPO" "$DB_VOLUME"
  echo "Copied $(du -h $DB_VOLUME | cut -f1) to Volume"
else
  echo "Database exists on Volume ($(du -h $DB_VOLUME | cut -f1)) — using it."
fi

echo "Running schema migrations..."
python3 migrate_startup.py
python3 migrate_v2.py
exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}
