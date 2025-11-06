// Sprawdzanie czy użytkownik jest zalogowany
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        // Jeśli nie jesteśmy na stronie logowania, przekieruj
        if (!window.location.pathname.endsWith('/index.html') && !window.location.pathname.endsWith('/')) {
            window.location.href = '/index.html';
        }
        return false;
    }
    
    // Jeśli jesteśmy zalogowani i na stronie logowania, przekieruj do panelu
    if (window.location.pathname.endsWith('/index.html') || window.location.pathname.endsWith('/')) {
        window.location.href = '/start/';
    }
    return true;
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
