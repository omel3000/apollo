# Integracja Apollo z Google Calendar

## Cel dokumentu

Ten dokument opisuje krok po kroku, jak wdrożyć w Apollo integrację z Google Calendar w wariancie pełnym (`wariant B`), czyli z użyciem `Google OAuth 2.0` i `Google Calendar API`.

Założenie biznesowe jest następujące:
- każdy użytkownik może połączyć swoje konto Google z Apollo,
- użytkownik może jednym kliknięciem zsynchronizować cały wybrany miesiąc z grafiku miesięcznego do swojego Google Calendar,
- synchronizacja ma unikać duplikatów,
- w kolejnych etapach synchronizacja ma umieć aktualizować i usuwać wydarzenia po zmianach w grafiku.

Dokument jest napisany tak, aby:
- można było go wrzucić do repozytorium GitHub jako plan wdrożenia,
- można było łatwo wrócić do niego w kolejnych sesjach i kontynuować implementację bez gubienia kontekstu.

---

## 1. Czy to jest możliwe?

Tak, integracja jest możliwa i jest to typowy scenariusz dla aplikacji webowej.

Docelowy przepływ działania:
1. użytkownik klika `Połącz z Google`,
2. loguje się do Google i wyraża zgodę na dostęp do kalendarza,
3. Apollo zapisuje połączenie z kontem Google,
4. użytkownik klika `Synchronizuj miesiąc`,
5. Apollo tworzy lub aktualizuje wydarzenia w kalendarzu Google użytkownika.

Najbezpieczniejszy i najbardziej poprawny model techniczny to:
- synchronizacja `jednokierunkowa`: `Apollo -> Google Calendar`,
- autoryzacja przez `OAuth 2.0 per user`,
- osobny kalendarz Google tworzony dla Apollo, zamiast wrzucania wpisów do głównego kalendarza użytkownika.

---

## 2. Czy to jest płatne?

W praktyce najczęściej nie.

Dla typowego użycia biznesowego na poziomie aplikacji do grafiku pracowników:
- samo korzystanie z `Google Calendar API` zwykle mieści się w darmowych limitach,
- potrzebny jest projekt w `Google Cloud Console`,
- większym kosztem jest konfiguracja, bezpieczeństwo i utrzymanie integracji, a nie samo API.

Trzeba jednak pamiętać, że mogą pojawić się koszty pośrednie:
- konfiguracja projektu Google Cloud,
- przygotowanie ekranu zgody OAuth,
- ewentualna weryfikacja aplikacji przez Google,
- utrzymanie polityki prywatności i poprawnej obsługi danych użytkownika.

---

## 3. Model działania rekomendowany dla Apollo

### Rekomendacja

Najlepiej wdrożyć to w takiej postaci:
- każdy użytkownik łączy własne konto Google,
- synchronizowany jest tylko jego własny grafik,
- eventy są zapisywane do osobnego kalendarza, np. `Apollo`,
- synchronizacja działa dla wybranego miesiąca,
- system zapisuje mapowanie `wpis grafiku -> event Google`, żeby uniknąć duplikatów i umożliwić aktualizacje.

### Dlaczego osobny kalendarz `Apollo`?

To jest najwygodniejsze rozwiązanie, ponieważ:
- nie miesza danych służbowych z prywatnymi wydarzeniami użytkownika,
- łatwiej sprzątać wydarzenia po odłączeniu integracji,
- łatwiej aktualizować i usuwać eventy,
- użytkownik może łatwo ukryć cały kalendarz Apollo w Google Calendar jednym kliknięciem.

---

## 4. Wiele firm a Google Cloud

### Czy jedno konto Google Cloud wystarczy?

Tak, w większości przypadków jedno konto / jeden projekt Google Cloud wystarczy.

