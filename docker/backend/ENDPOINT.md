# Endpointy API - Macierz uprawnień

## Legenda
- ✅ - Endpoint dostępny dla danej roli
- ❌ - Endpoint niedostępny dla danej roli
- 🔓 - Endpoint publiczny (bez autoryzacji)

---

## Wszystkie endpointy

| Metoda | Endpoint | Opis | User | HR | Admin | Publiczny |
|--------|----------|------|------|----|----|-----------|
| **UŻYTKOWNICY** |
| POST | `/users/login` | Logowanie użytkownika | 🔓 | 🔓 | 🔓 | 🔓 |
| POST | `/users/register` | Rejestracja nowego użytkownika | ❌ | ✅ | ✅ | ❌ |
| GET | `/users/` | Lista wszystkich użytkowników | ❌ | ✅ | ✅ | ❌ |
| GET | `/users/me` | Odczyt danych zalogowanego użytkownika | ✅ | ✅ | ✅ | ❌ |
| PUT | `/users/me/change-email` | Zmiana adresu email | ✅ | ✅ | ✅ | ❌ |
| PUT | `/users/me/change-password` | Zmiana hasła | ✅ | ✅ | ✅ | ❌ |
| DELETE | `/users/{user_id}` | Usuwanie użytkownika | ❌ | ✅ | ✅ | ❌ |
| **PROJEKTY** |
| POST | `/projects` | Tworzenie nowego projektu | ❌ | ✅ | ✅ | ❌ |
| GET | `/projects` | Odczyt wszystkich projektów | ❌ | ✅ | ✅ | ❌ |
| PUT | `/projects/{project_id}` | Aktualizacja projektu | ❌ | ✅ | ✅ | ❌ |
| **KOMUNIKATY** |
| GET | `/messages` | Odczyt aktywnych komunikatów | ✅ | ✅ | ✅ | ❌ |
| POST | `/messages` | Tworzenie nowego komunikatu | ❌ | ❌ | ✅ | ❌ |
| **RAPORTY PRACY** |
| POST | `/work_reports` | Dodawanie nowego raportu pracy | ✅ | ✅ | ✅ | ❌ |
| GET | `/work_reports` | Odczyt raportów pracy | ✅* | ✅ | ✅ | ❌ |
| PUT | `/work_reports/{report_id}` | Aktualizacja raportu pracy | ✅* | ✅ | ✅ | ❌ |
| DELETE | `/work_reports/{report_id}` | Usuwanie raportu pracy | ✅* | ✅ | ✅ | ❌ |
| POST | `/work_reports/monthly_summary` | Miesięczne podsumowanie raportów | ✅* | ✅ | ✅ | ❌ |
| **PRZYDZIAŁY UŻYTKOWNIKÓW DO PROJEKTÓW** |
| POST | `/user_projects` | Przypisanie użytkownika do projektu | ❌ | ✅ | ✅ | ❌ |
| GET | `/user_projects` | Odczyt przypisań użytkowników | ❌ | ✅ | ✅ | ❌ |

---

## Uwagi

**\* Ograniczenia dla roli User:**
- **GET /work_reports** - User widzi tylko własne raporty
- **PUT /work_reports/{report_id}** - User może edytować tylko własne raporty
- **DELETE /work_reports/{report_id}** - User może usuwać tylko własne raporty
- **POST /work_reports/monthly_summary** - User widzi tylko swoje podsumowanie

**Rozszerzone uprawnienia dla HR i Admin:**
- HR i Admin mogą przeglądać, edytować i usuwać raporty wszystkich użytkowników
- HR i Admin mogą zarządzać użytkownikami i projektami
- Tylko Admin może tworzyć komunikaty systemowe

---

## Role w systemie

| Rola | Opis |
|------|------|
| **User** | Zwykły użytkownik - może zarządzać swoimi raportami pracy i odczytywać komunikaty |
| **HR** | Human Resources - może zarządzać użytkownikami, projektami i wszystkimi raportami pracy |
| **Admin** | Administrator - pełne uprawnienia, dodatkowo może tworzyć komunikaty systemowe |