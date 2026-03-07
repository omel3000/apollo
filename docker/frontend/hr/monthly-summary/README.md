# Podsumowania Miesięczne Pracowników - Dokumentacja

## 📋 Przegląd

Strona **Podsumowania miesięczne pracowników** to zaawansowany moduł w panelu HR systemu Apollo, który dostarcza kompleksowe raporty i analizy czasu pracy wszystkich pracowników w danym miesiącu.

## 🔗 Lokalizacja

- **URL**: `/hr/monthly-summary/`
- **Uprawnienia**: Tylko HR i Admin
- **Pliki**:
  - Frontend: `docker/frontend/hr/monthly-summary/`
  - Backend: Endpointy w `docker/backend/app/routers/work_reports.py`

## ✨ Główne Funkcje

### 1. **Szybkie Statystyki** 📊
- Łączny czas pracy wszystkich pracowników
- Liczba aktywnych pracowników
- Liczba aktywnych projektów
- Średni czas pracy na pracownika

### 2. **Wizualizacje**
- **Wykres słupkowy** - Top 5 pracowników według czasu pracy
- **Wykres kołowy** - Rozkład czasu według projektów
- **Wykres liniowy** - Trend czasu pracy w ostatnich 6 miesiącach

### 3. **Podsumowanie według Pracowników** 👥
#### Funkcje:
- Lista wszystkich pracowników z czasem w miesiącu
- Wyszukiwarka (imię, nazwisko, email)
- Sortowanie (nazwisko, czas, dni robocze)
- Filtrowanie zaawansowane (zakres czasu, ukryj bez czasu)
- Rozwijane karty z szczegółami projektów
- Paski procentowe pokazujące relatywny czas pracy

#### Szczegóły pracownika (modal):
- Statystyki: łączny czas, dni robocze, średnia dzienna
- Kalendarz dzienny z raportami
- Lista wszystkich raportów (data, projekt, czas, opis)
- Eksport szczegółów do CSV

### 4. **Podsumowanie według Projektów** 📁
#### Funkcje:
- Lista wszystkich projektów z czasem w miesiącu
- Wyszukiwarka projektów
- Sortowanie (nazwa, czas)
- Rozwijane karty z listą pracowników
- Paski procentowe pokazujące relatywny czas projektu
- Rozkład czasu między pracowników w projekcie

### 5. **Eksport Danych** 📥
- **CSV** - kompatybilny z Excel
- **Excel** - bezpośredni eksport (poprzez CSV)
- **PDF** - poprzez funkcję drukowania przeglądarki
- **Drukowanie** - dedykowany przycisk

### 6. **Nawigacja Miesiąc/Rok** 📅
- Przyciski: Poprzedni, Bieżący, Następny
- Selektor miesiąca (dropdown)
- Selektor roku (dropdown)
- Automatyczna synchronizacja

## 🔌 Endpointy API

### 1. Pełne podsumowanie miesiąca
```
POST /work_reports/hr_monthly_overview
```

**Request:**
```json
{
  "month": 11,
  "year": 2025
}
```

**Response:**
```json
{
  "month": 11,
  "year": 2025,
  "total_hours": 245,
  "total_minutes": 30,
  "total_users": 12,
  "total_projects": 8,
  "average_hours": 20,
  "average_minutes": 27,
  "users": [
    {
      "user_id": 1,
      "first_name": "Jan",
      "last_name": "Kowalski",
      "email": "jan.kowalski@firma.pl",
      "phone_number": "+48 123 456 789",
      "total_hours": 42,
      "total_minutes": 15,
      "days_worked": 18,
      "projects": [
        {
          "project_id": 1,
          "project_name": "Projekt A",
          "total_hours": 25,
          "total_minutes": 30
        }
      ]
    }
  ],
  "projects": [
    {
      "project_id": 1,
      "project_name": "Projekt A",
      "total_hours": 125,
      "total_minutes": 45,
      "users": [
        {
          "user_id": 1,
          "first_name": "Jan",
          "last_name": "Kowalski",
          "total_hours": 25,
          "total_minutes": 30
        }
      ]
    }
  ]
}
```

### 2. Trend miesięczny
```
POST /work_reports/monthly_trend
```

**Request:**
```json
{
  "months": 6
}
```

**Response:**
```json
[
  {
    "month": 6,
    "year": 2025,
    "total_hours": 180,
    "total_minutes": 15
  },
  {
    "month": 7,
    "year": 2025,
    "total_hours": 195,
    "total_minutes": 30
  }
]
```

## 🛠️ Technologie

### Frontend:
- **HTML/CSS** - Vanilla (bez frameworków)
- **Bootstrap 5** - UI framework
- **Chart.js 4.4** - wykresy interaktywne
- **Bootstrap Icons** - ikony

### Backend:
- **FastAPI** - framework API
- **SQLAlchemy** - ORM
- **Pydantic** - walidacja danych
- **python-dateutil** - obliczenia dat

## 📦 Struktura Plików

```
docker/
├── frontend/hr/monthly-summary/
│   ├── index.html              # Główna strona HTML
│   └── monthly-summary.js      # Logika JavaScript
│
├── backend/app/
│   ├── routers/work_reports.py # Nowe endpointy
│   ├── crud.py                 # Funkcje CRUD
│   └── schemas.py              # Schematy Pydantic
│
└── nginx/nginx.conf            # Konfiguracja proxy (już skonfigurowana)
```

