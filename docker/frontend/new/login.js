// Obsługa logowania i przekierowania
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('form');
  
  if (!loginForm) {
    console.error('Formularz logowania nie został znaleziony');
    return;
  }

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
      if (userData.role === 'worker') {
        window.location.href = '/new/worker/';
      } else if (userData.role === 'admin') {
        // Możesz dodać przekierowanie dla admina w przyszłości
        window.location.href = '/new/worker/'; // Tymczasowo też na worker
      } else if (userData.role === 'hr') {
        // Możesz dodać przekierowanie dla HR w przyszłości
        window.location.href = '/new/worker/'; // Tymczasowo też na worker
      } else {
        alert('Nieznana rola użytkownika');
        localStorage.removeItem('token');
      }

    } catch (error) {
      console.error('Błąd podczas logowania:', error);
      alert('Błąd połączenia z serwerem. Spróbuj ponownie.');
      localStorage.removeItem('token');
    }
  });
});
