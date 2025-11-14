// Weryfikacja zalogowania i roli 'hr' przed wyświetleniem strony
(async function enforceHrAuth() {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.replace('/');
      return;
    }
    const resp = await fetch('/users/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) {
      localStorage.removeItem('token');
      window.location.replace('/');
      return;
    }
    const user = await resp.json();
    if (user.role !== 'hr') {
      window.location.replace('/');
      return;
    }
    // Uprawnienia potwierdzone – pokaż stronę
    document.documentElement.style.visibility = 'visible';
  } catch (e) {
    console.error('Błąd weryfikacji dostępu:', e);
    localStorage.removeItem('token');
    window.location.replace('/');
  }
})();
