# schemas.py
from typing import Optional, Annotated, List, Dict
from datetime import date, datetime, time
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator, field_serializer
from enum import Enum

class TimeTypeEnum(str, Enum):
    constant = "constant"
    from_to = "from_to"

class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: Optional[str]
    role: str
    birth_date: Optional[date] = None
    address: Optional[str] = None

    @field_validator("email", mode="before")
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v

class UserCreate(UserBase):
    password: str
    
    @field_validator("birth_date", mode="before")
    def validate_birth_date(cls, v):
        """Waliduje datę urodzenia - nie może być z przyszłości"""
        if v is None or v == "":
            return None
        
        # Konwersja stringa na date jeśli potrzebne
        if isinstance(v, str):
            from datetime import datetime as dt
            try:
                v = dt.strptime(v, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("Nieprawidłowy format daty urodzenia (wymagany: YYYY-MM-DD)")
        
        from datetime import datetime
        today = datetime.now().date()
        
        # Sprawdź czy data nie jest z przyszłości
        if v > today:
            raise ValueError("Data urodzenia nie może być z przyszłości")
        
        return v
    
    @field_validator("address", mode="before")
    def validate_address(cls, v):
        """Waliduje adres - jeśli jest pusty string, zwraca None"""
        if v is None:
            return None
        if isinstance(v, str):
            v = v.strip()
            if v == "" or v.lower() == "string":
                return None
        return v

class UserRead(UserBase):
    user_id: int
    registration_date: datetime
    account_status: str

    model_config = {"from_attributes": True}

class UserShortRead(BaseModel):
    user_id: int
    first_name: str
    last_name: str

class ProjectBase(BaseModel):
    project_name: str
    description: Optional[str]

class ProjectCreate(BaseModel):
    project_name: str
    description: Optional[str]
    owner_user_id: int
    time_type: TimeTypeEnum

class ProjectRead(BaseModel):
    project_id: int
    project_name: str
    description: Optional[str]
    owner_user_id: int
    created_by_user_id: int
    time_type: TimeTypeEnum
    created_at: datetime

    model_config = {"from_attributes": True}

class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    description: Optional[str] = None
    owner_user_id: Optional[int] = None
    time_type: Optional[TimeTypeEnum] = None

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
    time_from: Optional[time] = None
    time_to: Optional[time] = None

    @field_validator("time_from", "time_to", mode="before")
    @classmethod
    def normalize_time(cls, v):
        """Normalizuje czas do formatu HH:MM (bez sekund i mikrosekund)"""
        if v is None:
            return None
        if isinstance(v, str):
            # Parse string do obiektu time
            from datetime import time as dt_time
            parts = v.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            return dt_time(hour, minute, 0, 0)
        if isinstance(v, time):
            # Jeśli już jest time, ustaw sekundy i mikrosekundy na 0
            return v.replace(second=0, microsecond=0)
        return v

    @model_validator(mode="after")
    def validate_total_time(self):
        # model_validator(mode='after') wykonuje się po walidacji poszczególnych pól
        hours = int(self.hours_spent)
        minutes = int(self.minutes_spent)
        if hours == 24 and minutes > 0:
            raise ValueError("Łączny czas nie może przekroczyć 24 godzin")
        if hours == 0 and minutes == 0:
            raise ValueError("Łączny czas pracy musi być większy niż 0 godzin i 0 minut")
        
        # Walidacja time_from i time_to
        if self.time_from is not None and self.time_to is not None:
            if self.time_from >= self.time_to:
                raise ValueError("Czas rozpoczęcia (time_from) musi być wcześniejszy niż czas zakończenia (time_to)")
        
        return self

class WorkReportCreate(WorkReportBase):
    project_id: int  # Ensure project_id is included
    work_date: date  # Ensure work_date is included

class WorkReportRead(WorkReportBase):
    report_id: int
    user_id: int
    created_at: datetime

    @field_serializer('time_from', 'time_to')
    def serialize_time(self, value: Optional[time]) -> Optional[str]:
        """Serializuje czas do formatu HH:MM"""
        if value is None:
            return None
        return value.strftime("%H:%M")

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

# Now add update schema
class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    role: Optional[str] = None
    account_status: Optional[str] = None
    birth_date: Optional[date] = None
    address: Optional[str] = None

    @field_validator("email", mode="before")
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v
    
    @field_validator("birth_date", mode="before")
    def validate_birth_date(cls, v):
        """Waliduje datę urodzenia - nie może być z przyszłości"""
        if v is None or v == "":
            return None
        
        # Konwersja stringa na date jeśli potrzebne
        if isinstance(v, str):
            from datetime import datetime as dt
            try:
                v = dt.strptime(v, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("Nieprawidłowy format daty urodzenia (wymagany: YYYY-MM-DD)")
        
        from datetime import datetime
        today = datetime.now().date()
        
        # Sprawdź czy data nie jest z przyszłości
        if v > today:
            raise ValueError("Data urodzenia nie może być z przyszłości")
        
        return v
    
    @field_validator("address", mode="before")
    def validate_address(cls, v):
        """Waliduje adres - jeśli jest pusty string, zwraca None"""
        if v is None:
            return None
        if isinstance(v, str):
            v = v.strip()
            if v == "" or v.lower() == "string":
                return None
        return v

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

class ProjectMonthlySummaryRequest(BaseModel):
    project_id: int
    month: int  # Month as an integer (1-12)
    year: int   # Year as an integer

class ProjectMonthlySummary(BaseModel):
    project_id: int
    month: int
    year: int
    total_hours: int
    total_minutes: int

class UserProjectTime(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    total_hours: int
    total_minutes: int

class ProjectMonthlySummaryWithUsers(BaseModel):
    project_id: int
    month: int
    year: int
    total_hours: int
    total_minutes: int
    users: List[UserProjectTime]

class UserProjectDetailedRequest(BaseModel):
    project_id: int
    user_id: int
    month: int  # Month as an integer (1-12)
    year: int   # Year as an integer

class WorkReportDetail(BaseModel):
    work_date: date
    project_name: str
    description: Optional[str]
    hours_spent: int
    minutes_spent: int

class UserProjectDetailedReport(BaseModel):
    project_id: int
    user_id: int
    first_name: str
    last_name: str
    month: int
    year: int
    reports: List[WorkReportDetail]

class UsersMonthlyActiveRequest(BaseModel):
    month: int
    year: int

class UserMonthlyTotalTime(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    total_hours: int
    total_minutes: int

class UserMonthlyProjectsRequest(BaseModel):
    user_id: int
    month: int
    year: int

class UserProjectMonthlySummary(BaseModel):
    project_id: int
    project_name: str
    total_hours: int
    total_minutes: int

# ============================================================================
# Availability schemas
# ============================================================================

class AvailabilityBase(BaseModel):
    date: date
    is_available: bool
    time_from: Optional[time] = None
    time_to: Optional[time] = None

    @field_validator("time_from", "time_to", mode="before")
    @classmethod
    def normalize_time(cls, v):
        """Normalizuje czas do formatu HH:MM (bez sekund i mikrosekund)"""
        if v is None:
            return None
        if isinstance(v, str):
            from datetime import time as dt_time
            parts = v.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            return dt_time(hour, minute, 0, 0)
        if isinstance(v, time):
            return v.replace(second=0, microsecond=0)
        return v

    @model_validator(mode="after")
    def validate_availability(self):
        """Waliduje logikę dostępności"""
        if self.is_available and self.time_from is not None and self.time_to is not None:
            if self.time_from >= self.time_to:
                raise ValueError("Czas rozpoczęcia (time_from) musi być wcześniejszy niż czas zakończenia (time_to)")
        
        # Jeśli is_available=False, nie powinno być czasu
        if not self.is_available and (self.time_from is not None or self.time_to is not None):
            raise ValueError("Dla niedostępności nie należy podawać zakresu czasu")
        
        # Jeśli is_available=True i brak czasu, to dostępny cały dzień (to jest OK)
        
        return self

class AvailabilityCreate(AvailabilityBase):
    pass

class AvailabilityRead(AvailabilityBase):
    user_id: int
    created_at: datetime

    @field_serializer('time_from', 'time_to')
    def serialize_time(self, value: Optional[time]) -> Optional[str]:
        """Serializuje czas do formatu HH:MM"""
        if value is None:
            return None
        return value.strftime("%H:%M")

    model_config = {"from_attributes": True}

class AvailabilityUpdate(BaseModel):
    is_available: Optional[bool] = None
    time_from: Optional[time] = None
    time_to: Optional[time] = None

    @field_validator("time_from", "time_to", mode="before")
    @classmethod
    def normalize_time(cls, v):
        """Normalizuje czas do formatu HH:MM"""
        if v is None:
            return None
        if isinstance(v, str):
            from datetime import time as dt_time
            parts = v.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            return dt_time(hour, minute, 0, 0)
        if isinstance(v, time):
            return v.replace(second=0, microsecond=0)
        return v

# ============================================================================
# Absence schemas
# ============================================================================

class AbsenceTypeEnum(str, Enum):
    urlop = "urlop"
    L4 = "L4"
    inne = "inne"

class AbsenceBase(BaseModel):
    absence_type: AbsenceTypeEnum
    date_from: date
    date_to: date

    @model_validator(mode="after")
    def validate_dates(self):
        """Waliduje zakres dat"""
        if self.date_from > self.date_to:
            raise ValueError("Data rozpoczęcia (date_from) musi być wcześniejsza lub równa dacie zakończenia (date_to)")
        return self

class AbsenceCreate(AbsenceBase):
    pass

class AbsenceRead(AbsenceBase):
    absence_id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class AbsenceUpdate(BaseModel):
    absence_type: Optional[AbsenceTypeEnum] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None

# ============================================================================
# Query filters for availability and absences
# ============================================================================

class AvailabilityQueryParams(BaseModel):
    user_id: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None

class AbsenceQueryParams(BaseModel):
    user_id: Optional[int] = None
    absence_type: Optional[AbsenceTypeEnum] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None

# ============================================================================
# Schedule schemas
# ============================================================================

class ShiftTypeEnum(str, Enum):
    normalna = "normalna"
    urlop = "urlop"
    L4 = "L4"
    inne = "inne"

class ScheduleBase(BaseModel):
    user_id: int
    project_id: Optional[int] = None
    work_date: date
    time_from: time
    time_to: time
    shift_type: ShiftTypeEnum

    @field_validator("time_from", "time_to", mode="before")
    @classmethod
    def normalize_time(cls, v):
        """Normalizuje czas do formatu HH:MM (bez sekund i mikrosekund)"""
        if v is None:
            return None
        if isinstance(v, str):
            from datetime import time as dt_time
            parts = v.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            return dt_time(hour, minute, 0, 0)
        if isinstance(v, time):
            return v.replace(second=0, microsecond=0)
        return v

    @model_validator(mode="after")
    def validate_schedule(self):
        """Waliduje logikę grafiku"""
        if self.time_from >= self.time_to:
            raise ValueError("Czas rozpoczęcia (time_from) musi być wcześniejszy niż czas zakończenia (time_to)")
        
        # Dla zmian nieobecności (urlop, L4, inne) projekt nie jest wymagany
        if self.shift_type == ShiftTypeEnum.normalna and self.project_id is None:
            raise ValueError("Dla zmiany 'normalna' należy podać projekt (project_id)")
        
        # Dla urlop/L4/inne projekt powinien być NULL
        if self.shift_type != ShiftTypeEnum.normalna and self.project_id is not None:
            raise ValueError(f"Dla zmiany '{self.shift_type.value}' nie należy podawać projektu")
        
        return self

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleRead(ScheduleBase):
    schedule_id: int
    created_by_user_id: Optional[int]
    created_at: datetime

    @field_serializer('time_from', 'time_to')
    def serialize_time(self, value: Optional[time]) -> Optional[str]:
        """Serializuje czas do formatu HH:MM"""
        if value is None:
            return None
        return value.strftime("%H:%M")

    model_config = {"from_attributes": True}

class ScheduleUpdate(BaseModel):
    project_id: Optional[int] = None
    work_date: Optional[date] = None
    time_from: Optional[time] = None
    time_to: Optional[time] = None
    shift_type: Optional[ShiftTypeEnum] = None

    @field_validator("time_from", "time_to", mode="before")
    @classmethod
    def normalize_time(cls, v):
        """Normalizuje czas do formatu HH:MM"""
        if v is None:
            return None
        if isinstance(v, str):
            from datetime import time as dt_time
            parts = v.split(":")
            hour = int(parts[0])
            minute = int(parts[1]) if len(parts) > 1 else 0
            return dt_time(hour, minute, 0, 0)
        if isinstance(v, time):
            return v.replace(second=0, microsecond=0)
        return v

# ============================================================================
# Schedule query and response schemas
# ============================================================================

class ScheduleWithUserInfo(BaseModel):
    """Schedule z rozszerzonymi informacjami o użytkowniku i projekcie"""
    schedule_id: int
    user_id: int
    first_name: str
    last_name: str
    project_id: Optional[int]
    project_name: Optional[str]
    work_date: date
    time_from: str  # Format HH:MM
    time_to: str    # Format HH:MM
    shift_type: ShiftTypeEnum
    created_at: datetime

class DaySchedule(BaseModel):
    """Wszystkie wpisy grafiku dla jednego dnia"""
    work_date: date
    schedules: List[ScheduleWithUserInfo]

class MonthScheduleRequest(BaseModel):
    month: int  # 1-12
    year: int

class UserScheduleRequest(BaseModel):
    user_id: int
    date_from: Optional[date] = None
    date_to: Optional[date] = None

