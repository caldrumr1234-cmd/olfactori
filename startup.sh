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

python -c "
import sqlite3
con = sqlite3.connect('/data/sillage.db')
con.executescript('''
CREATE TABLE IF NOT EXISTS sample_requests (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    friend_id    INTEGER REFERENCES friend_invites(id),
    friend_name  TEXT,
    fragrance_ids TEXT DEFAULT ''[]'',
    fragrance_names TEXT DEFAULT ''[]'',
    message      TEXT,
    status       TEXT DEFAULT ''pending'',
    created_at   TEXT DEFAULT (datetime(''''now'''')),
    updated_at   TEXT
);
''')
con.commit()
con.close()
print('Tables verified.')
"

exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}