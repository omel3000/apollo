from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from models import User, Project, Message, WorkReport, UserProject
from auth import hash_password
from schemas import UserCreate, ProjectCreate, MessageCreate, WorkReportCreate, UserProjectCreate
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

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

    # Sprawdź łączny czas pracy w danym dniu
    existing_time = db.query(
        func.sum(WorkReport.hours_spent),
        func.sum(WorkReport.minutes_spent)
    ).filter(
        WorkReport.user_id == user_id,
        WorkReport.work_date == report.work_date
    ).first()
    
    existing_hours = existing_time[0] or 0
    existing_minutes = existing_time[1] or 0
    
    # Przelicz istniejący czas na prawidłowy format (godziny i minuty)
    existing_total_minutes = (existing_hours * 60) + existing_minutes
    existing_display_hours = existing_total_minutes // 60
    existing_display_minutes = existing_total_minutes % 60
    
    # Przelicz wszystko na minuty dla łatwiejszego porównania
    new_minutes = (report.hours_spent * 60) + report.minutes_spent
    total_minutes = existing_total_minutes + new_minutes
    
    # 24 godziny = 1440 minut
    if total_minutes > 1440:
        total_hours = total_minutes // 60
        total_mins = total_minutes % 60
        raise ValueError(
            f"Nie można dodać raportu. Łączny czas pracy w dniu {report.work_date} "
            f"przekroczyłby 24 godziny ({total_hours}h {total_mins}min). "
            f"Aktualnie zarejestrowano: {existing_display_hours}h {existing_display_minutes}min."
        )

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

def delete_work_report(db: Session, report_id: int):
    db_report = db.query(WorkReport).filter(WorkReport.report_id == report_id).first()
    if db_report:
        db.delete(db_report)
        db.commit()
        return True
    return False

def update_work_report(db: Session, report_id: int, report_data: WorkReportCreate):
    db_report = db.query(WorkReport).filter(WorkReport.report_id == report_id).first()
    if not db_report:
        return None
    
    # Sprawdź łączny czas pracy w danym dniu (bez uwzględniania aktualnie edytowanego raportu)
    existing_time = db.query(
        func.sum(WorkReport.hours_spent),
        func.sum(WorkReport.minutes_spent)
    ).filter(
        WorkReport.user_id == db_report.user_id,
        WorkReport.work_date == report_data.work_date,
        WorkReport.report_id != report_id  # Wyklucz edytowany raport
    ).first()
    
    existing_hours = existing_time[0] or 0
    existing_minutes = existing_time[1] or 0
    
    # Przelicz istniejący czas na prawidłowy format (godziny i minuty)
    existing_total_minutes = (existing_hours * 60) + existing_minutes
    existing_display_hours = existing_total_minutes // 60
    existing_display_minutes = existing_total_minutes % 60
    
    # Przelicz wszystko na minuty
    new_minutes = (report_data.hours_spent * 60) + report_data.minutes_spent
    total_minutes = existing_total_minutes + new_minutes
    
    # 24 godziny = 1440 minut
    if total_minutes > 1440:
        total_hours = total_minutes // 60
        total_mins = total_minutes % 60
        raise ValueError(
            f"Nie można zaktualizować raportu. Łączny czas pracy w dniu {report_data.work_date} "
            f"przekroczyłby 24 godziny ({total_hours}h {total_mins}min). "
            f"Aktualnie zarejestrowano (bez tego raportu): {existing_display_hours}h {existing_display_minutes}min."
        )
    
    db_report.hours_spent = report_data.hours_spent
    db_report.minutes_spent = report_data.minutes_spent
    db_report.description = report_data.description
    db_report.work_date = report_data.work_date
    db_report.project_id = report_data.project_id
    db.commit()
    db.refresh(db_report)
    return db_report

def get_work_reports(db: Session, user_id: int, work_date: Optional[date] = None):
    query = db.query(WorkReport).filter(WorkReport.user_id == user_id)
    if work_date:
        query = query.filter(WorkReport.work_date == work_date)
    return query.all()

def get_assignments(db: Session, user_id: Optional[int] = None, project_id: Optional[int] = None):
    q = db.query(UserProject)
    if user_id is not None:
        q = q.filter(UserProject.user_id == user_id)
    if project_id is not None:
        q = q.filter(UserProject.project_id == project_id)
    return q.all()

