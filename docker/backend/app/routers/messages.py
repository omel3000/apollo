from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import MessageCreate, MessageRead, MessageUpdate
from crud import get_active_messages, create_message, update_message, delete_message
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

@router.put("/{message_id}", response_model=MessageRead)
def update_existing_message(
    message_id: int,
    message: MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Aktualizuje komunikat - dostęp tylko dla admina"""
    updated_message = update_message(db, message_id, message)
    if not updated_message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Komunikat nie znaleziony"
        )
    return updated_message

@router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_existing_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_required)
):
    """Usuwa komunikat - dostęp tylko dla admina"""
    success = delete_message(db, message_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Komunikat nie znaleziony"
        )
    return None
