#!/bin/bash
FILE_ID="1hY77mkLucyu7xs3EH_zJz3t1GVy7ZUNJ"

echo "Downloading database from Google Drive..."
python -c "
import urllib.request, os, re

file_id = '1hY77mkLucyu7xs3EH_zJz3t1GVy7ZUNJ'
dest = 'data/sillage.db'
os.makedirs('data', exist_ok=True)

# First request to get confirmation token
opener = urllib.request.build_opener()
opener.addheaders = [('User-Agent', 'Mozilla/5.0')]
url = 'https://drive.google.com/uc?export=download&id=' + file_id
response = opener.open(url)
content = response.read()

# Check if we got an HTML warning page
if b'confirm=' in content:
    # Extract confirm token
    match = re.search(rb'confirm=([0-9A-Za-z_]+)', content)
    if match:
        token = match.group(1).decode()
        url2 = 'https://drive.google.com/uc?export=download&id=' + file_id + '&confirm=' + token
        response2 = opener.open(url2)
        content = response2.read()

with open(dest, 'wb') as f:
    f.write(content)

size = os.path.getsize(dest)
print('Downloaded', size, 'bytes')

import sqlite3
con = sqlite3.connect(dest)
count = con.execute('SELECT COUNT(*) FROM fragrances').fetchone()[0]
print('Fragrances:', count)
"

exec uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8080}
