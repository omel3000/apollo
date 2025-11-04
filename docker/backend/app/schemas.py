# schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

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

    class Config:
        orm_mode = True

