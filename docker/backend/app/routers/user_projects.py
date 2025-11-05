from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import UserProjectCreate, UserProjectRead
from crud import assign_user_to_project, get_assignments
from auth import admin_or_hr_required
from models import User

router = APIRouter()

@router.post("/", response_model=UserProjectRead)
def create_assignment(assignment: UserProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(admin_or_hr_required)):
    # Przypisanie użytkownika do projektu - tylko admin/HR
    try:
        assigned = assign_user_to_project(db, assignment)
        return assigned
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[UserProjectRead])
def read_assignments(user_id: int = None, project_id: int = None, db: Session = Depends(get_db), current_user: User = Depends(admin_or_hr_required)):
    # Pobieranie przypisań, można filtrować po user_id i project_id
    assignments = get_assignments(db, user_id=user_id, project_id=project_id)
    return assignments
