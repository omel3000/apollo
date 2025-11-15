let authHeader = '';
let currentYear = null;
let currentMonth = null; // 0-11
let projectsMap = {}; // Map project_id -> { name, time_type }
let lastSummaryData = null; // do ponownego renderowania wykresu przy resize

const monthNamesPl = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const dayNamesPl = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

document.addEventListener('DOMContentLoaded', async () => {
  console.log('summary.js: DOMContentLoaded fired');
  
  const rawToken = localStorage.getItem('token');
  const token = rawToken ? rawToken.trim() : '';
  console.log('summary.js: token exists:', !!token);
  
  if (!token) {
    console.warn('summary.js: No token, redirecting');
    handleUnauthorized();
    return;
  }

  authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  
  // Initialize to current month
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();
  
  // Setup navigation buttons
  setupNavigation();
  
  // Load projects first, then summary
  try {
    await loadProjects();
    await loadMonthlySummary();
  } catch (error) {
    console.error('Initialization error:', error);
  }
  // Re-render wykres przy zmianie rozmiaru okna (responsywnie)
  window.addEventListener('resize', () => {
    if (lastSummaryData) {
      renderPieChart(lastSummaryData);
    }
  });
});

async function loadProjects() {
  console.log('Loading projects...');
  
  const response = await fetch('/user_projects/my_projects', {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json'
    }
  });

  if (response.status === 401) {
    handleUnauthorized();
    return;
  }

  if (!response.ok) {
    const message = await safeReadText(response);
    throw new Error(message || 'Błąd pobierania projektów');
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Błąd API: niepoprawny format odpowiedzi przy pobieraniu projektów');
  }

  // Build map (name + time_type)
  projectsMap = {};
  data.forEach(project => {
    projectsMap[project.project_id] = {
      name: project.project_name,
      time_type: project.time_type || 'constant'
    };
  });

  console.log('Projects loaded:', projectsMap);
}

function populateMonthYearSelects(monthSelect, yearSelect) {
  // Miesiące
  monthSelect.innerHTML = '';
  monthNamesPl.forEach((name, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = name;
    monthSelect.appendChild(opt);
  });

  // Lata w zakresie +/-5 od bieżącego
  yearSelect.innerHTML = '';
  const baseYear = new Date().getFullYear();
  for (let y = baseYear - 5; y <= baseYear + 5; y++) {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    yearSelect.appendChild(opt);
  }
}

function syncMonthYearSelects(monthSelect, yearSelect) {
  if (monthSelect) {
    monthSelect.value = String(currentMonth);
  }
  if (yearSelect) {
    let exists = Array.from(yearSelect.options).some(o => Number(o.value) === currentYear);
    if (!exists) {
      const opt = document.createElement('option');
      opt.value = String(currentYear);
      opt.textContent = String(currentYear);
      yearSelect.appendChild(opt);
    }
    yearSelect.value = String(currentYear);
  }
}

function setupNavigation() {
  const buttons = document.querySelectorAll('main form button');
  if (buttons.length < 3) {
    console.warn('Navigation buttons not found');
    return;
  }
  
  const prevBtn = buttons[0];
  const currentBtn = buttons[1];
  const nextBtn = buttons[2];

  const monthSelect = document.getElementById('sumMonthSelect');
  const yearSelect = document.getElementById('sumYearSelect');
  if (monthSelect && yearSelect) {
    populateMonthYearSelects(monthSelect, yearSelect);
    syncMonthYearSelects(monthSelect, yearSelect);
    monthSelect.addEventListener('change', () => {
      currentMonth = parseInt(monthSelect.value, 10);
      loadMonthlySummary();
    });
    yearSelect.addEventListener('change', () => {
      currentYear = parseInt(yearSelect.value, 10);
      loadMonthlySummary();
    });
  }
  
  prevBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    if (monthSelect && yearSelect) syncMonthYearSelects(monthSelect, yearSelect);
    loadMonthlySummary();
  });
  
  currentBtn.addEventListener('click', () => {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    if (monthSelect && yearSelect) syncMonthYearSelects(monthSelect, yearSelect);
    loadMonthlySummary();
  });
  
  nextBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    if (monthSelect && yearSelect) syncMonthYearSelects(monthSelect, yearSelect);
    loadMonthlySummary();
  });
}

