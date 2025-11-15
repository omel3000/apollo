from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import UserProjectCreate, UserProjectRead, UserShortRead, ProjectRead
from crud import assign_user_to_project, get_assignments, get_users_assigned_to_project, get_projects_for_user, delete_user_project_assignment
from auth import admin_or_hr_required, get_current_user
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

@router.get("/assigned_users/{project_id}", response_model=List[UserShortRead])
def get_assigned_users(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_or_hr_required)):
    """
    Zwraca listę użytkowników przypisanych do danego projektu (tylko admin/HR).
    """
    users = get_users_assigned_to_project(db, project_id)
    return users

@router.get("/my_projects", response_model=List[ProjectRead])
def read_my_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Zwraca listę projektów przypisanych do bieżącego (zalogowanego) użytkownika.
    """
    projects = get_projects_for_user(db, current_user.user_id)
    return projects

@router.delete("/{user_id}/{project_id}")
def remove_assignment(user_id: int, project_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_or_hr_required)):
    """
    Usuwa przypisanie użytkownika do projektu - tylko admin/HR.
    """
    try:
        deleted = delete_user_project_assignment(db, user_id, project_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Nie znaleziono przypisania użytkownika {user_id} do projektu {project_id}"
            )
        return {"message": "Przypisanie usunięte pomyślnie"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
