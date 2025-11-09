const ALLOWED_ROLE = 'worker';

class AccessError extends Error {
  constructor(message, shouldLogout = false) {
    super(message);
    this.name = 'AccessError';
    this.shouldLogout = shouldLogout;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  registerStaticHandlers();
  initializeDashboard();
});

function registerStaticHandlers() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof logout === 'function') {
        logout();
      }
    });
  }
}

async function initializeDashboard() {
  const loadingOverlay = document.getElementById('loadingState');
  const mainContent = document.getElementById('mainContent');

  try {
    const user = await enforceWorkerAccess();
    personalizeView(user);
    loadingOverlay.classList.add('hidden');
    mainContent.classList.remove('hidden');
    window.dispatchEvent(new Event('contentLoaded'));
    await loadMessages();
  } catch (error) {
    showBlockingInfo(error.message);
    if (error instanceof AccessError && error.shouldLogout && typeof logout === 'function') {
      setTimeout(() => logout(), 1500);
    }
  }
}

async function enforceWorkerAccess() {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new AccessError('Brak aktywnej sesji. Zaloguj się ponownie.', true);
  }

  const response = await fetch('/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (response.status === 401) {
    throw new AccessError('Sesja wygasła. Zaloguj się ponownie.', true);
  }

  if (!response.ok) {
    throw new Error('Nie udało się zweryfikować uprawnień.');
  }

  const user = await response.json();
  if (user.role !== ALLOWED_ROLE) {
    throw new AccessError('Brak uprawnień do tego panelu.', true);
  }

  return user;
}

function personalizeView(user) {
  const welcomeMessage = document.getElementById('welcomeMessage');
  const badge = document.getElementById('userBadge');

  if (welcomeMessage) {
    const name = user.first_name || user.full_name || user.email || 'Pracowniku';
    welcomeMessage.textContent = `Witaj w systemie Apollo!`;
  }

  if (badge) {
    badge.textContent = `Rola: ${user.role}`;
  }
}

async function loadMessages() {
  const list = document.getElementById('messagesList');
  if (!list) return;

  const token = localStorage.getItem('token');
  if (!token) {
    showMessagesError('Brak tokenu uwierzytelniającego.');
    return;
  }

  setMessagesLoading();

  try {
    const response = await fetch('/messages/', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Nie udało się pobrać komunikatów.');
    }

    const messages = await response.json();
    renderMessages(Array.isArray(messages) ? messages : []);
  } catch (error) {
    showMessagesError('Błąd podczas ładowania komunikatów.');
    console.error(error);
  }
}

function setMessagesLoading() {
  const list = document.getElementById('messagesList');
  if (!list) return;
  list.innerHTML = '';
  const placeholder = document.createElement('div');
  placeholder.className = 'message-placeholder';
  placeholder.textContent = 'Ładowanie komunikatów...';
  list.appendChild(placeholder);
}

function renderMessages(messages) {
  const list = document.getElementById('messagesList');
  if (!list) return;
  list.innerHTML = '';

  if (messages.length === 0) {
    showMessagesEmpty();
    return;
  }

  const sorted = [...messages].sort((a, b) => {
    const dateA = new Date(a.created_at || a.date_posted || 0);
    const dateB = new Date(b.created_at || b.date_posted || 0);
    return dateB - dateA;
  });

  sorted.forEach(message => {
    const item = document.createElement('article');
    item.className = 'message-item';
    item.innerHTML = `
      <h4 class="message-title">${escapeHtml(message.title)}</h4>
      <p class="message-body">${escapeHtml(message.content)}</p>
      <span class="message-date">${formatMessageDate(message.created_at || message.date_posted)}</span>
    `;
    list.appendChild(item);
  });
}

function showMessagesEmpty() {
  const list = document.getElementById('messagesList');
  if (!list) return;
  const empty = document.createElement('div');
  empty.className = 'message-empty';
  empty.textContent = 'Brak komunikatów do wyświetlenia.';
  list.appendChild(empty);
}

function showMessagesError(text) {
  const list = document.getElementById('messagesList');
  if (!list) return;
  list.innerHTML = '';
  const errorBox = document.createElement('div');
  errorBox.className = 'message-empty';
  errorBox.textContent = text;
  list.appendChild(errorBox);
}

function showBlockingInfo(message) {
  const overlay = document.getElementById('loadingState');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  const textNode = overlay.querySelector('p');
  if (textNode) {
    textNode.textContent = message;
  }
}

function formatMessageDate(value) {
  if (!value) return '';
  const messageDate = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const time = messageDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });

  if (sameDay(messageDate, today)) {
    return `Dzisiaj, ${time}`;
  }
  if (sameDay(messageDate, yesterday)) {
    return `Wczoraj, ${time}`;
  }
  return messageDate.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}
