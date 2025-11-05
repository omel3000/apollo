from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import MessageCreate, MessageRead
from crud import get_active_messages, create_message
from auth import get_current_user, admin_required
from models import User

router = APIRouter()

@router.get("/", response_model=List[MessageRead])
def read_messages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # dostęp tylko dla zalogowanych użytkowników
    messages = get_active_messages(db)
    return messages

@router.post("/", response_model=MessageRead)
def create_new_message(message: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    # dostęp tylko dla admina
    new_message = create_message(db, message)
    return new_message
