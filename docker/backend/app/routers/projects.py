from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import ProjectCreate, ProjectRead
from crud import create_project
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

