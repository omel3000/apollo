# main.py
from fastapi import FastAPI
from routers import users
from database import engine, Base

app = FastAPI(title="Apollo Backend")

# Tworzymy tabele w bazie (jeśli jeszcze nie istnieją)
Base.metadata.create_all(bind=engine)

# Dodajemy router użytkowników pod ścieżką /users
app.include_router(users.router, prefix="/users", tags=["Users"])

@app.get("/")
def root():
    return {"message": "Witaj w API Apollo Backend"}