To jest typowy model dla aplikacji SaaS:
- Apollo ma jeden wspólny projekt w Google Cloud,
- wszyscy użytkownicy z różnych firm autoryzują tę samą aplikację OAuth,
- każdy użytkownik ma osobny token i osobne połączenie zapisane w bazie Apollo,
- dane są rozdzielone po użytkownikach i po firmach po stronie Apollo.

### Kiedy jedno konto jest dobrym wyborem?

Jedno konto / jeden projekt Google Cloud jest dobrym rozwiązaniem, gdy:
- Apollo jest jednym produktem dla wielu klientów,
- branding aplikacji może być wspólny,
- chcesz mieć jedną konfigurację OAuth,
- chcesz mieć jedną weryfikację Google,
- utrzymujesz jedną wspólną infrastrukturę.

### Kiedy rozważyć osobne projekty Google Cloud dla firm?

Osobne projekty warto rozważyć tylko wtedy, gdy:
- konkretna firma wymaga pełnej izolacji integracji,
- klient chce zarządzać własnymi poświadczeniami Google,
- wymagany jest osobny branding ekranu zgody,
- występują wymagania prawne, compliance lub kontraktowe,
- klient ma własną infrastrukturę i chce sam utrzymywać integrację.

### Co ustawić w Google OAuth przy wielu firmach?

Jeżeli Apollo ma obsługiwać użytkowników z więcej niż jednej firmy, aplikacja OAuth powinna być ustawiona jako:
- `External`

Nie jako:
- `Internal`

`Internal` działa tylko dla użytkowników z jednej organizacji Google Workspace.

---

## 5. Zakres MVP

### MVP rekomendowane

Na pierwszy etap warto zrobić:
- połączenie konta Google użytkownika,
- utworzenie osobnego kalendarza `Apollo`,
- ręczną synchronizację wybranego miesiąca,
- tworzenie eventów dla wszystkich wpisów grafiku z danego miesiąca,
- aktualizację już istniejących eventów,
- usuwanie eventów, które odpowiadają wpisom usuniętym z grafiku.

### Czego nie robić na start?

Na start nie warto robić:
- synchronizacji dwukierunkowej `Google -> Apollo`,
- webhooków z Google,
- automatycznej synchronizacji po każdej zmianie grafiku w czasie rzeczywistym,
- zaawansowanych opcji wyboru wielu kalendarzy.

---

## 6. Krok po kroku — wdrożenie

## Krok 1. Utworzenie projektu Google Cloud

1. Wejdź do `Google Cloud Console`.
2. Utwórz nowy projekt, np. `Apollo Calendar Integration`.
3. Włącz `Google Calendar API`.
4. Skonfiguruj `OAuth consent screen`.
5. Ustaw typ aplikacji jako `External`.
6. Uzupełnij podstawowe dane:
   - nazwa aplikacji,
   - adres e-mail wsparcia,
   - domena aplikacji,
   - link do polityki prywatności,
   - opcjonalnie link do regulaminu.
7. Utwórz `OAuth 2.0 Client ID` typu `Web application`.
8. Dodaj `Authorized redirect URIs`, np.:
   - `http://localhost:8000/integrations/google/callback`
   - `https://twoja-domena/integrations/google/callback`

### Rezultat

Po tym kroku powinieneś mieć:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- gotowy projekt Google Cloud z włączonym `Google Calendar API`

---

## Krok 2. Ustalenie zakresów OAuth

Minimalnie potrzebne będą scope'y:
- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/calendar.events`

Jeżeli Apollo ma tworzyć osobny kalendarz `Apollo`, można rozważyć też:
- `https://www.googleapis.com/auth/calendar`

### Rekomendacja

Na start:
- jeżeli chcesz tworzyć osobny kalendarz automatycznie, użyj zakresu `calendar`,
- jeżeli chcesz ograniczyć uprawnienia maksymalnie, możesz pracować tylko na `calendar.events`, ale wtedy trzeba dobrze przemyśleć, gdzie tworzyć wpisy.

---

## Krok 3. Dodanie konfiguracji do Apollo

