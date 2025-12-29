# 🔒 Plan Naprawy Bezpieczeństwa Apollo

## Data: 29.12.2025
## Status: Do wdrożenia

---

## 1️⃣ KLUCZE W .env BEZ SZYFROWANIA

### ❓ Co to znaczy?
Plik `.env` zawiera wrażliwe dane (hasła, klucze JWT) jako **zwykły tekst**:
```env
SECRET_KEY=supersekretnykluczdojwt
POSTGRES_PASSWORD=apollo123
```

Każdy kto ma dostęp do:
- Systemu plików serwera
- Repozytorium Git (jeśli .env został zacommitowany)
- Backupów
może odczytać wszystkie sekrety.

### ✅ Jak naprawić?

#### **Opcja A: Docker Secrets (zalecane dla produkcji)**
```yaml
# docker-compose.yml
services:
  backend:
    secrets:
      - db_password
      - jwt_secret
    environment:
      - DATABASE_URL=postgresql://apollo:${db_password}@postgres-db:5432/apollo_prod_db
      - SECRET_KEY=${jwt_secret}

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

**Zalety:**
- Sekrety nie są w plain text w .env
- Montowane jako pliki tylko do odczytu w kontenerze
- Lepsza separacja środowisk

#### **Opcja B: Minimalna (dla małych projektów)**
1. Silne uprawnienia na .env: `chmod 600 .env`
2. Dodanie .env do .gitignore
3. Instrukcja .env.example dla zespołu
4. Różne .env dla dev/staging/prod

**Implementacja: Opcja B (prostsza, wystarczająca dla małych zespołów)**

---

## 4️⃣ BACKEND WYSTAWIONY PUBLICZNIE

### ❌ Problem
```yaml
backend:
  ports:
    - "8000:8000"  # ❌ Dostęp z hosta/internetu bezpośrednio
```

**Ryzyko:**
- Omija Nginx security headers
- Omija HTTPS (jeśli będzie na Nginx)
- Ekspozycja Swagger UI `/docs` bez uwierzytelnienia
- Możliwość ataków bezpośrednio na FastAPI

### ✅ Rozwiązanie

**Krok 1: Usuń ekspozycję portu**
```yaml
backend:
  build: ./backend
  container_name: backend
  restart: always
  # USUŃ sekcję ports - backend dostępny tylko w sieci Docker
  networks:
    - apollo-network
```

**Krok 2: Tylko Nginx ma port 80/443**
```yaml
nginx-proxy:
  ports:
    - "80:80"
    - "443:443"  # dodamy później z SSL
```

**Krok 3: Wyłącz /docs na produkcji**
```python
# main.py
import os

app = FastAPI(
    title="Apollo Backend",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
)
```

---

## 5️⃣ BRAK CORS POLICY

### ❌ Problem
Backend odpowiada na requesty z **dowolnej domeny** (brak kontroli Origin).

**Ryzyko:**
- Złośliwa strona `evil.com` może wysyłać requesty do Twojego API
- Możliwość kradzieży danych przez CSRF

### ✅ Rozwiązanie

**Instalacja zależności:**
```bash
# Już jest w FastAPI, tylko trzeba skonfigurować
```

**Konfiguracja w main.py:**
```python
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Apollo Backend")

# CORS Configuration
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # ["https://apollo.twoja-domena.pl"]
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=600,  # Cache preflight requests
)

app.add_middleware(AuditLoggingMiddleware)
```

**W .env:**
```env
# Development
ALLOWED_ORIGINS=http://localhost,http://localhost:80

# Production (później)
# ALLOWED_ORIGINS=https://apollo.twoja-domena.pl
```

---

## 6️⃣ BRAK RATE LIMITING

### ❌ Problem
Brak ochrony przed:
- Brute-force na `/users/login`
- DDoS przez wielokrotne requesty
- Abuse API endpoints

### ✅ Rozwiązanie

**Opcja A: Nginx Rate Limiting (zalecane - na poziomie reverse proxy)**

**nginx.conf:**
```nginx
http {
    # Definicja stref limitowania
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    
    server {
        # Login endpoint - max 5 requestów/minutę
        location /users/login {
            limit_req zone=login_limit burst=3 nodelay;
            limit_req_status 429;
            
            proxy_pass http://backend:8000/users/login;
            # ... reszta konfiguracji proxy
        }
        
        # Wszystkie inne API endpoints - max 100 requestów/minutę
        location ~ ^/(users|projects|work_reports|messages)/ {
            limit_req zone=api_limit burst=20 nodelay;
            limit_req_status 429;
            
            proxy_pass http://backend:8000;
            # ... reszta konfiguracji proxy
        }
    }
}
```

**Opcja B: SlowAPI w FastAPI (backup, jeśli ktoś ominie Nginx)**

**requirements.txt:**
```
slowapi==0.1.9
```

**main.py:**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

**routers/users.py:**
```python
from slowapi import Limiter
from fastapi import Request

