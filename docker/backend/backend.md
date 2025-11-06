# backend/README-backend.md

## Struktura projektu backend

```
backend/
├── models/ # Modele danych (Mongoose schemas)
│   ├── User.js
│   ├── Project.js
│   ├── Member.js
│   └── Document.js
├── routes/ # Definicje endpointów API
│   ├── auth.js
│   ├── users.js
│   ├── projects.js
│   ├── members.js
│   └── documents.js
├── middleware/ # Middleware (autoryzacja, walidacja)
│   └── auth.js
├── uploads/ # Przechowywanie uploadowanych plików
└── server.js # Punkt wejścia aplikacji
```

## Instalacja i uruchomienie

### Docker

Instrukcje dotyczące uruchomienia aplikacji w kontenerze Docker.

## Autoryzacja i role

### Role użytkowników

System rozróżnia trzy role użytkowników:

- admin - Administrator systemu
  - Pełny dostęp do wszystkich zasobów
  - Zarządzanie wszystkimi projektami i użytkownikami
- manager - Kierownik projektu
  - Zarządzanie własnymi projektami
  - Dodawanie/usuwanie członków zespołu
  - Zarządzanie dokumentami projektu
- user - Zwykły użytkownik
  - Dostęp tylko do projektów, do których został dodany
  - Przeglądanie dokumentów
  - Edycja własnego profilu

### Mechanizm autoryzacji

- Wszystkie chronione endpointy wymagają nagłówka: Authorization: Bearer <token>
- Token JWT jest generowany podczas logowania
- Token zawiera: userId, email, role
- Ważność tokenu: 24 godziny

## API Endpoints

### Autentykacja

#### POST /api/auth/register

- Rejestracja nowego użytkownika.
- Dostęp: Publiczny
- Body (wymagane):
- Body (opcjonalne):
- Odpowiedź (201):
- Błędy:
  - 400: Użytkownik już istnieje
  - 500: Błąd serwera

#### POST /api/auth/login

- Logowanie użytkownika.
- Dostęp: Publiczny
- Body (wymagane):
- Odpowiedź (200):
- Błędy:
  - 400: Nieprawidłowe dane logowania
  - 500: Błąd serwera

### Użytkownicy

#### GET /api/users

- Pobiera listę wszystkich użytkowników.
- Dostęp: Wymaga autoryzacji (admin)
- Headers:
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień (nie admin)
  - 500: Błąd serwera

#### GET /api/users/me

- Pobiera dane zalogowanego użytkownika.
- Dostęp: Wymaga autoryzacji
- Headers:
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 404: Użytkownik nie znaleziony
  - 500: Błąd serwera

#### GET /api/users/:id

- Pobiera dane użytkownika o podanym ID.
- Dostęp: Wymaga autoryzacji (admin lub własne dane)
- Headers:
- Parametry URL:
  - id - ID użytkownika
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 404: Użytkownik nie znaleziony
  - 500: Błąd serwera

#### PUT /api/users/:id

- Aktualizuje dane użytkownika.
- Dostęp: Wymaga autoryzacji (admin lub własne dane)
- Headers:
- Parametry URL:
  - id - ID użytkownika
- Body (wszystkie opcjonalne):
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 404: Użytkownik nie znaleziony
  - 500: Błąd serwera

#### DELETE /api/users/:id

- Usuwa użytkownika.
- Dostęp: Wymaga autoryzacji (admin)
- Headers:
- Parametry URL:
  - id - ID użytkownika
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 404: Użytkownik nie znaleziony
  - 500: Błąd serwera

### Projekty

#### GET /api/projects

- Pobiera listę projektów.
- Dostęp: Wymaga autoryzacji
- Headers:
- Logika dostępu:
  - Admin: Wszystkie projekty
  - Manager: Projekty utworzone przez siebie
  - User: Projekty, do których został dodany jako członek
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 500: Błąd serwera

#### GET /api/projects/:id

- Pobiera szczegóły projektu.
- Dostęp: Wymaga autoryzacji (admin, twórca projektu lub członek)
- Headers:
- Parametry URL:
  - id - ID projektu
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak dostępu do projektu
  - 404: Projekt nie znaleziony
  - 500: Błąd serwera