W pliku środowiskowym trzeba dodać nowe zmienne, np. do [docker/.env](docker/.env):

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/integrations/google/callback
GOOGLE_OAUTH_SCOPES=openid,email,profile,https://www.googleapis.com/auth/calendar
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

### Uwagi
- `GOOGLE_TOKEN_ENCRYPTION_KEY` służy do szyfrowania tokenów użytkowników przed zapisem do bazy.
- Klucze nie powinny być hardcodowane w kodzie.
- Kluczy i sekretów nie należy commitować do repozytorium.

---

## Krok 4. Zmiana modelu danych

W Apollo nie ma migracji Alembic, więc trzeba dodać nowe modele i ręcznie dopilnować schematu bazy, jeśli baza już istnieje.

### Tabela 1: połączenie użytkownika z Google

Proponowana tabela, np. `google_calendar_connections`:
- `google_connection_id`
- `user_id`
- `google_email`
- `encrypted_refresh_token`
- `scope`
- `calendar_id`
- `calendar_summary`
- `connected_at`
- `last_sync_at`
- `is_active`

### Tabela 2: mapowanie wpisów grafiku do eventów Google

Proponowana tabela, np. `google_calendar_events`:
- `google_calendar_event_id`
- `user_id`
- `schedule_id`
- `calendar_id`
- `google_event_id`
- `synced_at`
- `last_payload_hash`

### Po co druga tabela?

Jest potrzebna, aby:
- nie tworzyć duplikatów,
- wiedzieć, który event Google odpowiada któremu wpisowi grafiku,
- aktualizować wydarzenia po zmianie grafiku,
- usuwać wydarzenia po usunięciu wpisu grafiku.

---

## Krok 5. Dodanie modeli i schematów w backendzie

Pliki do zmiany:
- [docker/backend/app/models.py](docker/backend/app/models.py)
- [docker/backend/app/schemas.py](docker/backend/app/schemas.py)

### Co dodać do modeli?

Nowe modele SQLAlchemy dla:
- połączenia z kontem Google,
- mapowania eventów Google do wpisów grafiku.

### Co dodać do schematów?

Przydatne schematy Pydantic, np.:
- `GoogleConnectionStatusRead`
- `GoogleSyncMonthRequest`
- `GoogleSyncMonthResult`
- `GoogleDisconnectRequest`

---

## Krok 6. Dodanie warstwy integracji Google po backendzie

Najczyściej będzie dodać osobny moduł, np.:
- `docker/backend/app/google_calendar_service.py`

Ten moduł powinien odpowiadać za:
- generowanie URL do OAuth,
- wymianę `authorization code` na tokeny,
- odświeżanie `access token`,
- tworzenie kalendarza `Apollo`,
- tworzenie eventów,
- aktualizowanie eventów,
- usuwanie eventów,
- pobieranie informacji o połączeniu.

### Dodatkowa rekomendacja

Warto od razu wydzielić funkcje pomocnicze:
- `encrypt_token()`
- `decrypt_token()`
- `build_google_event_from_schedule()`
- `hash_schedule_payload()`

---

## Krok 7. Dodanie endpointów FastAPI

Najlepiej dodać nowy router, np.:
- `docker/backend/app/routers/google_calendar.py`

Następnie zarejestrować go w [docker/backend/app/main.py](docker/backend/app/main.py).

### Proponowane endpointy

- `GET /integrations/google/status`
- `GET /integrations/google/connect`
- `GET /integrations/google/callback`
- `POST /integrations/google/sync-month`
- `POST /integrations/google/disconnect`

### Co robi każdy endpoint?

#### `GET /integrations/google/status`
Zwraca informację:
- czy konto Google jest podłączone,
- z jakim adresem e-mail,
- jaki kalendarz Apollo został utworzony,
- kiedy była ostatnia synchronizacja.

#### `GET /integrations/google/connect`
- sprawdza zalogowanego użytkownika,
- generuje URL do OAuth Google,
- zwraca go frontendowi albo robi redirect.

