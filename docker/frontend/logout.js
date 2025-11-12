function logout() {
  // Usuń token z localStorage
  localStorage.removeItem('token');
  
  // Przekieruj na stronę logowania
  window.location.href = '/';
}

// Obsługa kliknięcia w link wylogowania
document.addEventListener('DOMContentLoaded', () => {
  const logoutLinks = document.querySelectorAll('a[href="/logout"]');
  
  logoutLinks.forEach(link => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      logout();
    });
  });
});
