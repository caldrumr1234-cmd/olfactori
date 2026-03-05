"""
Olfactori — FastAPI Backend
Run: uvicorn api.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import fragrances, wear_log, wishlist, friends, suggest, insights, export, settings

app = FastAPI(title="Olfactori API", version="1.0.0", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fragrances.router, prefix="/api/fragrances", tags=["fragrances"])
app.include_router(wear_log.router,   prefix="/api/wear",       tags=["wear"])
app.include_router(wishlist.router,   prefix="/api/wishlist",   tags=["wishlist"])
app.include_router(friends.router,    prefix="/api/friends",    tags=["friends"])
app.include_router(suggest.router,    prefix="/api/suggest",    tags=["suggest"])
app.include_router(insights.router,   prefix="/api/insights",   tags=["insights"])
app.include_router(export.router,     prefix="/api/export",     tags=["export"])
app.include_router(settings.router,   prefix="/api/settings",   tags=["settings"])

@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Olfactori"}