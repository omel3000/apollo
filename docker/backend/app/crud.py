from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, select, and_, or_  # dodano and_, or_
from models import User, Project, Message, WorkReport, UserProject, TimeType, Availability, Absence, Schedule
from auth import hash_password
from schemas import UserCreate, ProjectCreate, MessageCreate, WorkReportCreate, UserProjectCreate, UserUpdate, ProjectUpdate, AvailabilityCreate, AvailabilityUpdate, AbsenceCreate, AbsenceUpdate, ScheduleCreate, ScheduleUpdate
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, time

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
        owner_user_id=project.owner_user_id,
        # upewnij się, że zapisujemy poprawny Enum w DB
        time_type=TimeType(project.time_type)
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

    # Walidacja time_from i time_to w zależności od time_type projektu
    time_type_value = project.time_type.value if hasattr(project.time_type, "value") else project.time_type
    if time_type_value == "from_to":
        if report.time_from is None or report.time_to is None:
            raise ValueError(f"Projekt '{project.project_name}' wymaga podania czasu od (time_from) i czasu do (time_to).")
    elif time_type_value == "constant":
        # Dla constant nie wymagamy time_from/time_to - ustawiamy na None
        report.time_from = None
        report.time_to = None

    # Opcjonalnie: sprawdź czy użytkownik jest przypisany do projektu
    assignment = db.query(UserProject).filter(
        UserProject.user_id == user_id,
        UserProject.project_id == report.project_id
    ).first()
    if assignment is None:
        raise ValueError(f"Użytkownik o id {user_id} nie jest przypisany do projektu o id {report.project_id}.")

    # Walidacja konfliktu zakresów czasu (dotyczy tylko gdy podano przedziały czasowe)
    if report.time_from is not None and report.time_to is not None:
        existing_with_times = db.query(WorkReport).filter(
            WorkReport.user_id == user_id,
            WorkReport.work_date == report.work_date,
            WorkReport.time_from.isnot(None),
            WorkReport.time_to.isnot(None)
        ).all()

        new_start = report.time_from
        new_end = report.time_to
        for r in existing_with_times:
            # sprawdź nakładanie się przedziałów: start < other_end i end > other_start
            if new_start < r.time_to and new_end > r.time_from:
                raise ValueError("w podanych godzinach masz już dodany czas pracy - sprawdź zaraportowany dzisiejszy czas i popraw")

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
        time_from=report.time_from,
        time_to=report.time_to
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
    
    # Sprawdź czy projekt istnieje i pobierz jego time_type
    project = db.query(Project).filter(Project.project_id == report_data.project_id).first()
    if project is None:
        raise ValueError(f"Projekt o id {report_data.project_id} nie istnieje.")

    # Walidacja time_from i time_to w zależności od time_type projektu
    time_type_value = project.time_type.value if hasattr(project.time_type, "value") else project.time_type
    if time_type_value == "from_to":
        if report_data.time_from is None or report_data.time_to is None:
            raise ValueError(f"Projekt '{project.project_name}' wymaga podania czasu od (time_from) i czasu do (time_to).")
    elif time_type_value == "constant":
        # Dla constant nie wymagamy time_from/time_to - ustawiamy na None
        report_data.time_from = None
        report_data.time_to = None

    # Walidacja konfliktu zakresów czasu (dotyczy tylko gdy podano przedziały czasowe)
    if report_data.time_from is not None and report_data.time_to is not None:
        existing_with_times = db.query(WorkReport).filter(
            WorkReport.user_id == db_report.user_id,
            WorkReport.work_date == report_data.work_date,
            WorkReport.report_id != report_id,
            WorkReport.time_from.isnot(None),
            WorkReport.time_to.isnot(None)
        ).all()

        new_start = report_data.time_from
        new_end = report_data.time_to
        for r in existing_with_times:
            if new_start < r.time_to and new_end > r.time_from:
                raise ValueError("w podanych godzinach masz już dodany czas pracy - sprawdź zaraportowany dzisiejszy czas i popraw")
    
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
    db_report.time_from = report_data.time_from
    db_report.time_to = report_data.time_to
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

