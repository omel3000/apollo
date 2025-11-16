# models.py
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Boolean, Enum, Time, UniqueConstraint
from sqlalchemy.sql import func
from database import Base
import enum


def enum_values(enum_cls):
    return [member.value for member in enum_cls]

class TimeType(str, enum.Enum):
    constant = "constant"
    from_to = "from_to"


class WorkReportStatus(str, enum.Enum):
    draft = "roboczy"
    pending = "oczekuje_na_akceptacje"
    approved = "zaakceptowany"
    rejected = "odrzucony"
    locked = "zablokowany"


class AbsenceStatus(str, enum.Enum):
    draft = "roboczy"
    pending = "oczekuje_na_akceptacje"
    approved = "zaakceptowany"
    rejected = "odrzucony"
    locked = "zablokowany"


class PeriodStatus(str, enum.Enum):
    open = "otwarty"
    pending_close = "oczekuje_na_zamkniecie"
    closed = "zamkniety"
    unlocked = "odblokowany"

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    registration_date = Column(DateTime(timezone=True), server_default=func.now())
    account_status = Column(String(50), nullable=False, default="aktywny")
    password_reset_token = Column(String(255), nullable=True)
    birth_date = Column(Date, nullable=True)
    address = Column(String(500), nullable=True)

class Project(Base):
    __tablename__ = "projects"

    project_id = Column(Integer, primary_key=True)
    project_name = Column(String(255), nullable=False)
    description = Column(String(1000))
    created_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    owner_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)  # obowiązkowe pole
    time_type = Column(Enum(TimeType), nullable=False, default=TimeType.constant)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __tablename__ = "messages"

    message_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(String(2000), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

class WorkReport(Base):
    __tablename__ = "work_reports"

    report_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.project_id"), nullable=False)
    work_date = Column(Date, nullable=False)
    hours_spent = Column(Integer, nullable=False, default=0)
    minutes_spent = Column(Integer, nullable=False, default=0)
    description = Column(String(1000), nullable=True)
    time_from = Column(Time, nullable=True)
    time_to = Column(Time, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(
        Enum(WorkReportStatus, values_callable=enum_values),
        nullable=False,
        default=WorkReportStatus.pending,
    )
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reviewer_comment = Column(String(2000), nullable=True)

class UserProject(Base):
    __tablename__ = "user_projects"

    user_project_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.project_id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

class Availability(Base):
    __tablename__ = "availability"

    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True, nullable=False)
    date = Column(Date, primary_key=True, nullable=False)
    is_available = Column(Boolean, nullable=False)
    time_from = Column(Time, nullable=True)
    time_to = Column(Time, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AbsenceType(str, enum.Enum):
    urlop = "urlop"
    L4 = "L4"
    inne = "inne"

class Absence(Base):
    __tablename__ = "absences"

    absence_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    absence_type = Column(Enum(AbsenceType), nullable=False)
    date_from = Column(Date, nullable=False)
    date_to = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(
        Enum(AbsenceStatus, values_callable=enum_values),
        nullable=False,
        default=AbsenceStatus.draft,
    )
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    rejected_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    reviewer_comment = Column(String(2000), nullable=True)

class ShiftType(str, enum.Enum):
    normalna = "normalna"
    urlop = "urlop"
    L4 = "L4"
    inne = "inne"

class Schedule(Base):
    __tablename__ = "schedule"

    schedule_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("projects.project_id", ondelete="SET NULL"), nullable=True)
    work_date = Column(Date, nullable=False, index=True)
    time_from = Column(Time, nullable=False)
    time_to = Column(Time, nullable=False)
    shift_type = Column(Enum(ShiftType), nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PeriodClosure(Base):
    __tablename__ = "period_closures"

    period_closure_id = Column(Integer, primary_key=True, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    status = Column(
        Enum(PeriodStatus, values_callable=enum_values),
        nullable=False,
        default=PeriodStatus.open,
    )
    locked_by_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    unlocked_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String(2000), nullable=True)

    __table_args__ = (
        UniqueConstraint("year", "month", name="uq_period_closures_year_month"),
    )


class ApprovalLog(Base):
    __tablename__ = "approval_log"

    approval_log_id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)  # np. work_report / absence / period
    entity_id = Column(Integer, nullable=False)
    action = Column(String(30), nullable=False)
    actor_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    comment = Column(String(2000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(255), nullable=True)
    user_role = Column(String(50), nullable=True)
    action = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    path = Column(String(500), nullable=False)
    status_code = Column(Integer, nullable=False)
    ip_address = Column(String(100), nullable=True)
    user_agent = Column(String(255), nullable=True)
    detail = Column(String(2000), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)