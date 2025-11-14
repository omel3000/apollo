# Schemat bazy danych z opisami

## Typy ENUM

### timetype
Typ wyliczeniowy określający sposób rejestrowania czasu pracy:
- `constant` – stała ilość czasu (godziny + minuty)
- `from_to` – zakres czasowy (od - do)

## 1. Tabela: users (użytkownicy)

- `user_id` (PK, SERIAL) – unikalny identyfikator użytkownika  
- `first_name` (VARCHAR(100), NOT NULL) – imię  
- `last_name` (VARCHAR(100), NOT NULL) – nazwisko  
- `email` (VARCHAR(255), NOT NULL, UNIQUE) – adres email (unikalny)  
- `phone_number` (VARCHAR(20)) – numer telefonu  
- `password_hash` (VARCHAR(255), NOT NULL) – hash hasła (dla bezpieczeństwa)  
- `role` (VARCHAR(50), NOT NULL) – rola użytkownika (np. worker, hr, admin)  
- `registration_date` (TIMESTAMP, domyślnie CURRENT_TIMESTAMP) – data rejestracji konta  
- `account_status` (VARCHAR(50), domyślnie 'aktywny') – status konta (np. aktywny, zablokowany)  
- `password_reset_token` (VARCHAR(255)) – opcjonalny token do resetu hasła  

## 2. Tabela: messages (komunikaty wyświetlane na stronie)

- `message_id` (PK, SERIAL) – unikalny identyfikator komunikatu  
- `title` (VARCHAR(255), NOT NULL) – tytuł komunikatu  
- `content` (TEXT, NOT NULL) – treść komunikatu  
- `created_at` (TIMESTAMP, domyślnie CURRENT_TIMESTAMP) – data utworzenia  
- `is_active` (BOOLEAN, domyślnie TRUE) – czy komunikat jest aktywny (widoczny)  

## 3. Tabela: projects (projekty)

- `project_id` (PK, SERIAL) – unikalny identyfikator projektu  
- `project_name` (VARCHAR(255), NOT NULL) – nazwa projektu  
- `description` (TEXT) – opis projektu (opcjonalnie)  
- `owner_user_id` (FK, INTEGER, NOT NULL) – ID użytkownika (z users), który zarządza projektem  
- `status` (VARCHAR(50), domyślnie 'aktywny') – status projektu (np. aktywny, zakończony)  
- `created_by_user_id` (FK, INTEGER, NOT NULL) – ID użytkownika, który utworzył projekt  
- `created_at` (TIMESTAMP WITH TIME ZONE, domyślnie NOW()) – data i czas utworzenia projektu  
- `time_type` (timetype, NOT NULL, domyślnie 'constant') – sposób rejestrowania czasu pracy w projekcie

**Klucze obce:**
- `owner_user_id` → `users.user_id` (fk_owner)
- `created_by_user_id` → `users.user_id` (fk_created_by_user)

## 4. Tabela: user_projects (przydział projektów do użytkowników)  
*(tabela łącznikowa obsługująca relację wielu do wielu)*

- `user_project_id` (PK, SERIAL) – unikalny identyfikator wpisu  
- `user_id` (FK, INTEGER, NOT NULL) – ID użytkownika  
- `project_id` (FK, INTEGER, NOT NULL) – ID projektu  
- `assigned_at` (TIMESTAMP, domyślnie CURRENT_TIMESTAMP) – data przypisania do projektu  

**Klucze obce:**
- `user_id` → `users.user_id` (fk_user)
- `project_id` → `projects.project_id` (fk_project)

**Ograniczenia:**
- `uc_user_project` – UNIQUE(user_id, project_id) – zapobiega duplikacji przypisań

## 5. Tabela: work_reports (raporty przepracowanych godzin)

- `report_id` (PK, SERIAL) – unikalny identyfikator raportu  
- `user_id` (FK, INTEGER, NOT NULL) – ID pracownika (z users)  
- `project_id` (FK, INTEGER, NOT NULL) – ID projektu (z projects)  
- `work_date` (DATE, NOT NULL) – data pracy  
- `hours_spent` (NUMERIC(5,2), NOT NULL, domyślnie 0) – liczba przepracowanych godzin  
- `minutes_spent` (INTEGER, NOT NULL, domyślnie 0) – liczba przepracowanych minut  
- `description` (TEXT) – opis wykonanych prac  
- `time_from` (TIME) – godzina rozpoczęcia pracy (dla time_type='from_to')  
- `time_to` (TIME) – godzina zakończenia pracy (dla time_type='from_to')  
- `created_at` (TIMESTAMP, domyślnie CURRENT_TIMESTAMP) – data dodania raportu  

**Klucze obce:**
- `user_id` → `users.user_id` (fk_report_user)
- `project_id` → `projects.project_id` (fk_report_project)