#### `GET /integrations/google/callback`
- odbiera `code` i `state` z Google,
- wymienia `code` na tokeny,
- zapisuje połączenie użytkownika,
- tworzy kalendarz `Apollo` jeśli jeszcze nie istnieje.

#### `POST /integrations/google/sync-month`
Przyjmuje np.:
- `year`
- `month`

I wykonuje:
- pobranie grafiku użytkownika dla miesiąca,
- tworzenie lub aktualizację eventów,
- usunięcie nieaktualnych eventów,
- zwrócenie podsumowania synchronizacji.

#### `POST /integrations/google/disconnect`
- odłącza konto Google,
- opcjonalnie usuwa powiązane eventy z Google,
- dezaktywuje połączenie w bazie.

---

## Krok 8. Bezpieczna obsługa OAuth

### `state`
Przy autoryzacji trzeba bezpiecznie obsłużyć parametr `state`.

`state` powinien:
- być powiązany z użytkownikiem,
- mieć krótki czas ważności,
- być podpisany lub zapisany tymczasowo,
- chronić przed CSRF.

### Refresh token
`refresh_token` powinien być:
- zapisany w bazie w postaci zaszyfrowanej,
- odszyfrowywany tylko po stronie backendu,
- nigdy nie wysyłany do frontendu.

---

## Krok 9. Synchronizacja miesiąca — logika biznesowa

### Wejście
Użytkownik wybiera miesiąc w widoku grafiku miesięcznego i klika `Synchronizuj miesiąc`.

### Backend robi kolejno
1. sprawdza, czy użytkownik ma podłączone konto Google,
2. pobiera jego aktywne połączenie Google,
3. odświeża `access token`,
4. pobiera grafik użytkownika dla wskazanego miesiąca,
5. buduje docelową listę eventów Google,
6. porównuje ją z zapisanym mapowaniem eventów,
7. tworzy nowe eventy,
8. aktualizuje istniejące eventy,
9. usuwa eventy, których nie ma już w grafiku,
10. zapisuje wynik synchronizacji.

### Dlaczego warto używać `last_payload_hash`?

Dzięki temu można łatwo sprawdzić, czy wpis grafiku realnie się zmienił. Jeżeli hash się nie zmienił:
- nie trzeba robić update eventu w Google,
- zmniejsza się liczba requestów do API,
- synchronizacja jest szybsza i bezpieczniejsza.

---

## Krok 10. Jak budować event Google

Dla każdego wpisu grafiku należy zbudować event z:
- tytułem,
- datą i godziną,
- opisem,
- strefą czasową,
- prywatnym identyfikatorem Apollo.

### Przykładowy tytuł
- `Zmiana: Projekt X`
- `Urlop`
- `L4`
- `Inna zmiana`

### Przykładowy opis
- typ zmiany,
- nazwa projektu,
- godziny,
- informacja, że wpis został utworzony przez Apollo.

### Dodatkowa rekomendacja
Warto zapisać w `extendedProperties.private` eventu Google np.:
- `apollo_schedule_id`
- `apollo_user_id`

To ułatwia późniejsze odnajdywanie i diagnostykę.

---

## Krok 11. Frontend — gdzie dodać obsługę

Najbardziej naturalne miejsce to miesięczny widok grafiku.

Pliki, które najpewniej będą dotknięte:
- [docker/frontend/common/schedule-view/schedule-view.js](docker/frontend/common/schedule-view/schedule-view.js)
- [docker/frontend/common/schedule-view/schedule-view.css](docker/frontend/common/schedule-view/schedule-view.css)
- [docker/frontend/hr/schedule-view/index.html](docker/frontend/hr/schedule-view/index.html)
- [docker/frontend/worker/schedule-view/index.html](docker/frontend/worker/schedule-view/index.html)

### Co dodać do UI?

