# Instrukcja wdrożenia poprawek bezpieczeństwa Apollo

## 🔄 Restart aplikacji z nowymi zabezpieczeniami

### Krok 1: Zatrzymaj obecne kontenery
```bash
cd docker
docker-compose down
```

### Krok 2: Zbuduj ponownie backend (nowy Dockerfile)
```bash
docker-compose build --no-cache backend
```

### Krok 3: Uruchom aplikację
```bash
docker-compose up -d
```

### Krok 4: Sprawdź logi
```bash
# Backend
docker logs backend

# Nginx
docker logs nginx-proxy

# Sprawdź czy wszystko działa
curl http://localhost/
```

---

## ✅ Weryfikacja zabezpieczeń

### 1. Sprawdź Security Headers
```bash
curl -I http://localhost/
```

Powinieneś zobaczyć:
- ✅ Content-Security-Policy
- ✅ X-Content-Type-Options
- ✅ X-Frame-Options
- ✅ Referrer-Policy
- ✅ Permissions-Policy
- ✅ Cross-Origin-Opener-Policy

### 2. Sprawdź Rate Limiting (login)
```bash
# Wyślij 10 requestów do login
for i in {1..10}; do
  curl -X POST http://localhost/users/login \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=test&password=test"
  echo ""
done
```

Po 5 requestach powinieneś dostać **HTTP 429 Too Many Requests**

### 3. Sprawdź CORS
```bash
# Request z nieznaneją domeny (powinien być zablokowany)
curl -X GET http://localhost/users/ \
  -H "Origin: http://evil.com" \
  -v
```

### 4. Sprawdź czy backend nie jest dostępny bezpośrednio
```bash
# To POWINNO NIE DZIAŁAĆ (timeout/connection refused)
curl http://localhost:8000/
```

### 5. Sprawdź czy /docs jest wyłączony na produkcji
Ustaw w `.env`:
```
ENVIRONMENT=production
```

Zrestartuj:
```bash
docker-compose restart backend
```

Sprawdź:
```bash
curl http://localhost:8000/docs
# Powinno zwrócić 404
```

---

## 🔧 Przełączanie między środowiskami

### Development (obecne)
```bash
# .env
ENVIRONMENT=development
LOG_LEVEL=debug
ALLOWED_ORIGINS=http://localhost,http://localhost:80

# Uruchom
cd docker
docker-compose up -d
```

### Production (przyszłe)
```bash
# .env
ENVIRONMENT=production
LOG_LEVEL=warning
ALLOWED_ORIGINS=https://twoja-domena.pl

# Wygeneruj nowe secrety
openssl rand -hex 32  # SECRET_KEY
openssl rand -base64 24  # POSTGRES_PASSWORD

# Uruchom z prod config
cd docker
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoring po zmianach

### Sprawdź logi backendu
```bash
docker logs backend -f
```

Powinieneś zobaczyć:
```
INFO: CORS allowed origins: ['http://localhost', 'http://localhost:80']
INFO: Application startup complete.
```

### Sprawdź logi Nginx
```bash
docker logs nginx-proxy -f
```

Przy przekroczeniu rate limit zobaczysz:
```
[error] limiting requests, excess: X.XXX by zone "login_limit"
```

---

## 🐛 Troubleshooting

### Problem: Frontend nie może połączyć się z backendem
**Rozwiązanie:** Sprawdź czy backend jest w tej samej sieci Docker:
```bash
docker network inspect apollo-network
```

### Problem: CORS errors
**Rozwiązanie:** Upewnij się że `ALLOWED_ORIGINS` zawiera domenę frontendu:
```bash
# .env
ALLOWED_ORIGINS=http://localhost,http://localhost:80
```

### Problem: Rate limiting blokuje normalnych użytkowników
**Rozwiązanie:** Zwiększ limity w `nginx.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/m;
```

---

## 📝 Co zostało do zrobienia

### Opcjonalne (zaawansowane):
- [ ] **httpOnly cookies** - wymaga zmian w całym frontendzie (2-3h pracy)
- [ ] **Walidacja frontendu** - DOMPurify + validation.js (1h pracy)
- [ ] **HTTPS/SSL** - Let's Encrypt lub Cloudflare
- [ ] **Silne secrety** - wygeneruj nowe dla produkcji

### Rekomendowane przed produkcją:
```bash
# Wygeneruj nowe secrety
openssl rand -hex 32 > secret_key.txt
openssl rand -base64 24 > db_password.txt

# Zaktualizuj .env
SECRET_KEY=<zawartość secret_key.txt>
POSTGRES_PASSWORD=<zawartość db_password.txt>
```

---

## ✅ Status bezpieczeństwa

**Przed zmianami:** 🔴 Niegotowe do produkcji (4/10)

**Po zmianach:** 🟡 Gotowe do małych/średnich deploymentów (7/10)

**Brakuje do pełnej produkcji:**
- HTTPS/SSL (krytyczne)
- Silne secrety (krytyczne)
- httpOnly cookies (zalecane)
- WAF/DDoS protection (zalecane dla dużych projektów)
