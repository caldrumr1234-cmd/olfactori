import sqlite3

con = sqlite3.connect('/data/sillage.db')

migrations = [
    'ALTER TABLE fragrances ADD COLUMN r2_image_url TEXT',
    'ALTER TABLE used_to_have ADD COLUMN r2_image_url TEXT',
    'ALTER TABLE wishlist ADD COLUMN r2_image_url TEXT',
    'ALTER TABLE used_to_have ADD COLUMN custom_image_url TEXT',
    'ALTER TABLE fragrances ADD COLUMN want_to_trade INTEGER DEFAULT 0',
    'ALTER TABLE fragrances ADD COLUMN want_to_sell INTEGER DEFAULT 0',
    'ALTER TABLE fragrances ADD COLUMN want_to_give_away INTEGER DEFAULT 0',
    'ALTER TABLE wishlist ADD COLUMN custom_image_url TEXT',
    # decants
    'ALTER TABLE decants ADD COLUMN fragrance_id INTEGER',
    'ALTER TABLE decants ADD COLUMN volume_remaining_ml REAL',
    'ALTER TABLE decants ADD COLUMN source TEXT',
    'ALTER TABLE decants ADD COLUMN custom_image_url TEXT',
    'ALTER TABLE decants ADD COLUMN fragrantica_url TEXT',
    # shelves
    'ALTER TABLE shelves ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0',
    "ALTER TABLE shelves ADD COLUMN color TEXT NOT NULL DEFAULT '#7aabff'",
    "ALTER TABLE shelves ADD COLUMN icon TEXT NOT NULL DEFAULT '🧴'",
    # tables
    'CREATE TABLE IF NOT EXISTS security_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT UNIQUE NOT NULL, label TEXT, grp TEXT, public INTEGER DEFAULT 0)',
    """CREATE TABLE IF NOT EXISTS decants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL DEFAULT 'decant',
        brand TEXT NOT NULL,
        name TEXT NOT NULL,
        concentration TEXT,
        size_ml REAL,
        quantity INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT DEFAULT (date('now'))
    )""",
    """CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        invite_token TEXT UNIQUE,
        invite_url TEXT,
        revoked INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )""",
    """CREATE TABLE IF NOT EXISTS login_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        logged_in_at TEXT DEFAULT (datetime('now'))
    )""",
    """CREATE TABLE IF NOT EXISTS share_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT,
        bio TEXT,
        show_size INTEGER DEFAULT 1,
        show_concentration INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
    )""",
    """CREATE TABLE IF NOT EXISTS trade_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        friend_name TEXT NOT NULL,
        friend_email TEXT,
        fragrance_ids TEXT NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
    )""",
    """CREATE TABLE IF NOT EXISTS friend_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        token TEXT UNIQUE,
        is_active INTEGER DEFAULT 1,
        last_seen TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )""",
    """CREATE TABLE IF NOT EXISTS sample_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        friend_id INTEGER,
        friend_name TEXT NOT NULL,
        fragrance_ids TEXT NOT NULL,
        fragrance_names TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT
    )""",
]

for m in migrations:
    try:
        con.execute(m)
        con.commit()
        print(f'  OK: {m[:80]}')
    except Exception as e:
        print(f'  Skip: {m[:80]} ({e})')

con.close()
print('Migrations complete.')