limiter = Limiter(key_func=lambda request: request.client.host)

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    # ... istniejący kod
```

**Implementacja: Nginx Rate Limiting (lepsza wydajność)**

---

## 7️⃣ TOKENY JWT W localStorage

### ❌ Problem
```javascript
localStorage.setItem('token', token);  // ❌ Podatne na XSS
```

**Ryzyko:**
- Skrypt XSS może odczytać token: `localStorage.getItem('token')`
- Token widoczny w DevTools
- Brak ochrony przed kradzieżą przez JavaScript

### ✅ Rozwiązanie: httpOnly Cookies

**Zalety:**
- JavaScript **nie ma dostępu** do cookie
- Automatyczne dołączanie do requestów
- Flaga `SameSite` chroni przed CSRF

**Backend (FastAPI):**

```python
# routers/users.py - zmiana endpointa /login
from fastapi.responses import JSONResponse

@router.post("/login")
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # ... walidacja użytkownika (istniejący kod)
    
    # Wygeneruj token
    access_token = create_access_token(data={"sub": str(db_user.user_id)})
    
    # Zamiast zwracać JSON, ustaw cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,        # ❗ JavaScript nie ma dostępu
        secure=True,          # Tylko HTTPS (wyłącz na localhost)
        samesite="strict",    # Ochrona przed CSRF
        max_age=3600,         # 1 godzina (sync z JWT expiry)
        path="/"
    )
    
    # Nadal zwróć role i podstawowe info dla frontendu
    return {
        "role": db_user.role,
        "user_id": db_user.user_id,
        "email": db_user.email,
        "first_name": db_user.first_name,
        "last_name": db_user.last_name
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Wylogowano pomyślnie"}
```

**Backend - czytanie tokenu z cookie:**

```python
# auth.py
from fastapi import Cookie

def get_current_user(
    request: Request,
    access_token: Optional[str] = Cookie(None),  # ❗ Czytaj z cookie
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Niepoprawny lub wygasły token",
    )
    
    # Sprawdź cookie najpierw
    token = access_token
    
    # Fallback: sprawdź Authorization header (dla kompatybilności)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()
    
    if not token:
        raise credentials_exception
    
    # ... reszta bez zmian (dekodowanie JWT)
```

**Frontend - login.js:**

```javascript
// Usuń localStorage całkowicie
const loginResponse = await fetch('/users/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  credentials: 'include',  // ❗ Wyślij i odbierz cookies
  body: new URLSearchParams({
    'username': login,
    'password': haslo,
  })
});

if (!loginResponse.ok) {
  alert('Błąd logowania');
  return;
}

const userData = await loginResponse.json();
// ❌ USUŃ: localStorage.setItem('token', token);

