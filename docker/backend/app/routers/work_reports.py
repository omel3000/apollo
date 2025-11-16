from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import (
    WorkReportCreate, WorkReportRead, MonthlySummary, MonthlySummaryRequest,
    HRMonthlyOverview, HRMonthlyOverviewRequest, MonthlyTrendItem, MonthlyTrendRequest,
    WorkReportReviewRequest, WorkReportBulkFilter, ApprovalLogEntry, WorkReportStatusEnum,
)
from crud import (
    create_work_report, get_work_reports, delete_work_report, update_work_report, 
    get_monthly_summary, get_hr_monthly_overview, get_monthly_trend,
    submit_work_report, review_work_report, get_work_reports_for_review, get_work_report_history,
)
from auth import get_current_user, can_manage_work_report, admin_or_hr_required
from models import User
from datetime import date
import models  

router = APIRouter()

@router.post("/", response_model=WorkReportRead)
def add_work_report(report: WorkReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Tylko właściciel (current_user) lub admin/hr może dodać raport dla siebie
    if current_user.role not in ("admin", "hr") and report.project_id:
        # Sprawdzamy czy user dodaje raport dla siebie (nie dla kogoś innego)
        # W tym systemie raporty są zawsze dodawane dla current_user
        pass  # logika jest już poprawna, bo przekazujemy current_user.user_id do CRUD
    try:
        new_report = create_work_report(db, report, current_user.user_id)
        return new_report
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/", response_model=List[WorkReportRead])
def read_work_reports(
    work_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Zwraca raporty pracy dla bieżącego użytkownika.
    Opcjonalnie filtruje po work_date (format YYYY-MM-DD).
    """
    reports = get_work_reports(db, current_user.user_id, work_date)
    return reports

@router.delete("/{report_id}", status_code=204)
def delete_work_report_endpoint(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Pobierz raport z bazy
    db_report = db.query(models.WorkReport).filter(models.WorkReport.report_id == report_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    # Sprawdź uprawnienia
    if not can_manage_work_report(current_user, db_report.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak uprawnień do usunięcia tego raportu")
    try:
        success = delete_work_report(db, report_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not success:
        raise HTTPException(status_code=404, detail="Report not found")


@router.post("/{report_id}/submit", response_model=WorkReportRead)
def submit_work_report_endpoint(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_report = db.query(models.WorkReport).filter(models.WorkReport.report_id == report_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not can_manage_work_report(current_user, db_report.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak uprawnień")
    try:
        return submit_work_report(db, report_id, current_user.user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{report_id}/review", response_model=WorkReportRead)
def review_work_report_endpoint(
    report_id: int,
    review_request: WorkReportReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required),
):
    try:
        return review_work_report(db, report_id, current_user.user_id, review_request)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/review_queue", response_model=List[WorkReportRead])
def get_review_queue(
    filters: WorkReportBulkFilter = Body(default=WorkReportBulkFilter(status=WorkReportStatusEnum.pending)),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required),
):
    reports = get_work_reports_for_review(db, filters)
    return reports


@router.get("/{report_id}/history", response_model=List[ApprovalLogEntry])
def get_report_history(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_report = db.query(models.WorkReport).filter(models.WorkReport.report_id == report_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    if not can_manage_work_report(current_user, db_report.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak uprawnień")
    return get_work_report_history(db, report_id)

@router.put("/{report_id}", response_model=WorkReportRead)
def update_work_report_endpoint(report_id: int, report: WorkReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Pobierz raport z bazy
    db_report = db.query(models.WorkReport).filter(models.WorkReport.report_id == report_id).first()
    if not db_report:
        raise HTTPException(status_code=404, detail="Report not found")
    # Sprawdź uprawnienia
    if not can_manage_work_report(current_user, db_report.user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak uprawnień do edycji tego raportu")
    try:
        updated_report = update_work_report(db, report_id, report)
        if not updated_report:
            raise HTTPException(status_code=404, detail="Report not found")
        return updated_report
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/monthly_summary", response_model=MonthlySummary)
def get_monthly_summary_endpoint(
    request: MonthlySummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Zwracaj tylko podsumowanie bieżącego użytkownika
    summary = get_monthly_summary(
        db,
        current_user.user_id,
        request.month,
        request.year,
        include_all_statuses=request.include_all_statuses,
    )
    return summary

@router.post("/hr_monthly_overview", response_model=HRMonthlyOverview)
def get_hr_monthly_overview_endpoint(
    request: HRMonthlyOverviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required)
):
    """
    Pełne podsumowanie miesiąca dla HR - wszystkie dane w jednym endpoincie.
    Dostępne tylko dla admin/HR.
    """
    overview = get_hr_monthly_overview(db, request.month, request.year)
    return overview

@router.post("/monthly_trend", response_model=List[MonthlyTrendItem])
def get_monthly_trend_endpoint(
    request: MonthlyTrendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required)
):
    """
    Trend czasu pracy dla ostatnich N miesięcy.
    Dostępne tylko dla admin/HR.
    """
    trend = get_monthly_trend(db, request.months)
    return trend
