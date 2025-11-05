# schemas.py
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import date, datetime

class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: Optional[str]
    role: str

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    user_id: int
    registration_date: datetime
    account_status: str

class ProjectBase(BaseModel):
    project_name: str
    description: Optional[str]

class ProjectCreate(BaseModel):
    project_name: str
    description: Optional[str]
    owner_user_id: int  # wymagane pole, ID właściciela
    # nie trzeba podawać created_by_user_id w input, bo będzie brane z tokena lub logiki backendu

class ProjectRead(BaseModel):
    project_id: int
    project_name: str
    description: Optional[str]
    owner_user_id: int
    created_by_user_id: int
    created_at: datetime

class MessageBase(BaseModel):
    title: str
    content: str
    is_active: Optional[bool] = True

class MessageCreate(MessageBase):
    pass

class MessageRead(MessageBase):
    message_id: int
    created_at: datetime

class WorkReportBase(BaseModel):
    project_id: int
    work_date: date
    hours_spent: int = 0
    minutes_spent: int = 0
    description: Optional[str] = None

    @validator('hours_spent')
    def validate_hours(cls, v):
        if not 0 <= v <= 24:
            raise ValueError("Godziny muszą być z zakresu 0-24")
        return v

    @validator('minutes_spent')
    def validate_minutes(cls, v):
        if not 0 <= v <= 59:
            raise ValueError("Minuty muszą być z zakresu 0-59")
        return v

    @validator('minutes_spent')
    def validate_total_time(cls, v, values):
        if 'hours_spent' not in values:
            return v
        hours = values['hours_spent']
        if hours == 24 and v > 0:
            raise ValueError("Łączny czas nie może przekroczyć 24 godzin")
        if hours == 0 and v == 0:
            raise ValueError("Łączny czas pracy musi być większy niż 0 godzin i 0 minut")
        return v

class WorkReportCreate(WorkReportBase):
    pass

class WorkReportRead(WorkReportBase):
    report_id: int
    user_id: int
    created_at: datetime

    class Config:
        orm_mode = True
