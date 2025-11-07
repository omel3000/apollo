// Weryfikacja tokenu przez backend
async function verifyToken(token) {
    try {
        const response = await fetch('/users/me', {
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

// Nowa funkcja: pobieranie danych użytkownika z rolą
async function getCurrentUser(token) {
    try {
        const response = await fetch('/users/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.ok) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('Błąd pobierania danych użytkownika:', error);
        return null;
    }
}

// Funkcja do pokazania zawartości po weryfikacji
function showContent() {
    const loadingState = document.getElementById('loadingState');
    const mainContent = document.getElementById('mainContent');
    
    if (loadingState) loadingState.style.display = 'none';
    if (mainContent) {
        mainContent.classList.remove('content-hidden');
        mainContent.style.display = 'block';
    }
    
    document.body.classList.add('loaded');
}

// Sprawdzanie czy użytkownik jest zalogowany
async function checkAuth() {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    const isLoginPage = path === '/index.html' || path === '/';
    const isStartPage = path === '/start' || path === '/start/' || path.includes('/start/');
    const isWorkerPage = path === '/worker' || path === '/worker/' || path.includes('/worker/');

    // Jeśli mamy token, zweryfikuj go przez backend
    if (token) {
        const user = await getCurrentUser(token);
        
        if (!user) {
            // Token nieprawidłowy - usuń go
            localStorage.removeItem('token');
            
            if (isStartPage || isWorkerPage) {
                renderUnauthenticated();
            } else if (!isLoginPage) {
                window.location.href = '/index.html';
                return false;
            }
        } else {
            // Token prawidłowy
            if (isLoginPage) {
                window.location.href = '/start/';
                return true;
            }
            
            // Dla strony /worker sprawdź rolę
            if (isWorkerPage) {
                if (user.role !== 'worker') {
                    renderInsufficientPermissions(user);
                    document.body.classList.add('loaded');
                    return false;
                }
            }
            
            // Token OK i rola OK (lub strona bez wymagań), pokaż zawartość strony
            showContent();
            return true;
        }
    } else {
        // Brak tokenu
        if (isStartPage || isWorkerPage) {
            renderUnauthenticated();
        } else if (!isLoginPage) {
            window.location.href = '/index.html';
            return false;
        }
    }

    // Pokaż stronę (dla strony logowania lub po pokazaniu komunikatu)
    document.body.classList.add('loaded');
    return false;
}

function renderUnauthenticated() {
    const loadingState = document.getElementById('loadingState');
    const mainContent = document.getElementById('mainContent');
    
    if (loadingState) {
        loadingState.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h1 style="font-size: 24px; font-weight: 600; color: #2d3748; margin-bottom: 20px;">Panel Apollo</h1>
                <p style="margin: 20px 0; color: #4a5568;">Nie jesteś zalogowany. Zaloguj się, aby uzyskać dostęp.</p>
                <button id="toLogin" class="btn" style="margin-top: 20px; padding: 12px 24px; background: #4a5568; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px;">
                    Przejdź do logowania
                </button>
            </div>
        `;
        const btn = document.getElementById('toLogin');
        if (btn) btn.addEventListener('click', () => window.location.href = '/index.html');
    }
    
    if (mainContent) mainContent.style.display = 'none';
    document.body.classList.add('loaded');
}

// Nowa funkcja: renderowanie komunikatu o braku uprawnień
function renderInsufficientPermissions(user) {
    const loadingState = document.getElementById('loadingState');
    const mainContent = document.getElementById('mainContent');
    
    if (loadingState) {
        loadingState.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h1 style="font-size: 24px; font-weight: 600; color: #2d3748; margin-bottom: 20px;">Brak uprawnień</h1>
                <p style="margin: 20px 0; color: #4a5568;">
                    Witaj, <strong>${user.first_name} ${user.last_name}</strong>!<br><br>
                    Nie masz wystarczających uprawnień do dostępu do tego panelu.<br><br>
                    Wymagana rola: <strong>worker</strong><br>
                    Twoja rola: <strong>${user.role}</strong>
                </p>
                <button id="logoutBtn" class="btn" style="margin-top: 20px; padding: 12px 24px; background: #4a5568; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 16px;">
                    Wyloguj
                </button>
            </div>
        `;
        const btn = document.getElementById('logoutBtn');
        if (btn) btn.addEventListener('click', logout);
    }
    
    if (mainContent) mainContent.style.display = 'none';
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