- status połączenia z Google,
- przycisk `Połącz z Google`,
- przycisk `Synchronizuj miesiąc`,
- przycisk `Odłącz konto`,
- komunikat o ostatniej synchronizacji,
- komunikaty sukcesu i błędu.

### UX rekomendowany

Jeśli konto nie jest połączone:
- pokaż `Połącz z Google`

Jeśli konto jest połączone:
- pokaż nazwę konta Google,
- pokaż `Synchronizuj miesiąc`,
- pokaż `Odłącz konto`

---

## Krok 12. Uprawnienia i bezpieczeństwo

### Zasada dostępu
Każdy użytkownik synchronizuje tylko własny kalendarz.

To oznacza:
- worker synchronizuje swój grafik,
- HR synchronizuje swój grafik,
- HR nie powinien synchronizować kalendarza innego użytkownika bez dodatkowego modelu zgód i delegacji.

### Dlaczego tak?

To upraszcza:
- zgodę OAuth,
- bezpieczeństwo,
- odpowiedzialność za dane,
- architekturę całego rozwiązania.

---

## Krok 13. Odłączanie integracji

Trzeba przewidzieć działanie `Odłącz konto Google`.

### Minimalna wersja
- oznaczenie połączenia jako nieaktywne,
- usunięcie lokalnych tokenów,
- pozostawienie już utworzonych eventów w Google.

### Lepsza wersja
Użytkownik dostaje wybór:
- `Odłącz tylko konto`
- `Odłącz konto i usuń wydarzenia Apollo z Google Calendar`

To jest najbardziej przejrzyste z punktu widzenia użytkownika.

---

## Krok 14. Testy wdrożeniowe

### Testy minimalne
1. Połączenie konta Google działa poprawnie.
2. Użytkownik widzi status połączenia.
3. Synchronizacja pustego miesiąca nie powoduje błędu.
4. Synchronizacja miesiąca z wpisami tworzy eventy.
5. Ponowna synchronizacja nie tworzy duplikatów.
6. Zmiana godziny wpisu w grafiku aktualizuje event.
7. Usunięcie wpisu z grafiku usuwa event z Google.
8. Odłączenie konta działa poprawnie.

### Dodatkowe testy
- cofnięcie zgody przez użytkownika w Google,
- wygaśnięcie tokena,
- błąd po stronie Google API,
- zmiana miesiąca na granicy czasu letniego / zimowego,
- obsługa różnych typów zmian (`normalna`, `urlop`, `L4`, `inne`).

---

## Krok 15. Kolejność wdrożenia w Apollo

### Etap 1 — przygotowanie backendu
- dodać modele połączenia Google i mapowania eventów,
- dodać konfigurację w `.env`,
- dodać warstwę serwisową integracji Google,
- dodać endpointy `status`, `connect`, `callback`, `disconnect`.

### Etap 2 — przygotowanie UI
- dodać sekcję integracji w widoku grafiku miesięcznego,
- pokazać status połączenia,
- dodać przycisk `Połącz z Google`.

### Etap 3 — pierwsza synchronizacja
- dodać endpoint `sync-month`,
- tworzyć eventy dla wpisów grafiku,
- tworzyć lub odnajdywać kalendarz `Apollo`.

### Etap 4 — pełna synchronizacja
- aktualizować istniejące eventy,
- usuwać eventy, których nie ma już w grafiku,
- zapisywać hash payloadu i czas ostatniej synchronizacji.

### Etap 5 — dopracowanie produkcyjne
- obsłużyć błędy i retry,
- dopracować UX,
- dodać logowanie zdarzeń integracji,
- przygotować dokumentację użytkownika końcowego.

---

## 7. Lista plików, które prawdopodobnie trzeba będzie zmienić

