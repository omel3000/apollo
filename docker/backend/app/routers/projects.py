from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import ProjectCreate, ProjectRead
from crud import create_project
from auth import get_current_user
from models import User, Project

router = APIRouter()

def admin_or_hr_required(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "hr"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak uprawnień")
    return current_user

@router.post("/", response_model=ProjectRead)
def create_new_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_project = create_project(db=db, project=project, user_id=current_user.user_id)
    return new_project

@router.get("/", response_model=List[ProjectRead])
def read_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    return projects

