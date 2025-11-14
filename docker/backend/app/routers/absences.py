from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from database import get_db
from auth import get_current_user, admin_or_hr_required
from models import User
import crud
from schemas import AbsenceCreate, AbsenceRead, AbsenceUpdate, AbsenceTypeEnum

router = APIRouter()

# ============================================================================
# Worker endpoints - zarządzanie własnymi nieobecnościami
# ============================================================================

@router.post("/my_absences", response_model=AbsenceRead, status_code=status.HTTP_201_CREATED)
def create_my_absence(
    absence: AbsenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker może dodać swoją nieobecność (urlop, L4, inne).
    """
    try:
        return crud.create_absence(db, current_user.user_id, absence)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/my_absences", response_model=List[AbsenceRead])
def get_my_absences(
    absence_type: Optional[AbsenceTypeEnum] = Query(None, description="Filtruj po typie nieobecności"),
    date_from: Optional[date] = Query(None, description="Data początkowa zakresu"),
    date_to: Optional[date] = Query(None, description="Data końcowa zakresu"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker może pobrać swoje nieobecności z opcjonalnymi filtrami.
    """
    return crud.get_absences(
        db,
        user_id=current_user.user_id,
        absence_type=absence_type.value if absence_type else None,
        date_from=date_from,
        date_to=date_to
    )

@router.get("/my_absences/{date_param}", response_model=AbsenceRead)
def get_my_absence(
    date_param: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker może pobrać szczegóły swojej nieobecności dla konkretnej daty.
    Zwraca nieobecność która obejmuje podaną datę.
    """
    absence = crud.get_absence_by_date(db, current_user.user_id, date_param)
    if not absence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brak nieobecności obejmującej datę {date_param}"
        )
    return absence

@router.put("/my_absences/{date_param}", response_model=AbsenceRead)
def update_my_absence(
    date_param: date,
    absence_update: AbsenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker może zaktualizować swoją nieobecność dla konkretnej daty.
    Aktualizuje nieobecność która obejmuje podaną datę.
    """
    try:
        return crud.update_absence_by_date(db, current_user.user_id, date_param, absence_update)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/my_absences/{date_param}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_absence(
    date_param: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Worker może usunąć swoją nieobecność dla konkretnej daty.
    Usuwa nieobecność która obejmuje podaną datę.
    """
    deleted = crud.delete_absence_by_date(db, current_user.user_id, date_param)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Brak nieobecności obejmującej datę {date_param}"
        )
    return None

# ============================================================================
# Admin/HR endpoints - przeglądanie nieobecności użytkowników
# ============================================================================

@router.get("/", response_model=List[AbsenceRead])
def get_all_absences(
    user_id: Optional[int] = Query(None, description="Filtruj po ID użytkownika"),
    absence_type: Optional[AbsenceTypeEnum] = Query(None, description="Filtruj po typie nieobecności"),
    date_from: Optional[date] = Query(None, description="Data początkowa zakresu"),
    date_to: Optional[date] = Query(None, description="Data końcowa zakresu"),
    current_user: User = Depends(admin_or_hr_required),
    db: Session = Depends(get_db)
):
    """
    Admin/HR może przeglądać nieobecności wszystkich użytkowników z filtrami.
    """
    return crud.get_absences(
        db,
        user_id=user_id,
        absence_type=absence_type.value if absence_type else None,
        date_from=date_from,
        date_to=date_to
    )

@router.get("/{absence_id}", response_model=AbsenceRead)
def get_absence_by_id(
    absence_id: int,
    current_user: User = Depends(admin_or_hr_required),
    db: Session = Depends(get_db)
):
    """
    Admin/HR może pobrać szczegóły nieobecności dowolnego użytkownika.
    """
    absence = crud.get_absence(db, absence_id)
    if not absence:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nieobecność o id {absence_id} nie istnieje"
        )
    return absence
