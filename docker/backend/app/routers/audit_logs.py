from datetime import date, datetime, time
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import crud
from auth import admin_or_hr_required
from database import get_db
from models import User
from schemas import AuditLogListResponse, AuditLogUserOption

router = APIRouter()

SortField = Literal["created_at", "status_code", "duration_ms", "user_id"]
SortOrder = Literal["asc", "desc"]


@router.get("/", response_model=AuditLogListResponse)
def list_audit_logs_endpoint(
    action: Optional[str] = Query(None, description="Fragment oryginalnej akcji"),
    action_group: Optional[str] = Query(None, description="Znormalizowana akcja, np. 'PUT /projects/'"),
    user_id: Optional[int] = Query(None, description="Filtr po ID użytkownika"),
    user_email: Optional[str] = Query(None, description="Fragment adresu email"),
    entity_type: Optional[str] = Query(None, description="Typ encji, np. 'projects'"),
    entity_id: Optional[int] = Query(None, description="ID encji, np. numer projektu"),
    date_from: Optional[date] = Query(None, description="Data od (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Data do (YYYY-MM-DD)"),
    sort_by: SortField = Query("created_at"),
    sort_order: SortOrder = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required),
):
    del current_user
    action_filter = action.strip() if action else None
    user_email_filter = user_email.strip() if user_email else None
    date_from_dt = datetime.combine(date_from, time.min) if date_from else None
    date_to_dt = datetime.combine(date_to, time.max) if date_to else None

    return crud.list_audit_logs(
        db,
        action=action_filter,
        action_group=action_group,
        user_id=user_id,
        user_email=user_email_filter,
        entity_type=entity_type,
        entity_id=entity_id,
        date_from=date_from_dt,
        date_to=date_to_dt,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit,
    )


@router.get("/actions", response_model=List[str])
def list_audit_actions_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required),
):
    del current_user
    return crud.list_audit_log_actions(db)


@router.get("/users", response_model=List[AuditLogUserOption])
def list_audit_users_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required),
):
    del current_user
    items = crud.list_audit_log_users(db)
    return [AuditLogUserOption(**item) for item in items]
