// Sprawdzanie czy użytkownik jest zalogowany
function checkAuth() {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    const isLoginPage = path === '/index.html' || path === '/';
    const isStartPage = path === '/start' || path === '/start/' || path.includes('/start/');

    if (token && isLoginPage) {
        // Mamy token i jesteśmy na stronie logowania - przekieruj do panelu
        window.location.href = '/start/';
        return true;
    }

    if (!token) {
        if (isStartPage) {
            // Na /start/ — pokaż komunikat o braku zalogowania zamiast przekierowywać
            renderStartUnauthenticated();
            return false;
        }
        if (!isLoginPage) {
            // Brak tokenu i nie jesteśmy na stronie logowania ani start - przekieruj do logowania
            window.location.href = '/index.html';
            return false;
        }
    }

    return true;
}

function renderStartUnauthenticated() {
    const main = document.getElementById('mainCard') || document.querySelector('main.card');
    if (!main) return;
    main.innerHTML = `
      <h1 class="title">Panel Apollo</h1>
      <p>Nie jesteś zalogowany, zaloguj się</p>
      <div style="margin-top:16px; display:flex; gap:10px; justify-content:center;">
        <button id="toLogin" class="btn">Przejdź do logowania</button>
      </div>
    `;
    const btn = document.getElementById('toLogin');
    if (btn) btn.addEventListener('click', () => window.location.href = '/index.html');
}

// Obsługa logowania
async function handleLogin(event) {
    event.preventDefault();
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        const response = await fetch('/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'username': document.getElementById('login').value,
                'password': document.getElementById('haslo').value,
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            window.location.href = '/start/';
        } else {
            errorMessage.textContent = data.detail || 'Błąd logowania';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'Błąd połączenia z serwerem';
        errorMessage.style.display = 'block';
    }
}

// Obsługa wylogowania
function logout() {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
    // Sprawdź autoryzację przy każdym załadowaniu strony
    checkAuth();
    
    // Dodaj obsługę formularza logowania jeśli jest na stronie
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});
