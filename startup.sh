#!/bin/bash
# Run migration if DB doesn't exist or is empty
if [ ! -f "$DB_PATH" ] || [ ! -s "$DB_PATH" ]; then
  echo "Initializing database at $DB_PATH..."
  python migrate.py
  python backfill_notes.py
  echo "Database initialized."
else
  echo "Database exists, skipping init."
fi

# Start the API
uvicorn api.main:app --host 0.0.0.0 --port $PORT
