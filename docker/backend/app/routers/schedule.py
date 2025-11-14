from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from database import get_db
from auth import get_current_user, admin_or_hr_required
from models import User
import crud
from schemas import ScheduleCreate, ScheduleRead, ScheduleUpdate, ScheduleWithUserInfo, DaySchedule, MonthScheduleRequest, ShiftTypeEnum

router = APIRouter()

# ============================================================================
# Endpointy dostępne dla wszystkich zalogowanych użytkowników (odczyt grafiku)
# ============================================================================

@router.get("/day/{work_date}", response_model=List[ScheduleWithUserInfo])
def get_schedule_for_day(
    work_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pobiera grafik dla konkretnego dnia.
    Dostępne dla wszystkich zalogowanych użytkowników.
    """
    return crud.get_schedule_for_day(db, work_date)

@router.post("/month", response_model=List[DaySchedule])
def get_schedule_for_month(
    request: MonthScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pobiera grafik dla całego miesiąca.
    Dostępne dla wszystkich zalogowanych użytkowników.
    """
    if request.month < 1 or request.month > 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Miesiąc musi być w zakresie 1-12")
    
    return crud.get_schedule_for_month(db, request.month, request.year)

@router.get("/user/{user_id}", response_model=List[ScheduleRead])
def get_user_schedule(
    user_id: int,
    date_from: Optional[date] = Query(None, description="Data początkowa"),
    date_to: Optional[date] = Query(None, description="Data końcowa"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pobiera grafik konkretnego użytkownika z opcjonalnym filtrem dat.
    Dostępne dla wszystkich zalogowanych użytkowników.
    """
    return crud.get_schedules(
        db,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to
    )

@router.get("/", response_model=List[ScheduleRead])
def get_all_schedules(
    user_id: Optional[int] = Query(None, description="Filtruj po ID użytkownika"),
    date_from: Optional[date] = Query(None, description="Data początkowa"),
    date_to: Optional[date] = Query(None, description="Data końcowa"),
    shift_type: Optional[ShiftTypeEnum] = Query(None, description="Filtruj po typie zmiany"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Pobiera wszystkie wpisy grafiku z opcjonalnymi filtrami.
    Dostępne dla wszystkich zalogowanych użytkowników.
    """
    return crud.get_schedules(
        db,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        shift_type=shift_type.value if shift_type else None
    )

# ============================================================================
# Endpointy HR/Admin - zarządzanie grafikiem
# ============================================================================

@router.post("/", response_model=ScheduleRead, status_code=status.HTTP_201_CREATED)
def create_schedule_entry(
    schedule: ScheduleCreate,
    current_user: User = Depends(admin_or_hr_required),
    db: Session = Depends(get_db)
):
    """
    Tworzy nowy wpis w grafiku.
    Dostępne tylko dla HR i Admin.
    """
    try:
        return crud.create_schedule(db, schedule, current_user.user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/{schedule_id}", response_model=ScheduleRead)
def get_schedule_entry(
    schedule_id: int,
    current_user: User = Depends(admin_or_hr_required),
    db: Session = Depends(get_db)
):
    """
    Pobiera szczegóły wpisu grafiku.
    Dostępne tylko dla HR i Admin.
    """
    schedule = crud.get_schedule(db, schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wpis grafiku o id {schedule_id} nie istnieje"
        )
    return schedule

@router.put("/{schedule_id}", response_model=ScheduleRead)
def update_schedule_entry(
    schedule_id: int,
    schedule_update: ScheduleUpdate,
    current_user: User = Depends(admin_or_hr_required),
    db: Session = Depends(get_db)
):
    """
    Aktualizuje wpis w grafiku.
    Dostępne tylko dla HR i Admin.
    """
    try:
        return crud.update_schedule(db, schedule_id, schedule_update)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule_entry(
    schedule_id: int,
    current_user: User = Depends(admin_or_hr_required),
    db: Session = Depends(get_db)
):
    """
    Usuwa wpis z grafiku.
    Dostępne tylko dla HR i Admin.
    """
    deleted = crud.delete_schedule(db, schedule_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wpis grafiku o id {schedule_id} nie istnieje"
        )
    return None
