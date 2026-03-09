# routers/google_calendar.py
"""
Router FastAPI dla integracji Apollo z Google Calendar.

Endpointy:
    GET  /integrations/google/status      — status połączenia z Google
    GET  /integrations/google/connect     — inicjuje OAuth (zwraca URL)
    GET  /integrations/google/callback    — callback OAuth od Google
    POST /integrations/google/sync-month  — synchronizuje grafik miesiąca
    POST /integrations/google/disconnect  — odłącza konto Google

Bezpieczeństwo OAuth (CSRF):
    Parametr `state` jest krótkotrwałym tokenem JWT podpisanym przez Apollo,
    zawierającym user_id i timestamp. Callback weryfikuje podpis i czas ważności
    przed akceptacją authorization_code od Google.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from database import get_db
from auth import get_current_user, SECRET_KEY
from models import User, GoogleCalendarConnection, GoogleCalendarEventMap, Schedule, Project
import google_calendar_service as gcal
from schemas import GoogleConnectionStatusRead, GoogleSyncMonthRequest, GoogleSyncMonthResult

router = APIRouter()
logger = logging.getLogger("apollo.google_calendar_router")

ALGORITHM = "HS256"
# Czas ważności parametru state — 10 minut wystarczy na przeprowadzenie autoryzacji
STATE_TOKEN_EXPIRE_MINUTES = 10

# Adres frontendu, do którego wrócimy po autoryzacji
FRONTEND_REDIRECT_AFTER_CONNECT = os.getenv("FRONTEND_URL", "http://localhost")


# ===== POMOCNICZE: STATE TOKEN =====

def _create_state_token(user_id: int) -> str:
    """Tworzy krótkotrwały JWT jako state dla OAuth, zawierający user_id."""
    expire = datetime.now(tz=timezone.utc) + timedelta(minutes=STATE_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire, "purpose": "google_oauth_state"},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _decode_state_token(state: str) -> int:
    """
    Weryfikuje i dekoduje state JWT.
    Zwraca user_id lub rzuca HTTPException 400.
    """
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "google_oauth_state":
            raise JWTError("Nieprawidłowy cel tokena")
        return int(payload["sub"])
    except JWTError as e:
        logger.warning("Nieprawidłowy lub wygasły parametr state OAuth: %s", e)
        raise HTTPException(status_code=400, detail="Nieprawidłowy lub wygasły parametr state. Spróbuj ponownie.")


# ===== ENDPOINTY =====

@router.get("/status", response_model=GoogleConnectionStatusRead)
def get_google_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Zwraca status połączenia zalogowanego użytkownika z Google Calendar."""
    connection = (
        db.query(GoogleCalendarConnection)
        .filter(
            GoogleCalendarConnection.user_id == current_user.user_id,
            GoogleCalendarConnection.is_active == True,
        )
        .first()
    )
    if not connection:
        return GoogleConnectionStatusRead(is_connected=False)

    return GoogleConnectionStatusRead(
        is_connected=True,
        google_email=connection.google_email,
        calendar_id=connection.calendar_id,
        calendar_summary=connection.calendar_summary,
        connected_at=connection.connected_at,
        last_sync_at=connection.last_sync_at,
    )


@router.get("/connect")
def initiate_google_connect(
    current_user: User = Depends(get_current_user),
):
    """
    Generuje URL autoryzacji Google OAuth i przekierowuje użytkownika.
    Parametr state jest podpisanym JWT — zabezpiecza przed CSRF.
    """
    if not gcal.GOOGLE_CLIENT_ID or not gcal.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Integracja Google Calendar nie jest skonfigurowana. Skontaktuj się z administratorem.",
        )

    state = _create_state_token(current_user.user_id)
    auth_url = gcal.generate_auth_url(state=state)
    return RedirectResponse(url=auth_url)


