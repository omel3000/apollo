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
| PUT | `/users/{user_id}` | Edycja danych użytkownika | ❌ | ✅* | ✅ | ❌ |
| DELETE | `/users/{user_id}` | Usuwanie użytkownika | ❌ | ✅* | ✅ | ❌ |
| POST | `/users/monthly_active_users` | Użytkownicy z czasem w miesiącu (z sumą) | ❌ | ✅ | ✅ | ❌ |
| POST | `/users/monthly_projects` | Projekty użytkownika w miesiącu (z sumą) | ❌ | ✅ | ✅ | ❌ |
| POST | `/users/user_project_detailed` | Szczegóły dni użytkownika w projekcie w miesiącu | ❌ | ✅ | ✅ | ❌ |
| **PROJEKTY** |||||||
| POST | `/projects` | Tworzenie nowego projektu | ❌ | ✅ | ✅ | ❌ |
| GET | `/projects` | Odczyt wszystkich projektów | ❌ | ✅ | ✅ | ❌ |
| PUT | `/projects/{project_id}` | Aktualizacja projektu | ❌ | ✅ | ✅ | ❌ |
| POST | `/projects/monthly_summary` | Suma miesięczna czasu dla projektu | ❌ | ✅ | ✅ | ❌ |
| POST | `/projects/monthly_summary_with_users` | Miesięczna suma + lista użytkowników | ❌ | ✅ | ✅ | ❌ |
| POST | `/projects/user_detailed_report` | Szczegóły dni użytkownika w projekcie | ❌ | ✅ | ✅ | ❌ |
| **KOMUNIKATY** |||||||
| GET | `/messages` | Odczyt aktywnych komunikatów | ✅ | ✅ | ✅ | ❌ |
| POST | `/messages` | Tworzenie nowego komunikatu | ❌ | ❌ | ✅ | ❌ |
| **RAPORTY PRACY** |||||||
| POST | `/work_reports` | Dodawanie nowego raportu pracy | ✅ | ✅ | ✅ | ❌ |
| GET | `/work_reports` | Odczyt raportów pracy | ✅* | ✅ | ✅ | ❌ |
| PUT | `/work_reports/{report_id}` | Aktualizacja raportu pracy | ✅* | ✅ | ✅ | ❌ |
| DELETE | `/work_reports/{report_id}` | Usuwanie raportu pracy | ✅* | ✅ | ✅ | ❌ |
| POST | `/work_reports/monthly_summary` | Miesięczne podsumowanie (dla siebie) | ✅* | ✅ | ✅ | ❌ |
| **PRZYDZIAŁY UŻYTKOWNIKÓW DO PROJEKTÓW** |||||||
| POST | `/user_projects` | Przypisanie użytkownika do projektu | ❌ | ✅ | ✅ | ❌ |
| GET | `/user_projects` | Odczyt przypisań użytkowników | ❌ | ✅ | ✅ | ❌ |
| GET | `/user_projects/assigned_users/{project_id}` | Lista użytkowników przypisanych do projektu | ❌ | ✅ | ✅ | ❌ |

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