## 🚀 Instalacja i Uruchomienie

### 1. Restart backendu (zainstalowanie nowych zależności)
```bash
cd docker
docker-compose up -d --build backend
```

### 2. Sprawdzenie logów
```bash
docker logs backend -f
```

### 3. Dostęp do strony
Zaloguj się jako HR lub Admin i przejdź do:
```
http://localhost/hr/monthly-summary/
```

## 💡 Przykłady Użycia

### Scenariusz 1: Miesięczne podsumowanie zespołu
1. Zaloguj się jako HR
2. Przejdź do "Podsumowania miesięczne"
3. Wybierz miesiąc i rok
4. Sprawdź szybkie statystyki
5. Przejrzyj wykresy

### Scenariusz 2: Analiza czasu pracownika
1. W sekcji "Podsumowanie według pracowników"
2. Użyj wyszukiwarki lub znajdź pracownika na liście
3. Kliknij na kartę pracownika aby rozwinąć projekty
4. Kliknij "Zobacz szczegóły dni" aby otworzyć modal
5. Przejrzyj kalendarz dzienny z raportami
6. Opcjonalnie eksportuj do CSV

### Scenariusz 3: Raport projektu
1. W sekcji "Podsumowanie według projektów"
2. Znajdź projekt na liście
3. Kliknij aby rozwinąć listę pracowników
4. Sprawdź procentowy rozkład czasu

### Scenariusz 4: Eksport danych
1. Kliknij "Eksport CSV" dla pełnego raportu
2. Plik zawiera:
   - Statystyki globalne
   - Lista pracowników z czasem
   - Lista projektów z czasem
3. Otwórz w Excel i analizuj dalej

### Scenariusz 5: Analiza trendu
1. Przewiń do sekcji "Porównanie miesięczne"
2. Zobacz wykres liniowy ostatnich 6 miesięcy
3. Analizuj wzrosty/spadki czasu pracy

## 🎨 Personalizacja

### Kolory projektów
Kolory wykresów są generowane przez `project-colors.js`. Możesz dostosować:

```javascript
// W monthly-summary.js
function getProjectColor(projectId, index) {
  const colors = [
    'rgba(191, 110, 80, 0.8)',  // Twój kolor 1
    'rgba(115, 106, 101, 0.8)', // Twój kolor 2
    // ... więcej kolorów
  ];
  return colors[index % colors.length];
}
```

### Liczba miesięcy w trendzie
Domyślnie: 6 miesięcy. Zmiana w `monthly-summary.js`:

```javascript
// Linia ~48
body: JSON.stringify({
  months: 12  // Zmień na 12 dla rocznego trendu
})
```

## 🔒 Bezpieczeństwo

- **Autoryzacja**: Tylko HR i Admin (`admin_or_hr_required`)
- **Token JWT**: Wszystkie requesty wymagają Bearer token
- **Walidacja danych**: Pydantic schemas w backend
- **SQL Injection**: Zabezpieczone przez SQLAlchemy ORM

## 📊 Wydajność

- **Optymalizacja**: Jeden endpoint zwraca wszystkie dane (unika wielokrotnych requestów)
- **Caching**: Chart.js cache wykresy przy resize
- **Lazy loading**: Szczegóły pracownika ładowane on-demand (modal)
- **Filtrowanie**: Po stronie frontend (szybkie, bez zapytań do API)

## 🐛 Debugging

### Problem: Brak danych na wykresach
**Rozwiązanie**: Sprawdź console (F12) - czy dane przychodzą z API
```javascript
console.log('Overview data:', overviewData);
```

### Problem: Błąd 401 Unauthorized
**Rozwiązanie**: Wyloguj się i zaloguj ponownie (token wygasł)

### Problem: Wykres nie wyświetla się
**Rozwiązanie**: Sprawdź czy Chart.js się załadował:
```javascript
console.log('Chart.js loaded:', typeof Chart !== 'undefined');
```

### Problem: Spinner nie znika
**Rozwiązanie**: Sprawdź czy wszystkie API calls się powiodły w Network tab

## 📝 Changelog

### v1.0.0 (2025-11-16)
- ✨ Inicjalna wersja z pełną funkcjonalnością
- 📊 3 typy wykresów (słupkowy, kołowy, liniowy)
- 👥 Podsumowanie pracowników z szczegółami
- 📁 Podsumowanie projektów z pracownikami
- 📥 Eksport CSV/Excel/PDF
- 🔍 Wyszukiwanie i filtrowanie
- 📈 Trend 6 miesięcy
- 📱 Responsywny design

## 🤝 Wsparcie

W razie problemów sprawdź:
1. Logi backendu: `docker logs backend -f`
2. Console przeglądarki (F12)
3. Network tab (sprawdź API responses)
4. Dokumentację endpointów: `http://localhost:8000/docs`

## 📚 Powiązane Moduły

- **Moje podsumowania** (`/hr/summary/`) - indywidualne podsumowanie
- **Zarządzanie użytkownikami** (`/hr/users/`) - CRUD użytkowników
- **Zarządzanie projektami** (`/hr/projects/`) - CRUD projektów
- **Rejestracja czasu** (`/hr/reports/`) - dodawanie raportów

---

**Autor**: Apollo System  
**Data**: Listopad 2025  
**Wersja**: 1.0.0