@router.get("/callback")
def google_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Callback OAuth wywołany przez Google po autoryzacji użytkownika.
    Wymienia authorization_code na tokeny, zapisuje połączenie w bazie,
    tworzy kalendarz Apollo (jeśli nie istnieje).
    """
    # Weryfikacja state — ochrona CSRF
    user_id = _decode_state_token(state)

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje.")

    # Wymiana kodu na tokeny
    try:
        tokens = gcal.exchange_code_for_tokens(code)
    except Exception as e:
        logger.error("Błąd wymiany authorization_code na tokeny: %s", e)
        raise HTTPException(status_code=400, detail="Nie udało się autoryzować z Google. Spróbuj ponownie.")

    if not tokens.get("refresh_token"):
        raise HTTPException(
            status_code=400,
            detail="Google nie zwróciło refresh_token. Odwołaj dostęp aplikacji Apollo w ustawieniach Google i spróbuj ponownie.",
        )

    # Pobierz e-mail użytkownika Google
    try:
        user_info = gcal.get_google_user_info(tokens["access_token"])
        google_email = user_info.get("email", "")
    except Exception as e:
        logger.warning("Nie udało się pobrać e-mail z Google: %s", e)
        google_email = ""

    # Zaszyfruj refresh_token przed zapisem
    encrypted_refresh_token = gcal.encrypt_token(tokens["refresh_token"])

    # Utwórz lub odnajdź kalendarz Apollo
    try:
        calendar_id, calendar_summary = gcal.get_or_create_apollo_calendar(encrypted_refresh_token)
    except Exception as e:
        logger.error("Błąd tworzenia kalendarza Apollo: %s", e)
        raise HTTPException(status_code=500, detail="Nie udało się utworzyć kalendarza w Google Calendar.")

    # Zapisz lub zaktualizuj połączenie w bazie
    existing = (
        db.query(GoogleCalendarConnection)
        .filter(GoogleCalendarConnection.user_id == user_id)
        .first()
    )
    if existing:
        existing.google_email = google_email
        existing.encrypted_refresh_token = encrypted_refresh_token
        existing.scope = tokens.get("scope", "")
        existing.calendar_id = calendar_id
        existing.calendar_summary = calendar_summary
        existing.is_active = True
    else:
        db.add(GoogleCalendarConnection(
            user_id=user_id,
            google_email=google_email,
            encrypted_refresh_token=encrypted_refresh_token,
            scope=tokens.get("scope", ""),
            calendar_id=calendar_id,
            calendar_summary=calendar_summary,
            is_active=True,
        ))
    db.commit()
    logger.info("Połączono konto Google dla user_id=%s (%s)", user_id, google_email)

    # Wróć do frontendu — widok grafiku miesięcznego
    redirect_url = f"{FRONTEND_REDIRECT_AFTER_CONNECT}/worker/schedule-view/"
    return RedirectResponse(url=redirect_url)


@router.post("/sync-month", response_model=GoogleSyncMonthResult)
def sync_month_to_google(
    request: GoogleSyncMonthRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Synchronizuje grafik danego miesiąca zalogowanego użytkownika z Google Calendar.
    Tworzy nowe eventy, aktualizuje zmienione, usuwa nieaktualne.
    """
    connection = (
        db.query(GoogleCalendarConnection)
        .filter(
            GoogleCalendarConnection.user_id == current_user.user_id,
            GoogleCalendarConnection.is_active == True,
        )
        .first()
    )
    if not connection:
        raise HTTPException(status_code=400, detail="Konto Google nie jest połączone. Najpierw połącz konto Google.")

    year = request.year
    month = request.month
    if not (1 <= month <= 12) or year < 2000:
        raise HTTPException(status_code=400, detail="Nieprawidłowy rok lub miesiąc.")

    # Pobierz grafik użytkownika dla danego miesiąca
    from datetime import date as date_type
    import calendar as cal_module
    last_day = cal_module.monthrange(year, month)[1]
    date_from = date_type(year, month, 1)
    date_to = date_type(year, month, last_day)

    schedule_entries = (
        db.query(Schedule, Project)
        .outerjoin(Project, Schedule.project_id == Project.project_id)
        .filter(
            Schedule.user_id == current_user.user_id,
            Schedule.work_date >= date_from,
            Schedule.work_date <= date_to,
        )
        .all()
    )

    # Pobierz istniejące mapowania eventów dla tego użytkownika i miesiąca
    schedule_ids = [s.schedule_id for s, _ in schedule_entries]
    existing_maps = {
        m.schedule_id: m
        for m in db.query(GoogleCalendarEventMap).filter(
            GoogleCalendarEventMap.user_id == current_user.user_id,
            GoogleCalendarEventMap.schedule_id.in_(schedule_ids) if schedule_ids else False,
        ).all()
    } if schedule_ids else {}

    # Wynik synchronizacji
    result = {"created": 0, "updated": 0, "deleted": 0, "skipped": 0, "errors": 0}

    for schedule_entry, project in schedule_entries:
        entry_dict = {
            "schedule_id": schedule_entry.schedule_id,
            "user_id": schedule_entry.user_id,
            "work_date": schedule_entry.work_date,
            "time_from": schedule_entry.time_from,
            "time_to": schedule_entry.time_to,
            "shift_type": schedule_entry.shift_type.value if hasattr(schedule_entry.shift_type, "value") else str(schedule_entry.shift_type),
            "project_name": project.project_name if project else None,
        }
        payload_hash = gcal.hash_schedule_payload(entry_dict)

        try:
            if schedule_entry.schedule_id in existing_maps:
                event_map = existing_maps[schedule_entry.schedule_id]
                # Aktualizuj tylko jeśli coś się zmieniło
                if event_map.last_payload_hash == payload_hash:
                    result["skipped"] += 1
                    continue
                gcal.update_event(
                    connection.encrypted_refresh_token,
                    connection.calendar_id,
                    event_map.google_event_id,
                    entry_dict,
                )
                event_map.last_payload_hash = payload_hash
                event_map.synced_at = datetime.now(tz=timezone.utc)
                result["updated"] += 1
            else:
                # Utwórz nowy event
                google_event_id = gcal.create_event(
                    connection.encrypted_refresh_token,
                    connection.calendar_id,
                    entry_dict,
                )
                db.add(GoogleCalendarEventMap(
                    user_id=current_user.user_id,
                    schedule_id=schedule_entry.schedule_id,
                    calendar_id=connection.calendar_id,
                    google_event_id=google_event_id,
                    last_payload_hash=payload_hash,
                ))
                result["created"] += 1
        except Exception as e:
            logger.error(
                "Błąd synchronizacji wpisu schedule_id=%s: %s",
                schedule_entry.schedule_id, e
            )
            result["errors"] += 1

    # Usuń eventy dla wpisów, których nie ma już w grafiku tego miesiąca
    # (mapowania istniejące dla tego miesiąca, ale schedule_id nie ma w bieżącym grafiku)
    all_maps_for_month = (
        db.query(GoogleCalendarEventMap)
        .join(Schedule, GoogleCalendarEventMap.schedule_id == Schedule.schedule_id)
        .filter(
            GoogleCalendarEventMap.user_id == current_user.user_id,
            Schedule.work_date >= date_from,
            Schedule.work_date <= date_to,
        )
        .all()
    )
    current_schedule_ids = set(s.schedule_id for s, _ in schedule_entries)
    for event_map in all_maps_for_month:
        if event_map.schedule_id not in current_schedule_ids:
            try:
                gcal.delete_event(
                    connection.encrypted_refresh_token,
                    connection.calendar_id,
                    event_map.google_event_id,
                )
                db.delete(event_map)
                result["deleted"] += 1
            except Exception as e:
                logger.error(
                    "Błąd usuwania eventu google_event_id=%s: %s",
                    event_map.google_event_id, e
                )
                result["errors"] += 1

    # Zaktualizuj czas ostatniej synchronizacji
    connection.last_sync_at = datetime.now(tz=timezone.utc)
    db.commit()

    created = result["created"]
    updated = result["updated"]
    deleted = result["deleted"]
    skipped = result["skipped"]
    errors = result["errors"]

    msg = (
        f"Synchronizacja zakończona. "
        f"Utworzono: {created}, zaktualizowano: {updated}, "
        f"usunięto: {deleted}, pominięto: {skipped}, błędy: {errors}."
    )
    return GoogleSyncMonthResult(
        created=created,
        updated=updated,
        deleted=deleted,
        skipped=skipped,
        errors=errors,
        message=msg,
    )


@router.post("/disconnect")
def disconnect_google(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Odłącza konto Google użytkownika.
    Oznacza połączenie jako nieaktywne i usuwa token.
    Istniejące eventy w Google Calendar pozostają niezmienione.
    """
    connection = (
        db.query(GoogleCalendarConnection)
        .filter(
            GoogleCalendarConnection.user_id == current_user.user_id,
            GoogleCalendarConnection.is_active == True,
        )
        .first()
    )
    if not connection:
        raise HTTPException(status_code=400, detail="Konto Google nie jest połączone.")

    connection.is_active = False
    # Usuwamy token z bazy — nie ma sensu go przechowywać po odłączeniu
    connection.encrypted_refresh_token = ""
    db.commit()
    logger.info("Odłączono konto Google dla user_id=%s", current_user.user_id)
    return {"detail": "Konto Google zostało odłączone."}
