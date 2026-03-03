#!/bin/bash
# Download database from Google Drive if not present on Volume
DB_FILE="${DB_PATH:-/data/sillage.db}"
FILE_ID="1dT7Pwq0dRPt25tCz5S6eJ4X3VA7F-4cU"

if [ ! -f "$DB_FILE" ] || [ ! -s "$DB_FILE" ]; then
  echo "Database not found at $DB_FILE, downloading from Google Drive..."
  mkdir -p "$(dirname "$DB_FILE")"
  curl -L "https://drive.google.com/uc?export=download&id=${FILE_ID}&confirm=t" -o "$DB_FILE"
  if [ -f "$DB_FILE" ] && [ -s "$DB_FILE" ]; then
    echo "Database downloaded successfully ($(du -h "$DB_FILE" | cut -f1))"
  else
    echo "ERROR: Database download failed!"
    exit 1
  fi
else
  echo "Database found at $DB_FILE ($(du -h "$DB_FILE" | cut -f1)), skipping download."
fi

# Start the API
exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
