async function loadMessages() {
  try {
    const response = await fetch('/messages/');
    if (!response.ok) {
      throw new Error('Nie udało się pobrać komunikatów');
    }
    
    const messages = await response.json();
    
    // Filtruj tylko aktywne wiadomości
    const activeMessages = messages.filter(msg => msg.is_active === true);
    
    // Sortuj od najnowszej do najstarszej
    activeMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    displayMessages(activeMessages);
  } catch (error) {
    console.error('Błąd przy pobieraniu komunikatów:', error);
    displayErrorMessage();
  }
}

function displayMessages(messages) {
  const container = document.getElementById('messages-container');
  
  if (!container) {
    console.error('Nie znaleziono kontenera na komunikaty');
    return;
  }
  
  container.innerHTML = '';
  
  if (messages.length === 0) {
    container.innerHTML = '<p>Brak aktywnych komunikatów.</p>';
    return;
  }
  
  messages.forEach(msg => {
    const section = document.createElement('section');
    const div = document.createElement('div');
    
    const title = document.createElement('p');
    title.innerHTML = `<strong>${escapeHtml(msg.title)}</strong>`;
    
    const content = document.createElement('p');
    content.textContent = msg.content;
    
    const date = document.createElement('p');
    date.innerHTML = `<small>${formatDate(msg.created_at)}</small>`;
    
    div.appendChild(title);
    div.appendChild(content);
    div.appendChild(date);
    section.appendChild(div);
    
    container.appendChild(section);
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}.${month}.${year}, ${hours}:${minutes}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function displayErrorMessage() {
  const container = document.getElementById('messages-container');
  if (container) {
    container.innerHTML = '<p style="color: red;">Nie udało się załadować komunikatów. Spróbuj ponownie później.</p>';
  }
}

// Załaduj komunikaty po załadowaniu strony
document.addEventListener('DOMContentLoaded', loadMessages);
