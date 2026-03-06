from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import MessageCreate, MessageRead, MessageUpdate
from crud import get_active_messages, get_all_messages, create_message, update_message, delete_message
from auth import get_current_user, admin_or_hr_required
from models import User

router = APIRouter()

@router.get("/", response_model=List[MessageRead])
def read_messages(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if include_inactive:
        if current_user.role not in ("admin", "hr"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Brak uprawnień",
            )
        messages = get_all_messages(db)
    else:
        messages = get_active_messages(db)
    return messages

@router.post("/", response_model=MessageRead)
def create_new_message(message: MessageCreate, db: Session = Depends(get_db), current_user: User = Depends(admin_or_hr_required)):
    new_message = create_message(db, message)
    return new_message

@router.put("/{message_id}", response_model=MessageRead)
def update_existing_message(
    message_id: int,
    message: MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required)
):
    """Aktualizuje komunikat - dostęp dla HR i admina"""
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
    current_user: User = Depends(admin_or_hr_required)
):
    """Usuwa komunikat - dostęp dla HR i admina"""
    success = delete_message(db, message_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Komunikat nie znaleziony"
        )
    return None
