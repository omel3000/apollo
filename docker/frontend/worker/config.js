const defaultConfig = {
  page_title: "Panel Pracownika",
  menu_home: "Strona główna",
  menu_time: "Rejestracja czasu pracy",
  menu_summary: "Podsumowania",
  messages_title: "Komunikaty",
  welcome_message: "Witaj w systemie!",
  primary_color: "#4a5568",
  surface_color: "#ffffff",
  text_color: "#2d3748",
  accent_color: "#718096",
  font_family: "Segoe UI",
  font_size: 16
};

async function onConfigChange(config) {
  const primaryColor = config.primary_color || defaultConfig.primary_color;
  const surfaceColor = config.surface_color || defaultConfig.surface_color;
  const textColor = config.text_color || defaultConfig.text_color;
  const accentColor = config.accent_color || defaultConfig.accent_color;
  const fontFamily = config.font_family || defaultConfig.font_family;
  const fontSize = config.font_size || defaultConfig.font_size;

  document.getElementById('pageTitle').textContent = config.page_title || defaultConfig.page_title;
  document.getElementById('menuHomeText').textContent = config.menu_home || defaultConfig.menu_home;
  document.getElementById('menuTimeText').textContent = config.menu_time || defaultConfig.menu_time;
  document.getElementById('menuSummaryText').textContent = config.menu_summary || defaultConfig.menu_summary;
  document.getElementById('messagesTitle').textContent = config.messages_title || defaultConfig.messages_title;
  document.getElementById('welcomeMessage').textContent = config.welcome_message || defaultConfig.welcome_message;

  document.body.style.background = '#f7fafc';
  
  const headers = document.querySelectorAll('.header, .sidebar, .messages-panel');
  headers.forEach(el => el.style.background = surfaceColor);

  const textElements = document.querySelectorAll('.header-title, .panel-header, .message-title, .menu-item');
  textElements.forEach(el => el.style.color = textColor);

  const activeMenu = document.querySelector('.menu-item.active');
  if (activeMenu) {
    activeMenu.style.background = primaryColor;
    activeMenu.style.color = 'white';
  }

  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
      if (!this.classList.contains('active')) {
        this.style.background = primaryColor;
        this.style.color = surfaceColor;
      }
    });
    item.addEventListener('mouseleave', function() {
      if (!this.classList.contains('active')) {
        this.style.background = '';
        this.style.color = textColor;
      }
    });
  });

  const iconButtons = document.querySelectorAll('.icon-button');
  iconButtons.forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      this.style.background = primaryColor;
      this.style.borderColor = primaryColor;
    });
    btn.addEventListener('mouseleave', function() {
      this.style.background = '';
      this.style.borderColor = '';
    });
  });

  const welcomeBanner = document.querySelector('.welcome-banner');
  welcomeBanner.style.background = primaryColor;

  const panelHeader = document.querySelector('.panel-header');
  panelHeader.style.borderBottomColor = primaryColor;

  const messageItems = document.querySelectorAll('.message-item');
  messageItems.forEach(item => item.style.borderLeftColor = primaryColor);

  document.body.style.fontFamily = `${fontFamily}, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
  document.querySelector('.header-title').style.fontSize = `${fontSize * 1.5}px`;
  document.querySelector('.panel-header').style.fontSize = `${fontSize * 2}px`;
  document.querySelector('.welcome-text').style.fontSize = `${fontSize * 1.5}px`;
  document.querySelectorAll('.menu-item').forEach(el => el.style.fontSize = `${fontSize}px`);
  document.querySelectorAll('.message-title').forEach(el => el.style.fontSize = `${fontSize * 1.125}px`);
  document.querySelectorAll('.message-text').forEach(el => el.style.fontSize = `${fontSize * 0.9375}px`);
}

function mapToCapabilities(config) {
  return {
    recolorables: [
      {
        get: () => config.primary_color || defaultConfig.primary_color,
        set: (value) => {
          if (window.elementSdk) {
            window.elementSdk.setConfig({ primary_color: value });
          }
        }
      },
      {
        get: () => config.surface_color || defaultConfig.surface_color,
        set: (value) => {
          if (window.elementSdk) {
            window.elementSdk.setConfig({ surface_color: value });
          }
        }
      },
      {
        get: () => config.text_color || defaultConfig.text_color,
        set: (value) => {
          if (window.elementSdk) {
            window.elementSdk.setConfig({ text_color: value });
          }
        }
      },
      {
        get: () => config.accent_color || defaultConfig.accent_color,
        set: (value) => {
          if (window.elementSdk) {
            window.elementSdk.setConfig({ accent_color: value });
          }
        }
      }
    ],
    borderables: [],
    fontEditable: {
      get: () => config.font_family || defaultConfig.font_family,
      set: (value) => {
        if (window.elementSdk) {
          window.elementSdk.setConfig({ font_family: value });
        }
      }
    },
    fontSizeable: {
      get: () => config.font_size || defaultConfig.font_size,
      set: (value) => {
        if (window.elementSdk) {
          window.elementSdk.setConfig({ font_size: value });
        }
      }
    }
  };
}

function mapToEditPanelValues(config) {
  return new Map([
    ["page_title", config.page_title || defaultConfig.page_title],
    ["menu_home", config.menu_home || defaultConfig.menu_home],
    ["menu_time", config.menu_time || defaultConfig.menu_time],
    ["menu_summary", config.menu_summary || defaultConfig.menu_summary],
    ["messages_title", config.messages_title || defaultConfig.messages_title],
    ["welcome_message", config.welcome_message || defaultConfig.welcome_message]
  ]);
}

if (window.elementSdk) {
  window.elementSdk.init({
    defaultConfig,
    onConfigChange,
    mapToCapabilities,
    mapToEditPanelValues
  });
}