// Przekieruj na podstawie roli
redirectByRole(userData.role);
```

**Frontend - wszystkie requesty:**

```javascript
// Przykład: users.js, projects.js, itd.
const response = await fetch('/users/', {
  method: 'GET',
  credentials: 'include',  // ❗ Dołącz cookies automatycznie
  headers: {
    'Accept': 'application/json'
    // ❌ USUŃ: 'Authorization': `Bearer ${token}`
  }
});
```

**⚠️ UWAGA:** To wymaga zmian we **wszystkich** plikach JS frontendu.

---

## 8️⃣ BRAK SECURITY HEADERS W NGINX

### ❌ Problem
Brakuje kluczowych nagłówków ochronnych:
- `Strict-Transport-Security` (wymusza HTTPS)
- `Content-Security-Policy` (blokuje XSS)
- `Referrer-Policy` (kontrola referrerów)

### ✅ Rozwiązanie

**nginx.conf - dodaj do sekcji `server {}`:**

```nginx
server {
    listen 80;
    server_name localhost;
    
    # ===== SECURITY HEADERS =====
    
    # Istniejące (już są)
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # ❗ NOWE - Force HTTPS (wyłącz na localhost, włącz na produkcji)
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # ❗ NOWE - Content Security Policy (chroni przed XSS)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self'; frame-ancestors 'none';" always;
    
    # ❗ NOWE - Referrer Policy
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # ❗ NOWE - Permissions Policy (blokuj dostęp do API przeglądarki)
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" always;
    
    # ❗ NOWE - Cross-Origin Policies
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
    
    # ... reszta konfiguracji
}
```

**Wyjaśnienie:**

| Header | Co robi |
|--------|---------|
| `Strict-Transport-Security` | Wymusza HTTPS na 1 rok (włącz po dodaniu SSL) |
| `Content-Security-Policy` | Blokuje inline scripts, zewnętrzne domeny (chroni przed XSS) |
| `Referrer-Policy` | Nie wysyła pełnych URLi do zewnętrznych stron |
| `Permissions-Policy` | Blokuje dostęp do kamery, GPS, mikrofonu |
| `Cross-Origin-*-Policy` | Izoluje stronę od innych domen |

---

## 9️⃣ LOGI VERBOSE W PRODUKCJI

### ❌ Problem

**Dockerfile:**
```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**Problemy:**
- `--reload` monitoruje zmiany plików (niepotrzebne w produkcji)
- Logi mogą zawierać wrażliwe dane
- Gorsze performance

### ✅ Rozwiązanie

**Dockerfile - dwa tryby:**

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

COPY . .

# ❗ Domyślnie produkcja (bez --reload)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "warning"]

# Development override w docker-compose.yml
```

**docker-compose.yml - override dla devu:**

```yaml
services:
  backend:
    build: ./backend
    container_name: backend
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload  # ❗ Override
    environment:
      - ENVIRONMENT=development
      - LOG_LEVEL=debug
```

**Produkcja - docker-compose.prod.yml:**

```yaml
services:
  backend:
    # Użyje CMD z Dockerfile (bez --reload)
    environment:
      - ENVIRONMENT=production
      - LOG_LEVEL=warning
```

**Dodatkowa ochrona w kodzie:**

```python
# main.py
import logging
import os

# Konfiguracja logów
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Wyłącz verbose logi bibliotek
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("passlib").setLevel(logging.WARNING)
```

---

## 🔟 BRAK WALIDACJI INPUT NA FRONTEND

### ❌ Problem
Frontend wysyła dane bezpośrednio do backendu bez sanityzacji:
```javascript
const description = document.getElementById('description').value;
// Wysyłane bez walidacji
```

**Ryzyko:**
- XSS przez stored input (np. opis projektu: `<script>alert('xss')</script>`)
- Błędy UX (użytkownik wysyła nieprawidłowe dane)

### ✅ Rozwiązanie

**Krok 1: Instalacja DOMPurify (sanityzacja HTML)**

**W każdym pliku HTML dodaj przed innymi skryptami:**
```html
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
```

**Krok 2: Moduł walidacji frontendu**

**Utwórz: `docker/frontend/common/validation.js`**

```javascript
// validation.js - Wspólne funkcje walidacji

/**
 * Sanityzuje input HTML (chroni przed XSS)
 */
function sanitizeHTML(input) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],  // Usuń wszystkie tagi HTML
      ALLOWED_ATTR: []
    });
  }
  // Fallback - podstawowa sanityzacja
  return input.replace(/[<>'"]/g, '');
}

/**
 * Walidacja emaila
 */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Walidacja hasła (min 8 znaków, litera + cyfra)
 */
function validatePassword(password) {
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
}

/**
 * Walidacja daty (YYYY-MM-DD)
 */
function validateDate(dateStr) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dateStr)) return false;
  
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * Escape HTML entities (dla wyświetlania user input)
 */
function escapeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Sanityzuj obiekt przed wysłaniem do API
 */
