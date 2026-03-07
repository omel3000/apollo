# Endpointy API - Macierz uprawnień

## Legenda
- ✅ - Endpoint dostępny dla danej roli
- ❌ - Endpoint niedostępny dla danej roli
- 🔓 - Endpoint publiczny (bez autoryzacji)

---

## Wszystkie endpointy

| Metoda | Endpoint | Opis | User | HR | Admin | Publiczny |
|--------|----------|------|------|----|-------|-----------|
| **UŻYTKOWNICY** |||||||
| POST | `/users/login` | Logowanie użytkownika | 🔓 | 🔓 | 🔓 | 🔓 |
| POST | `/users/register` | Rejestracja nowego użytkownika | ❌ | ✅ | ✅ | ❌ |
| GET | `/users/` | Lista wszystkich użytkowników | ❌ | ✅ | ✅ | ❌ |
| GET | `/users/me` | Odczyt danych zalogowanego użytkownika | ✅ | ✅ | ✅ | ❌ |
| PUT | `/users/me/change-email` | Zmiana adresu email | ✅ | ✅ | ✅ | ❌ |
| PUT | `/users/me/change-password` | Zmiana hasła | ✅ | ✅ | ✅ | ❌ |
| PUT | `/users/{user_id}/password` | Reset hasła przez admin/HR | ❌ | ✅* | ✅ | ❌ |
| PUT | `/users/{user_id}` | Edycja danych użytkownika | ❌ | ✅* | ✅ | ❌ |
| DELETE | `/users/{user_id}` | Usuwanie użytkownika | ❌ | ✅* | ✅ | ❌ |
| POST | `/users/monthly_active_users` | Użytkownicy z czasem w miesiącu (z sumą) | ❌ | ✅ | ✅ | ❌ |
| POST | `/users/monthly_projects` | Projekty użytkownika w miesiącu (z sumą) | ❌ | ✅ | ✅ | ❌ |
| POST | `/users/user_project_detailed` | Szczegóły dni użytkownika w projekcie w miesiącu | ❌ | ✅ | ✅ | ❌ |
| **PROJEKTY** |||||||
| POST | `/projects` | Tworzenie nowego projektu | ❌ | ✅ | ✅ | ❌ |
| GET | `/projects` | Odczyt wszystkich projektów | ❌ | ✅ | ✅ | ❌ |
| PUT | `/projects/{project_id}` | Aktualizacja projektu | ❌ | ✅ | ✅ | ❌ |
| DELETE | `/projects/{project_id}` | Usunięcie projektu | ❌ | ✅ | ✅ | ❌ |
| POST | `/projects/monthly_summary` | Suma miesięczna czasu dla projektu | ❌ | ✅ | ✅ | ❌ |
| POST | `/projects/monthly_summary_with_users` | Miesięczna suma + lista użytkowników | ❌ | ✅ | ✅ | ❌ |
| POST | `/projects/user_detailed_report` | Szczegóły dni użytkownika w projekcie | ❌ | ✅ | ✅ | ❌ |
| **KOMUNIKATY** |||||||
| GET | `/messages` | Odczyt aktywnych komunikatów | ✅ | ✅ | ✅ | ❌ |
| GET | `/messages?include_inactive=true` | Odczyt wszystkich komunikatów (aktywnych i nieaktywnych) | ❌ | ✅ | ✅ | ❌ |
| POST | `/messages` | Tworzenie nowego komunikatu | ❌ | ✅ | ✅ | ❌ |
| PUT | `/messages/{message_id}` | Aktualizacja komunikatu | ❌ | ✅ | ✅ | ❌ |
| DELETE | `/messages/{message_id}` | Usunięcie komunikatu | ❌ | ✅ | ✅ | ❌ |
| **RAPORTY PRACY** |||||||
| POST | `/work_reports` | Dodawanie nowego raportu pracy | ✅ | ✅ | ✅ | ❌ |
| GET | `/work_reports` | Odczyt raportów pracy | ✅* | ✅ | ✅ | ❌ |
| PUT | `/work_reports/{report_id}` | Aktualizacja raportu pracy | ✅* | ✅ | ✅ | ❌ |
| DELETE | `/work_reports/{report_id}` | Usuwanie raportu pracy | ✅* | ✅ | ✅ | ❌ |
| POST | `/work_reports/{report_id}/submit` | Zgłoszenie raportu do akceptacji | ✅* | ✅ | ✅ | ❌ |
| POST | `/work_reports/{report_id}/review` | Akceptacja/odrzucenie raportu | ❌ | ✅ | ✅ | ❌ |
| POST | `/work_reports/review_queue` | Kolejka raportów oczekujących na decyzję | ❌ | ✅ | ✅ | ❌ |
| GET | `/work_reports/{report_id}/history` | Historia decyzji dla raportu | ✅* | ✅ | ✅ | ❌ |
| POST | `/work_reports/monthly_summary` | Miesięczne podsumowanie (dla siebie) | ✅* | ✅ | ✅ | ❌ |
| POST | `/work_reports/hr_monthly_overview` | Pełne podsumowanie miesiąca HR (wszyscy + projekty) | ❌ | ✅ | ✅ | ❌ |
| POST | `/work_reports/monthly_trend` | Trend czasu pracy (ostatnie N miesięcy) | ❌ | ✅ | ✅ | ❌ |
| **PRZYDZIAŁY UŻYTKOWNIKÓW DO PROJEKTÓW** |||||||
| POST | `/user_projects` | Przypisanie użytkownika do projektu | ❌ | ✅ | ✅ | ❌ |
| GET | `/user_projects` | Odczyt przypisań użytkowników | ❌ | ✅ | ✅ | ❌ |
| GET | `/user_projects/assigned_users/{project_id}` | Lista użytkowników przypisanych do projektu | ❌ | ✅ | ✅ | ❌ |
| DELETE | `/user_projects/{user_id}/{project_id}` | Usunięcie przypisania użytkownika do projektu | ❌ | ✅ | ✅ | ❌ |
| **DOSTĘPNOŚĆ** |||||||
| POST | `/availability/my_availability` | Dodanie własnej dostępności | ✅ | ✅ | ✅ | ❌ |
| GET | `/availability/my_availability` | Odczyt własnej dostępności (z filtrami) | ✅ | ✅ | ✅ | ❌ |
| GET | `/availability/my_availability/{date}` | Odczyt własnej dostępności dla daty | ✅ | ✅ | ✅ | ❌ |
| PUT | `/availability/my_availability/{date}` | Aktualizacja własnej dostępności | ✅ | ✅ | ✅ | ❌ |
| DELETE | `/availability/my_availability/{date}` | Usunięcie własnej dostępności | ✅ | ✅ | ✅ | ❌ |
| GET | `/availability/` | Odczyt dostępności wszystkich użytkowników (z filtrami) | ❌ | ✅ | ✅ | ❌ |
| GET | `/availability/{user_id}/{date}` | Odczyt dostępności użytkownika dla daty | ❌ | ✅ | ✅ | ❌ |
| **NIEOBECNOŚCI** |||||||
| POST | `/absences/my_absences` | Dodanie własnej nieobecności | ✅ | ✅ | ✅ | ❌ |
| GET | `/absences/my_absences` | Odczyt własnych nieobecności (z filtrami) | ✅ | ✅ | ✅ | ❌ |
| GET | `/absences/my_absences/{date}` | Odczyt szczegółów własnej nieobecności dla daty | ✅ | ✅ | ✅ | ❌ |
| PUT | `/absences/my_absences/{date}` | Aktualizacja własnej nieobecności dla daty | ✅ | ✅ | ✅ | ❌ |
| DELETE | `/absences/my_absences/{date}` | Usunięcie własnej nieobecności dla daty | ✅ | ✅ | ✅ | ❌ |
| GET | `/absences/` | Odczyt nieobecności wszystkich użytkowników (z filtrami) | ❌ | ✅ | ✅ | ❌ |
| GET | `/absences/{absence_id}` | Odczyt szczegółów nieobecności użytkownika | ❌ | ✅ | ✅ | ❌ |
| POST | `/absences/{absence_id}/submit` | Zgłoszenie nieobecności do akceptacji | ✅* | ✅* | ✅* | ❌ |
| POST | `/absences/{absence_id}/review` | Akceptacja/odrzucenie nieobecności | ❌ | ✅ | ✅ | ❌ |
| POST | `/absences/review_queue` | Kolejka nieobecności oczekujących na decyzję | ❌ | ✅ | ✅ | ❌ |
| GET | `/absences/{absence_id}/history` | Historia decyzji dla nieobecności | ✅* | ✅ | ✅ | ❌ |
| **GRAFIK** |||||||
| GET | `/schedule/day/{date}` | Grafik dla konkretnego dnia (wszyscy użytkownicy) | ✅ | ✅ | ✅ | ❌ |
| POST | `/schedule/month` | Grafik dla miesiąca (wszyscy użytkownicy) | ✅ | ✅ | ✅ | ❌ |
| GET | `/schedule/user/{user_id}` | Grafik użytkownika (z filtrami dat) | ✅ | ✅ | ✅ | ❌ |
| GET | `/schedule/` | Wszystkie wpisy grafiku (z filtrami) | ✅ | ✅ | ✅ | ❌ |
| POST | `/schedule/` | Dodanie wpisu do grafiku | ❌ | ✅ | ✅ | ❌ |
| GET | `/schedule/{schedule_id}` | Szczegóły wpisu grafiku | ❌ | ✅ | ✅ | ❌ |
| PUT | `/schedule/{schedule_id}` | Aktualizacja wpisu grafiku | ❌ | ✅ | ✅ | ❌ |
| DELETE | `/schedule/{schedule_id}` | Usunięcie wpisu grafiku | ❌ | ✅ | ✅ | ❌ |
| **OKRESY ROZLICZENIOWE** |||||||
| GET | `/periods/` | Lista okresów rozliczeniowych (opcjonalny filtr po roku) | ❌ | ✅ | ✅ | ❌ |
| GET | `/periods/{year}/{month}` | Szczegóły okresu rozliczeniowego | ❌ | ✅ | ✅ | ❌ |
| POST | `/periods/{year}/{month}` | Utworzenie okresu rozliczeniowego (jeśli nie istnieje) | ❌ | ✅ | ✅ | ❌ |
| PATCH | `/periods/{year}/{month}/notes` | Zapis lub wyczyszczenie notatki okresu | ❌ | ✅ | ✅ | ❌ |
| POST | `/periods/{year}/{month}/status` | Zmiana statusu okresu (zamykanie/otwieranie) | ❌ | ✅ | ✅ | ❌ |
| DELETE | `/periods/{year}/{month}` | Usunięcie okresu (tylko jeśli w miesiącu nie ma danych) | ❌ | ✅ | ✅ | ❌ |
| **LOGI AUDYTU** |||||||
| GET | `/audit_logs/` | Lista logów audytu z filtrowaniem i paginacją | ❌ | ✅ | ✅ | ❌ |
| GET | `/audit_logs/actions` | Lista dostępnych akcji (do filtrów na froncie) | ❌ | ✅ | ✅ | ❌ |
| GET | `/audit_logs/users` | Lista użytkowników pojawiających się w logach | ❌ | ✅ | ✅ | ❌ |

