"""
api/routers/settings.py
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from api.database import get_db

router = APIRouter()

class SettingUpdate(BaseModel):
    value: str

@router.get("/")
def get_settings(db = Depends(get_db)):
    rows = db.execute("SELECT key, value FROM settings").fetchall()
    return {r["key"]: r["value"] for r in rows}

@router.patch("/{key}")
def update_setting(key: str, data: SettingUpdate, db = Depends(get_db)):
    db.execute(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?,?,datetime('now'))",
        (key, data.value)
    )
    db.commit()
    return {"key": key, "value": data.value}
