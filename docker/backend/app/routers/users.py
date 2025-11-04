from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi.security import OAuth2PasswordRequestForm
from database import get_db
from schemas import UserCreate, UserRead
from crud import create_user, get_user_by_email, get_user_by_id, delete_user
from auth import verify_password, create_access_token, admin_required, get_current_user
from models import User

router = APIRouter()

@router.post("/register", response_model=UserRead)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email już używany")
    new_user = create_user(db=db, user=user)
    return new_user

@router.post("/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieprawidłowe dane logowania")
    
    access_token = create_access_token(data={"sub": str(user.user_id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/", response_model=List[UserRead])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.delete("/{user_id}", status_code=204)
def delete_user_endpoint(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    success = delete_user(db, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    return None