def update_user(db: Session, user_id: int, user_update: UserUpdate):
    """
    Aktualizuje dane użytkownika (admin/hr).
    Sprawdza unikalność email jeśli jest zmieniany.
    """
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError("Użytkownik nie istnieje")

    # jeśli email jest podany i różny — sprawdź unikalność
    if user_update.email:
        existing = get_user_by_email(db, user_update.email.lower())
        if existing and existing.user_id != user_id:
            raise ValueError("Ten adres email jest już używany przez innego użytkownika")
        user.email = user_update.email.lower()

    # aktualizuj inne pola tylko gdy są przekazane
    if user_update.first_name is not None:
        user.first_name = user_update.first_name
    if user_update.last_name is not None:
        user.last_name = user_update.last_name
    if user_update.phone_number is not None:
        user.phone_number = user_update.phone_number
    if user_update.role is not None:
        user.role = user_update.role
    if user_update.account_status is not None:
        user.account_status = user_update.account_status

    db.commit()
    db.refresh(user)
    return user

def update_project(db: Session, project_id: int, project_update: ProjectUpdate):
    """
    Aktualizuje dane projektu (admin/hr).
    Sprawdza czy nowy właściciel istnieje jeśli jest zmieniany.
    """
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        raise ValueError("Projekt nie istnieje")

    # jeśli owner_user_id jest podany — sprawdź czy użytkownik istnieje
    if project_update.owner_user_id is not None:
        owner = get_user_by_id(db, project_update.owner_user_id)
        if owner is None:
            raise ValueError(f"Użytkownik właściciel o id {project_update.owner_user_id} nie istnieje")
        project.owner_user_id = project_update.owner_user_id

    # aktualizuj inne pola tylko gdy są przekazane
    if project_update.project_name is not None:
        project.project_name = project_update.project_name
    if project_update.description is not None:
        project.description = project_update.description
    if project_update.time_type is not None:
        # konwersja do Enum modelu
        project.time_type = TimeType(project_update.time_type)

    db.commit()
    db.refresh(project)
    return project

def get_users_assigned_to_project(db: Session, project_id: int):
    """
    Zwraca listę użytkowników przypisanych do danego projektu (tylko niezbędne pola).
    """
    rows = (
        db.query(User.user_id, User.first_name, User.last_name)
        .join(UserProject, User.user_id == UserProject.user_id)
        .filter(UserProject.project_id == project_id)
        .order_by(User.last_name, User.first_name)
        .all()
    )
    return [{"user_id": r.user_id, "first_name": r.first_name, "last_name": r.last_name} for r in rows]

