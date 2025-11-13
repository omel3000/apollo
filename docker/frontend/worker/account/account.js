let authHeader = '';
let failedAttempts = 0;
const MAX_FAILED_ATTEMPTS = 3;
const FAILED_ATTEMPTS_KEY = 'account_failed_attempts';
const TOKEN_KEY = 'account_token_hash';

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
  
  // Initialize or reset failed attempts based on token
  initializeFailedAttempts(token);
  
  // Setup form handlers
  setupChangeEmailForm();
  setupChangePasswordForm();
});

function initializeFailedAttempts(currentToken) {
  // Create a simple hash of the token to detect if it's a new login
  const tokenHash = simpleHash(currentToken);
  const storedTokenHash = localStorage.getItem(TOKEN_KEY);
  
  if (storedTokenHash !== tokenHash) {
    // New token = new login, reset attempts
    console.log('New token detected, resetting failed attempts');
    failedAttempts = 0;
    localStorage.setItem(TOKEN_KEY, tokenHash);
    localStorage.setItem(FAILED_ATTEMPTS_KEY, '0');
  } else {
    // Same token, load existing attempts
    const stored = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    failedAttempts = stored ? parseInt(stored, 10) : 0;
    console.log('Loaded failed attempts:', failedAttempts);
  }
}

function incrementFailedAttempts() {
  failedAttempts++;
  localStorage.setItem(FAILED_ATTEMPTS_KEY, failedAttempts.toString());
}

function resetFailedAttempts() {
  failedAttempts = 0;
  localStorage.setItem(FAILED_ATTEMPTS_KEY, '0');
}

function simpleHash(str) {
  // Simple hash function for token comparison
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

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
        
        incrementFailedAttempts();
        
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
          showMessage(messageDiv, `Błędne hasło. Przekroczono limit prób (${MAX_FAILED_ATTEMPTS}). Wylogowywanie...`, 'error');
          setTimeout(() => handleUnauthorized(), 2000);
          return;
        }
        
        const remainingAttempts = MAX_FAILED_ATTEMPTS - failedAttempts;
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
      resetFailedAttempts();
      
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
        
        incrementFailedAttempts();
        
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
          showMessage(messageDiv, `Błędne hasło. Przekroczono limit prób (${MAX_FAILED_ATTEMPTS}). Wylogowywanie...`, 'error');
          setTimeout(() => handleUnauthorized(), 2000);
          return;
        }
        
        const remainingAttempts = MAX_FAILED_ATTEMPTS - failedAttempts;
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
      resetFailedAttempts();
      
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  window.location.replace('/');
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return { detail: await response.text() };
  }
}
