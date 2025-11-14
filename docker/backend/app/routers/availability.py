from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from database import get_db
from auth import get_current_user, admin_or_hr_required
from models import User
import crud
from schemas import AvailabilityCreate, AvailabilityRead, AvailabilityUpdate

router = APIRouter()

# ============================================================================
# Worker endpoints - zarządzanie własną dostępnością
# ============================================================================

@router.post("/my_availability", response_model=AvailabilityRead, status_code=status.HTTP_201_CREATED)
def create_my_availability(
    availability: AvailabilityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker może dodać swoją dostępność dla konkretnej daty.
    """
    try:
        return crud.create_availability(db, current_user.user_id, availability)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/my_availability", response_model=List[AvailabilityRead])
def get_my_availability(
    date_from: Optional[date] = Query(None, description="Data początkowa (włącznie)"),
    date_to: Optional[date] = Query(None, description="Data końcowa (włącznie)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker może pobrać swoją dostępność z opcjonalnym filtrowaniem po zakresie dat.
    """
    return crud.get_availabilities(
        db,
        user_id=current_user.user_id,
        date_from=date_from,
        date_to=date_to
    )

@router.get("/my_availability/{date_param}", response_model=AvailabilityRead)
def get_my_availability_by_date(
    date_param: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker może pobrać swoją dostępność dla konkretnej daty.
    """
    availability = crud.get_availability(db, current_user.user_id, date_param)
    if not availability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brak dostępności dla daty {date_param}"
        )
    return availability

@router.put("/my_availability/{date_param}", response_model=AvailabilityRead)
def update_my_availability(
    date_param: date,
    availability_update: AvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker może zaktualizować swoją dostępność dla konkretnej daty.
    """
    try:
        return crud.update_availability(db, current_user.user_id, date_param, availability_update)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/my_availability/{date_param}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_availability(
    date_param: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker może usunąć swoją dostępność dla konkretnej daty.
    """
    deleted = crud.delete_availability(db, current_user.user_id, date_param)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brak dostępności dla daty {date_param}"
        )
    return None

# ============================================================================
# Admin/HR endpoints - przeglądanie dostępności użytkowników
# ============================================================================

@router.get("/", response_model=List[AvailabilityRead])
def get_all_availability(
    user_id: Optional[int] = Query(None, description="Filtruj po ID użytkownika"),
    date_from: Optional[date] = Query(None, description="Data początkowa (włącznie)"),
    date_to: Optional[date] = Query(None, description="Data końcowa (włącznie)"),
    current_user: User = Depends(admin_or_hr_required),
    db: Session = Depends(get_db)
):
    """
    Admin/HR może przeglądać dostępność wszystkich użytkowników z filtrami.
    """
    return crud.get_availabilities(
        db,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to
    )

@router.get("/{user_id}/{date_param}", response_model=AvailabilityRead)
def get_user_availability_by_date(
    user_id: int,
    date_param: date,
    current_user: User = Depends(admin_or_hr_required),
    db: Session = Depends(get_db)
):
    """
    Admin/HR może pobrać dostępność konkretnego użytkownika dla konkretnej daty.
    """
    availability = crud.get_availability(db, user_id, date_param)
    if not availability:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brak dostępności dla użytkownika {user_id} w dniu {date_param}"
        )
    return availability
