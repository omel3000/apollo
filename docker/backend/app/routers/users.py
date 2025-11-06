from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from fastapi.security import OAuth2PasswordRequestForm
from database import get_db
from schemas import UserCreate, UserRead, ChangeEmailRequest, ChangePasswordRequest, UserUpdate
from crud import (
    create_user, get_user_by_email, get_user_by_id, delete_user,
    change_user_email, change_user_password, update_user,
    get_users_with_time_in_month, get_user_monthly_projects_summary,
    get_user_project_detailed_report,
)
from auth import verify_password, create_access_token, admin_required, get_current_user, admin_or_hr_required
from models import User
from schemas import (
    UsersMonthlyActiveRequest, UserMonthlyTotalTime,
    UserMonthlyProjectsRequest, UserProjectMonthlySummary,
    UserProjectDetailedRequest, UserProjectDetailedReport,
)

router = APIRouter()

@router.post("/register", response_model=UserRead)
def register_user(
    user: UserCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required)  # Add this line to require admin/hr auth
):
    db_user = get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    return create_user(db=db, user=user)


@router.post("/login")
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieprawidłowe dane logowania")
    
    access_token = create_access_token(data={"sub": str(user.user_id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    """Endpoint zwracający dane zalogowanego użytkownika - dostępny dla wszystkich zalogowanych"""
    return current_user

@router.get("/", response_model=List[UserRead])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.delete("/{user_id}", status_code=204)
def delete_user_endpoint(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(admin_required)):
    try:
        success = delete_user(db, user_id)
    except ValueError as e:
        # np. nie można usunąć bo istnieją powiązane rekordy
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not success:
        raise HTTPException(status_code=404, detail="Użytkownik nie znaleziony")
    return None

@router.put("/me/change-email", response_model=UserRead)
def change_email(
    request: ChangeEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Zmiana adresu email - dostępna tylko dla zalogowanego użytkownika"""
    # Weryfikuj hasło
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowe hasło"
        )
    
    try:
        updated_user = change_user_email(db, current_user.user_id, request.new_email)
        return updated_user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/me/change-password")
def change_password(
    request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Zmiana hasła - dostępna tylko dla zalogowanego użytkownika"""
    # Weryfikuj aktualne hasło
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowe aktualne hasło"
        )
    
    try:
        change_user_password(db, current_user.user_id, request.new_password)
        return {"message": "Hasło zostało zmienione pomyślnie"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put("/{user_id}", response_model=UserRead)
def update_user_endpoint(user_id: int, user: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(admin_or_hr_required)):
    """Edycja danych użytkownika - dostępna dla admin/HR"""
    try:
        updated = update_user(db, user_id, user)
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/monthly_active_users", response_model=List[UserMonthlyTotalTime])
def users_monthly_active_endpoint(
    request: UsersMonthlyActiveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required),
):
    """
    Lista użytkowników z jakimkolwiek czasem w miesiącu + łączny czas (pomija 0).
    """
    return get_users_with_time_in_month(db, request.month, request.year)

@router.post("/monthly_projects", response_model=List[UserProjectMonthlySummary])
def user_monthly_projects_endpoint(
    request: UserMonthlyProjectsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required),
):
    """
    Lista projektów dla użytkownika w danym miesiącu + suma czasu per projekt.
    """
    return get_user_monthly_projects_summary(db, request.user_id, request.month, request.year)

@router.post("/user_project_detailed", response_model=UserProjectDetailedReport)
def user_project_detailed_endpoint(
    request: UserProjectDetailedRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_hr_required),
):
    """
    Szczegóły: dni/raporty dla użytkownika w projekcie w danym miesiącu.
    """
    try:
        return get_user_project_detailed_report(db, request.project_id, request.user_id, request.month, request.year)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