---

## Uwagi

- Normalizacja minut: w podsumowaniach minuty są przeliczane na godziny (np. 90 min = 1h 30min).
- Walidacje czasu pracy:
  - Jednorazowy wpis: 0 ≤ godziny ≤ 24, 0 ≤ minuty < 60, nie może być łącznie 0h 0m.
  - Suma dzienna (wszystkie raporty danego dnia) nie może przekroczyć 24h.
- Ograniczenia dla roli User:
  - GET/PUT/DELETE `/work_reports/{report_id}` – User może zarządzać tylko własnymi raportami.
  - POST `/work_reports/monthly_summary` – User widzi tylko swoje podsumowanie.
- Uprawnienia HR i Admin:
  - HR/Admin mogą przeglądać i zarządzać raportami wszystkich użytkowników.
  - HR/Admin mają dostęp do raportów projektowych i użytkowników (miesięczne sumy, listy aktywnych, szczegóły).
- Specjalne ograniczenia roli "admin":
  - Nadawanie roli "admin" przy rejestracji/edycji może wykonać tylko użytkownik z rolą "admin".
  - Edycję danych użytkownika z rolą "admin" może wykonać tylko "admin".
  - Usuwanie użytkownika z rolą "admin" może wykonać tylko "admin".
  - Reset hasła użytkownika z rolą "admin" może wykonać tylko "admin".
