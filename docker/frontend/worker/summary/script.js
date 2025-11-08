const defaultConfig = {
  page_title: "Podsumowania miesięczne",
  menu_home: "Strona główna",
  menu_time: "Rejestracja czasu pracy",
  menu_summary: "Podsumowania",
  current_month_button: "Bieżący miesiąc",
  total_hours_label: "Łączna ilość godzin:",
  daily_breakdown_title: "Szczegółowe rozpisanie",
  primary_color: "#4a5568",
  surface_color: "#ffffff",
  text_color: "#2d3748",
  accent_color: "#48bb78",
  font_family: "Segoe UI",
  font_size: 16
};

let summaryMonth = new Date().getMonth();
let summaryYear = new Date().getFullYear();

async function onConfigChange(config) {
  const primaryColor = config.primary_color || defaultConfig.primary_color;
  const surfaceColor = config.surface_color || defaultConfig.surface_color;
  const textColor = config.text_color || defaultConfig.text_color;
  const accentColor = config.accent_color || defaultConfig.accent_color;
  const fontFamily = config.font_family || defaultConfig.font_family;
  const fontSize = config.font_size || defaultConfig.font_size;

  // Update text content
  document.getElementById('pageTitle').textContent = config.page_title || defaultConfig.page_title;
  document.getElementById('currentMonthBtn').textContent = config.current_month_button || defaultConfig.current_month_button;
  document.getElementById('totalHoursLabel').textContent = config.total_hours_label || defaultConfig.total_hours_label;
  document.getElementById('dailyBreakdownTitle').textContent = config.daily_breakdown_title || defaultConfig.daily_breakdown_title;
  document.getElementById('menuHomeText').textContent = config.menu_home || defaultConfig.menu_home;
  document.getElementById('menuTimeText').textContent = config.menu_time || defaultConfig.menu_time;
  document.getElementById('menuSummaryText').textContent = config.menu_summary || defaultConfig.menu_summary;

  // Apply colors
  document.body.style.background = '#f7fafc';
  
  const panels = document.querySelectorAll('.content-panel');
  panels.forEach(el => el.style.background = surfaceColor);

  const textElements = document.querySelectorAll('.header-title, .panel-header, .month-name, .total-label');
  textElements.forEach(el => el.style.color = textColor);

  const navButtons = document.querySelectorAll('.nav-button');
  navButtons.forEach(btn => btn.style.background = primaryColor);

  const currentMonthBtn = document.querySelector('.current-month-button');
  if (currentMonthBtn) currentMonthBtn.style.background = accentColor;

  // Apply font
  document.body.style.fontFamily = `${fontFamily}, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
  document.querySelector('.header-title').style.fontSize = `${fontSize * 2}px`;
  document.querySelector('.month-name').style.fontSize = `${fontSize * 2.25}px`;
  document.querySelector('.panel-header').style.fontSize = `${fontSize * 1.75}px`;
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
    ["current_month_button", config.current_month_button || defaultConfig.current_month_button],
    ["total_hours_label", config.total_hours_label || defaultConfig.total_hours_label],
    ["daily_breakdown_title", config.daily_breakdown_title || defaultConfig.daily_breakdown_title]
  ]);
}

// Initialize SDKs
if (window.elementSdk) {
  window.elementSdk.init({
    defaultConfig,
    onConfigChange,
    mapToCapabilities,
    mapToEditPanelValues
  });
}

// Summary page functions
async function fetchMonthlySummary(month, year) {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const resp = await fetch('/work_reports/monthly_summary', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ month: month + 1, year })
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function updateSummaryPage() {
  const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                     'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  document.getElementById('summaryMonthName').textContent = `${monthNames[summaryMonth]} ${summaryYear}`;

  // --- NOWE: pobierz dane z backendu ---
  const summary = await fetchMonthlySummary(summaryMonth, summaryYear);
  if (summary) {
    // Formatowanie hh:mm
    const h = summary.total_hours || 0;
    const m = summary.total_minutes || 0;
    document.getElementById('totalHours').textContent = `${h}h ${m.toString().padStart(2, '0')}min`;
  } else {
    document.getElementById('totalHours').textContent = '0h 00min';
  }

  // --- poniżej zostawiamy generowanie przykładowych danych tylko dla legendy i breakdown ---
  // generateSampleSummaryData(); // USUNIĘTO wywołanie (nie nadpisujemy totalHours)
  // Możesz tu dodać pobieranie i generowanie wykresu/legendy z prawdziwych danych w przyszłości
  generateSampleSummaryData();
}

function generateSampleSummaryData() {
  // Sample data - this will be replaced with real data from backend
  const sampleData = [
    { project: 'Projekt A - Rozwój aplikacji', hours: 45.5, color: '#4a5568' },
    { project: 'Projekt B - Analiza danych', hours: 32.0, color: '#48bb78' },
    { project: 'Projekt C - Testowanie', hours: 28.5, color: '#f56565' },
    { project: 'Administracja', hours: 15.0, color: '#ed8936' },
    { project: 'Spotkania', hours: 12.5, color: '#9f7aea' }
  ];

  const totalHours = sampleData.reduce((sum, item) => sum + item.hours, 0);
  // document.getElementById('totalHours').textContent = `${totalHours}h`;

  // Generate chart
  drawPieChart(sampleData, totalHours);
  
  // Generate legend
  generateLegend(sampleData);
  
  // Generate daily breakdown
  generateDailyBreakdown();
}

function drawPieChart(data, total) {
  const canvas = document.getElementById('projectChart');
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 120;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let currentAngle = -Math.PI / 2; // Start from top

  data.forEach(item => {
    const sliceAngle = (item.hours / total) * 2 * Math.PI;
    
    // Draw slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    currentAngle += sliceAngle;
  });
}

function generateLegend(data) {
  const legendContainer = document.getElementById('chartLegend');
  legendContainer.innerHTML = '';

  data.forEach(item => {
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    
    legendItem.innerHTML = `
      <div class="legend-color" style="background-color: ${item.color}"></div>
      <div class="legend-text">${item.project}</div>
      <div class="legend-hours">${item.hours}h</div>
    `;
    
    legendContainer.appendChild(legendItem);
  });
}

function generateDailyBreakdown() {
  const breakdownContainer = document.getElementById('dailyBreakdown');
  breakdownContainer.innerHTML = '';

  // Sample daily data
  const dailyData = [
    {
      date: '2024-01-15',
      dayName: 'Poniedziałek',
      projects: [
        { name: 'Projekt A - Rozwój aplikacji', hours: 6.5 },
        { name: 'Administracja', hours: 1.5 }
      ]
    },
    {
      date: '2024-01-16',
      dayName: 'Wtorek',
      projects: [
        { name: 'Projekt B - Analiza danych', hours: 7.0 },
        { name: 'Spotkania', hours: 1.0 }
      ]
    },
    {
      date: '2024-01-17',
      dayName: 'Środa',
      projects: [
        { name: 'Projekt C - Testowanie', hours: 5.5 },
        { name: 'Projekt A - Rozwój aplikacji', hours: 2.5 }
      ]
    }
  ];

  dailyData.forEach(day => {
    const dayEntry = document.createElement('div');
    dayEntry.className = 'day-entry';
    
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    dayHeader.textContent = `${day.dayName}, ${new Date(day.date).toLocaleDateString('pl-PL')}`;
    
    const projectList = document.createElement('div');
    projectList.className = 'project-list';
    
    day.projects.forEach(project => {
      const projectItem = document.createElement('div');
      projectItem.className = 'project-item';
      
      projectItem.innerHTML = `
        <div class="project-name">${project.name}</div>
        <div class="project-hours">${project.hours}h</div>
      `;
      
      projectList.appendChild(projectItem);
    });
    
    dayEntry.appendChild(dayHeader);
    dayEntry.appendChild(projectList);
    breakdownContainer.appendChild(dayEntry);
  });
}

function navigateMonth(direction) {
  summaryMonth += direction;
  
  if (summaryMonth > 11) {
    summaryMonth = 0;
    summaryYear++;
  } else if (summaryMonth < 0) {
    summaryMonth = 11;
    summaryYear--;
  }
  
  updateSummaryPage();
}

function goToCurrentMonth() {
  const now = new Date();
  summaryMonth = now.getMonth();
  summaryYear = now.getFullYear();
  updateSummaryPage();
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 90px;
    right: 30px;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
    font-weight: 500;
    color: white;
    background: #48bb78;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Event listeners initialization
document.addEventListener('DOMContentLoaded', function() {
  // Summary page event listeners
  document.getElementById('prevMonthBtn').addEventListener('click', () => navigateMonth(-1));
  document.getElementById('nextMonthBtn').addEventListener('click', () => navigateMonth(1));
  document.getElementById('currentMonthBtn').addEventListener('click', goToCurrentMonth);

  // Button interactions
  document.getElementById('accountBtn').addEventListener('click', function() {
    showNotification('Funkcja ustawień konta zostanie wkrótce dodana', 'info');
  });

  document.getElementById('logoutBtn').addEventListener('click', function() {
    showNotification('Funkcja wylogowania zostanie wkrótce dodana', 'info');
  });

  // Initialize summary page
  updateSummaryPage();
});
