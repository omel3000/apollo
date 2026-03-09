# Konfiguracja integracji Google Calendar — instrukcja krok po kroku

Dokument opisuje wszystkie kroki wymagane do uruchomienia integracji Apollo z Google Calendar.  
Większość kroków wykonujesz **tylko raz** — przy pierwszym wdrożeniu.

---

## Wymagania wstępne

- Konto Google (dowolne — najlepiej służbowe lub dedykowane dla projektu)
- Uruchomiona aplikacja Apollo (Docker)
- Dostęp do pliku `docker/.env`

---

## Krok 1 — Utwórz projekt w Google Cloud Console

🔗 Link: https://console.cloud.google.com/projectcreate

1. Wejdź pod powyższy link.
2. W polu **Nazwa projektu** wpisz np. `Apollo Calendar Integration`.
3. Kliknij **Utwórz**.
4. Poczekaj kilka sekund — projekt zostanie wybrany automatycznie.

---

## Krok 2 — Włącz Google Calendar API

🔗 Link: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com

1. Upewnij się, że w górnym pasku widać nazwę Twojego projektu (`Apollo Calendar Integration`).
2. Kliknij niebieski przycisk **Włącz**.
3. Poczekaj na przekierowanie — API jest włączone.

---

## Krok 3 — Skonfiguruj ekran zgody OAuth

🔗 Link: https://console.cloud.google.com/apis/credentials/consent

1. Wybierz typ użytkownika: **Zewnętrzny** → kliknij **Utwórz**.
2. Wypełnij formularz na stronie **Informacje o aplikacji**:
   - **Nazwa aplikacji**: `Apollo`
   - **Adres e-mail pomocy technicznej**: Twój adres e-mail
   - **Dane kontaktowe dewelopera** (na dole): Twój adres e-mail
3. Kliknij **Zapisz i kontynuuj**.

### Strona „Zakresy"

4. Kliknij **Dodaj lub usuń zakresy**.
5. W polu wyszukiwania wpisz kolejno i zaznacz każdy zakres:
   - `openid`
   - `userinfo.email`
   - `userinfo.profile`
   - `calendar.events`
   - `calendar.calendars`
   - `calendar.calendarlist.readonly`
6. Kliknij **Aktualizuj** → **Zapisz i kontynuuj**.

### Strona „Użytkownicy testowi"

7. Kliknij **+ Add users**.
8. Wpisz adres e-mail konta Google, którym będziesz testować połączenie.
9. Kliknij **Dodaj** → **Zapisz i kontynuuj**.

10. Na stronie podsumowania kliknij **Wróć do pulpitu**.

---

## Krok 4 — Utwórz OAuth 2.0 Client ID

🔗 Link: https://console.cloud.google.com/apis/credentials

1. Kliknij **+ Utwórz dane logowania** (górny pasek).
2. Wybierz **Identyfikator klienta OAuth**.
3. W polu **Typ aplikacji** wybierz: **Aplikacja internetowa**.
4. W polu **Nazwa** wpisz: `Apollo`.
5. W sekcji **Autoryzowane identyfikatory URI przekierowania** kliknij **+ Dodaj identyfikator URI** i wpisz:
   ```
   http://localhost:8000/integrations/google/callback
   ```
   > Na produkcji dodaj też: `https://twoja-domena.pl/integrations/google/callback`
6. Kliknij **Utwórz**.
7. Pojawi się okienko z dwoma wartościami — **skopiuj je**:
   - **Identyfikator klienta** → `GOOGLE_CLIENT_ID`
   - **Tajny klucz klienta** → `GOOGLE_CLIENT_SECRET`

---

## Krok 5 — Wygeneruj klucz szyfrowania tokenów

Klucz szyfruje tokeny użytkowników przed zapisem do bazy danych.  
**Wygeneruj go raz i nigdy nie zmieniaj** — zmiana uniemożliwi zalogowanym użytkownikom korzystanie z integracji.

Otwórz PowerShell w katalogu projektu i uruchom:

