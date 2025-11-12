// Walidacja tokenu i przekierowanie
async function checkExistingLogin() {
  const token = localStorage.getItem('token');

  if (!token) {
    // Brak tokenu - pokaż formularz logowania
    return false;
  }

  try {
    // Sprawdź czy token jest prawidłowy
    const response = await fetch('/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      // Token nieprawidłowy - usuń go
      console.warn('Token nieprawidłowy lub wygasły');
      localStorage.removeItem('token');
      return false;
    }

    const userData = await response.json();

    // Token prawidłowy - przekieruj na właściwą stronę
    redirectByRole(userData.role);
    return true;

  } catch (error) {
    console.error('Błąd podczas walidacji tokenu:', error);
    localStorage.removeItem('token');
    return false;
  }
}

// Funkcja przekierowująca na podstawie roli
function redirectByRole(role) {
  if (role === 'worker') {
    window.location.href = '/worker/';
  } else if (role === 'admin') {
    window.location.href = '/admin/';
  } else if (role === 'hr') {
    window.location.href = '/hr/';
  } else {
    console.warn('Nieznana rola użytkownika:', role);
    localStorage.removeItem('token');
  }
}

// Obsługa logowania i przekierowania
document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.querySelector('form');
  if (!loginForm) {
    console.error('Formularz logowania nie został znaleziony');
    return;
  }

  // Ukryj formularz do czasu sprawdzenia czy użytkownik jest zalogowany
  loginForm.hidden = true;

  // Sprawdź czy użytkownik jest już zalogowany (oraz czy token jest poprawny)
  const alreadyLoggedIn = await checkExistingLogin();
  if (alreadyLoggedIn) {
    // Przekierowanie nastąpiło w checkExistingLogin
    return;
  }

  // Brak lub niepoprawny token - pokaż formularz
  loginForm.hidden = false;

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const login = document.getElementById('login').value.trim();
    const haslo = document.getElementById('haslo').value;

    if (!login || !haslo) {
      alert('Proszę wypełnić wszystkie pola');
      return;
    }

    try {
      // Krok 1: Zaloguj użytkownika
      const loginResponse = await fetch('/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'username': login,
          'password': haslo,
        })
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => ({ detail: 'Błąd logowania' }));
        alert(errorData.detail || 'Nieprawidłowy login lub hasło');
        return;
      }

      const loginData = await loginResponse.json();
      const token = loginData.access_token;

      // Zapisz token w localStorage
      localStorage.setItem('token', token);

      // Krok 2: Pobierz dane użytkownika
      const userResponse = await fetch('/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error('Nie udało się pobrać danych użytkownika');
      }

      const userData = await userResponse.json();

      // Krok 3: Przekieruj na podstawie roli
      redirectByRole(userData.role);

    } catch (error) {
      console.error('Błąd podczas logowania:', error);
      alert('Błąd połączenia z serwerem. Spróbuj ponownie.');
      localStorage.removeItem('token');
    }
  });
});
