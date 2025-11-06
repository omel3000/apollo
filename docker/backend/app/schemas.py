# schemas.py
from typing import Optional, Annotated, List, Dict
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: Optional[str]
    role: str

    @field_validator("email", mode="before")
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    user_id: int
    registration_date: datetime
    account_status: str

    model_config = {"from_attributes": True}

class ProjectBase(BaseModel):
    project_name: str
    description: Optional[str]

class ProjectCreate(BaseModel):
    project_name: str
    description: Optional[str]
    owner_user_id: int

class ProjectRead(BaseModel):
    project_id: int
    project_name: str
    description: Optional[str]
    owner_user_id: int
    created_by_user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class MessageBase(BaseModel):
    title: str
    content: str
    is_active: Optional[bool] = True

class MessageCreate(MessageBase):
    pass

class MessageRead(MessageBase):
    message_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

# Use Annotated + Field for simple bounds
Hours = Annotated[int, Field(ge=0, le=24)]
Minutes = Annotated[int, Field(ge=0, le=59)]

class WorkReportBase(BaseModel):
    project_id: int
    work_date: date
    hours_spent: Hours = 0
    minutes_spent: Minutes = 0
    description: Optional[str] = None

    # dodatkowa normalizacja/konwersje można tu dodać jeśli potrzeba

    @model_validator(mode="after")
    def validate_total_time(self):
        # model_validator(mode='after') wykonuje się po walidacji poszczególnych pól
        hours = int(self.hours_spent)
        minutes = int(self.minutes_spent)
        if hours == 24 and minutes > 0:
            raise ValueError("Łączny czas nie może przekroczyć 24 godzin")
        if hours == 0 and minutes == 0:
            raise ValueError("Łączny czas pracy musi być większy niż 0 godzin i 0 minut")
        return self

class WorkReportCreate(WorkReportBase):
    project_id: int  # Ensure project_id is included
    work_date: date  # Ensure work_date is included

class WorkReportRead(WorkReportBase):
    report_id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class UserProjectBase(BaseModel):
    user_id: int
    project_id: int

class UserProjectCreate(UserProjectBase):
    pass

class UserProjectRead(UserProjectBase):
    user_project_id: int
    assigned_at: Optional[datetime]

    model_config = {"from_attributes": True}

class DailySummary(BaseModel):
    date: str
    total_hours: int
    total_minutes: int
    project_hours: Dict[int, Dict[str, int]]  # Dictionary with project_id as key and dict with hours and minutes

class MonthlySummary(BaseModel):
    total_hours: int
    total_minutes: int
    project_hours: Dict[int, Dict[str, int]]  # Dictionary with project_id as key and dict with hours and minutes
    daily_hours: List[DailySummary]  # List of DailySummary objects

class MonthlySummaryRequest(BaseModel):
    month: int  # Month as an integer (1-12)
    year: int   # Year as an integer

class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    current_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_new_password: str
    
    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_new_password:
            raise ValueError("Nowe hasła nie są identyczne")
        return self
