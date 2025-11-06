# Dokumentacja Backend Apollo

## Spis treści
1. [Wprowadzenie](#wprowadzenie)
2. [Struktura projektu](#struktura-projektu)
3. [Zależności](#zależności)
4. [Endpointy API](#endpointy-api)
   - [Użytkownicy](#użytkownicy)
   - [Projekty](#projekty)
   - [Komunikaty](#komunikaty)
   - [Raporty pracy](#raporty-pracy)
   - [Przydziały użytkowników do projektów](#przydziały-użytkowników-do-projektów)
5. [Inne informacje](#inne-informacje)

## Wprowadzenie
Backend aplikacji Apollo jest zbudowany przy użyciu frameworka FastAPI i służy do zarządzania użytkownikami, projektami oraz raportami pracy. Aplikacja korzysta z bazy danych PostgreSQL.

## Struktura projektu
Projekt składa się z następujących plików i folderów:
- `main.py` - główny plik uruchamiający aplikację.
- `database.py` - konfiguracja bazy danych.
- `models.py` - definicje modeli bazodanowych.
- `schemas.py` - definicje schematów danych (Pydantic).
- `crud.py` - operacje CRUD na bazie danych.
- `auth.py` - logika autoryzacji i uwierzytelniania.
- `routers/` - folder z definicjami endpointów API.

## Zależności
Aplikacja wymaga następujących bibliotek:
- FastAPI
- Uvicorn
- SQLAlchemy
- Psycopg2-binary
- Pydantic
- Alembic
- Python-multipart
- PyJWT
- Bcrypt
- Passlib

## Endpointy API

### Użytkownicy
#### Rejestracja użytkownika
- **Endpoint:** `POST /users/register`
- **Dane wymagane:** 
  - `first_name`: Imię użytkownika.
  - `last_name`: Nazwisko użytkownika.
  - `email`: Adres email (unikalny).
  - `phone_number`: Numer telefonu (opcjonalny).
  - `password`: Hasło użytkownika.
  - `role`: Rola użytkownika (np. user, HR, admin).
- **Dostęp:** Tylko dla niezalogowanych użytkowników.
- **Odpowiedź:** Zwraca dane nowo utworzonego użytkownika.

#### Logowanie
- **Endpoint:** `POST /users/login`
- **Dane wymagane:** 
  - `username`: Adres email użytkownika.
  - `password`: Hasło użytkownika.
- **Dostęp:** Dla wszystkich użytkowników.
- **Odpowiedź:** Zwraca token dostępu.

#### Odczyt danych zalogowanego użytkownika
- **Endpoint:** `GET /users/me`
- **Dostęp:** Tylko dla zalogowanych użytkowników.
- **Odpowiedź:** Zwraca dane zalogowanego użytkownika.

#### Zmiana adresu email
- **Endpoint:** `PUT /users/me/change-email`
- **Dane wymagane:** 
  - `new_email`: Nowy adres email.
  - `current_password`: Aktualne hasło.
- **Dostęp:** Tylko dla zalogowanych użytkowników.
- **Odpowiedź:** Zwraca zaktualizowane dane użytkownika.

#### Zmiana hasła
- **Endpoint:** `PUT /users/me/change-password`
- **Dane wymagane:** 
  - `current_password`: Aktualne hasło.
  - `new_password`: Nowe hasło.
  - `confirm_new_password`: Potwierdzenie nowego hasła.
- **Dostęp:** Tylko dla zalogowanych użytkowników.
- **Odpowiedź:** Zwraca komunikat o powodzeniu operacji.

### Projekty
#### Tworzenie nowego projektu
- **Endpoint:** `POST /projects`
- **Dane wymagane:** 
  - `project_name`: Nazwa projektu.
  - `description`: Opis projektu (opcjonalny).
  - `owner_user_id`: ID użytkownika, który jest właścicielem projektu.
- **Dostęp:** Tylko dla użytkowników z rolą admin lub HR.
- **Odpowiedź:** Zwraca dane nowo utworzonego projektu.

#### Odczyt projektów
- **Endpoint:** `GET /projects`
- **Dostęp:** Tylko dla użytkowników z rolą admin lub HR.
- **Odpowiedź:** Zwraca listę wszystkich projektów.

### Komunikaty
#### Odczyt komunikatów
- **Endpoint:** `GET /messages`
- **Dostęp:** Dla wszystkich zalogowanych użytkowników.
- **Odpowiedź:** Zwraca listę aktywnych komunikatów.

#### Tworzenie nowego komunikatu
- **Endpoint:** `POST /messages`
- **Dane wymagane:** 
  - `title`: Tytuł komunikatu.
  - `content`: Treść komunikatu.
- **Dostęp:** Tylko dla użytkowników z rolą admin.
- **Odpowiedź:** Zwraca dane nowo utworzonego komunikatu.

### Raporty pracy
#### Dodawanie raportu pracy
- **Endpoint:** `POST /work_reports`
- **Dane wymagane:** 
  - `project_id`: ID projektu.
  - `work_date`: Data pracy.
  - `hours_spent`: Liczba przepracowanych godzin.
  - `minutes_spent`: Liczba przepracowanych minut.
  - `description`: Opis (opcjonalny).
- **Dostęp:** Tylko dla zalogowanych użytkowników.
- **Odpowiedź:** Zwraca dane nowo utworzonego raportu.

#### Odczyt raportów pracy
- **Endpoint:** `GET /work_reports`
- **Dane opcjonalne:** 
  - `work_date`: Data pracy (opcjonalna).
- **Dostęp:** Tylko dla zalogowanych użytkowników.
- **Odpowiedź:** Zwraca listę raportów pracy dla zalogowanego użytkownika.

### Przydziały użytkowników do projektów
#### Przypisanie użytkownika do projektu
- **Endpoint:** `POST /user_projects`
- **Dane wymagane:** 
  - `user_id`: ID użytkownika.
  - `project_id`: ID projektu.
- **Dostęp:** Tylko dla użytkowników z rolą admin lub HR.
- **Odpowiedź:** Zwraca dane nowego przypisania.

#### Odczyt przypisań
- **Endpoint:** `GET /user_projects`
- **Dane opcjonalne:** 
  - `user_id`: ID użytkownika (opcjonalne).
  - `project_id`: ID projektu (opcjonalne).
- **Dostęp:** Tylko dla użytkowników z rolą admin lub HR.
- **Odpowiedź:** Zwraca listę przypisań.

## Inne informacje
- Aplikacja korzysta z bazy danych PostgreSQL, której konfiguracja znajduje się w pliku `database.py`.
- Używane są tokeny JWT do autoryzacji użytkowników.
- Wszelkie operacje na bazie danych są realizowane za pomocą SQLAlchemy.
