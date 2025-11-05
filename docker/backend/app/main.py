# main.py
from fastapi import FastAPI
from routers import users, projects, messages, work_reports, user_projects  
from database import engine, Base

app = FastAPI(title="Apollo Backend")

# Tworzymy tabele w bazie (jeśli jeszcze nie istnieją)
Base.metadata.create_all(bind=engine)

# Dodajemy router użytkowników pod ścieżką /users
app.include_router(users.router, prefix="/users", tags=["Users"])

app.include_router(projects.router, prefix="/projects", tags=["Projects"])

app.include_router(messages.router, prefix="/messages", tags=["Messages"])

app.include_router(work_reports.router, prefix="/work_reports", tags=["WorkReports"])

app.include_router(user_projects.router, prefix="/user_projects", tags=["UserProjects"])

@app.get("/")
def root():
    return {"message": "Witaj w API Apollo Backend"}