### Backend
- [docker/backend/app/models.py](docker/backend/app/models.py)
- [docker/backend/app/schemas.py](docker/backend/app/schemas.py)
- [docker/backend/app/crud.py](docker/backend/app/crud.py)
- [docker/backend/app/main.py](docker/backend/app/main.py)
- nowy plik, np. `docker/backend/app/google_calendar_service.py`
- nowy router, np. `docker/backend/app/routers/google_calendar.py`
- [docker/backend/ENDPOINT.md](docker/backend/ENDPOINT.md)
- [docker/backend/requirements.txt](docker/backend/requirements.txt)

### Frontend
- [docker/frontend/common/schedule-view/schedule-view.js](docker/frontend/common/schedule-view/schedule-view.js)
- [docker/frontend/common/schedule-view/schedule-view.css](docker/frontend/common/schedule-view/schedule-view.css)
- [docker/frontend/hr/schedule-view/index.html](docker/frontend/hr/schedule-view/index.html)
- [docker/frontend/worker/schedule-view/index.html](docker/frontend/worker/schedule-view/index.html)

### Konfiguracja
- [docker/.env](docker/.env)
- opcjonalnie [docker/.env.example](docker/.env.example)
- [docker/docker-compose.yml](docker/docker-compose.yml), jeśli zajdzie potrzeba przekazania nowych zmiennych do backendu

---

## 8. Sugerowany stack techniczny po stronie Pythona

Najwygodniej użyć jednej z tych opcji:
- oficjalne biblioteki Google do OAuth i Calendar API,
- albo bezpośrednie requesty HTTP, ale to zwykle jest mniej wygodne.

Rekomendacja:
- `google-auth`
- `google-auth-oauthlib`
- `google-api-python-client`
- biblioteka do szyfrowania, np. `cryptography`

---

## 9. Ryzyka i pułapki

### Techniczne
- błędna obsługa stref czasowych,
- duplikaty eventów przy ponownej synchronizacji,
- brak mapowania `schedule -> event`,
- przechowywanie tokenów bez szyfrowania,
- brak obsługi cofnięcia zgody przez użytkownika,
- ręczne zmiany eventów przez użytkownika bez jasnej polityki synchronizacji.

### Produktowe
- użytkownik może oczekiwać pełnej synchronizacji automatycznej,
- użytkownik może nie rozumieć różnicy między głównym kalendarzem a kalendarzem `Apollo`,
- niektóre firmy mogą wymagać własnej konfiguracji Google Cloud.

### Rekomendacja produktowa
Trzeba jasno komunikować użytkownikowi:
- że Apollo synchronizuje tylko jego własny grafik,
- do jakiego kalendarza trafiają wpisy,
- kiedy była ostatnia synchronizacja,
- że po zmianie grafiku warto wykonać synchronizację ponownie.

---

## 10. Decyzje rekomendowane na dziś

Na obecnym etapie rekomendowane decyzje dla Apollo są następujące:

1. Implementacja w wariancie `OAuth per user`.
2. Jeden wspólny projekt Google Cloud dla całego Apollo.
3. Typ aplikacji OAuth: `External`.
4. Osobny kalendarz Google `Apollo` dla każdego użytkownika.
5. Synchronizacja `jednokierunkowa` z Apollo do Google.
6. MVP obejmujące:
   - połączenie konta,
   - synchronizację miesiąca,
   - update istniejących eventów,
   - usuwanie nieaktualnych eventów.

---

## 11. Checklist wdrożeniowy

### Faza analizy
- [ ] Potwierdzić zakres MVP.
- [ ] Potwierdzić, że synchronizowany jest tylko własny grafik użytkownika.
- [ ] Potwierdzić użycie osobnego kalendarza `Apollo`.

### Faza Google Cloud
- [ ] Utworzyć projekt Google Cloud.
- [ ] Włączyć `Google Calendar API`.
- [ ] Skonfigurować `OAuth consent screen` jako `External`.
- [ ] Utworzyć `OAuth 2.0 Client ID`.
- [ ] Ustawić `redirect URI` dla local i production.