def get_monthly_summary(db: Session, user_id: int, month: int, year: int):
    start_date = date(year, month, 1)
    end_date = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)

    # Pobierz sumę godzin i minut dla całego miesiąca
    total_time = db.query(
        func.sum(WorkReport.hours_spent),
        func.sum(WorkReport.minutes_spent)
    ).filter(
        WorkReport.user_id == user_id,
        WorkReport.work_date >= start_date,
        WorkReport.work_date < end_date
    ).first()
    
    total_hours_raw = total_time[0] or 0
    total_minutes_raw = total_time[1] or 0
    # Przelicz minuty na godziny
    total_hours = total_hours_raw + (total_minutes_raw // 60)
    total_minutes = total_minutes_raw % 60

    # Pobierz sumę godzin i minut dla każdego projektu
    project_time = db.query(
        WorkReport.project_id,
        func.sum(WorkReport.hours_spent),
        func.sum(WorkReport.minutes_spent)
    ).filter(
        WorkReport.user_id == user_id,
        WorkReport.work_date >= start_date,
        WorkReport.work_date < end_date
    ).group_by(WorkReport.project_id).all()

    project_hours = {}
    for project_id, hours, minutes in project_time:
        hours = hours or 0
        minutes = minutes or 0
        total_h = hours + (minutes // 60)
        total_m = minutes % 60
        project_hours[project_id] = {"hours": total_h, "minutes": total_m}

    # Pobierz dane dzienne z podziałem na projekty
    daily_summaries = db.query(
        WorkReport.work_date,
        WorkReport.project_id,
        func.sum(WorkReport.hours_spent),
        func.sum(WorkReport.minutes_spent)
    ).filter(
        WorkReport.user_id == user_id,
        WorkReport.work_date >= start_date,
        WorkReport.work_date < end_date
    ).group_by(WorkReport.work_date, WorkReport.project_id).all()

    daily_summary_dict = {}
    for work_date, project_id, hours, minutes in daily_summaries:
        hours = hours or 0
        minutes = minutes or 0
        
        if work_date not in daily_summary_dict:
            daily_summary_dict[work_date] = {
                "total_hours": 0,
                "total_minutes": 0,
                "project_hours": {}
            }
        
        # Oblicz godziny i minuty dla projektu
        proj_total_h = hours + (minutes // 60)
        proj_total_m = minutes % 60
        daily_summary_dict[work_date]["project_hours"][project_id] = {
            "hours": proj_total_h,
            "minutes": proj_total_m
        }
        
        # Dodaj do sumy dziennej
        daily_summary_dict[work_date]["total_hours"] += hours
        daily_summary_dict[work_date]["total_minutes"] += minutes

    # Przelicz minuty na godziny w sumie dziennej
    for work_date in daily_summary_dict:
        total_h = daily_summary_dict[work_date]["total_hours"]
        total_m = daily_summary_dict[work_date]["total_minutes"]
        daily_summary_dict[work_date]["total_hours"] = total_h + (total_m // 60)
        daily_summary_dict[work_date]["total_minutes"] = total_m % 60

    daily_hours = [
        {
            "date": str(work_date),
            "total_hours": summary["total_hours"],
            "total_minutes": summary["total_minutes"],
            "project_hours": summary["project_hours"]
        }
        for work_date, summary in sorted(daily_summary_dict.items())
    ]

    return {
        "total_hours": total_hours,
        "total_minutes": total_minutes,
        "project_hours": project_hours,
        "daily_hours": daily_hours
    }

def change_user_email(db: Session, user_id: int, new_email: str):
    """
    Zmienia email użytkownika. Sprawdza czy nowy email nie jest już zajęty.
    """
    # Sprawdź czy nowy email nie jest już używany
    existing_user = get_user_by_email(db, new_email.lower())
    if existing_user and existing_user.user_id != user_id:
        raise ValueError("Ten adres email jest już używany przez innego użytkownika")
    
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Użytkownik nie istnieje")
    
    user.email = new_email.lower()
    db.commit()
    db.refresh(user)
    return user

def change_user_password(db: Session, user_id: int, new_password: str):
    """
    Zmienia hasło użytkownika.
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Użytkownik nie istnieje")
    
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user