#### POST /api/projects

- Tworzy nowy projekt.
- Dostęp: Wymaga autoryzacji (admin lub manager)
- Headers:
- Body (wymagane):
- Body (opcjonalne):
- Dostępne statusy:
  - active - Aktywny
  - completed - Zakończony
  - archived - Zarchiwizowany
- Odpowiedź (201):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 500: Błąd serwera

#### PUT /api/projects/:id

- Aktualizuje projekt.
- Dostęp: Wymaga autoryzacji (admin lub twórca projektu)
- Headers:
- Parametry URL:
  - id - ID projektu
- Body (wszystkie opcjonalne):
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 404: Projekt nie znaleziony
  - 500: Błąd serwera

#### DELETE /api/projects/:id

- Usuwa projekt.
- Dostęp: Wymaga autoryzacji (admin lub twórca projektu)
- Headers:
- Parametry URL:
  - id - ID projektu
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 404: Projekt nie znaleziony
  - 500: Błąd serwera

### Członkowie projektu

#### GET /api/members/:projectId

- Pobiera listę członków projektu.
- Dostęp: Wymaga autoryzacji (admin, twórca projektu lub członek)
- Headers:
- Parametry URL:
  - projectId - ID projektu
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak dostępu do projektu
  - 500: Błąd serwera

#### POST /api/members/:projectId

- Dodaje członka do projektu.
- Dostęp: Wymaga autoryzacji (admin lub twórca projektu)
- Headers:
- Parametry URL:
  - projectId - ID projektu
- Body (wymagane):
- Body (opcjonalne):
- Dostępne role członków:
  - member - Członek
  - developer - Deweloper
  - designer - Designer
  - tester - Tester
- Odpowiedź (201):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 404: Projekt lub użytkownik nie znaleziony
  - 500: Błąd serwera

#### PUT /api/members/:projectId/:memberId

- Aktualizuje rolę członka projektu.
- Dostęp: Wymaga autoryzacji (admin lub twórca projektu)
- Headers:
- Parametry URL:
  - projectId - ID projektu
  - memberId - ID członka (wpis w kolekcji members)
- Body (wymagane):
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 404: Członek nie znaleziony
  - 500: Błąd serwera

#### DELETE /api/members/:projectId/:memberId

- Usuwa członka z projektu.
- Dostęp: Wymaga autoryzacji (admin lub twórca projektu)
- Headers:
- Parametry URL:
  - projectId - ID projektu
  - memberId - ID członka (wpis w kolekcji members)
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 404: Członek nie znaleziony
  - 500: Błąd serwera

### Dokumenty

#### GET /api/documents/:projectId

- Pobiera listę dokumentów projektu.
- Dostęp: Wymaga autoryzacji (admin, twórca projektu lub członek)
- Headers:
- Parametry URL:
  - projectId - ID projektu
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak dostępu do projektu
  - 500: Błąd serwera

#### GET /api/documents/:projectId/:documentId

- Pobiera szczegóły dokumentu.
- Dostęp: Wymaga autoryzacji (admin, twórca projektu lub członek)
- Headers:
- Parametry URL:
  - projectId - ID projektu
  - documentId - ID dokumentu
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak dostępu
  - 404: Dokument nie znaleziony
  - 500: Błąd serwera

#### POST /api/documents/:projectId

- Uploaduje nowy dokument do projektu.
- Dostęp: Wymaga autoryzacji (admin, twórca projektu lub członek)
- Headers:
- Parametry URL:
  - projectId - ID projektu
- Form Data (wymagane):
  - file - Plik do uploadu
- Form Data (opcjonalne):
  - title - Tytuł dokumentu (domyślnie: nazwa pliku)
  - description - Opis dokumentu
- Maksymalny rozmiar pliku: 10MB
- Dozwolone typy plików:
  - PDF (.pdf)
  - Word (.doc, .docx)
  - Excel (.xls, .xlsx)
  - Obrazy (.jpg, .jpeg, .png, .gif)
  - Tekst (.txt)