- Ograniczenia dla edycji własnego konta w zarządzaniu użytkownikami:
  - Nie można usunąć własnego konta.
  - Nie można zmienić własnej roli.
  - Nie można zmienić własnego statusu na inny niż aktywny.
  - Nie można resetować własnego hasła — do tego służy zakładka „Konto”.
- Dostępność:
  - Worker może dodawać, przeglądać, edytować i usuwać swoją dostępność (dostępny/niedostępny, przedziały czasowe).
  - HR/Admin mają dostęp do dostępności wszystkich użytkowników z filtrowaniem (user_id, zakres dat).
  - Walidacje: jeśli niedostępny, nie można podawać przedziału czasu; jeśli dostępny z czasem, time_from < time_to.
- Nieobecności:
  - Worker może dodawać, przeglądać, edytować i usuwać swoje nieobecności (urlop, L4, inne).
  - Endpointy worker dla pojedynczych nieobecności używają daty zamiast ID (GET/PUT/DELETE `/my_absences/{date}`) - wyszukują nieobecność która obejmuje podaną datę.
  - HR/Admin mają dostęp do nieobecności wszystkich użytkowników z filtrowaniem (user_id, typ, zakres dat).
  - Walidacje: date_from ≤ date_to, nieobecności nie mogą się nakładać (ten sam użytkownik nie może mieć dwóch nieobecności w tym samym dniu).
