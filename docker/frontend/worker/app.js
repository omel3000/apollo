// Czekaj na załadowanie contentu
function initializeApp() {
  // Menu interactions
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      menuItems.forEach(mi => mi.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Button interactions
  const accountBtn = document.getElementById('accountBtn');
  if (accountBtn) {
    accountBtn.addEventListener('click', function() {
      const messagePanel = document.querySelector('.messages-panel');
      if (messagePanel) {
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
      }
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      const messagePanel = document.querySelector('.messages-panel');
      if (messagePanel) {
        const tempMessage = document.createElement('div');
        tempMessage.className = 'message-item';
        tempMessage.style.background = '#fff5f5';
        tempMessage.style.borderLeftColor = '#fc8181';
        tempMessage.innerHTML = `
          <div class="message-title">Wylogowanie</div>
          <div class="message-text">Funkcja wylogowania zostanie wkrótce dodana.</div>
        `;
        messagePanel.appendChild(tempMessage);
        setTimeout(() => tempMessage.remove(), 3000);
      }
    });
  }
}

// Inicjalizuj app gdy content jest załadowany
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Lub czekaj na custom event z auth.js
window.addEventListener('contentLoaded', initializeApp);
