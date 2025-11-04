# auth.py
from passlib.context import CryptContext
from datetime import datetime, timedelta
import jwt

# Ustawienia hashowania haseł
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Sekretny klucz do JWT - w prawdziwej aplikacji przechowuj go bezpiecznie!
SECRET_KEY = "supersekretnykluczdojwt"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # ważność tokenu 1 godzina

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

