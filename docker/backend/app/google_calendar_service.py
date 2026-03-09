# google_calendar_service.py
"""
Warstwa serwisowa integracji Apollo z Google Calendar.

Odpowiada za:
- generowanie URL autoryzacji OAuth 2.0,
- wymianę authorization_code na tokeny,
- szyfrowanie i odszyfrowywanie refresh_token przed zapisem w bazie,
- odświeżanie access_token,
- tworzenie, aktualizowanie i usuwanie eventów Google Calendar,
- tworzenie kalendarza Apollo (jeśli nie istnieje),
- hashowanie payloadu wpisu grafiku (antyduplicat).
"""

import os
import json
import hashlib
import logging
import secrets
import base64
from datetime import datetime, timezone, date, time
from typing import Optional

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from cryptography.fernet import Fernet

logger = logging.getLogger("apollo.google_calendar")

# ===== KONFIGURACJA Z ZMIENNYCH ŚRODOWISKOWYCH =====

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_OAUTH_REDIRECT_URI = os.getenv(
    "GOOGLE_OAUTH_REDIRECT_URI",
    "http://localhost:8000/integrations/google/callback"
)
GOOGLE_OAUTH_SCOPES_RAW = os.getenv(
    "GOOGLE_OAUTH_SCOPES",
    "openid,email,profile,"
    "https://www.googleapis.com/auth/calendar.events,"
    "https://www.googleapis.com/auth/calendar.calendars,"
    "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
)
GOOGLE_OAUTH_SCOPES = [s.strip() for s in GOOGLE_OAUTH_SCOPES_RAW.split(",")]
GOOGLE_TOKEN_ENCRYPTION_KEY = os.getenv("GOOGLE_TOKEN_ENCRYPTION_KEY", "")

CALENDAR_SUMMARY = "Apollo"
CALENDAR_TIMEZONE = "Europe/Warsaw"


# ===== SZYFROWANIE TOKENÓW =====

