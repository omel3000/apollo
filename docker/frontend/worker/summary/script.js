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

// NOWE: statyczne kolory dla projektów 1..15 (deterministyczne)
const PROJECT_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#4a5568', '#48bb78', '#f56565', '#ed8936', '#9f7aea'
];

let summaryMonth = new Date().getMonth();
let summaryYear = new Date().getFullYear();

// NOWE: cache nazw projektów (mapa id → name)
const projectNames = new Map();
let projectsLoaded = false;

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

// ZMIANA: format wyjściowy "hh h mm min"
function formatHM(hours, minutes) {
  const h = Number.isFinite(hours) ? hours : parseInt(hours || 0, 10) || 0;
  const m = Number.isFinite(minutes) ? minutes : parseInt(minutes || 0, 10) || 0;
  return `${h}h ${m}min`;
}

// NOWE: pobierz przypisane projekty (mapa id → name)
async function loadMyProjects() {
  if (projectsLoaded) return projectNames;
  const token = localStorage.getItem('token');
  if (!token) return projectNames;
  try {
    const resp = await fetch('/user_projects/my_projects/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (resp.ok) {
      const data = await resp.json();
      (data || []).forEach(p => {
        const id = String(p.project_id);
        projectNames.set(id, p.project_name || `Projekt ${id}`);
      });
      projectsLoaded = true;
    }
  } catch {}
  return projectNames;
}

// NOWE: kolor dla project_id
function colorForProjectId(id) {
  const idx = (Math.max(1, parseInt(id, 10)) - 1) % PROJECT_COLORS.length;
  return PROJECT_COLORS[idx];
}

// NOWE: budowa danych do wykresu z project_hours
function buildChartData(summary) {
  const ph = summary?.project_hours || {};
  const entries = Object.entries(ph).map(([pid, val]) => {
    const hours = val?.hours || 0;
    const minutes = val?.minutes || 0;
    const totalMin = (hours * 60) + minutes;
    return {
      project_id: parseInt(pid, 10),
      name: projectNames.get(String(pid)) || `Projekt ${pid}`,
      minutes: totalMin,
      hours,
      mins: minutes,
      color: colorForProjectId(pid)
    };
  }).filter(x => x.minutes > 0);

  const grandTotal = entries.reduce((s, i) => s + i.minutes, 0) || 1;
  entries.forEach(i => { i.percent = (i.minutes / grandTotal) * 100; });
  entries.sort((a, b) => b.minutes - a.minutes);
  return { entries, grandTotal };
}

// NOWE: interaktywny wykres (hover + tooltip z hh h mm min)
let chartState = { data: null };

function drawPieChartFromData(data) {
  chartState.data = data;
  renderPieChart();
}

// ZMIANA: prosty render wykresu bez obsługi hover
function renderPieChart() {
  const canvas = document.getElementById('projectChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = chartState.data;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!data || !data.entries.length) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = 120;

  let currentAngle = -Math.PI / 2;

  data.entries.forEach((item) => {
    const sliceAngle = (item.minutes / data.grandTotal) * Math.PI * 2;
    const start = currentAngle;
    const end = currentAngle + sliceAngle;
    
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, baseRadius, start, end);
    ctx.closePath();

    ctx.fillStyle = item.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    currentAngle = end;
  });

  // Dodaj etykiety procentowe
  currentAngle = -Math.PI / 2;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Segoe UI, Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  data.entries.forEach((item) => {
    if (item.percent < 3) {
      const sliceAngle = (item.minutes / data.grandTotal) * Math.PI * 2;
      currentAngle += sliceAngle;
      return;
    }
    const sliceAngle = (item.minutes / data.grandTotal) * Math.PI * 2;
    const mid = currentAngle + sliceAngle / 2;
    const labelR = baseRadius * 0.65;
    const lx = centerX + Math.cos(mid) * labelR;
    const ly = centerY + Math.sin(mid) * labelR;
    ctx.fillText(`${Math.round(item.percent)}%`, lx, ly);
    currentAngle += sliceAngle;
  });
}

// NOWE: legenda na realnych danych (czas mm:hh jak wcześniej ustalone)
function generateLegendFromData(data) {
  const legendContainer = document.getElementById('chartLegend');
  if (!legendContainer) return;
  legendContainer.innerHTML = '';
  data.entries.forEach(item => {
    const div = document.createElement('div');
    div.className = 'legend-item';
    div.innerHTML = `
      <div class="legend-color" style="background-color:${item.color}"></div>
      <div class="legend-text">${item.name}</div>
      <div class="legend-hours">${formatHM(item.hours, item.mins)}</div>
    `;
    legendContainer.appendChild(div);
  });
}