- Odpowiedź (201):
- Błędy:
  - 400: Brak pliku lub nieprawidłowy typ
  - 401: Brak autoryzacji
  - 403: Brak dostępu do projektu
  - 413: Plik za duży
  - 500: Błąd serwera

#### GET /api/documents/:projectId/:documentId/download

- Pobiera (downloaduje) plik dokumentu.
- Dostęp: Wymaga autoryzacji (admin, twórca projektu lub członek)
- Headers:
- Parametry URL:
  - projectId - ID projektu
  - documentId - ID dokumentu
- Odpowiedź (200):
- Plik do pobrania z odpowiednimi nagłówkami:
  - Content-Type: typ MIME pliku
  - Content-Disposition: attachment; filename="nazwa_pliku.ext"
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak dostępu
  - 404: Dokument lub plik nie znaleziony
  - 500: Błąd serwera

#### PUT /api/documents/:projectId/:documentId

- Aktualizuje metadane dokumentu.
- Dostęp: Wymaga autoryzacji (admin, twórca projektu lub uploader dokumentu)
- Headers:
- Parametry URL:
  - projectId - ID projektu
  - documentId - ID dokumentu
- Body (wszystkie opcjonalne):
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 404: Dokument nie znaleziony
  - 500: Błąd serwera

#### DELETE /api/documents/:projectId/:documentId

- Usuwa dokument.
- Dostęp: Wymaga autoryzacji (admin, twórca projektu lub uploader dokumentu)
- Headers:
- Parametry URL:
  - projectId - ID projektu
  - documentId - ID dokumentu
- Odpowiedź (200):
- Błędy:
  - 401: Brak autoryzacji
  - 403: Brak uprawnień
  - 404: Dokument nie znaleziony
  - 500: Błąd serwera

## Modele danych

- User (Użytkownik)
- Project (Projekt)
- Member (Członek projektu)
- Document (Dokument)

## Obsługa błędów

### Kody statusów HTTP

- 200 - OK (sukces)
- 201 - Created (utworzono zasób)
- 400 - Bad Request (nieprawidłowe dane)
- 401 - Unauthorized (brak autoryzacji)
- 403 - Forbidden (brak uprawnień)
- 404 - Not Found (zasób nie znaleziony)
- 413 - Payload Too Large (plik za duży)
- 500 - Internal Server Error (błąd serwera)

### Format odpowiedzi błędu

## Bezpieczeństwo

### Hashowanie haseł

- Wszystkie hasła są hashowane przy użyciu bcrypt z salt rounds = 10
- Hasła nigdy nie są zwracane w odpowiedziach API

### JWT Tokens

- Tokeny wygasają po 24 godzinach
- Token zawiera minimalne dane: userId, email, role
- Tokeny są podpisywane za pomocą JWT_SECRET

### CORS

- Skonfigurowany dla wszystkich origins w trybie deweloperskim
- W produkcji należy ograniczyć do konkretnych domen

## Walidacja danych

- Wszystkie dane wejściowe są walidowane
- Email musi być prawidłowym adresem
- Hasło musi mieć minimum określoną długość

## Upload plików

- Maksymalny rozmiar: 10MB
- Tylko określone typy MIME są dozwolone
- Nazwy plików są sanityzowane i zawierają timestamp

## Zmienne środowiskowe

| Zmienna    | Opis                      | Domyślna wartość                      |
|------------|---------------------------|-------------------------------------|
| PORT       | Port serwera              | 5000                                |
| MONGODB_URI| URI bazy MongoDB          | mongodb://mongo:27017/apollo        |
| JWT_SECRET | Klucz do podpisywania JWT | - (wymagane)                        |
| NODE_ENV   | Środowisko                | development                        |

## Rozwój i testowanie

- Logi
  - W trybie deweloperskim wszystkie żądania są logowane w konsoli.
- Przykładowe dane
  - Możesz utworzyć przykładowe dane za pomocą skryptu seed (jeśli dostępny).
- Testowanie API
  - Zalecane narzędzia: Postman, Insomnia, curl, Thunder Client (VSCode extension)

## Licencja

- Proprietary - Apollo Project by Omlet