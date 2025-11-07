// Menu interactions
const menuItems = document.querySelectorAll('.menu-item');
menuItems.forEach(item => {
  item.addEventListener('click', function() {
    menuItems.forEach(mi => mi.classList.remove('active'));
    this.classList.add('active');
  });
});

// Button interactions
document.getElementById('accountBtn').addEventListener('click', function() {
  const messagePanel = document.querySelector('.messages-panel');
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

document.getElementById('logoutBtn').addEventListener('click', function() {
  const messagePanel = document.querySelector('.messages-panel');
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
});
