import os
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from models import User
from database import get_db
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import logging

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login", auto_error=False)
logger = logging.getLogger("apollo.auth")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Read secret and token settings from environment (avoid hardcoding in code)
SECRET_KEY = os.getenv("SECRET_KEY", "supersekretnykluczdojwt")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    now = datetime.now(tz=timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Niepoprawny lub wygasły token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
        else:
            logger.warning("Brak nagłówka Authorization dla %s %s", request.method, request.url.path)
            raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)
    except (JWTError, ValueError) as exc:
        logger.warning("Błędny token JWT dla %s %s: %s", request.method, request.url.path, exc)
        raise credentials_exception

    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # Sprawdź status konta - zablokuj dostęp dla nieaktywnych i zablokowanych
    account_status_normalized = (user.account_status or '').lower()
    if account_status_normalized == 'nieaktywny' or account_status_normalized == 'inactive':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Twoje konto jest nieaktywne. Skontaktuj się z administratorem."
        )
    if account_status_normalized == 'zablokowany' or account_status_normalized == 'blocked':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Twoje konto zostało zablokowane. Skontaktuj się z administratorem."
        )
    
    return user

def admin_required(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak uprawnień")
    return current_user

def admin_or_hr_required(current_user: User = Depends(get_current_user)):
    if current_user.role not in ("admin", "hr"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Brak uprawnień")
    return current_user

def can_manage_work_report(current_user: User, report_user_id: int):
    # Może admin, hr lub właściciel raportu
    if current_user.role in ("admin", "hr"):
        return True
    if current_user.user_id == report_user_id:
        return True
    return False