async function loadMonthlySummary() {
  console.log('Loading summary for:', currentYear, currentMonth);
  
  // Update header
  const header = document.querySelector('main h2');
  if (header) {
    header.textContent = `${monthNamesPl[currentMonth]} ${currentYear}`;
  }

  // Utrzymaj spójność selektorów miesiąca/roku
  const ms = document.getElementById('sumMonthSelect');
  const ys = document.getElementById('sumYearSelect');
  if (ms && ys) {
    syncMonthYearSelects(ms, ys);
  }
  
  try {
    const response = await fetch('/work_reports/monthly_summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        month: currentMonth + 1, // Backend expects 1-12
        year: currentYear
      })
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const message = await safeReadText(response);
      throw new Error(message || 'Błąd pobierania podsumowania');
    }

    const data = await response.json();
    console.log('Monthly summary data:', data);
    lastSummaryData = data; // zapamiętaj do ponownego renderu
    
    renderSummary(data);
  } catch (error) {
    console.error('Error loading monthly summary:', error);
    alert('Nie udało się pobrać podsumowania miesięcznego.');
  }
}

function renderSummary(data) {
  // Update total time
  const totalHours = data.total_hours || 0;
  const totalMinutes = data.total_minutes || 0;
  
  const totalElement = document.querySelector('main h3 span');
  if (totalElement) {
    totalElement.textContent = `${totalHours}h ${totalMinutes}min`;
  }
  
  // Render pie chart
  renderPieChart(data);
  
  // Render detailed breakdown
  const section = document.querySelector('main section');
  if (!section) return;
  
  // Zachowaj nagłówek i wyczyść resztę
  const heading = section.querySelector('h3');
  section.innerHTML = '';
  if (heading) {
    section.appendChild(heading);
  } else {
    const newHeading = document.createElement('h3');
    newHeading.className = 'h4';
    newHeading.textContent = 'Szczegółowe rozpisanie';
    section.appendChild(newHeading);
  }

  // Kontener listy w stylu komunikatów
  const listContainer = document.createElement('div');
  listContainer.id = 'summary-details';
  listContainer.className = 'list-group';
  section.appendChild(listContainer);
  
  // Dane per dzień
  const dailyHours = data.daily_hours || [];
  
  if (dailyHours.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'list-group-item list-group-item-light';
    emptyMsg.textContent = 'Brak wpisów dla tego miesiąca.';
    listContainer.appendChild(emptyMsg);
    return;
  }
  
  dailyHours.forEach(dayData => {
    // Element dnia
    const dayItem = document.createElement('div');
    dayItem.className = 'list-group-item list-group-item-action list-group-item-light';
    
    // Parse date (format: YYYY-MM-DD)
    const [year, month, day] = dayData.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = dayNamesPl[dateObj.getDay()];
    const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;

    // Nagłówek dnia + suma
    const headerRow = document.createElement('div');
    headerRow.className = 'd-flex justify-content-between align-items-center mb-2';
    
    const titleEl = document.createElement('strong');
    titleEl.textContent = `${dayName}, ${dateStr}`;
    headerRow.appendChild(titleEl);

    // Oblicz sumę dla dnia
    const projectHours = dayData.project_hours || {};
    let dayTotalMin = 0;
    Object.values(projectHours).forEach(ph => {
      const h = (ph.hours || 0);
      const m = (ph.minutes || 0);
      dayTotalMin += h * 60 + m;
    });
    const totalH = Math.floor(dayTotalMin / 60);
    const totalM = dayTotalMin % 60;

    const totalEl = document.createElement('span');
    totalEl.className = 'badge badge-summary-day';
    totalEl.textContent = `Łącznie: ${totalH}h ${totalM}min`;
    headerRow.appendChild(totalEl);

    dayItem.appendChild(headerRow);

    // Lista szczegółowych wpisów dla dnia
    const entriesList = document.createElement('ul');
    entriesList.className = 'mb-0 ps-3';

    const placeholder = document.createElement('li');
    placeholder.className = 'text-muted';
    placeholder.textContent = 'Ładowanie wpisów...';
    entriesList.appendChild(placeholder);

    dayItem.appendChild(entriesList);
    listContainer.appendChild(dayItem);

    // Pobierz szczegółowe wpisy dla dnia i wyrenderuj
    fetchDayReports(dayData.date)
      .then(reports => {
        // Sortowanie: od najwcześniejszych godzin do najpóźniejszych
        const sorted = reports.slice().sort((a, b) => {
          // primary: time_from asc (missing -> Infinity)
          const aTf = parseHHMMToMinutes(a.time_from);
          const bTf = parseHHMMToMinutes(b.time_from);
          const aKey = (aTf === null ? Number.POSITIVE_INFINITY : aTf);
          const bKey = (bTf === null ? Number.POSITIVE_INFINITY : bTf);
          if (aKey !== bKey) return aKey - bKey;
          // secondary: created_at asc
          const aCt = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bCt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return aCt - bCt;
        });

        entriesList.innerHTML = '';
        if (sorted.length === 0) {
          const emptyLi = document.createElement('li');
          emptyLi.className = 'text-muted';
          emptyLi.textContent = 'Brak wpisów tego dnia.';
          entriesList.appendChild(emptyLi);
          return;
        }

        sorted.forEach(rep => {
          const li = document.createElement('li');
          const proj = projectsMap[rep.project_id] || { name: `Projekt #${rep.project_id}`, time_type: 'constant' };
          const h = Number(rep.hours_spent) || 0;
          const m = Number(rep.minutes_spent) || 0;

          // Nazwa projektu najpierw i pogrubiona
          const strongName = document.createElement('strong');
          strongName.textContent = proj.name;
          li.appendChild(strongName);

          // Tekst czasu po nazwie projektu
          let detailsText = ' — ';
          if (proj.time_type === 'from_to' && rep.time_from && rep.time_to) {
            detailsText += `${rep.time_from} – ${rep.time_to} (${h}h ${String(m).padStart(2,'0')}min)`;
          } else {
            detailsText += `${h}h ${String(m).padStart(2,'0')}min`;
          }
          li.appendChild(document.createTextNode(detailsText));

          // Opis (opcjonalny) pod spodem
          if (rep.description) {
            const desc = document.createElement('div');
            desc.className = 'text-muted small';
            desc.textContent = rep.description;
            li.appendChild(document.createElement('br'));
            li.appendChild(desc);
          }
          entriesList.appendChild(li);
        });
      })
      .catch(err => {
        console.error('Błąd pobierania wpisów dnia', dayData.date, err);
        entriesList.innerHTML = '';
        const errorLi = document.createElement('li');
        errorLi.className = 'text-danger';
        errorLi.textContent = 'Nie udało się pobrać wpisów dla tego dnia.';
        entriesList.appendChild(errorLi);
      });
  });
}

