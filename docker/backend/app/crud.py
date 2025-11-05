from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from models import User, Project, Message, WorkReport, UserProject
from auth import hash_password
from schemas import UserCreate, ProjectCreate, MessageCreate, WorkReportCreate, UserProjectCreate
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.user_id == user_id).first()

def create_user(db: Session, user: UserCreate):
    db_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email.lower(),
        phone_number=user.phone_number,
        password_hash=hash_password(user.password),
        role=user.role,
        account_status="aktywny"
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int):
    db_user = get_user_by_id(db, user_id)
    if db_user:
        try:
            db.delete(db_user)
            db.commit()
            return True
        except IntegrityError:
            db.rollback()
            # Zwrotny, opisowy błąd dla warstwy wyżej
            raise ValueError(f"Nie można usunąć użytkownika {user_id}: istnieją powiązane rekordy (projekty, zgłoszenia, przypisania).")
    return False

def create_project(db: Session, project: ProjectCreate, user_id: int):
    # Walidacja czy owner istnieje
    owner = get_user_by_id(db, project.owner_user_id)
    if owner is None:
        raise ValueError(f"Użytkownik właściciel o id {project.owner_user_id} nie istnieje.")

    creator = get_user_by_id(db, user_id)
    if creator is None:
        raise ValueError(f"Użytkownik tworzący projekt o id {user_id} nie istnieje.")

    db_project = Project(
        project_name=project.project_name,
        description=project.description,
        created_by_user_id=user_id,
        owner_user_id=project.owner_user_id
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def get_active_messages(db: Session):
    return db.query(Message).filter(Message.is_active == True).all()

def create_message(db: Session, message: MessageCreate):
    db_message = Message(
        title=message.title,
        content=message.content,
        is_active=message.is_active
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def create_work_report(db: Session, report: WorkReportCreate, user_id: int):
    # Sprawdź czy user istnieje
    user = get_user_by_id(db, user_id)
    if user is None:
        raise ValueError(f"Użytkownik o id {user_id} nie istnieje.")

    # Sprawdź czy projekt istnieje
    project = db.query(Project).filter(Project.project_id == report.project_id).first()
    if project is None:
        raise ValueError(f"Projekt o id {report.project_id} nie istnieje.")

    # Opcjonalnie: sprawdź czy użytkownik jest przypisany do projektu
    assignment = db.query(UserProject).filter(
        UserProject.user_id == user_id,
        UserProject.project_id == report.project_id
    ).first()
    if assignment is None:
        raise ValueError(f"Użytkownik o id {user_id} nie jest przypisany do projektu o id {report.project_id}.")

    db_report = WorkReport(
        user_id=user_id,
        project_id=report.project_id,
        work_date=report.work_date,
        hours_spent=report.hours_spent,
        minutes_spent=report.minutes_spent,
        description=report.description,
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def assign_user_to_project(db: Session, assignment: UserProjectCreate):
    """
    Tworzy wpis przypisania (UserProject) i zwraca dodany rekord.
    Jeśli przypisanie (user_id, project_id) już istnieje, zwraca istniejący rekord.
    """
    # Sprawdzamy istnienie usera i projektu
    user_exists = get_user_by_id(db, assignment.user_id) is not None
    project_exists = db.query(Project).filter(Project.project_id == assignment.project_id).first() is not None

    if not user_exists and not project_exists:
        raise ValueError(f"Użytkownik o id {assignment.user_id} i projekt o id {assignment.project_id} nie istnieją.")
    if not user_exists:
        raise ValueError(f"Użytkownik o id {assignment.user_id} nie istnieje.")
    if not project_exists:
        raise ValueError(f"Projekt o id {assignment.project_id} nie istnieje.")

    existing = db.query(UserProject).filter(
        UserProject.user_id == assignment.user_id,
        UserProject.project_id == assignment.project_id
    ).first()
    if existing:
        return existing

    db_assignment = UserProject(
        user_id=assignment.user_id,
        project_id=assignment.project_id
        # assigned_at left to DB default (server_default=func.now())
    )
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

def get_work_reports(db: Session, user_id: int):
    return db.query(WorkReport).filter(WorkReport.user_id == user_id).all()

def get_assignments(db: Session, user_id: Optional[int] = None, project_id: Optional[int] = None):
    q = db.query(UserProject)
    if user_id is not None:
        q = q.filter(UserProject.user_id == user_id)
    if project_id is not None:
        q = q.filter(UserProject.project_id == project_id)
    return q.all()
