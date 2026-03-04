#!/bin/bash
DB_FILE="${DB_PATH:-/data/sillage.db}"
FILE_ID="1dT7Pwq0dRPt25tCz5S6eJ4X3VA7F-4cU"

if [ ! -f "$DB_FILE" ] || [ ! -s "$DB_FILE" ]; then
  echo "Downloading database from Google Drive..."
  mkdir -p "$(dirname "$DB_FILE")"
  python -c "
import urllib.request, os
file_id = '1dT7Pwq0dRPt25tCz5S6eJ4X3VA7F-4cU'
dest = os.environ.get('DB_PATH', '/data/sillage.db')
url = 'https://drive.google.com/uc?export=download&id=' + file_id + '&confirm=t'
urllib.request.urlretrieve(url, dest)
size = os.path.getsize(dest)
print('Downloaded', size, 'bytes to', dest)
"
  if [ -f "$DB_FILE" ] && [ -s "$DB_FILE" ]; then
    echo "Database ready."
  else
    echo "ERROR: Download failed, falling back to migration..."
    python migrate.py
    python backfill_notes.py
  fi
else
  echo "Database found at $DB_FILE, skipping download."
fi

exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
