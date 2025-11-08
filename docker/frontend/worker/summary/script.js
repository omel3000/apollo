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

// NOWE: statyczne kolory projektów 1..15
const PROJECT_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#4a5568', '#48bb78', '#f56565', '#ed8936', '#9f7aea'
];

let summaryMonth = new Date().getMonth();
let summaryYear = new Date().getFullYear();

// NOWE: cache nazw projektów
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

function formatHM(hours, minutes) {
  const h = Number.isFinite(hours) ? hours : parseInt(hours || 0, 10) || 0;
  const m = Number.isFinite(minutes) ? minutes : parseInt(minutes || 0, 10) || 0;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

// NOWE: format mm:hh (zgodnie z wymaganiem dla legendy)
function formatMMHH(hours, minutes) {
  const h = Number.isFinite(hours) ? hours : parseInt(hours || 0, 10) || 0;
  const m = Number.isFinite(minutes) ? minutes : parseInt(minutes || 0, 10) || 0;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${mm}:${hh}`;
}

// NOWE: pobierz nazwy projektów przypisanych do usera
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
        if (p && typeof p.project_id !== 'undefined') {
          projectNames.set(String(p.project_id), p.project_name || `Projekt ${p.project_id}`);
        }
      });
      projectsLoaded = true;
    }
  } catch {}
  return projectNames;
}

// NOWE: mapowanie koloru do project_id (1..15 → stałe; reszta deterministycznie)
function colorForProjectId(id) {
  const idx = (Math.max(1, parseInt(id, 10)) - 1) % PROJECT_COLORS.length;
  return PROJECT_COLORS[idx];
}

// NOWE: budowa danych do wykresu z odpowiedzi summary
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
  // lepsza czytelność: sort malejąco po czasie
  entries.sort((a, b) => b.minutes - a.minutes);
  return { entries, grandTotal };
}

// NOWE: stan wykresu i tooltip
let chartState = { slices: [], centerX: 0, centerY: 0, radius: 120, hoveredIndex: -1, totalMinutes: 0 };
let chartTooltipEl = null;

function ensureTooltip() {
  if (chartTooltipEl) return chartTooltipEl;
  chartTooltipEl = document.createElement('div');
  chartTooltipEl.className = 'chart-tooltip';
  chartTooltipEl.style.display = 'none';
  document.body.appendChild(chartTooltipEl);
  return chartTooltipEl;
}

function showTooltip(x, y, text) {
  const el = ensureTooltip();
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.display = 'block';
}

function hideTooltip() {
  if (chartTooltipEl) chartTooltipEl.style.display = 'none';
}

// NOWE: rysowanie tortu + interaktywność
function drawPieChartFromData(data) {
  const canvas = document.getElementById('projectChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const baseRadius = 120;

  // clear
  ctx.clearRect(0, 0, width, height);

  // przygotuj kąty
  let currentAngle = -Math.PI / 2;
  chartState.slices = [];
  chartState.centerX = centerX;
  chartState.centerY = centerY;
  chartState.radius = baseRadius;
  chartState.totalMinutes = data.grandTotal;

  data.entries.forEach((item, index) => {
    const sliceAngle = (item.minutes / data.grandTotal) * Math.PI * 2;
    const start = currentAngle;
    const end = currentAngle + sliceAngle;
    chartState.slices.push({ start, end, item });
    currentAngle = end;
  });

  // narysuj kawałki (z podświetleniem hover)
  chartState.slices.forEach((slice, index) => {
    const hovered = index === chartState.hoveredIndex;
    const r = hovered ? baseRadius + 8 : baseRadius;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, r, slice.start, slice.end);
    ctx.closePath();
    ctx.fillStyle = slice.item.color;
    ctx.fill();

    // krawędź
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  // procenty na wykresie
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Segoe UI, Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  chartState.slices.forEach((slice, index) => {
    const mid = (slice.start + slice.end) / 2;
    const r = (index === chartState.hoveredIndex) ? baseRadius + 8 : baseRadius;
    const labelR = r * 0.65;
    const pct = slice.item.percent;

    // ukryj bardzo małe wartości (zatłoczone)
    if (pct < 3) return;

    const lx = centerX + Math.cos(mid) * labelR;
    const ly = centerY + Math.sin(mid) * labelR;
    ctx.fillText(`${Math.round(pct)}%`, lx, ly);
  });

  // obsługa interakcji
  if (!canvas._interactiveBound) {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const dx = mx - chartState.centerX;
      const dy = my - chartState.centerY;
      const dist = Math.sqrt(dx*dx + dy*dy);

      let newHover = -1;
      if (dist <= chartState.radius + 10) {
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2) { /* pozostawiamy zakres -π..π */ }
        // przesunięcie, bo zaczynamy od -π/2
        if (angle < -Math.PI / 2) angle += 2*Math.PI;
        const normAngle = angle;

        chartState.slices.forEach((s, idx) => {
          // normalizacja porównania
          const start = s.start;
          const end = s.end;
          // dopasuj normAngle do porównania (relatywnie do -π/2)
          if (normAngle >= start && normAngle <= end) {
            newHover = idx;
          }
        });
      }
      if (newHover !== chartState.hoveredIndex) {
        chartState.hoveredIndex = newHover;
        drawPieChartFromData(data);
      }
      if (newHover >= 0) {
        const item = chartState.slices[newHover].item;
        const hhmm = formatHM(item.hours, item.mins);
        showTooltip(e.clientX, e.clientY, `${item.name} — ${hhmm} (${Math.round(item.percent)}%)`);
      } else {
        hideTooltip();
      }
    });

    canvas.addEventListener('mouseleave', () => {
      chartState.hoveredIndex = -1;
      hideTooltip();
      drawPieChartFromData(data);
    });

    canvas._interactiveBound = true;
  }
}

// NOWE: legenda z realnymi danymi (czas w formacie mm:hh)
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
      <div class="legend-hours">${formatMMHH(item.hours, item.mins)}</div>
    `;
    legendContainer.appendChild(div);
  });
}

async function updateSummaryPage() {
  const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                     'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  document.getElementById('summaryMonthName').textContent = `${monthNames[summaryMonth]} ${summaryYear}`;

  // 1) Pobierz dane
  const [summary] = await Promise.all([
    fetchMonthlySummary(summaryMonth, summaryYear),
    loadMyProjects()
  ]);

  // 2) Ustaw łączny czas (hh:mm)
  if (summary) {
    const h = summary.total_hours || 0;
    const m = summary.total_minutes || 0;
    document.getElementById('totalHours').textContent = formatHM(h, m);
  } else {
    document.getElementById('totalHours').textContent = '00:00';
  }

  // 3) Jeżeli są dane projektowe – buduj wykres i legendę
  if (summary && summary.project_hours && Object.keys(summary.project_hours).length) {
    const chartData = buildChartData(summary);
    drawPieChartFromData(chartData);
    generateLegendFromData(chartData);
  } else {
    // brak danych – wyczyść wykres/legendę
    const canvas = document.getElementById('projectChart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const legendContainer = document.getElementById('chartLegend');
    if (legendContainer) legendContainer.innerHTML = '';
  }

  // UWAGA: dotychczasowe „sample” usunięto – korzystamy wyłącznie z prawdziwych danych
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

  // Initialize summary page
  ensureTooltip(); // NOWE
  updateSummaryPage();
}

// ZAMIANA poprzedniego listenera DOMContentLoaded na bezpieczną inicjalizację
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSummaryPage);
} else {
  initSummaryPage();
}
