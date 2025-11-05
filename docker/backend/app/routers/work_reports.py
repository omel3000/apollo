from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import WorkReportCreate, WorkReportRead, WorkReportOut
from crud import create_work_report, get_work_reports
from auth import get_current_user
from models import User

router = APIRouter(prefix="/work_reports", tags=["work_reports"])

@router.get("/", response_model=List[WorkReportOut])
def read_work_reports(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # admin i hr - widzą wszystkie raporty
    if getattr(current_user, "role", None) in ("admin", "hr"):
        return get_work_reports(db, skip=skip, limit=limit)
    # pozostali - tylko swoje
    return get_work_reports_by_user(db, user_id=current_user.user_id, skip=skip, limit=limit)

@router.get("/", response_model=List[WorkReportRead])
def read_work_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = get_work_reports(db, current_user.user_id)
    return reports
