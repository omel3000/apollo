from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import WorkReportCreate, WorkReportRead
from crud import create_work_report, get_work_reports
from auth import get_current_user
from models import User

router = APIRouter()

@router.post("/", response_model=WorkReportRead)
def add_work_report(report: WorkReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Walidacja jest obsługiwana przez Pydantic validator
    new_report = create_work_report(db, report, current_user.user_id)
    return new_report

@router.get("/", response_model=List[WorkReportRead])
def read_work_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = get_work_reports(db, current_user.user_id)
    return reports
