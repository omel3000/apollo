from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from auth import admin_or_hr_required, admin_required, User
from database import get_db
from schemas import PeriodClosureRead, PeriodStatusUpdateRequest
import crud

router = APIRouter()


@router.get("/", response_model=List[PeriodClosureRead])
def list_periods(
    year: Optional[int] = Query(None, ge=2000, le=2100, description="Opcjonalny filtr po roku"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required),
):
    return crud.list_periods(db, year)


@router.get("/{year}/{month}", response_model=PeriodClosureRead)
def get_period(
    year: int = Path(..., ge=2000, le=2100, description="Rok okresu"),
    month: int = Path(..., ge=1, le=12, description="Miesiąc okresu"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required),
):
    return crud.get_period(db, year, month)


@router.post("/{year}/{month}/status", response_model=PeriodClosureRead)
def update_period_status(
    payload: PeriodStatusUpdateRequest,
    year: int = Path(..., ge=2000, le=2100, description="Rok okresu"),
    month: int = Path(..., ge=1, le=12, description="Miesiąc okresu"),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required),
):
    try:
        return crud.set_period_status(
            db=db,
            year=year,
            month=month,
            status=payload.status,
            actor_user_id=current_user.user_id,
            notes=payload.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
