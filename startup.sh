#!/bin/bash
FILE_ID="1hY77mkLucyu7xs3EH_zJz3t1GVy7ZUNJ"

echo "Downloading database from Google Drive..."
python -c "
import urllib.request, os
file_id = '1hY77mkLucyu7xs3EH_zJz3t1GVy7ZUNJ'
dest = 'data/sillage.db'
os.makedirs('data', exist_ok=True)
url = 'https://drive.google.com/uc?export=download&id=' + file_id + '&confirm=t'
urllib.request.urlretrieve(url, dest)
size = os.path.getsize(dest)
print('Downloaded', size, 'bytes')
import sqlite3
con = sqlite3.connect(dest)
count = con.execute('SELECT COUNT(*) FROM fragrances').fetchone()[0]
print('Fragrances:', count)
"

exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}
