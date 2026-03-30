from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import os
import logging

from database import engine, Base, SessionLocal
from models import Case, User
from routers import auth, locations, cases, stats
from routers import users as users_router

logger = logging.getLogger(__name__)
os.makedirs("uploads", exist_ok=True)

scheduler = BackgroundScheduler()


def promote_pending_cases():
    """Verschiebt abgelaufene 'pending' Fälle automatisch auf 'new'."""
    try:
        with SessionLocal() as db:
            now = datetime.utcnow()
            updated = db.query(Case).filter(
                Case.status == "pending",
                Case.recall_deadline <= now,
            ).update({"status": "new"})
            if updated:
                db.commit()
                logger.info(f"Scheduler: {updated} Fälle von 'pending' auf 'new' gesetzt")
    except Exception as e:
        logger.error(f"Scheduler-Fehler: {e}")


def seed_admin():
    """Legt den ersten Admin-User an, falls keine User vorhanden."""
    from config import settings
    from routers.auth import hash_password

    with SessionLocal() as db:
        if db.query(User).count() == 0:
            admin = User(
                username=settings.first_admin_username,
                email=settings.first_admin_email,
                hashed_password=hash_password(settings.first_admin_password),
                role="admin",
                is_active=True,
                email_verified=True,
            )
            db.add(admin)
            db.commit()
            logger.info(f"Admin-User '{settings.first_admin_username}' angelegt")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_admin()
    scheduler.add_job(promote_pending_cases, "interval", seconds=60)
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(
    title="KR Control API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Produktion auf Frontend-Domain einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users_router.router, prefix="/api/users", tags=["Benutzer"])
app.include_router(locations.router, prefix="/api/locations", tags=["Parkplätze"])
app.include_router(cases.router, prefix="/api/cases", tags=["Fälle"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistiken"])


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "KR Control API", "version": "2.0.0"}
