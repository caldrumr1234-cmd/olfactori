import sqlite3
DB_PATH = "/data/sillage.db"
con = sqlite3.connect(DB_PATH)
try:
    con.execute("ALTER TABLE used_to_have ADD COLUMN custom_image_url TEXT")
    con.commit()
    print("Migration complete")
except Exception as e:
    print(f"Already exists or error: {e}")
finally:
    con.close()