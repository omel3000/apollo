# models.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from database import Base

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
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __tablename__ = "messages"

    message_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(String(2000), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)