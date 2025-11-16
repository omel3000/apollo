# main.py
from fastapi import FastAPI
from routers import users, projects, messages, work_reports, user_projects, availability, absences, schedule, periods, audit_logs  
from database import engine, Base
from audit_logging import AuditLoggingMiddleware

app = FastAPI(title="Apollo Backend")

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

@app.get("/")
def root():
    return {"message": "Witaj w API Apollo Backend"}

