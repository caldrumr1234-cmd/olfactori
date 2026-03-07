"""
Olfactori — FastAPI Backend
Run: uvicorn api.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import fragrances, wear_log, wishlist, friends, suggest, insights, export, settings, shelves, used_to_have, decants
from api.routers import auth, security, share, trade_requests

app = FastAPI(title="Olfactori API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.olfactori.vip",
        "https://olfactori.vip",
        "http://localhost:5173",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fragrances.router, prefix="/api/fragrances",    tags=["fragrances"])
app.include_router(wear_log.router,   prefix="/api/wear",           tags=["wear"])
app.include_router(wishlist.router,   prefix="/api/wishlist",       tags=["wishlist"])
app.include_router(friends.router,    prefix="/api/friends",        tags=["friends"])
app.include_router(suggest.router,    prefix="/api/suggest",        tags=["suggest"])
app.include_router(insights.router,   prefix="/api/insights",       tags=["insights"])
app.include_router(export.router,     prefix="/api/export",         tags=["export"])
app.include_router(settings.router,   prefix="/api/settings",       tags=["settings"])
app.include_router(shelves.router,    prefix="/api/shelves",        tags=["shelves"])
app.include_router(used_to_have.router, prefix="/api/used_to_have", tags=["used_to_have"])
app.include_router(decants.router,      prefix="/api/decants",      tags=["decants"])

app.include_router(auth.router,     prefix="/api/auth",     tags=["auth"])
app.include_router(security.router, prefix="/api/security", tags=["security"])

app.include_router(share.router,          prefix="/api/share",          tags=["share"])
app.include_router(trade_requests.router, prefix="/api/trade-requests", tags=["trade_requests"])

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Olfactori"}