- Grafik:
  - **Odczyt grafiku** - dostępny dla wszystkich zalogowanych użytkowników (Worker, HR, Admin):
    - GET `/schedule/day/{date}` - widok dnia z wszystkimi zmianami wszystkich użytkowników
    - POST `/schedule/month` - widok miesiąca (parametry: month, year) - zwraca listę dni z przypisanymi zmianami
    - GET `/schedule/user/{user_id}` - grafik konkretnego użytkownika (można filtrować po datach)
    - GET `/schedule/` - wszystkie wpisy z filtrami (user_id, date_from, date_to, shift_type)
  - **Zarządzanie grafikiem** - dostępne tylko dla HR i Admin:
    - POST `/schedule/` - dodanie nowego wpisu grafiku
    - PUT/DELETE `/schedule/{schedule_id}` - edycja/usunięcie wpisu
  - **Typy zmian**: `normalna` (wymaga project_id), `urlop`, `L4`, `inne` (bez project_id)
  - **Walidacje**:
    - time_from < time_to
    - Zmiana 'normalna' wymaga project_id, pozostałe typy nie mogą mieć project_id
    - Zmiany tego samego użytkownika w tym samym dniu nie mogą się nakładać czasowo
  - **Format odpowiedzi**:
    - Wpisy zawierają informacje o użytkowniku (imię, nazwisko) i projekcie (nazwa)
    - Odpowiedzi miesięczne są pogrupowane po dniach
    - Czas w formacie HH:MM
- Akceptacja raportów i nieobecności:
  - Raporty pracy i nieobecności przechodzą przez statusy: `roboczy` → `oczekuje_na_akceptacje` → `zaakceptowany`/`odrzucony` → `zablokowany` (po zamknięciu okresu).
  - Użytkownicy mogą zgłaszać swoje wpisy do akceptacji (`/submit`) tylko wtedy, gdy okres rozliczeniowy jest otwarty.
  - HR/Admin przeglądają kolejkę oczekujących (`/review_queue`) i podejmują decyzje (`/review`). Odrzucenie wymaga komentarza.
  - Historia decyzji jest dostępna zarówno dla raportów, jak i nieobecności (`/{id}/history`).
- Okresy rozliczeniowe:
  - HR/Administrator zarządza statusem okresów (`/periods/{year}/{month}/status`) – zamykanie blokuje dalsze modyfikacje i automatycznie utrwala zaakceptowane wpisy.
  - Odblokowanie okresu automatycznie przywraca status `zaakceptowany`, co pozwala na korekty i ponowne zgłoszenie.
  - Usunięcie okresu jest możliwe tylko wtedy, gdy w danym miesiącu nie ma żadnych danych (raporty, nieobecności, grafik, dostępność).