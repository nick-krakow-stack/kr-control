from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from database import engine, Base
from routers import auth, locations, cases, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    os.makedirs("uploads", exist_ok=True)
    yield


app = FastAPI(
    title="KR Control API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Produktion einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(locations.router, prefix="/api/locations", tags=["Parkplätze"])
app.include_router(cases.router, prefix="/api/cases", tags=["Fälle"])
app.include_router(stats.router, prefix="/api/stats", tags=["Statistiken"])


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "KR Control API"}
