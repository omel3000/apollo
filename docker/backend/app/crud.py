# crud.py
from sqlalchemy.orm import Session
from models import User, Project
from auth import hash_password
from schemas import UserCreate, ProjectCreate

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.user_id == user_id).first()

def create_user(db: Session, user: UserCreate):
    db_user = User(
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
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
        db.delete(db_user)
        db.commit()
        return True
    return False

def create_project(db: Session, project: ProjectCreate, user_id: int):
    db_project = Project(
        project_name=project.project_name,
        description=project.description,
        created_by_user_id=user_id,  # osoba która tworzy projekt, np. z tokena
        owner_user_id=project.owner_user_id  # ID właściciela podany w input
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