// Helpers
function parseHHMMToMinutes(val) {
  if (!val || typeof val !== 'string') return null;
  const parts = val.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

async function fetchDayReports(workDate) {
  const resp = await fetch(`/work_reports/?work_date=${encodeURIComponent(workDate)}`, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json'
    }
  });
  if (resp.status === 401) {
    handleUnauthorized();
    return [];
  }
  if (!resp.ok) {
    const msg = await safeReadText(resp);
    throw new Error(msg || 'Błąd pobierania wpisów dnia');
  }
  const data = await resp.json();
  if (!Array.isArray(data)) return [];
  return data;
}

function handleUnauthorized() {
  localStorage.removeItem('token');
  window.location.replace('/');
}

async function safeReadText(response) {
  try {
    return await response.text();
  } catch (error) {
    return '';
  }
}

function renderPieChart(data) {
  const canvas = document.getElementById('projectChart');
  if (!canvas) return;

  // Ustal rozmiar canvas na podstawie aktualnej szerokości kontenera (responsywnie)
  const dpr = window.devicePixelRatio || 1;
  const parentWidth = canvas.parentElement?.clientWidth || 400;
  // Ogranicz do mniejszego rozmiaru, żeby zmieścił się w karcie
  const cssWidth = Math.min(parentWidth * 0.85, 350); // 85% szerokości rodzica, max 350px
  const cssHeight = cssWidth; // kwadrat dla wykresu kołowego
  
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  
  // Ustaw style CSS dla responsywności
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // skalowanie do DPR

  // Czyść canvas w jednostkach CSS
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const centerX = cssWidth / 2;
  const centerY = cssHeight / 2;
  const radius = Math.min(cssWidth, cssHeight) / 2 - 20; // padding 20px

  // Calculate project totals in minutes
  const projectTotals = {};
  const dailyHours = data.daily_hours || [];
  
  dailyHours.forEach(dayData => {
    const projectHours = dayData.project_hours || {};
    Object.keys(projectHours).forEach(projectIdStr => {
      const projectId = parseInt(projectIdStr, 10);
      const projectData = projectHours[projectIdStr];
      const hours = projectData.hours || 0;
      const minutes = projectData.minutes || 0;
      const totalMinutes = hours * 60 + minutes;
      
      if (!projectTotals[projectId]) {
        projectTotals[projectId] = 0;
      }
      projectTotals[projectId] += totalMinutes;
    });
  });
  
  // Calculate total and percentages
  const totalMinutes = Object.values(projectTotals).reduce((sum, mins) => sum + mins, 0);
  
  if (totalMinutes === 0) {
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Brak danych', centerX, centerY);
    // Wyczyść legendę (jeśli była)
    ensureLegendContainer(canvas).innerHTML = '';
    return;
  }
  
  // Sort projects by time (descending - most hours first)
  const projectEntries = Object.entries(projectTotals).sort((a, b) => b[1] - a[1]);
  
  // Draw pie slices
  let currentAngle = -Math.PI / 2; // start at top
  
  projectEntries.forEach(([projectIdStr, minutes], index) => {
    const projectId = parseInt(projectIdStr, 10);
    const percentage = (minutes / totalMinutes) * 100;
    const sliceAngle = (minutes / totalMinutes) * 2 * Math.PI;
    
    // Draw slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = getProjectColor(projectId);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw percentage label in the middle of slice
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
    const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
    
    ctx.fillStyle = '#000';
    const fontSize = Math.max(11, Math.min(14, cssWidth / 25));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentage.toFixed(1)}%`, labelX, labelY);
    
    currentAngle += sliceAngle;
  });

  // Zewnętrzna legenda (HTML) poniżej canvas – responsywna, bez nachodzenia na wykres
  const legendContainer = ensureLegendContainer(canvas);
  legendContainer.innerHTML = '';
  legendContainer.style.display = 'flex';
  legendContainer.style.flexDirection = 'column';
  legendContainer.style.gap = '6px';
  legendContainer.style.marginTop = '16px';
  legendContainer.style.fontSize = '14px';

  projectEntries.forEach(([projectIdStr, minutes]) => {
    const projectId = parseInt(projectIdStr, 10);
    const projectName = (projectsMap[projectId] && projectsMap[projectId].name) || `Projekt #${projectId}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const color = getProjectColor(projectId);

    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.minHeight = '22px';

    const swatch = document.createElement('span');
    swatch.style.display = 'inline-block';
    swatch.style.width = '14px';
    swatch.style.height = '14px';
    swatch.style.borderRadius = '3px';
    swatch.style.background = color;
    swatch.style.marginRight = '8px';

    const label = document.createElement('span');
    label.textContent = `${projectName} (${hours}h ${mins}min)`;

    item.appendChild(swatch);
    item.appendChild(label);
    legendContainer.appendChild(item);
  });
}

function ensureLegendContainer(canvas) {
  let container = document.getElementById('projectChartLegend');
  if (!container) {
    container = document.createElement('div');
    container.id = 'projectChartLegend';
    // Wstaw tuż po canvas
    canvas.insertAdjacentElement('afterend', container);
  }
  return container;
}
