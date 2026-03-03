"""
backfill_notes.py
Reads top_notes, middle_notes, base_notes, main_accords from fragrances table
and populates the fragrance_notes lookup table.

Run once: python backfill_notes.py
"""
import sqlite3, json
from pathlib import Path

DB = Path("data/sillage.db")

def main():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row

    rows = con.execute("SELECT id, top_notes, middle_notes, base_notes, main_accords FROM fragrances").fetchall()

    con.execute("DELETE FROM fragrance_notes")  # clean slate

    inserts = []
    for row in rows:
        fid = row["id"]
        for pos, col in [("top", "top_notes"), ("middle", "middle_notes"),
                         ("base", "base_notes"), ("accord", "main_accords")]:
            raw = row[col]
            try:
                items = json.loads(raw) if raw else []
            except Exception:
                items = []
            for item in items:
                name = item.get("name", item) if isinstance(item, dict) else str(item)
                name = name.strip()
                if name:
                    inserts.append((fid, name, pos))

    con.executemany(
        "INSERT INTO fragrance_notes (fragrance_id, note_name, note_position) VALUES (?,?,?)",
        inserts
    )
    con.commit()

    count = con.execute("SELECT COUNT(*) FROM fragrance_notes").fetchone()[0]
    top   = con.execute("SELECT COUNT(*) FROM fragrance_notes WHERE note_position='top'").fetchone()[0]
    mid   = con.execute("SELECT COUNT(*) FROM fragrance_notes WHERE note_position='middle'").fetchone()[0]
    base  = con.execute("SELECT COUNT(*) FROM fragrance_notes WHERE note_position='base'").fetchone()[0]
    acc   = con.execute("SELECT COUNT(*) FROM fragrance_notes WHERE note_position='accord'").fetchone()[0]
    con.close()

    print(f"✓ {count} notes inserted")
    print(f"  Top: {top}  Heart: {mid}  Base: {base}  Accords: {acc}")

if __name__ == "__main__":
    main()
