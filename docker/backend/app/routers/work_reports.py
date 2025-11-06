from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import WorkReportCreate, WorkReportRead
from crud import create_work_report, get_work_reports, delete_work_report, update_work_report
from auth import get_current_user
from models import User
from datetime import date

router = APIRouter()

@router.post("/", response_model=WorkReportRead)
def add_work_report(report: WorkReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Walidacja jest obsługiwana przez Pydantic validator i dodatkowo przez CRUD
    try:
        new_report = create_work_report(db, report, current_user.user_id)
        return new_report
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[WorkReportRead])
def read_work_reports(work_date: Optional[date] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = get_work_reports(db, current_user.user_id, work_date)
    return reports

@router.delete("/{report_id}", status_code=204)
def delete_work_report_endpoint(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = delete_work_report(db, report_id)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found")

@router.put("/{report_id}", response_model=WorkReportRead)
def update_work_report_endpoint(report_id: int, report: WorkReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    updated_report = update_work_report(db, report_id, report)
    if not updated_report:
        raise HTTPException(status_code=404, detail="Report not found")
    return updated_report