// NOWE: nazwy dni PL i format daty dd.mm
const DAYS_PL = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'];
function formatDDMM(dateStr) {
  // dateStr w formacie YYYY-MM-DD
  const [y, m, d] = dateStr.split('-').map(v => parseInt(v, 10));
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${dd}.${mm}`;
}
function dayNamePL(dateStr) {
  const [y, m, d] = dateStr.split('-').map(v => parseInt(v, 10));
  const dt = new Date(y, m - 1, d);
  return DAYS_PL[dt.getDay()];
}

// NOWE: szczegółowy raport dzienny z daily_hours
function generateDailyBreakdownFromData(summary) {
  const container = document.getElementById('dailyBreakdown');
  if (!container) return;
  container.innerHTML = '';

  const daily = summary?.daily_hours || [];
  daily.forEach(day => {
    const entry = document.createElement('div');
    entry.className = 'day-entry';

    const header = document.createElement('div');
    header.className = 'day-header';
    header.textContent = `${dayNamePL(day.date)}, ${formatDDMM(day.date)}`;
    entry.appendChild(header);

    const list = document.createElement('div');
    list.className = 'project-list';

    const ph = day.project_hours || {};
    // posortuj projekty malejąco po łącznych minutach
    const rows = Object.entries(ph).map(([pid, val]) => {
      const hours = val?.hours || 0;
      const minutes = val?.minutes || 0;
      const mins = (hours * 60) + minutes;
      return { pid, hours, minutes, mins };
    }).sort((a, b) => b.mins - a.mins);

    rows.forEach(row => {
      const item = document.createElement('div');
      item.className = 'project-item';
      const name = projectNames.get(String(row.pid)) || `Projekt ${row.pid}`;
      item.innerHTML = `
        <div class="project-name">${name}</div>
        <div class="project-hours">${formatHM(row.hours, row.minutes)}</div>
      `;
      list.appendChild(item);
    });

    entry.appendChild(list);
    container.appendChild(entry);
  });
}

async function updateSummaryPage() {
  const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                     'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  document.getElementById('summaryMonthName').textContent = `${monthNames[summaryMonth]} ${summaryYear}`;

  // Pobierz dane i nazwy projektów
  const [summary] = await Promise.all([
    fetchMonthlySummary(summaryMonth, summaryYear),
    loadMyProjects()
  ]);

  // Łączny czas “hh h mm min”
  if (summary) {
    const h = summary.total_hours || 0;
    const m = summary.total_minutes || 0;
    document.getElementById('totalHours').textContent = formatHM(h, m);
  } else {
    document.getElementById('totalHours').textContent = '00h 00min';
  }

  // Wykres + legenda z realnych danych
  if (summary && summary.project_hours && Object.keys(summary.project_hours).length) {
    const chartData = buildChartData(summary);
    drawPieChartFromData(chartData);
    generateLegendFromData(chartData);
  } else {
    const canvas = document.getElementById('projectChart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const legendContainer = document.getElementById('chartLegend');
    if (legendContainer) legendContainer.innerHTML = '';
  }

  // NOWE: szczegóły miesiąca (dni)
  if (summary && Array.isArray(summary.daily_hours)) {
    generateDailyBreakdownFromData(summary);
  } else {
    const container = document.getElementById('dailyBreakdown');
    if (container) container.innerHTML = '';
  }
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
function initSummaryPage() {
  // Summary page event listeners
  document.getElementById('prevMonthBtn').addEventListener('click', () => navigateMonth(-1));
  document.getElementById('nextMonthBtn').addEventListener('click', () => navigateMonth(1));
  document.getElementById('currentMonthBtn').addEventListener('click', goToCurrentMonth);

  // Button interactions
  document.getElementById('accountBtn').addEventListener('click', function() {
    showNotification('Funkcja ustawień konta zostanie wkrótce dodana', 'info');
  });

  document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('token');
    window.location.href = '/index.html';
  });

  // Inicjalizacja
  updateSummaryPage();
}

// ZAMIANA poprzedniego listenera DOMContentLoaded na bezpieczną inicjalizację
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSummaryPage);
} else {
  initSummaryPage();
}
