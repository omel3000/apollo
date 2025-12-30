# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import users, projects, messages, work_reports, user_projects, availability, absences, schedule, periods, audit_logs  
from database import engine, Base, SessionLocal
from audit_logging import AuditLoggingMiddleware
import os
import logging
import asyncio
from datetime import date, timedelta

import crud

# Konfiguracja logowania
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Wyłącz verbose logi bibliotek na produkcji
if os.getenv("ENVIRONMENT") == "production":
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("passlib").setLevel(logging.WARNING)

# Kontrola dostępności Swagger UI - osobna zmienna (niezależna od ENVIRONMENT)
enable_docs = os.getenv("ENABLE_DOCS", "true").lower() in ("true", "1", "yes")

# FastAPI app - kontrola docs przez zmienną ENABLE_DOCS
app = FastAPI(
    title="Apollo Backend",
    docs_url="/docs" if enable_docs else None,
    redoc_url="/redoc" if enable_docs else None,
    description="API systemu Apollo - zarządzanie czasem pracy",
    version="1.0.0",
)

# === CORS CONFIGURATION ===
# Pobierz dozwolone originy z .env (oddzielone przecinkami)
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost")
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]

logging.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Audit logging middleware (musi być po CORS)
app.add_middleware(AuditLoggingMiddleware)

# Tworzymy tabele w bazie (jeśli jeszcze nie istnieją)
Base.metadata.create_all(bind=engine)

# Dodajemy router użytkowników pod ścieżką /users
app.include_router(users.router, prefix="/users", tags=["Users"])

app.include_router(projects.router, prefix="/projects", tags=["Projects"])

app.include_router(messages.router, prefix="/messages", tags=["Messages"])

app.include_router(work_reports.router, prefix="/work_reports", tags=["WorkReports"])

app.include_router(user_projects.router, prefix="/user_projects", tags=["UserProjects"])

app.include_router(availability.router, prefix="/availability", tags=["Availability"])

app.include_router(absences.router, prefix="/absences", tags=["Absences"])

app.include_router(schedule.router, prefix="/schedule", tags=["Schedule"])

app.include_router(periods.router, prefix="/periods", tags=["Periods"])

app.include_router(audit_logs.router, prefix="/audit_logs", tags=["AuditLogs"])


def _next_month(year: int, month: int) -> tuple[int, int]:
    if month == 12:
        return year + 1, 1
    return year, month + 1


def _ensure_periods_precreated(today: date) -> None:
    precreate_days = int(os.getenv("PERIOD_PRECREATE_DAYS", "14"))

    next_year, next_month = _next_month(today.year, today.month)
    first_next_month = date(next_year, next_month, 1)
    threshold = first_next_month - timedelta(days=precreate_days)

    db = SessionLocal()
    try:
        # zawsze upewnij się, że bieżący miesiąc istnieje (idempotentne)
        crud.create_period(db, today.year, today.month)

        # jeśli jesteśmy w oknie 14 dni (albo później), upewnij się, że następny miesiąc istnieje
        if today >= threshold:
            crud.create_period(db, next_year, next_month)
    finally:
        db.close()


async def _periods_maintenance_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(_ensure_periods_precreated, date.today())
        except Exception:
            logging.exception("Błąd automatycznego tworzenia okresów")
        await asyncio.sleep(24 * 60 * 60)


@app.on_event("startup")
async def _startup_periods_maintenance() -> None:
    # Uruchom natychmiastową weryfikację + potem cykliczne sprawdzanie
    try:
        await asyncio.to_thread(_ensure_periods_precreated, date.today())
    except Exception:
        logging.exception("Błąd podczas startowej weryfikacji okresów")
    asyncio.create_task(_periods_maintenance_loop())

@app.get("/")
def root():
    return {"message": "Witaj w API Apollo Backend"}