def _get_fernet() -> Fernet:
    """Zwraca instancję Fernet na podstawie klucza z .env."""
    key = GOOGLE_TOKEN_ENCRYPTION_KEY
    if not key:
        raise RuntimeError(
            "Brak zmiennej GOOGLE_TOKEN_ENCRYPTION_KEY w konfiguracji. "
            "Wygeneruj klucz: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_token(token: str) -> str:
    """Szyfruje token przed zapisem do bazy."""
    f = _get_fernet()
    return f.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Odszyfrowuje token pobrany z bazy."""
    f = _get_fernet()
    return f.decrypt(encrypted_token.encode()).decode()


# ===== OAUTH 2.0 =====

def _client_config() -> dict:
    """Buduje słownik konfiguracyjny dla google_auth_oauthlib.flow.Flow."""
    return {
        "web": {
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [GOOGLE_OAUTH_REDIRECT_URI],
        }
    }


def generate_code_verifier() -> str:
    """Generuje PKCE code_verifier (RFC 7636)."""
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b'=').decode()


def generate_auth_url(state: str, code_verifier: str) -> str:
    """
    Generuje URL autoryzacji Google OAuth z PKCE.
    Parametr state powinien być podpisanym tokenem JWT zawierającym user_id i code_verifier.
    """
    flow = Flow.from_client_config(
        _client_config(),
        scopes=GOOGLE_OAUTH_SCOPES,
        redirect_uri=GOOGLE_OAUTH_REDIRECT_URI,
    )
    flow.code_verifier = code_verifier
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="false",
        prompt="consent",
        state=state,
    )
    return auth_url


def exchange_code_for_tokens(code: str, code_verifier: str) -> dict:
    """
    Wymienia authorization_code na access_token i refresh_token.
    Wymaga code_verifier użytego przy generowaniu auth URL (PKCE).
    Zwraca słownik: {access_token, refresh_token, token_expiry, scope, id_token}.
    """
    flow = Flow.from_client_config(
        _client_config(),
        scopes=GOOGLE_OAUTH_SCOPES,
        redirect_uri=GOOGLE_OAUTH_REDIRECT_URI,
    )
    flow.code_verifier = code_verifier
    flow.fetch_token(code=code)
    credentials = flow.credentials
    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_expiry": credentials.expiry,
        "scope": " ".join(credentials.scopes) if credentials.scopes else "",
        "id_token": getattr(credentials, "id_token", None),
    }


def get_google_user_info(access_token: str) -> dict:
    """Pobiera adres e-mail zalogowanego użytkownika Google."""
    import urllib.request
    url = f"https://www.googleapis.com/oauth2/v2/userinfo?access_token={access_token}"
    with urllib.request.urlopen(url) as response:  # noqa: S310
        return json.loads(response.read().decode())


# ===== GOOGLE CALENDAR SERVICE BUILDER =====

def _build_calendar_service(encrypted_refresh_token: str):
    """
    Buduje klienta Google Calendar API na podstawie zaszyfrowanego refresh_token
    pobranego z bazy. Automatycznie odświeża access_token jeśli wygasł.
    """
    refresh_token = decrypt_token(encrypted_refresh_token)
    credentials = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        scopes=GOOGLE_OAUTH_SCOPES,
    )
    # Odśwież token jawnie przed użyciem
    credentials.refresh(GoogleRequest())
    return build("calendar", "v3", credentials=credentials, cache_discovery=False)


# ===== KALENDARZ APOLLO =====

def get_or_create_apollo_calendar(encrypted_refresh_token: str) -> tuple[str, str]:
    """
    Odnajduje lub tworzy kalendarz o nazwie 'Apollo' w koncie Google użytkownika.
    Zwraca (calendar_id, calendar_summary).
    """
    service = _build_calendar_service(encrypted_refresh_token)
    calendar_list = service.calendarList().list().execute()
    for entry in calendar_list.get("items", []):
        if entry.get("summary") == CALENDAR_SUMMARY:
            return entry["id"], entry["summary"]

    # Utwórz nowy kalendarz Apollo
    new_calendar = service.calendars().insert(body={
        "summary": CALENDAR_SUMMARY,
        "timeZone": CALENDAR_TIMEZONE,
        "description": "Grafik pracy zarządzany przez Apollo",
    }).execute()
    logger.info("Utworzono nowy kalendarz Apollo dla użytkownika, id=%s", new_calendar["id"])
    return new_calendar["id"], new_calendar["summary"]


# ===== BUDOWANIE EVENTU GOOGLE =====

def _build_event_body(schedule_entry: dict) -> dict:
    """
    Buduje słownik eventu Google Calendar z wpisu grafiku Apollo.

    schedule_entry powinien zawierać pola:
        schedule_id, work_date, time_from, time_to, shift_type, project_name (opcjonalnie), user_id
    """
    shift_type = schedule_entry.get("shift_type", "normalna")
    project_name = schedule_entry.get("project_name")

    if shift_type == "normalna" and project_name:
        title = f"Zmiana: {project_name}"
    elif shift_type == "urlop":
        title = "Urlop"
    elif shift_type == "L4":
        title = "L4"
    else:
        title = "Zmiana"

    work_date: date = schedule_entry["work_date"]
    time_from: time = schedule_entry["time_from"]
    time_to: time = schedule_entry["time_to"]

    # Daty jako string ISO z timezone
    tz = CALENDAR_TIMEZONE
    start_dt = datetime.combine(work_date, time_from).isoformat()
    end_dt = datetime.combine(work_date, time_to).isoformat()

    description_lines = [
        f"Typ zmiany: {shift_type}",
    ]
    if project_name:
        description_lines.append(f"Projekt: {project_name}")
    description_lines.append(
        f"Godziny: {time_from.strftime('%H:%M')} – {time_to.strftime('%H:%M')}"
    )
    description_lines.append("Wpis zarządzany przez system Apollo.")

    return {
        "summary": title,
        "description": "\n".join(description_lines),
        "start": {"dateTime": start_dt, "timeZone": tz},
        "end": {"dateTime": end_dt, "timeZone": tz},
        "extendedProperties": {
            "private": {
                "apollo_schedule_id": str(schedule_entry["schedule_id"]),
                "apollo_user_id": str(schedule_entry["user_id"]),
            }
        },
    }


def hash_schedule_payload(schedule_entry: dict) -> str:
    """Generuje hash SHA-256 z kluczowych pól wpisu grafiku — do wykrywania zmian."""
    payload = json.dumps({
        "work_date": str(schedule_entry["work_date"]),
        "time_from": str(schedule_entry["time_from"]),
        "time_to": str(schedule_entry["time_to"]),
        "shift_type": schedule_entry.get("shift_type"),
        "project_name": schedule_entry.get("project_name"),
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


# ===== CRUD EVENTÓW =====

def create_event(
    encrypted_refresh_token: str,
    calendar_id: str,
    schedule_entry: dict,
) -> str:
    """
    Tworzy event w Google Calendar.
    Zwraca google_event_id nowo utworzonego eventu.
    """
    service = _build_calendar_service(encrypted_refresh_token)
    event_body = _build_event_body(schedule_entry)
    created = service.events().insert(calendarId=calendar_id, body=event_body).execute()
    return created["id"]


def update_event(
    encrypted_refresh_token: str,
    calendar_id: str,
    google_event_id: str,
    schedule_entry: dict,
) -> None:
    """Aktualizuje istniejący event Google Calendar."""
    service = _build_calendar_service(encrypted_refresh_token)
    event_body = _build_event_body(schedule_entry)
    service.events().update(
        calendarId=calendar_id,
        eventId=google_event_id,
        body=event_body,
    ).execute()


def delete_event(
    encrypted_refresh_token: str,
    calendar_id: str,
    google_event_id: str,
) -> None:
    """Usuwa event z Google Calendar. Ignoruje błąd 404 (event już nie istnieje)."""
    service = _build_calendar_service(encrypted_refresh_token)
    try:
        service.events().delete(calendarId=calendar_id, eventId=google_event_id).execute()
    except HttpError as e:
        if e.resp.status == 404:
            logger.warning(
                "Event Google %s nie istnieje — prawdopodobnie usunięty ręcznie przez użytkownika.",
                google_event_id,
            )
        else:
            raise