```powershell
cd c:\Users\lukas\Documents\apollo
.venv\Scripts\Activate.ps1
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Wynik (długi ciąg znaków) to Twój `GOOGLE_TOKEN_ENCRYPTION_KEY`.

---

## Krok 6 — Uzupełnij plik `docker/.env`

Otwórz plik `docker/.env` i dopisz na końcu (lub uzupełnij istniejące wartości):

```env
# === Google Calendar Integration ===
GOOGLE_CLIENT_ID=tu-wklej-identyfikator-klienta
GOOGLE_CLIENT_SECRET=tu-wklej-tajny-klucz-klienta
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/integrations/google/callback
GOOGLE_OAUTH_SCOPES=openid,email,profile,https://www.googleapis.com/auth/calendar.events,https://www.googleapis.com/auth/calendar.calendars,https://www.googleapis.com/auth/calendar.calendarlist.readonly
GOOGLE_TOKEN_ENCRYPTION_KEY=tu-wklej-klucz-z-kroku-5
FRONTEND_URL=http://localhost
```

> ⚠️ **Nigdy nie commituj pliku `.env` do repozytorium Git!**  
> Plik `.env` jest (lub powinien być) w `.gitignore`.

---

## Krok 7 — Przebuduj backend i uruchom

Po uzupełnieniu `.env` przebuduj obraz backendowy (instaluje nowe biblioteki Google):

```powershell
cd c:\Users\lukas\Documents\apollo\docker
docker-compose up -d --build backend
```

Poczekaj aż backend się uruchomi (kilka minut przy pierwszym buildzie).

---

## Krok 8 — Przetestuj integrację

1. Otwórz przeglądarkę: http://localhost
2. Zaloguj się jako pracownik.
3. Przejdź do **Grafik miesięczny** (`/worker/schedule-view/`).
4. Na dole strony powinien pojawić się panel **Google Calendar**.
5. Kliknij **Połącz z Google**.
6. Google wyświetli ekran zgody — zaloguj się kontem które dodałeś w Kroku 3 (użytkownicy testowi) i kliknij **Zezwól**.
7. Wrócisz na stronę grafiku — panel pokaże adres e-mail i status **Połączono**.
8. Kliknij **Synchronizuj miesiąc** — wpisy grafiku pojawią się w Twoim Google Calendar w kalendarzu o nazwie **Apollo**.

---

## Najczęstsze problemy

### „Aplikacja nie jest zweryfikowana" / ostrzeżenie Google

Na etapie testów aplikacja jest w trybie testowym — Google wyświetla ostrzeżenie.  
Kliknij **Zaawansowane** → **Przejdź do Apollo (niebezpieczna)** — to normalne przy testowaniu.  
Ostrzeżenie znika po weryfikacji aplikacji przez Google (potrzebne tylko dla aplikacji publicznych).

### „redirect_uri_mismatch"

URI przekierowania w `.env` nie zgadza się z tym co zostało zarejestrowane w Google Cloud Console.  
Sprawdź dokładnie: `GOOGLE_OAUTH_REDIRECT_URI` w `.env` musi być identyczny z URI wpisanym w Kroku 4.

### „Google nie zwróciło refresh_token"

Zdarza się gdy konto Google było już wcześniej autoryzowane dla tej aplikacji bez opcji `prompt=consent`.  
Rozwiązanie: wejdź na https://myaccount.google.com/permissions, znajdź aplikację `Apollo`, kliknij **Usuń dostęp** i spróbuj połączyć ponownie.

### Backend nie startuje po przebudowie

Sprawdź logi:
```powershell
docker logs backend -f
```
Najczęstsza przyczyna: błąd w `.env` (spacja, cudzysłów, zły klucz Fernet).

---

## Przejście na produkcję

Gdy będziesz wdrażał na serwer z domeną:

1. W Google Cloud Console dodaj nowy URI przekierowania:  
   `https://twoja-domena.pl/integrations/google/callback`
2. W `.env` na serwerze ustaw:
   ```env
   GOOGLE_OAUTH_REDIRECT_URI=https://twoja-domena.pl/integrations/google/callback
   FRONTEND_URL=https://twoja-domena.pl
   ```
3. Jeśli chcesz umożliwić logowanie **wszystkim** użytkownikom (nie tylko testowym), zgłoś aplikację do weryfikacji Google:  
   Google Cloud Console → OAuth consent screen → **Opublikuj aplikację**  
   (Dla wewnętrznej firmy bez weryfikacji wystarczy dodać konta pracowników jako użytkowników testowych.)

---

## Podsumowanie zmiennych środowiskowych

| Zmienna | Opis | Skąd wziąć |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Identyfikator klienta OAuth | Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` | Tajny klucz klienta OAuth | Google Cloud Console → Credentials |
| `GOOGLE_OAUTH_REDIRECT_URI` | URI przekierowania po autoryzacji | Wpisujesz sam — musi być zarejestrowany w GCP |
| `GOOGLE_OAUTH_SCOPES` | Zakresy uprawnień OAuth | Skopiuj z Kroku 6 |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Klucz szyfrowania tokenów (Fernet) | Generujesz w Kroku 5 |
| `FRONTEND_URL` | Adres frontendu Apollo | `http://localhost` lub Twoja domena |