### Faza backend
- [ ] Dodać zmienne środowiskowe.
- [ ] Dodać modele SQLAlchemy.
- [ ] Dodać schematy Pydantic.
- [ ] Dodać serwis integracyjny Google.
- [ ] Dodać router FastAPI.
- [ ] Dodać szyfrowanie tokenów.
- [ ] Dodać logikę `sync-month`.
- [ ] Dodać mapowanie `schedule -> google_event`.

### Faza frontend
- [ ] Dodać sekcję integracji do widoku grafiku miesięcznego.
- [ ] Dodać `Połącz z Google`.
- [ ] Dodać `Synchronizuj miesiąc`.
- [ ] Dodać `Odłącz konto`.
- [ ] Dodać komunikaty statusu i błędów.

### Faza testów
- [ ] Przetestować OAuth.
- [ ] Przetestować pierwszą synchronizację.
- [ ] Przetestować ponowną synchronizację bez duplikatów.
- [ ] Przetestować aktualizację eventów.
- [ ] Przetestować usuwanie eventów.
- [ ] Przetestować odłączenie integracji.

---

## 12. Notatki robocze do kolejnych sesji i wdrożenia

Ta sekcja jest specjalnie przygotowana tak, aby łatwo było wrócić do tematu i kontynuować implementację.

### Kontekst projektu Apollo
- Backend: `FastAPI + SQLAlchemy + PostgreSQL`
- Frontend: `Vanilla JS/HTML/CSS`
- Brak Alembic — schemat bazy nie migruje się automatycznie.
- Najbardziej naturalny punkt wejścia po stronie UI to widok grafiku miesięcznego.
- Najbardziej naturalny punkt wejścia po stronie backendu to nowy router integracyjny i osobny serwis Google.

### Najważniejsze decyzje już ustalone
- Interesuje nas `wariant B`, nie eksport `.ics`.
- Synchronizacja ma działać z kontem Google użytkownika.
- Użytkownik ma móc jednym kliknięciem przenieść wybrany miesiąc do Google Calendar po wcześniejszym jednorazowym połączeniu konta.
- System może być używany przez więcej niż jedną firmę.
- Na dziś rekomendowany jest jeden wspólny projekt Google Cloud dla całego Apollo.

### Sugerowana kolejność implementacji w praktyce
1. Dodać modele i konfigurację `.env`.
2. Dodać router `google_calendar.py` i serwis `google_calendar_service.py`.
3. Zaimplementować `status`, `connect`, `callback`, `disconnect`.
4. Dodać UI do widoku grafiku miesięcznego.
5. Zaimplementować `sync-month`.
6. Dodać mapowanie eventów i obsługę aktualizacji/usuwania.

### Jeśli wracamy do tego w kolejnej sesji
Najlepiej zacząć od:
- przejrzenia [docker/backend/app/models.py](docker/backend/app/models.py),
- przejrzenia [docker/backend/app/main.py](docker/backend/app/main.py),
- przejrzenia [docker/frontend/common/schedule-view/schedule-view.js](docker/frontend/common/schedule-view/schedule-view.js),
- ustalenia finalnych nazw nowych tabel i endpointów.

### Minimalny cel kolejnej implementacyjnej sesji
- przygotować backendowy szkielet integracji Google,
- bez jeszcze pełnego UI i bez finalnej synchronizacji,
- ale z gotowymi modelami, konfiguracją i endpointem `status/connect/callback`.

---

## 13. Podsumowanie

Integracja Apollo z Google Calendar w wariancie pełnym jest możliwa i sensowna.

Najlepszy model dla tego projektu to:
- `OAuth 2.0 per user`,
- `Google Calendar API`,
- jeden projekt Google Cloud dla całego produktu,
- osobny kalendarz `Apollo` dla każdego użytkownika,
- synchronizacja własnego grafiku użytkownika,
- zapis mapowania między wpisami grafiku a eventami Google.

To rozwiązanie jest skalowalne, bezpieczne i dobrze pasuje do obecnej architektury Apollo.
