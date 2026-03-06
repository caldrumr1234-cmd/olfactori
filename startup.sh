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
python3 -c "
import sqlite3
con = sqlite3.connect('/data/sillage.db')
migrations = [
    'ALTER TABLE used_to_have ADD COLUMN custom_image_url TEXT',
]
for m in migrations:
    try:
        con.execute(m)
        con.commit()
        print(f'  OK: {m}')
    except Exception as e:
        print(f'  Skip: {m} ({e})')
con.close()
print('Migrations complete.')
"

exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}
