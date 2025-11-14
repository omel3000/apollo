# models.py
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Boolean, Enum, Time
from sqlalchemy.sql import func
from database import Base
import enum

class TimeType(str, enum.Enum):
    constant = "constant"
    from_to = "from_to"

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