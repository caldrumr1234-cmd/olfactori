#!/bin/bash
DB_FILE="${DB_PATH:-/data/sillage.db}"
FILE_ID="1hY77mkLucyu7xs3EH_zJz3t1GVy7ZUNJ"

if [ ! -f "$DB_FILE" ] || [ ! -s "$DB_FILE" ]; then
  echo "Downloading database from Google Drive..."
  mkdir -p "$(dirname "$DB_FILE")"
  python -c "
import urllib.request, os
file_id = '1hY77mkLucyu7xs3EH_zJz3t1GVy7ZUNJ'
dest = os.environ.get('DB_PATH', '/data/sillage.db')
url = 'https://drive.google.com/uc?export=download&id=' + file_id + '&confirm=t'
urllib.request.urlretrieve(url, dest)
size = os.path.getsize(dest)
print('Downloaded', size, 'bytes to', dest)
"
  if [ -f "$DB_FILE" ] && [ -s "$DB_FILE" ]; then
    echo "Database ready."
  else
    echo "ERROR: Download failed!"
    exit 1
  fi
else
  echo "Database found at $DB_FILE, skipping download."
fi

exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}
