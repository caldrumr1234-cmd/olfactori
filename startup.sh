#!/bin/bash
DB_VOLUME="/data/sillage.db"
DB_REPO="/app/data/sillage.db"

echo "Force copying database from repo to Volume..."
mkdir -p /data
cp "$DB_REPO" "$DB_VOLUME"
echo "Copied $(du -h $DB_VOLUME | cut -f1) to Volume"

exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}