// Funkcja do formatowania daty
function formatMessageDate(createdAt) {
  const messageDate = new Date(createdAt);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Resetuj godziny dla porównania dat
  const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  // Formatuj godzinę (hh:mm)
  const hours = messageDate.getHours().toString().padStart(2, '0');
  const minutes = messageDate.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (messageDateOnly.getTime() === todayOnly.getTime()) {
    return `Dzisiaj, ${timeStr}`;
  } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
    return `Wczoraj, ${timeStr}`;
  } else {
    const day = messageDate.getDate().toString().padStart(2, '0');
    const month = (messageDate.getMonth() + 1).toString().padStart(2, '0');
    const year = messageDate.getFullYear();
    return `${day}.${month}.${year}, ${timeStr}`;
  }
}

// Funkcja do pobierania komunikatów z API
async function loadMessages() {
  console.log('loadMessages() called');
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('Brak tokenu - nie można pobrać komunikatów');
    displayError('Brak autoryzacji');
    return;
  }

  console.log('Pobieranie komunikatów z /messages...');

  try {
    const response = await fetch('/messages', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      console.error('Błąd pobierania komunikatów:', response.status);
      displayError(`Błąd: ${response.status}`);
      return;
    }

    const messages = await response.json();
    console.log('Pobrano komunikaty:', messages);
    
    // ZMIENIONE: Sortuj komunikaty od najnowszych do najstarszych
    messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    displayMessages(messages);
  } catch (error) {
    console.error('Błąd podczas pobierania komunikatów:', error);
    displayError('Błąd połączenia');
  }
}

// Funkcja do wyświetlania błędu
function displayError(errorMsg) {
  const messagesPanel = document.querySelector('.messages-panel');
  if (!messagesPanel) return;

  const messagesHeader = messagesPanel.querySelector('.panel-header');
  if (!messagesHeader) return;

  // Usuń istniejące komunikaty
  const existingMessages = messagesPanel.querySelectorAll('.message-item');
  existingMessages.forEach(msg => msg.remove());

  const errorElement = document.createElement('div');
  errorElement.className = 'message-item';
  errorElement.style.textAlign = 'center';
  errorElement.style.color = '#e53e3e';
  errorElement.innerHTML = `
    <div class="message-text">Nie udało się załadować komunikatów: ${errorMsg}</div>
  `;
  messagesHeader.insertAdjacentElement('afterend', errorElement);
}

// Funkcja do wyświetlania komunikatów
function displayMessages(messages) {
  console.log('displayMessages() called with', messages?.length || 0, 'messages');
  
  const messagesPanel = document.querySelector('.messages-panel');
  if (!messagesPanel) {
    console.error('Nie znaleziono panelu komunikatów');
    return;
  }

  // Znajdź sekcję z komunikatami (po headerze)
  const messagesHeader = messagesPanel.querySelector('.panel-header');
  if (!messagesHeader) {
    console.error('Nie znaleziono nagłówka komunikatów');
    return;
  }

  // Usuń wszystkie istniejące komunikaty (włącznie z "Ładowanie...")
  const existingMessages = messagesPanel.querySelectorAll('.message-item');
  console.log('Usuwanie', existingMessages.length, 'istniejących komunikatów');
  existingMessages.forEach(msg => msg.remove());

  // Jeśli brak komunikatów
  if (!messages || messages.length === 0) {
    console.log('Brak komunikatów do wyświetlenia');
    const noMessages = document.createElement('div');
    noMessages.className = 'message-item';
    noMessages.style.textAlign = 'center';
    noMessages.style.color = '#a0aec0';
    noMessages.innerHTML = `
      <div class="message-text">Brak aktywnych komunikatów</div>
    `;
    messagesHeader.insertAdjacentElement('afterend', noMessages);
    return;
  }

  // Sortuj komunikaty od najnowszych
  messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  console.log('Wyświetlanie', messages.length, 'komunikatów');

  // Dodaj komunikaty
  messages.forEach((message, index) => {
    console.log(`Dodawanie komunikatu ${index + 1}:`, message.title);
    const messageElement = document.createElement('div');
    messageElement.className = 'message-item';
    messageElement.innerHTML = `
      <div class="message-title">${escapeHtml(message.title)}</div>
      <div class="message-text">${escapeHtml(message.content)}</div>
      <div class="message-date">${formatMessageDate(message.created_at)}</div>
    `;
    messagesHeader.insertAdjacentElement('afterend', messageElement);
  });
}

// Funkcja pomocnicza do escapowania HTML (zabezpieczenie przed XSS)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let appInitialized = false;

function markActiveMenuByPath() {
  const path = window.location.pathname;
  if (path.includes('/worker/reports')) {
    const home = document.getElementById('menuHome');
    const time = document.getElementById('menuTime');
    if (home) home.classList.remove('active');
    if (time) time.classList.add('active');
  }
}

// Czekaj na załadowanie contentu
function initializeApp() {
  if (appInitialized) return;
  appInitialized = true;
  console.log('initializeApp() called');
  
  // Menu interactions
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      menuItems.forEach(mi => mi.classList.remove('active'));
      this.classList.add('active');
    });
  });

  markActiveMenuByPath();

  // Button interactions
  const accountBtn = document.getElementById('accountBtn');
  if (accountBtn) {
    accountBtn.addEventListener('click', function() {
      const messagePanel = document.querySelector('.messages-panel');
      if (!messagePanel) return;
      const tempMessage = document.createElement('div');
      tempMessage.className = 'message-item';
      tempMessage.style.background = '#e6fffa';
      tempMessage.style.borderLeftColor = '#38b2ac';
      tempMessage.innerHTML = `
        <div class="message-title">Przejście do ustawień konta</div>
        <div class="message-text">Funkcja ustawień konta zostanie wkrótce dodana.</div>
      `;
      messagePanel.appendChild(tempMessage);
      setTimeout(() => tempMessage.remove(), 3000);
    });
  }

  // Załaduj komunikaty z API
  console.log('Wywołanie loadMessages()...');
  loadMessages?.(); // wywołanie jeśli funkcja istnieje (tylko na stronie głównej)
}

// Inicjalizuj app gdy content jest załadowany
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Lub czekaj na custom event z auth.js
window.addEventListener('contentLoaded', () => {
  console.log('contentLoaded event - wywołanie initializeApp()');
  initializeApp();
});
