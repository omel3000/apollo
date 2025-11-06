# Dokumentacja Backend Apollo

## Spis treści
1. [Wprowadzenie](#wprowadzenie)
2. [Struktura projektu](#struktura-projektu)
3. [Zależności](#zależności)
4. [Konfiguracja i uruchomienie](#konfiguracja-i-uruchomienie)
5. [Role i uprawnienia](#role-i-uprawnienia)
6. [Zasady walidacji czasu](#zasady-walidacji-czasu)
7. [Endpointy API (skrót) + szczegóły w ENDPOINT.md](#endpointy-api-skrót--szczegóły-w-endpointmd)
   - [Użytkownicy](#użytkownicy)
   - [Projekty](#projekty)
   - [Komunikaty](#komunikaty)
   - [Raporty pracy](#raporty-pracy)
   - [Przydziały użytkowników do projektów](#przydziały-użytkowników-do-projektów)
   - [Raporty projektowe (nowe)](#raporty-projektowe-nowe)
   - [Raporty użytkowników (nowe)](#raporty-użytkowników-nowe)
8. [Inne informacje](#inne-informacje)

## Wprowadzenie
Backend aplikacji Apollo jest zbudowany w oparciu o FastAPI i obsługuje zarządzanie użytkownikami, projektami, przypisaniami do projektów oraz raportami pracy. Autoryzacja oparta jest o JWT.

## Struktura projektu
- `main.py` – start aplikacji i rejestracja routerów
- `database.py` – konfiguracja połączenia z bazą (PostgreSQL)
- `models.py` – modele SQLAlchemy
- `schemas.py` – schematy Pydantic (wejście/wyjście)
- `crud.py` – logika bazodanowa i agregacje raportów
- `auth.py` – hashowanie haseł, JWT, zależności ról
- `routers/`
  - `users.py` – logowanie, CRUD użytkowników, raporty użytkowników (nowe)
  - `projects.py` – CRUD projektów, raporty projektowe (nowe)
  - `work_reports.py` – CRUD raportów pracy + miesięczne podsumowanie
  - `messages.py` – komunikaty
  - `user_projects.py` – przypisania użytkowników do projektów + assigned_users (nowe)
- `ENDPOINT.md` – pełna macierz endpointów i uprawnień (aktualna)

## Zależności
- fastapi, uvicorn
- sqlalchemy, psycopg2-binary
- pydantic[email]
- python-multipart
- python-jose[cryptography] (JWT)
- passlib[bcrypt], bcrypt (hashowanie haseł)
- alembic (migracje – opcjonalnie)

## Konfiguracja i uruchomienie
- Zmiennie środowiskowe w pliku `.env` (ładowane przez docker-compose):
  - `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`
- Start (Docker):
  - `docker-compose up -d`
  - Backend: `http://localhost:8000`
  - Nginx (frontend + proxy /users/*): `http://localhost/`

## Role i uprawnienia
- Użytkownik (user): zarządza wyłącznie własnymi raportami pracy.
- HR:
  - Ma dostęp do list użytkowników, projektów, raportów i agregacji (bez uprawnień „admin-only”).
  - Nie może nadawać roli „admin”.
- Admin:
  - Pełne uprawnienia.
  - Tylko admin może:
    - Nadać rolę „admin” (rejestracja/edycja).
    - Edytować dane innego użytkownika z rolą „admin”.
    - Usuwać użytkowników z rolą „admin”.

Zależności w kodzie:
- `admin_required` – tylko admin
- `admin_or_hr_required` – admin i HR
- `get_current_user` – dowolny zalogowany

## Zasady walidacji czasu
- Pojedynczy raport: 0 ≤ godziny ≤ 24, 0 ≤ minuty < 60, suma nie może być 0h 0m.
- Suma dzienna wpisów użytkownika nie może przekroczyć 24h.
- Wszystkie podsumowania normalizują minuty do godzin (np. 90 min = 1h 30 min).

## Endpointy API (skrót)
Pełna macierz endpointów i uprawnień: patrz plik `ENDPOINT.md`.

Główne grupy:
- Użytkownicy:
  - `POST /users/register` – rejestracja (admin/HR; rola „admin” tylko przez admina)
  - `POST /users/login` – logowanie (publiczny)
  - `GET /users/` – lista użytkowników (admin/HR)
  - `GET /users/me` – dane zalogowanego (zalogowani)
  - `PUT /users/me/change-email` – zmiana email (zalogowani)
  - `PUT /users/me/change-password` – zmiana hasła (zalogowani)
  - `PUT /users/{user_id}` – edycja użytkownika (admin/HR; edycja admina i nadawanie roli „admin” wyłącznie admin)
  - `DELETE /users/{user_id}` – usuwanie (admin/HR; usunięcie admina wyłącznie admin)

- Projekty:
  - `POST /projects` – tworzenie (admin/HR)
  - `GET /projects` – lista (admin/HR)
  - `PUT /projects/{project_id}` – aktualizacja (admin/HR)

- Komunikaty:
  - `GET /messages` – lista aktywnych (zalogowani)
  - `POST /messages` – tworzenie (admin)

- Raporty pracy:
  - `POST /work_reports` – dodanie (zalogowani; projekt musi istnieć, user musi być przypisany)
  - `GET /work_reports` – lista bieżącego użytkownika (zalogowani)
  - `PUT /work_reports/{report_id}` – edycja (właściciel lub admin/HR)
  - `DELETE /work_reports/{report_id}` – usuwanie (właściciel lub admin/HR)
  - `POST /work_reports/monthly_summary` – miesięczne podsumowanie dla bieżącego użytkownika

- Przydziały użytkowników do projektów:
  - `POST /user_projects` – przypisanie (admin/HR)
  - `GET /user_projects` – odczyt przypisań (admin/HR)
  - `GET /user_projects/assigned_users/{project_id}` – lista użytkowników przypisanych do projektu (admin/HR)

### Raporty projektowe (nowe)
- `POST /projects/monthly_summary` (admin/HR)
  - Wejście: `{ project_id, month, year }`
  - Wyjście: `{ total_hours, total_minutes }` dla całego projektu w miesiącu (minuty znormalizowane)

- `POST /projects/monthly_summary_with_users` (admin/HR)
  - Wejście: `{ project_id, month, year }`
  - Wyjście: suma projektu + lista użytkowników z ich łącznym czasem w miesiącu

- `POST /projects/user_detailed_report` (admin/HR)
  - Wejście: `{ project_id, user_id, month, year }`
  - Wyjście: szczegółowe wpisy (data, projekt, opis, godziny/minuty) posortowane chronologicznie

### Raporty użytkowników (nowe)
- `POST /users/monthly_active_users` (admin/HR)
  - Wejście: `{ month, year }`
  - Wyjście: lista użytkowników, którzy raportowali czas w miesiącu + ich sumy (pomija 0)

- `POST /users/monthly_projects` (admin/HR)
  - Wejście: `{ user_id, month, year }`
  - Wyjście: lista projektów, w których user raportował w miesiącu + sumy per projekt

- `POST /users/user_project_detailed` (admin/HR)
  - Wejście: `{ project_id, user_id, month, year }`
  - Wyjście: szczegóły dni użytkownika w projekcie (data, opis, godziny/minuty)

## Inne informacje
- Autoryzacja: Bearer JWT (nagłówek Authorization).
- Nginx proxy przekazuje Authorization do backendu dla ścieżek /users/*.
- Baza danych: patrz `DB_create.md` i `DB_opis.md`.
- Macierz endpointów i uprawnień: `ENDPOINT.md` (zawsze aktualny dokument referencyjny).
