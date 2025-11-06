// Weryfikacja tokenu przez backend
async function verifyToken(token) {
    try {
        const response = await fetch('/users/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.ok;
    } catch (error) {
        console.error('Błąd weryfikacji tokenu:', error);
        return false;
    }
}

// Sprawdzanie czy użytkownik jest zalogowany
async function checkAuth() {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    const isLoginPage = path === '/index.html' || path === '/';
    const isStartPage = path === '/start' || path === '/start/' || path.includes('/start/');

    // Jeśli mamy token, zweryfikuj go przez backend
    if (token) {
        const isValid = await verifyToken(token);
        
        if (!isValid) {
            // Token nieprawidłowy - usuń go
            localStorage.removeItem('token');
            
            if (isStartPage) {
                renderStartUnauthenticated();
                document.body.classList.add('loaded');
                return false;
            }
            if (!isLoginPage) {
                window.location.href = '/index.html';
                return false;
            }
        } else {
            // Token prawidłowy
            if (isLoginPage) {
                window.location.href = '/start/';
                return true;
            }
            document.body.classList.add('loaded');
            return true;
        }
    }

    // Brak tokenu
    if (isStartPage) {
        renderStartUnauthenticated();
        document.body.classList.add('loaded');
        return false;
    }
    
    if (!isLoginPage) {
        window.location.href = '/index.html';
        return false;
    }

    document.body.classList.add('loaded');
    return false;
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
document.addEventListener('DOMContentLoaded', async () => {
    // Sprawdź autoryzację przy każdym załadowaniu strony
    await checkAuth();
    
    // Dodaj obsługę formularza logowania jeśli jest na stronie
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});