def get_project_monthly_summary(db: Session, project_id: int, month: int, year: int):
    """
    Zwraca łączną sumę godzin przepracowanych w danym projekcie w danym miesiącu.
    """
    start_date = date(year, month, 1)
    end_date = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)

    # Pobierz sumę godzin i minut dla projektu
    total_time = db.query(
        func.sum(WorkReport.hours_spent),
        func.sum(WorkReport.minutes_spent)
    ).filter(
        WorkReport.project_id == project_id,
        WorkReport.work_date >= start_date,
        WorkReport.work_date < end_date
    ).first()
    
    total_hours_raw = total_time[0] or 0
    total_minutes_raw = total_time[1] or 0
    
    # Przelicz minuty na godziny (np. 90 minut = 1h 30min)
    total_hours = total_hours_raw + (total_minutes_raw // 60)
    total_minutes = total_minutes_raw % 60

    return {
        "project_id": project_id,
        "month": month,
        "year": year,
        "total_hours": total_hours,
        "total_minutes": total_minutes
    }

def get_project_monthly_summary_with_users(db: Session, project_id: int, month: int, year: int):
    """
    Zwraca łączną sumę godzin + listę użytkowników z ich czasem dla danego projektu w miesiącu.
    """
    start_date = date(year, month, 1)
    end_date = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)

    # Pobierz sumę godzin i minut dla każdego użytkownika w projekcie
    user_time = db.query(
        WorkReport.user_id,
        User.first_name,
        User.last_name,
        func.sum(WorkReport.hours_spent),
        func.sum(WorkReport.minutes_spent)
    ).join(
        User, WorkReport.user_id == User.user_id
    ).filter(
        WorkReport.project_id == project_id,
        WorkReport.work_date >= start_date,
        WorkReport.work_date < end_date
    ).group_by(
        WorkReport.user_id, User.first_name, User.last_name
    ).all()

    users_list = []
    total_hours_all = 0
    total_minutes_all = 0

    for user_id, first_name, last_name, hours, minutes in user_time:
        hours = hours or 0
        minutes = minutes or 0
        
        # Przelicz na format godziny + minuty
        user_hours = hours + (minutes // 60)
        user_minutes = minutes % 60
        
        users_list.append({
            "user_id": user_id,
            "first_name": first_name,
            "last_name": last_name,
            "total_hours": user_hours,
            "total_minutes": user_minutes
        })
        
        # Dodaj do sumy całkowitej
        total_hours_all += hours
        total_minutes_all += minutes

    # Przelicz łączną sumę na format godziny + minuty
    total_hours = total_hours_all + (total_minutes_all // 60)
    total_minutes = total_minutes_all % 60

    return {
        "project_id": project_id,
        "month": month,
        "year": year,
        "total_hours": total_hours,
        "total_minutes": total_minutes,
        "users": users_list
    }

def get_user_project_detailed_report(db: Session, project_id: int, user_id: int, month: int, year: int):
    """
    Zwraca szczegółową listę raportów pracy użytkownika w danym projekcie w danym miesiącu.
    Posortowane chronologicznie.
    """
    start_date = date(year, month, 1)
    end_date = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)

    # Pobierz informacje o użytkowniku
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError(f"Użytkownik o id {user_id} nie istnieje")

    # Pobierz szczegółowe raporty
    reports = db.query(
        WorkReport.work_date,
        Project.project_name,
        WorkReport.description,
        WorkReport.hours_spent,
        WorkReport.minutes_spent
    ).join(
        Project, WorkReport.project_id == Project.project_id
    ).filter(
        WorkReport.project_id == project_id,
        WorkReport.user_id == user_id,
        WorkReport.work_date >= start_date,
        WorkReport.work_date < end_date
    ).order_by(
        WorkReport.work_date.asc()
    ).all()

    reports_list = [
        {
            "work_date": r.work_date,
            "project_name": r.project_name,
            "description": r.description,
            "hours_spent": r.hours_spent,
            "minutes_spent": r.minutes_spent
        }
        for r in reports
    ]

    return {
        "project_id": project_id,
        "user_id": user_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "month": month,
        "year": year,
        "reports": reports_list
    }

def get_users_with_time_in_month(db: Session, month: int, year: int):
    """
    Zwraca listę użytkowników, którzy raportowali czas w danym miesiącu (sumy > 0),
    wraz z łącznym czasem (godziny + minuty znormalizowane).
    """
    start_date = date(year, month, 1)
    end_date = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)

    rows = (
        db.query(
            WorkReport.user_id,
            User.first_name,
            User.last_name,
            func.sum(WorkReport.hours_spent).label("h"),
            func.sum(WorkReport.minutes_spent).label("m"),
        )
        .join(User, User.user_id == WorkReport.user_id)
        .filter(WorkReport.work_date >= start_date, WorkReport.work_date < end_date)
        .group_by(WorkReport.user_id, User.first_name, User.last_name)
        .having((func.coalesce(func.sum(WorkReport.hours_spent), 0) + func.coalesce(func.sum(WorkReport.minutes_spent), 0)) > 0)
        .order_by(User.last_name, User.first_name)
        .all()
    )

    result = []
    for user_id, first_name, last_name, hours, minutes in rows:
        hours = hours or 0
        minutes = minutes or 0
        total_hours = hours + (minutes // 60)
        total_minutes = minutes % 60
        result.append({
            "user_id": user_id,
            "first_name": first_name,
            "last_name": last_name,
            "total_hours": total_hours,
            "total_minutes": total_minutes,
        })
    return result

def get_user_monthly_projects_summary(db: Session, user_id: int, month: int, year: int):
    """
    Zwraca listę projektów, w których użytkownik raportował czas w danym miesiącu,
    z łącznym czasem per projekt (godziny + minuty znormalizowane).
    """
    start_date = date(year, month, 1)
    end_date = date(year, month + 1, 1) if month < 12 else date(year + 1, 1, 1)

    rows = (
        db.query(
            Project.project_id,
            Project.project_name,
            func.sum(WorkReport.hours_spent).label("h"),
            func.sum(WorkReport.minutes_spent).label("m"),
        )
        .join(Project, Project.project_id == WorkReport.project_id)
        .filter(
            WorkReport.user_id == user_id,
            WorkReport.work_date >= start_date,
            WorkReport.work_date < end_date,
        )
        .group_by(Project.project_id, Project.project_name)
        .having((func.coalesce(func.sum(WorkReport.hours_spent), 0) + func.coalesce(func.sum(WorkReport.minutes_spent), 0)) > 0)
        .order_by(Project.project_name.asc())
        .all()
    )

    result = []
    for project_id, project_name, hours, minutes in rows:
        hours = hours or 0
        minutes = minutes or 0
        total_hours = hours + (minutes // 60)
        total_minutes = minutes % 60
        result.append({
            "project_id": project_id,
            "project_name": project_name,
            "total_hours": total_hours,
            "total_minutes": total_minutes,
        })
    return result

def get_projects_for_user(db: Session, user_id: int):
    """
    Zwraca listę projektów przypisanych do danego użytkownika.
    """
    rows = (
        db.query(Project)
        .join(UserProject, UserProject.project_id == Project.project_id)
        .filter(UserProject.user_id == user_id)
        .order_by(Project.project_name.asc())
        .all()
    )
    return rows

# ============================================================================
# AVAILABILITY CRUD functions
# ============================================================================

def create_availability(db: Session, user_id: int, availability_data: AvailabilityCreate):
    """
    Tworzy nowy wpis dostępności dla użytkownika.
    Jeśli wpis dla danej daty już istnieje, zgłasza błąd.
    """
    # Sprawdź czy użytkownik istnieje
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError(f"Użytkownik o id {user_id} nie istnieje")
    
    # Sprawdź czy wpis już istnieje
    existing = db.query(Availability).filter(
        Availability.user_id == user_id,
        Availability.date == availability_data.date
    ).first()
    if existing:
        raise ValueError(f"Dostępność dla daty {availability_data.date} już istnieje")
    
    db_availability = Availability(
        user_id=user_id,
        date=availability_data.date,
        is_available=availability_data.is_available,
        time_from=availability_data.time_from,
        time_to=availability_data.time_to
    )
    db.add(db_availability)
    db.commit()
    db.refresh(db_availability)
    return db_availability

def get_availability(db: Session, user_id: int, date_param: date):
    """
    Pobiera dostępność użytkownika dla konkretnej daty.
    """
    return db.query(Availability).filter(
        Availability.user_id == user_id,
        Availability.date == date_param
    ).first()

def get_availabilities(
    db: Session,
    user_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None
):
    """
    Pobiera listę dostępności z opcjonalnymi filtrami.
    """
    query = db.query(Availability)
    
    if user_id is not None:
        query = query.filter(Availability.user_id == user_id)
    if date_from is not None:
        query = query.filter(Availability.date >= date_from)
    if date_to is not None:
        query = query.filter(Availability.date <= date_to)
    
    return query.order_by(Availability.user_id, Availability.date).all()

def update_availability(db: Session, user_id: int, date_param: date, availability_update: AvailabilityUpdate):
    """
    Aktualizuje dostępność użytkownika dla konkretnej daty.
    """
    db_availability = get_availability(db, user_id, date_param)
    if not db_availability:
        raise ValueError(f"Dostępność dla użytkownika {user_id} i daty {date_param} nie istnieje")
    
    # Aktualizuj tylko przekazane pola
    if availability_update.is_available is not None:
        db_availability.is_available = availability_update.is_available
    if availability_update.time_from is not None:
        db_availability.time_from = availability_update.time_from
    if availability_update.time_to is not None:
        db_availability.time_to = availability_update.time_to
    
    # Walidacja logiki (jeśli niedostępny, wyczyść czas)
    if not db_availability.is_available:
        db_availability.time_from = None
        db_availability.time_to = None
    elif db_availability.time_from is not None and db_availability.time_to is not None:
        if db_availability.time_from >= db_availability.time_to:
            raise ValueError("Czas rozpoczęcia musi być wcześniejszy niż czas zakończenia")
    
    db.commit()
    db.refresh(db_availability)
    return db_availability

def delete_availability(db: Session, user_id: int, date_param: date):
    """
    Usuwa dostępność użytkownika dla konkretnej daty.
    """
    db_availability = get_availability(db, user_id, date_param)
    if not db_availability:
        return False
    
    db.delete(db_availability)
    db.commit()
    return True

# ============================================================================
# ABSENCE CRUD functions
# ============================================================================

def create_absence(db: Session, user_id: int, absence_data: AbsenceCreate):
    """
    Tworzy nową nieobecność dla użytkownika.
    Sprawdza czy użytkownik istnieje oraz czy nowa nieobecność nie nakłada się z istniejącymi.
    """
    # Sprawdź czy użytkownik istnieje
    user = get_user_by_id(db, user_id)
    if not user:
        raise ValueError(f"Użytkownik o id {user_id} nie istnieje")
    
    # Sprawdź czy nie nakłada się z istniejącymi nieobecnościami użytkownika
    overlapping = db.query(Absence).filter(
        Absence.user_id == user_id,
        Absence.date_from <= absence_data.date_to,
        Absence.date_to >= absence_data.date_from
    ).first()
    
    if overlapping:
        raise ValueError(
            f"Nieobecność nakłada się z istniejącą: {overlapping.absence_type.value} "
            f"({overlapping.date_from} - {overlapping.date_to})"
        )
    
    db_absence = Absence(
        user_id=user_id,
        absence_type=absence_data.absence_type,
        date_from=absence_data.date_from,
        date_to=absence_data.date_to
    )
    db.add(db_absence)
    db.commit()
    db.refresh(db_absence)
    return db_absence

def get_absence(db: Session, absence_id: int):
    """
    Pobiera nieobecność po ID.
    """
    return db.query(Absence).filter(Absence.absence_id == absence_id).first()

def get_absences(
    db: Session,
    user_id: Optional[int] = None,
    absence_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None
):
    """
    Pobiera listę nieobecności z opcjonalnymi filtrami.
    Jeśli podano date_from lub date_to, zwraca nieobecności które pokrywają się z tym zakresem.
    """
    query = db.query(Absence)
    
    if user_id is not None:
        query = query.filter(Absence.user_id == user_id)
    if absence_type is not None:
        query = query.filter(Absence.absence_type == absence_type)
    
    # Filtrowanie po zakresie dat - nieobecność pokrywa się z zakresem jeśli:
    # absence.date_from <= date_to AND absence.date_to >= date_from
    if date_from is not None and date_to is not None:
        query = query.filter(
            and_(
                Absence.date_from <= date_to,
                Absence.date_to >= date_from
            )
        )
    elif date_from is not None:
        # Jeśli tylko date_from, pokaż nieobecności które trwają od lub po tej dacie
        query = query.filter(Absence.date_to >= date_from)
    elif date_to is not None:
        # Jeśli tylko date_to, pokaż nieobecności które rozpoczynają się przed lub w tej dacie
        query = query.filter(Absence.date_from <= date_to)
    
    return query.order_by(Absence.user_id, Absence.date_from).all()

def update_absence(db: Session, absence_id: int, absence_update: AbsenceUpdate):
    """
    Aktualizuje nieobecność.
    Sprawdza czy zaktualizowana nieobecność nie nakłada się z innymi.
    """
    db_absence = get_absence(db, absence_id)
    if not db_absence:
        raise ValueError(f"Nieobecność o id {absence_id} nie istnieje")
    
    # Aktualizuj tylko przekazane pola
    if absence_update.absence_type is not None:
        db_absence.absence_type = absence_update.absence_type
    if absence_update.date_from is not None:
        db_absence.date_from = absence_update.date_from
    if absence_update.date_to is not None:
        db_absence.date_to = absence_update.date_to
    
    # Walidacja zakresu dat
    if db_absence.date_from > db_absence.date_to:
        raise ValueError("Data rozpoczęcia musi być wcześniejsza lub równa dacie zakończenia")
    
    # Sprawdź czy nie nakłada się z innymi nieobecnościami użytkownika (z wyłączeniem edytowanej)
    overlapping = db.query(Absence).filter(
        Absence.user_id == db_absence.user_id,
        Absence.absence_id != absence_id,
        Absence.date_from <= db_absence.date_to,
        Absence.date_to >= db_absence.date_from
    ).first()
    
    if overlapping:
        raise ValueError(
            f"Nieobecność nakłada się z istniejącą: {overlapping.absence_type.value} "
            f"({overlapping.date_from} - {overlapping.date_to})"
        )
    
    db.commit()
    db.refresh(db_absence)
    return db_absence

def delete_absence(db: Session, absence_id: int):
    """
    Usuwa nieobecność.
    """
    db_absence = get_absence(db, absence_id)
    if not db_absence:
        return False
    
    db.delete(db_absence)
    db.commit()
    return True

def get_absence_by_date(db: Session, user_id: int, date_param: date):
    """
    Pobiera nieobecność użytkownika dla konkretnej daty.
    Zwraca nieobecność, która obejmuje podaną datę (date_from <= date_param <= date_to).
    """
    return db.query(Absence).filter(
        Absence.user_id == user_id,
        Absence.date_from <= date_param,
        Absence.date_to >= date_param
    ).first()

def update_absence_by_date(db: Session, user_id: int, date_param: date, absence_update: AbsenceUpdate):
    """
    Aktualizuje nieobecność użytkownika dla konkretnej daty.
    Znajduje nieobecność która obejmuje podaną datę i ją aktualizuje.
    """
    db_absence = get_absence_by_date(db, user_id, date_param)
    if not db_absence:
        raise ValueError(f"Brak nieobecności dla użytkownika {user_id} obejmującej datę {date_param}")
    
    # Aktualizuj tylko przekazane pola
    if absence_update.absence_type is not None:
        db_absence.absence_type = absence_update.absence_type
    if absence_update.date_from is not None:
        db_absence.date_from = absence_update.date_from
    if absence_update.date_to is not None:
        db_absence.date_to = absence_update.date_to
    
    # Walidacja zakresu dat
    if db_absence.date_from > db_absence.date_to:
        raise ValueError("Data rozpoczęcia musi być wcześniejsza lub równa dacie zakończenia")
    
    # Sprawdź czy nie nakłada się z innymi nieobecnościami użytkownika
    overlapping = db.query(Absence).filter(
        Absence.user_id == user_id,
        Absence.absence_id != db_absence.absence_id,
        Absence.date_from <= db_absence.date_to,
        Absence.date_to >= db_absence.date_from
    ).first()
    
    if overlapping:
        raise ValueError(
            f"Nieobecność nakłada się z istniejącą: {overlapping.absence_type.value} "
            f"({overlapping.date_from} - {overlapping.date_to})"
        )
    
    db.commit()
    db.refresh(db_absence)
    return db_absence

def delete_absence_by_date(db: Session, user_id: int, date_param: date):
    """
    Usuwa nieobecność użytkownika dla konkretnej daty.
    Znajduje nieobecność która obejmuje podaną datę i ją usuwa.
    """
    db_absence = get_absence_by_date(db, user_id, date_param)
    if not db_absence:
        return False
    
    db.delete(db_absence)
    db.commit()
    return True

# ============================================================================
# SCHEDULE CRUD functions
# ============================================================================

def create_schedule(db: Session, schedule_data: ScheduleCreate, created_by_user_id: int):
    """
    Tworzy nowy wpis w grafiku.
    Sprawdza czy użytkownik istnieje, projekt (jeśli podano), i czy zmiana nie nakłada się.
    """
    # Sprawdź czy użytkownik istnieje
    user = get_user_by_id(db, schedule_data.user_id)
    if not user:
        raise ValueError(f"Użytkownik o id {schedule_data.user_id} nie istnieje")
    
    # Sprawdź czy projekt istnieje (jeśli podano)
    if schedule_data.project_id is not None:
        project = db.query(Project).filter(Project.project_id == schedule_data.project_id).first()
        if not project:
            raise ValueError(f"Projekt o id {schedule_data.project_id} nie istnieje")
    
    # Sprawdź czy nie nakłada się z innymi zmianami użytkownika w tym dniu
    overlapping = db.query(Schedule).filter(
        Schedule.user_id == schedule_data.user_id,
        Schedule.work_date == schedule_data.work_date,
        Schedule.time_from < schedule_data.time_to,
        Schedule.time_to > schedule_data.time_from
    ).first()
    
    if overlapping:
        raise ValueError(
            f"Zmiana nakłada się z istniejącą w grafiku: {overlapping.shift_type.value} "
            f"({overlapping.time_from.strftime('%H:%M')} - {overlapping.time_to.strftime('%H:%M')})"
        )
    
    db_schedule = Schedule(
        user_id=schedule_data.user_id,
        project_id=schedule_data.project_id,
        work_date=schedule_data.work_date,
        time_from=schedule_data.time_from,
        time_to=schedule_data.time_to,
        shift_type=schedule_data.shift_type,
        created_by_user_id=created_by_user_id
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def get_schedule(db: Session, schedule_id: int):
    """
    Pobiera wpis grafiku po ID.
    """
    return db.query(Schedule).filter(Schedule.schedule_id == schedule_id).first()

def get_schedules(
    db: Session,
    user_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    shift_type: Optional[str] = None
):
    """
    Pobiera listę wpisów grafiku z opcjonalnymi filtrami.
    """
    query = db.query(Schedule)
    
    if user_id is not None:
        query = query.filter(Schedule.user_id == user_id)
    if date_from is not None:
        query = query.filter(Schedule.work_date >= date_from)
    if date_to is not None:
        query = query.filter(Schedule.work_date <= date_to)
    if shift_type is not None:
        query = query.filter(Schedule.shift_type == shift_type)
    
    return query.order_by(Schedule.work_date, Schedule.time_from).all()

def get_schedule_for_day(db: Session, work_date: date):
    """
    Pobiera wszystkie wpisy grafiku dla konkretnego dnia z informacjami o użytkownikach i projektach.
    """
    schedules = db.query(
        Schedule.schedule_id,
        Schedule.user_id,
        User.first_name,
        User.last_name,
        Schedule.project_id,
        Project.project_name,
        Schedule.work_date,
        Schedule.time_from,
        Schedule.time_to,
        Schedule.shift_type,
        Schedule.created_at
    ).join(
        User, Schedule.user_id == User.user_id
    ).outerjoin(
        Project, Schedule.project_id == Project.project_id
    ).filter(
        Schedule.work_date == work_date
    ).order_by(
        User.last_name, User.first_name, Schedule.time_from
    ).all()
    
    return [
        {
            "schedule_id": s.schedule_id,
            "user_id": s.user_id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "project_id": s.project_id,
            "project_name": s.project_name,
            "work_date": s.work_date,
            "time_from": s.time_from.strftime("%H:%M"),
            "time_to": s.time_to.strftime("%H:%M"),
            "shift_type": s.shift_type,
            "created_at": s.created_at
        }
        for s in schedules
    ]

def get_schedule_for_month(db: Session, month: int, year: int):
    """
    Pobiera wszystkie wpisy grafiku dla danego miesiąca z informacjami o użytkownikach i projektach.
    Zwraca listę zgrupowaną po dniach.
    """
    from calendar import monthrange
    start_date = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end_date = date(year, month, last_day)
    
    schedules = db.query(
        Schedule.schedule_id,
        Schedule.user_id,
        User.first_name,
        User.last_name,
        Schedule.project_id,
        Project.project_name,
        Schedule.work_date,
        Schedule.time_from,
        Schedule.time_to,
        Schedule.shift_type,
        Schedule.created_at
    ).join(
        User, Schedule.user_id == User.user_id
    ).outerjoin(
        Project, Schedule.project_id == Project.project_id
    ).filter(
        Schedule.work_date >= start_date,
        Schedule.work_date <= end_date
    ).order_by(
        Schedule.work_date, User.last_name, User.first_name, Schedule.time_from
    ).all()
    
    # Grupuj po dniach
    days_dict = {}
    for s in schedules:
        if s.work_date not in days_dict:
            days_dict[s.work_date] = []
        
        days_dict[s.work_date].append({
            "schedule_id": s.schedule_id,
            "user_id": s.user_id,
            "first_name": s.first_name,
            "last_name": s.last_name,
            "project_id": s.project_id,
            "project_name": s.project_name,
            "work_date": s.work_date,
            "time_from": s.time_from.strftime("%H:%M"),
            "time_to": s.time_to.strftime("%H:%M"),
            "shift_type": s.shift_type,
            "created_at": s.created_at
        })
    
    return [
        {
            "work_date": work_date,
            "schedules": schedules_list
        }
        for work_date, schedules_list in sorted(days_dict.items())
    ]

def update_schedule(db: Session, schedule_id: int, schedule_update: ScheduleUpdate):
    """
    Aktualizuje wpis grafiku.
    Sprawdza czy po aktualizacji nie nakłada się z innymi zmianami.
    """
    db_schedule = get_schedule(db, schedule_id)
    if not db_schedule:
        raise ValueError(f"Wpis grafiku o id {schedule_id} nie istnieje")
    
    # Aktualizuj tylko przekazane pola
    if schedule_update.project_id is not None:
        # Sprawdź czy projekt istnieje
        project = db.query(Project).filter(Project.project_id == schedule_update.project_id).first()
        if not project:
            raise ValueError(f"Projekt o id {schedule_update.project_id} nie istnieje")
        db_schedule.project_id = schedule_update.project_id
    
    if schedule_update.work_date is not None:
        db_schedule.work_date = schedule_update.work_date
    if schedule_update.time_from is not None:
        db_schedule.time_from = schedule_update.time_from
    if schedule_update.time_to is not None:
        db_schedule.time_to = schedule_update.time_to
    if schedule_update.shift_type is not None:
        db_schedule.shift_type = schedule_update.shift_type
    
    # Walidacja czasu
    if db_schedule.time_from >= db_schedule.time_to:
        raise ValueError("Czas rozpoczęcia musi być wcześniejszy niż czas zakończenia")
    
    # Walidacja logiki shift_type vs project_id
    if db_schedule.shift_type.value == "normalna" and db_schedule.project_id is None:
        raise ValueError("Dla zmiany 'normalna' należy podać projekt")
    if db_schedule.shift_type.value != "normalna" and db_schedule.project_id is not None:
        raise ValueError(f"Dla zmiany '{db_schedule.shift_type.value}' nie należy podawać projektu")
    
    # Sprawdź czy nie nakłada się z innymi zmianami użytkownika (z wyłączeniem edytowanej)
    overlapping = db.query(Schedule).filter(
        Schedule.user_id == db_schedule.user_id,
        Schedule.work_date == db_schedule.work_date,
        Schedule.schedule_id != schedule_id,
        Schedule.time_from < db_schedule.time_to,
        Schedule.time_to > db_schedule.time_from
    ).first()
    
    if overlapping:
        raise ValueError(
            f"Zmiana nakłada się z istniejącą w grafiku: {overlapping.shift_type.value} "
            f"({overlapping.time_from.strftime('%H:%M')} - {overlapping.time_to.strftime('%H:%M')})"
        )
    
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def delete_schedule(db: Session, schedule_id: int):
    """
    Usuwa wpis grafiku.
    """
    db_schedule = get_schedule(db, schedule_id)
    if not db_schedule:
        return False
    
    db.delete(db_schedule)
    db.commit()
    return True

