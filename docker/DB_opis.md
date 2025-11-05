# Schemat bazy danych z opisami

## 1. Tabela: users (użytkownicy)

- `user_id` (PK) – unikalny identyfikator użytkownika  
- `first_name` – imię  
- `last_name` – nazwisko  
- `email` – adres email (unikalny)  
- `phone_number` – numer telefonu  
- `password_hash` – hash hasła (dla bezpieczeństwa)  
- `role` – rola użytkownika (np. user, HR, boss)  
- `registration_date` – data rejestracji konta  
- `account_status` – status konta (np. aktywny, zablokowany)  
- `password_reset_token` – opcjonalny token do resetu hasła  

## 2. Tabela: messages (komunikaty wyświetlane na stronie)

- `message_id` (PK) – unikalny identyfikator komunikatu  
- `title` – tytuł komunikatu  
- `content` – treść komunikatu  
- `created_at` – data utworzenia  
- `is_active` – czy komunikat jest aktywny (widoczny)  

## 3. Tabela: projects (projekty)

- `project_id` (PK) – unikalny identyfikator projektu  
- `project_name` – nazwa projektu  
- `description` – opis projektu (opcjonalnie)  
- `owner_user_id` (FK) – ID użytkownika (z users), który zarządza projektem  
- `status` – status projektu (np. aktywny, zakończony)
- `created_by_user_id` (FK, NOT NULL) – ID użytkownika, który utworzył projekt
- `created_at` (TIMESTAMP, domyślnie teraz) – data i czas utworzenia projektu


## 4. Tabela: user_projects (przydział projektów do użytkowników)  
*(tabela łącznikowa obsługująca relację wielu do wielu)*

- `user_project_id` (PK) – unikalny identyfikator wpisu  
- `user_id` (FK) – ID użytkownika  
- `project_id` (FK) – ID projektu  
- `assigned_at` – data przypisania do projektu  

## 5. Tabela: work_reports (raporty przepracowanych godzin)

- `report_id` (PK) – unikalny identyfikator raportu  
- `user_id` (FK) – ID pracownika (z users)  
- `project_id` (FK) – ID projektu (z projects)  
- `work_date` – data pracy  
- `hours_spent` – liczba przepracowanych godzin  
- `created_at` – data dodania raportu
- `minutes_spent` - liczba przepracowanych minut

