let authHeader = '';
let emailFailedAttempts = 0;
let passwordFailedAttempts = 0;
const MAX_FAILED_ATTEMPTS = 3;

document.addEventListener('DOMContentLoaded', () => {
  console.log('account.js: DOMContentLoaded fired');
  
  const rawToken = localStorage.getItem('token');
  const token = rawToken ? rawToken.trim() : '';
  console.log('account.js: token exists:', !!token);
  
  if (!token) {
    console.warn('account.js: No token, redirecting');
    handleUnauthorized();
    return;
  }

  authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  
  // Setup form handlers
  setupChangeEmailForm();
  setupChangePasswordForm();
});

function setupChangeEmailForm() {
  const form = document.getElementById('changeEmailForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newEmail = document.getElementById('newEmail').value.trim();
    const currentPassword = document.getElementById('emailCurrentPassword').value;
    const messageDiv = document.getElementById('emailMessage');
    
    // Clear previous messages
    messageDiv.innerHTML = '';
    
    // Validate
    if (!newEmail || !currentPassword) {
      showMessage(messageDiv, 'Wszystkie pola są wymagane.', 'error');
      return;
    }
    
    try {
      const response = await fetch('/users/me/change-email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          new_email: newEmail,
          current_password: currentPassword
        })
      });

      if (response.status === 401) {
        const errorData = await safeReadJson(response);
        const errorMessage = errorData.detail || 'Błędne hasło';
        
        emailFailedAttempts++;
        
        if (emailFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          showMessage(messageDiv, `Błędne hasło. Przekroczono limit prób (${MAX_FAILED_ATTEMPTS}). Wylogowywanie...`, 'error');
          setTimeout(() => handleUnauthorized(), 2000);
          return;
        }
        
        const remainingAttempts = MAX_FAILED_ATTEMPTS - emailFailedAttempts;
        showMessage(messageDiv, `${errorMessage}. Pozostało prób: ${remainingAttempts}`, 'error');
        return;
      }

      if (!response.ok) {
        const errorData = await safeReadJson(response);
        const errorMessage = errorData.detail || 'Błąd podczas zmiany adresu email.';
        showMessage(messageDiv, errorMessage, 'error');
        return;
      }

      const data = await response.json();
      showMessage(messageDiv, 'Adres email został zmieniony pomyślnie!', 'success');
      
      // Reset failed attempts on success
      emailFailedAttempts = 0;
      
      // Clear form
      form.reset();
      
    } catch (error) {
      console.error('Error changing email:', error);
      showMessage(messageDiv, 'Wystąpił błąd podczas zmiany adresu email.', 'error');
    }
  });
}

function setupChangePasswordForm() {
  const form = document.getElementById('changePasswordForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    const messageDiv = document.getElementById('passwordMessage');
    
    // Clear previous messages
    messageDiv.innerHTML = '';
    
    // Validate
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showMessage(messageDiv, 'Wszystkie pola są wymagane.', 'error');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      showMessage(messageDiv, 'Nowe hasła nie są identyczne.', 'error');
      return;
    }
    
    try {
      const response = await fetch('/users/me/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_new_password: confirmNewPassword
        })
      });

      if (response.status === 401) {
        const errorData = await safeReadJson(response);
        const errorMessage = errorData.detail || 'Błędne hasło';
        
        passwordFailedAttempts++;
        
        if (passwordFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          showMessage(messageDiv, `Błędne hasło. Przekroczono limit prób (${MAX_FAILED_ATTEMPTS}). Wylogowywanie...`, 'error');
          setTimeout(() => handleUnauthorized(), 2000);
          return;
        }
        
        const remainingAttempts = MAX_FAILED_ATTEMPTS - passwordFailedAttempts;
        showMessage(messageDiv, `${errorMessage}. Pozostało prób: ${remainingAttempts}`, 'error');
        return;
      }

      if (!response.ok) {
        const errorData = await safeReadJson(response);
        const errorMessage = errorData.detail || 'Błąd podczas zmiany hasła.';
        showMessage(messageDiv, errorMessage, 'error');
        return;
      }

      const data = await response.json();
      showMessage(messageDiv, 'Hasło zostało zmienione pomyślnie!', 'success');
      
      // Reset failed attempts on success
      passwordFailedAttempts = 0;
      
      // Clear form
      form.reset();
      
    } catch (error) {
      console.error('Error changing password:', error);
      showMessage(messageDiv, 'Wystąpił błąd podczas zmiany hasła.', 'error');
    }
  });
}

function showMessage(container, message, type) {
  container.innerHTML = `<div class="message ${type}">${message}</div>`;
}

function handleUnauthorized() {
  localStorage.removeItem('token');
  window.location.replace('/');
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return { detail: await response.text() };
  }
}