function sanitizeFormData(formData) {
  const sanitized = {};
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHTML(value.trim());
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
```

**Krok 3: Użycie w formularzu (przykład login.js):**

```javascript
// login.js
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const login = document.getElementById('login').value.trim();
  const haslo = document.getElementById('haslo').value;
  
  // ❗ Walidacja przed wysłaniem
  if (!login || !haslo) {
    alert('Proszę wypełnić wszystkie pola');
    return;
  }
  
  if (!validateEmail(login)) {
    alert('Nieprawidłowy format email');
    return;
  }
  
  // Sanityzacja
  const sanitizedLogin = sanitizeHTML(login);
  
  // Wysłanie
  const loginResponse = await fetch('/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      'username': sanitizedLogin,
      'password': haslo,  // Hasło NIE sanityzujemy (może mieć spec. znaki)
    })
  });
  // ...
});
```

**Krok 4: Bezpieczne wyświetlanie user input:**

```javascript
// Zamiast:
projectNameDiv.innerHTML = project.project_name;  // ❌ XSS vulnerability

// Użyj:
projectNameDiv.textContent = project.project_name;  // ✅ Safe

// Lub z escape:
projectNameDiv.innerHTML = escapeHTML(project.project_name);  // ✅ Safe
```

---

## 📦 PODSUMOWANIE - PLIKI DO ZMIANY

### 1. Nowe pliki do utworzenia:
- ✅ `.gitignore`
- ✅ `.env.example` (szablon bez wrażliwych danych)
- ✅ `docker/frontend/common/validation.js`
- ✅ `docker-compose.prod.yml` (opcjonalnie)

### 2. Pliki do modyfikacji:

#### Backend:
- ✅ `docker/backend/Dockerfile` - usuń `--reload`
- ✅ `docker/backend/app/main.py` - dodaj CORS, wyłącz /docs na prod
- ✅ `docker/backend/app/auth.py` - czytaj token z cookie
- ✅ `docker/backend/app/routers/users.py` - ustaw cookie przy loginie
- ✅ `docker/backend/requirements.txt` - dodaj `slowapi` (opcjonalnie)

#### Frontend (wszystkie pliki JS):
- ✅ Usuń `localStorage.getItem('token')`
- ✅ Dodaj `credentials: 'include'` do fetch()
- ✅ Dodaj `<script src=".../validation.js">` do HTML
- ✅ Użyj `sanitizeHTML()` przed wysłaniem danych

#### Nginx:
- ✅ `docker/nginx/nginx.conf` - dodaj security headers i rate limiting

#### Docker:
- ✅ `docker/docker-compose.yml` - usuń `ports: 8000:8000` z backendu
- ✅ `docker/.env` - dodaj `ALLOWED_ORIGINS`, `ENVIRONMENT`

---

## 🚀 KOLEJNOŚĆ WDROŻENIA

1. **Krok 1:** .gitignore + .env.example (bezpieczeństwo repozytorium)
2. **Krok 2:** Usuń port 8000 z docker-compose (izolacja backendu)
3. **Krok 3:** CORS w main.py (kontrola dostępu)
4. **Krok 4:** Security headers w nginx.conf (ochrona frontendu)
5. **Krok 5:** Rate limiting w nginx.conf (ochrona przed brute-force)
6. **Krok 6:** Usuń --reload z Dockerfile (produkcja)
7. **Krok 7:** Walidacja frontendu - validation.js (XSS protection)
8. **Krok 8:** httpOnly cookies (zaawansowane - wymaga zmian w całym frontendzie)

---

## ⚠️ UWAGI KOŃCOWE

### Co można pominąć na początek:
- **Punkt 7 (httpOnly cookies)** - duża zmiana w kodzie, zostaw na koniec
- Rate limiting w FastAPI (Nginx wystarczy)

### Co jest MUST-HAVE przed produkcją:
- ✅ .gitignore
- ✅ Usunięcie portu 8000
- ✅ CORS policy
- ✅ Security headers w Nginx
- ✅ Usuń --reload z Dockerfile

### Testowanie po zmianach:
```bash
# 1. Rebuild kontenerów
cd docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 2. Sprawdź security headers
curl -I http://localhost/

# 3. Sprawdź rate limiting
for i in {1..10}; do curl -X POST http://localhost/users/login; done

# 4. Sprawdź logi
docker logs backend
```

---

## 📞 GOTOWE DO WDROŻENIA?

Powiedz kiedy zacząć, a wdrożymy kolejno każdy punkt! 🚀
