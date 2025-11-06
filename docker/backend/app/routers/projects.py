from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import ProjectCreate, ProjectRead, ProjectUpdate, ProjectMonthlySummaryRequest, ProjectMonthlySummary, ProjectMonthlySummaryWithUsers
from crud import create_project, update_project, get_project_monthly_summary, get_project_monthly_summary_with_users
from auth import get_current_user, admin_or_hr_required
from models import User, Project

router = APIRouter()

@router.post("/", response_model=ProjectRead)
def create_new_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required)
):
    try:
        new_project = create_project(db=db, project=project, user_id=current_user.user_id)
        return new_project
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[ProjectRead])
def read_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required)
):
    projects = db.query(Project).all()
    return projects

@router.put("/{project_id}", response_model=ProjectRead)
def update_project_endpoint(
    project_id: int,
    project: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required)
):
    """Edycja danych projektu - dostępna dla admin/HR"""
    try:
        updated = update_project(db, project_id, project)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/monthly_summary", response_model=ProjectMonthlySummary)
def get_project_monthly_summary_endpoint(
    request: ProjectMonthlySummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required)
):
    """
    Zwraca łączną sumę godzin przepracowanych w danym projekcie w danym miesiącu (admin/HR).
    """
    summary = get_project_monthly_summary(db, request.project_id, request.month, request.year)
    return summary

@router.post("/monthly_summary_with_users", response_model=ProjectMonthlySummaryWithUsers)
def get_project_monthly_summary_with_users_endpoint(
    request: ProjectMonthlySummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required)
):
    """
    Zwraca łączną sumę godzin + listę użytkowników dla danego projektu w miesiącu (admin/HR).
    """
    summary = get_project_monthly_summary_with_users(db, request.project_id, request.month, request.year)
    return summary

