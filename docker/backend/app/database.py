# database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use environment variable for DB connection (safer) with sensible default for local dev
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://apollo:apollo123@postgres-db:5432/apollo_test_db"
)

# enable pool_pre_ping to avoid "stale connection" errors in long-running apps
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Funkcja do uzyskania sesji bazy danych
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

