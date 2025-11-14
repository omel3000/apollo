let authHeader = '';
let projectsCache = [];
let projectsReady = false;
let pendingWorkDate = null;
let reportsContainer = null;
let mainProjectSelect = null;

// --- Calendar state ---
let calYear = null;   // 4-digit year
let calMonth = null;  // 0-11
let reportedDates = new Set(); // Set of 'YYYY-MM-DD' strings for days with reports
const monthNamesPl = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

// Polskie święta (stałe i ruchome - przykładowe lata)
const polishHolidays = {
  // Stałe święta (miesiąc 1-based, dzień)
  fixed: [
    { month: 1, day: 1 },   // Nowy Rok
    { month: 1, day: 6 },   // Trzech Króli
    { month: 5, day: 1 },   // Święto Pracy
    { month: 5, day: 3 },   // Święto Konstytucji 3 Maja
    { month: 8, day: 15 },  // Wniebowzięcie NMP
    { month: 11, day: 1 },  // Wszystkich Świętych
    { month: 11, day: 11 }, // Święto Niepodległości
    { month: 12, day: 25 }, // Boże Narodzenie
    { month: 12, day: 26 }  // Drugi dzień Bożego Narodzenia
  ],
  // Ruchome święta (rok -> daty w formacie 'MM-DD')
  // Wielkanoc, Poniedziałek Wielkanocny, Zielone Świątki (49 dni po Wielkanocy), Boże Ciało (60 dni po Wielkanocy)
  movable: {
    2024: ['03-31', '04-01', '05-19', '05-30'], // Wielkanoc: 31 marca
    2025: ['04-20', '04-21', '06-08', '06-19'], // Wielkanoc: 20 kwietnia
    2026: ['04-05', '04-06', '05-24', '06-04'], // Wielkanoc: 5 kwietnia
    2027: ['03-28', '03-29', '05-16', '05-27'], // Wielkanoc: 28 marca
    2028: ['04-16', '04-17', '06-04', '06-15'], // Wielkanoc: 16 kwietnia
    2029: ['04-01', '04-02', '05-20', '05-31'], // Wielkanoc: 1 kwietnia
    2030: ['04-21', '04-22', '06-09', '06-20']  // Wielkanoc: 21 kwietnia
  }
};

function isPolishHoliday(year, month, day) {
  // Sprawdź święta stałe
  const isFixed = polishHolidays.fixed.some(h => h.month === month + 1 && h.day === day);
  if (isFixed) return true;
  
  // Sprawdź święta ruchome
  const movableForYear = polishHolidays.movable[year];
  if (movableForYear) {
    const dateStr = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return movableForYear.includes(dateStr);
  }
  return false;
}

// Listen for external date changes (e.g., prev/next/today buttons)
document.addEventListener('workdatechange', (e) => {
  try {
    const iso = e && e.detail && e.detail.date ? e.detail.date : null;
    if (!iso) return;
    const [y, m, d] = iso.split('-').map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return;
    const date = new Date(y, m - 1, d);
    if (calYear === null || calMonth === null) {
      calYear = y; calMonth = m - 1;
      renderCalendar();
      return;
    }
    const monthChanged = (calYear !== y) || (calMonth !== (m - 1));
    if (monthChanged) {
      calYear = y; calMonth = m - 1;
      syncMonthYearControls();
      renderCalendar();
    } else {
      // Only re-highlight selected day
      highlightSelectedDay(date);
    }
  } catch (err) {
    console.error('calendar workdatechange listener error:', err);
  }
});

window.handleWorkDateChange = function(newDate) {
  pendingWorkDate = newDate || window.getCurrentWorkDate() || null;
  refreshReportsIfReady();
};

document.addEventListener('DOMContentLoaded', async () => {
  console.log('reports.js: DOMContentLoaded fired');
  
  const rawToken = localStorage.getItem('token');
  const token = rawToken ? rawToken.trim() : '';
  console.log('reports.js: token exists:', !!token);
  
  if (!token) {
    console.warn('reports.js: No token, redirecting');
    handleUnauthorized();
    return;
  }

  authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  reportsContainer = document.getElementById('existingReports');
  mainProjectSelect = document.getElementById('projektSelect');
  
  console.log('reports.js: Elements found - container:', !!reportsContainer, 'select:', !!mainProjectSelect);

  try {
    console.log('reports.js: Starting loadProjects');
    await loadProjects();
    console.log('reports.js: Projects loaded, count:', projectsCache.length);
    projectsReady = true;
    if (!pendingWorkDate) {
      pendingWorkDate = window.getCurrentWorkDate() || toApiDate(new Date());
    }
    console.log('reports.js: Calling refreshReportsIfReady with date:', pendingWorkDate);
    refreshReportsIfReady();
  } catch (error) {
    console.error('reports.js: Error loading projects:', error);
    alert('Nie udało się pobrać listy projektów.');
  }

  setupSaveHandler();
  setupProjectSelectBehavior();

  // Initialize calendar UI
  try {
    initCalendar();
  } catch (err) {
    console.error('Calendar init error:', err);
  }
});

async function loadProjects() {
  console.log('loadProjects: Fetching /user_projects/my_projects');
  
  const response = await fetch('/user_projects/my_projects', {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json'
    }
  });

  console.log('loadProjects: Response status:', response.status);

  if (response.status === 401) {
    console.warn('loadProjects: Unauthorized');
    handleUnauthorized();
    return;
  }

  if (!response.ok) {
    const message = await safeReadText(response);
    console.error('loadProjects: Response not OK:', message);
    throw new Error(message || 'Błąd pobierania projektów');
  }

  const data = await response.json();
  console.log('loadProjects: Data received:', data);
  
  if (!Array.isArray(data)) {
    console.error('loadProjects: Data is not an array');
    throw new Error('Błąd API: niepoprawny format odpowiedzi przy pobieraniu projektów');
  }

  projectsCache = data.map(project => ({
    project_id: Number(project.project_id),
    project_name: project.project_name,
    time_type: project.time_type || 'constant'
  }));

  console.log('loadProjects: Projects cached:', projectsCache);

  if (mainProjectSelect) {
    // Najpierw dodaj domyślną opcję "Wybierz projekt"
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Wybierz projekt';
    defaultOption.selected = true;
    mainProjectSelect.innerHTML = '';
    mainProjectSelect.appendChild(defaultOption);
    
    // Następnie dodaj projekty
    if (projectsCache.length === 0) {
      const noProjectOption = document.createElement('option');
      noProjectOption.value = '';
      noProjectOption.textContent = 'Brak przypisanych projektów';
      noProjectOption.disabled = true;
      mainProjectSelect.appendChild(noProjectOption);
    } else {
      projectsCache.forEach(project => {
        const option = document.createElement('option');
        option.value = project.project_id;
        option.textContent = project.project_name;
        option.dataset.timeType = project.time_type || 'constant';
        mainProjectSelect.appendChild(option);
      });
    }
  }
}

async function loadReportsForDate(workDate) {
  if (!reportsContainer || !workDate) {
    return;
  }

  setReportsContainerMessage('Ładowanie wpisów...');

  try {
    const response = await fetch(`/work_reports/?work_date=${encodeURIComponent(workDate)}`, {
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
      throw new Error(message || 'Błąd pobierania wpisów');
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Błąd API: niepoprawny format odpowiedzi przy pobieraniu wpisów');
    }

    const sorted = data.slice().sort((a, b) => {
      const aTime = new Date(a.created_at || a.work_date).getTime();
      const bTime = new Date(b.created_at || b.work_date).getTime();
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
        return aTime - bTime;
      }
      return (a.report_id || 0) - (b.report_id || 0);
    });

    renderReports(sorted);
  } catch (error) {
    console.error(error);
    setReportsContainerMessage('Nie udało się pobrać wpisów.');
  }
}

function renderReports(reports) {
  if (!reportsContainer) {
    return;
  }

  reportsContainer.innerHTML = '';

  if (!reports.length) {
    setReportsContainerMessage('Brak wpisów dla wybranego dnia.');
    updateTotalTime([]);
    return;
  }

  const fragment = document.createDocumentFragment();
  reports.forEach(report => {
    fragment.appendChild(buildReportForm(report));
  });
  reportsContainer.appendChild(fragment);
  updateTotalTime(reports);
}

function updateTotalTime(reports) {
  let totalMinutes = 0;
  reports.forEach(report => {
    const hours = Number(report.hours_spent) || 0;
    const minutes = Number(report.minutes_spent) || 0;
    totalMinutes += (hours * 60) + minutes;
  });

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const totalTimeElement = document.getElementById('totalTime');
  if (totalTimeElement) {
    totalTimeElement.textContent = `Łącznie: ${totalHours}h ${remainingMinutes}min`;
  }
}

function buildReportForm(report) {
  const card = document.createElement('div');
  card.className = 'card mb-3';
  card.dataset.reportId = report.report_id;

  const cardBody = document.createElement('div');
  cardBody.className = 'card-body';

  const form = document.createElement('form');
  form.addEventListener('submit', (event) => event.preventDefault());
  
  // Store original values for change detection
  const originalValues = {
    project_id: report.project_id,
    description: report.description || '',
    hours: Number(report.hours_spent) || 0,
    minutes: Number(report.minutes_spent) || 0
  };

  // Projekt
  const projectGroup = document.createElement('div');
  projectGroup.className = 'mb-3';
  
  const projectLabel = document.createElement('label');
  const projectFieldId = `existing-project-${report.report_id}`;
  projectLabel.setAttribute('for', projectFieldId);
  projectLabel.className = 'form-label';
  projectLabel.textContent = 'Projekt:';
  
  const projectSelect = document.createElement('select');
  projectSelect.id = projectFieldId;
  projectSelect.name = 'project';
  projectSelect.className = 'form-select';
  populateProjectSelect(projectSelect, report.project_id);
  
  projectGroup.appendChild(projectLabel);
  projectGroup.appendChild(projectSelect);

  // Opis
  const descriptionGroup = document.createElement('div');
  descriptionGroup.className = 'mb-3';
  
  const descriptionLabel = document.createElement('label');
  const descriptionId = `existing-description-${report.report_id}`;
  descriptionLabel.setAttribute('for', descriptionId);
  descriptionLabel.className = 'form-label';
  descriptionLabel.textContent = 'Opis (opcjonalny):';
  
  const descriptionArea = document.createElement('textarea');
  descriptionArea.id = descriptionId;
  descriptionArea.name = 'description';
  descriptionArea.className = 'form-control';
  descriptionArea.rows = 3;
  descriptionArea.value = report.description || '';
  
  descriptionGroup.appendChild(descriptionLabel);
  descriptionGroup.appendChild(descriptionArea);

  // Czas pracy (dynamiczny)
  const timeGroup = document.createElement('div');
  timeGroup.className = 'mb-3 time-group';
  const timeLabel = document.createElement('label');
  timeLabel.className = 'form-label';
  timeLabel.textContent = 'Czas pracy:';
  const timeRow = document.createElement('div');
  timeRow.className = 'row g-2';

  const projectType = (getProjectById(report.project_id)?.time_type) || 'constant';

  if (projectType === 'from_to') {
    const fromCol = document.createElement('div');
    fromCol.className = 'col-6';
    fromCol.innerHTML = `
      <div class="input-group">
        <span class="input-group-text">Od</span>
        <input type="time" name="time_from" class="form-control" step="60" placeholder="HH:MM" value="${report.time_from || ''}">
      </div>`;
    const toCol = document.createElement('div');
    toCol.className = 'col-6';
    toCol.innerHTML = `
      <div class="input-group">
        <span class="input-group-text">Do</span>
        <input type="time" name="time_to" class="form-control" step="60" placeholder="HH:MM" value="${report.time_to || ''}">
      </div>`;
    timeRow.appendChild(fromCol);
    timeRow.appendChild(toCol);

    const calcRow = document.createElement('div');
    calcRow.className = 'mt-2';
    const calcText = document.createElement('small');
    calcText.className = 'text-muted';
    calcRow.appendChild(calcText);

    const updateCalc = () => {
      const f = form.querySelector('input[name="time_from"]').value;
      const t = form.querySelector('input[name="time_to"]').value;
      if (!f || !t) { calcText.textContent = ''; return; }
      const diff = diffHHMM(f, t);
      if (!diff || diff.totalMinutes <= 0) {
        calcText.textContent = 'przepracowany czas: -';
      } else {
        calcText.textContent = `przepracowany czas: ${diff.hours}h ${String(diff.minutes).padStart(2,'0')}min`;
      }
    };
    // zainicjuj wyliczenie po złożeniu formularza
    setTimeout(updateCalc);

    timeGroup.appendChild(timeLabel);
    timeGroup.appendChild(timeRow);
    timeGroup.appendChild(calcRow);

    // Listenery po dodaniu w DOM
    setTimeout(() => {
      const tf = form.querySelector('input[name="time_from"]');
      const tt = form.querySelector('input[name="time_to"]');
      if (tf) tf.addEventListener('input', updateCalc);
      if (tt) tt.addEventListener('input', updateCalc);
    });
  } else {
    // standardowe pola godzin/minut
    const hoursCol = document.createElement('div');
    hoursCol.className = 'col-6';
    const hoursInputGroup = document.createElement('div');
    hoursInputGroup.className = 'input-group';
    const hoursInput = document.createElement('input');
    hoursInput.type = 'number';
    hoursInput.name = 'hours';
    hoursInput.min = '0';
    hoursInput.max = '24';
    hoursInput.value = Number(report.hours_spent) || 0;
    hoursInput.className = 'form-control';
    hoursInput.setAttribute('aria-label', 'Godziny');
    const hoursSpan = document.createElement('span');
    hoursSpan.className = 'input-group-text';
    hoursSpan.textContent = 'h';
    hoursInputGroup.appendChild(hoursInput);
    hoursInputGroup.appendChild(hoursSpan);
    hoursCol.appendChild(hoursInputGroup);

    const minutesCol = document.createElement('div');
    minutesCol.className = 'col-6';
    const minutesInputGroup = document.createElement('div');
    minutesInputGroup.className = 'input-group';
    const minutesInput = document.createElement('input');
    minutesInput.type = 'number';
    minutesInput.name = 'minutes';
    minutesInput.min = '0';
    minutesInput.max = '59';
    minutesInput.value = Number(report.minutes_spent) || 0;
    minutesInput.className = 'form-control';
    minutesInput.setAttribute('aria-label', 'Minuty');
    const minutesSpan = document.createElement('span');
    minutesSpan.className = 'input-group-text';
    minutesSpan.textContent = 'min';
    minutesInputGroup.appendChild(minutesInput);
    minutesInputGroup.appendChild(minutesSpan);
    minutesCol.appendChild(minutesInputGroup);

    timeRow.appendChild(hoursCol);
    timeRow.appendChild(minutesCol);
    timeGroup.appendChild(timeLabel);
    timeGroup.appendChild(timeRow);
  }

  // Przyciski
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'd-flex gap-2';
  
  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'btn btn-primary btn-save-changes';
  saveButton.innerHTML = '<i class="bi bi-save me-1"></i>Zapisz zmiany';
  saveButton.disabled = true; // Domyślnie nieaktywny
  saveButton.addEventListener('click', () => handleUpdateReport(report.report_id, form));
  
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'btn btn-outline-secondary';
  deleteButton.innerHTML = '<i class="bi bi-trash me-1"></i>Usuń';
  deleteButton.addEventListener('click', () => handleDeleteReport(report.report_id));
  
  // Funkcja sprawdzająca zmiany
  const checkForChanges = () => {
    const currentProject = Number(projectSelect.value);
    const currentDescription = descriptionArea.value;
    const pType = getProjectById(currentProject)?.time_type || 'constant';
    let currentHours = 0, currentMinutes = 0;
    if (pType === 'from_to') {
      const tf = form.querySelector('input[name="time_from"]')?.value || '';
      const tt = form.querySelector('input[name="time_to"]')?.value || '';
      const diff = tf && tt ? diffHHMM(tf, tt) : {hours:0, minutes:0, totalMinutes:0};
      currentHours = diff.hours || 0;
      currentMinutes = diff.minutes || 0;
    } else {
      const hEl = form.querySelector('input[name="hours"]');
      const mEl = form.querySelector('input[name="minutes"]');
      currentHours = hEl ? (Number(hEl.value) || 0) : 0;
      currentMinutes = mEl ? (Number(mEl.value) || 0) : 0;
    }
    const hasChanges = (
      currentProject !== originalValues.project_id ||
      currentDescription !== originalValues.description ||
      currentHours !== originalValues.hours ||
      currentMinutes !== originalValues.minutes
    );
    saveButton.disabled = !hasChanges;
  };
  
  // Dodaj event listenery do wykrywania zmian
  projectSelect.addEventListener('change', () => {
    // Przy zmianie projektu przebuduj sekcję czasu zgodnie z time_type
    const newProjectId = Number(projectSelect.value);
    const rebuilt = buildReportForm({ ...report, project_id: newProjectId });
    const newTimeGroup = rebuilt.querySelector('.time-group');

    // Zastąp aktualną sekcję czasu najnowszą wersją
    const currentTimeGroup = form.querySelector('.time-group');
    if (newTimeGroup && currentTimeGroup && currentTimeGroup.parentNode === form) {
      form.replaceChild(newTimeGroup, currentTimeGroup);

      // Jeśli nowy projekt jest typu from_to, dołącz listenery obliczające przepracowany czas
      const pType = (getProjectById(newProjectId)?.time_type) || 'constant';
      if (pType === 'from_to') {
        const tf = form.querySelector('input[name="time_from"]');
        const tt = form.querySelector('input[name="time_to"]');
        const calcText = form.querySelector('.time-group small.text-muted');
        const updateCalc = () => {
          const f = tf ? tf.value : '';
          const t = tt ? tt.value : '';
          if (!calcText) return;
          if (!f || !t) { calcText.textContent = ''; return; }
          const diff = diffHHMM(f, t);
          if (!diff || diff.totalMinutes <= 0) {
            calcText.textContent = 'przepracowany czas: -';
          } else {
            calcText.textContent = `przepracowany czas: ${diff.hours}h ${String(diff.minutes).padStart(2,'0')}min`;
          }
        };
        if (tf) tf.addEventListener('input', updateCalc);
        if (tt) tt.addEventListener('input', updateCalc);
        // inicjalne wyliczenie (jeśli pola mają wartości)
        updateCalc();
      }
    }

    checkForChanges();
  });
  descriptionArea.addEventListener('input', checkForChanges);
  form.addEventListener('input', (e) => {
    if (e.target && (e.target.name === 'hours' || e.target.name === 'minutes' || e.target.name === 'time_from' || e.target.name === 'time_to')) {
      checkForChanges();
    }
  });
  
  buttonGroup.appendChild(saveButton);
  buttonGroup.appendChild(deleteButton);

  // Złożenie formularza
  form.appendChild(projectGroup);
  form.appendChild(descriptionGroup);
  form.appendChild(timeGroup);
  form.appendChild(buttonGroup);

  cardBody.appendChild(form);
  card.appendChild(cardBody);

  return card;
}

function populateProjectSelect(selectElement, selectedId) {
  selectElement.innerHTML = '';

  const selectedValue = selectedId !== undefined && selectedId !== null ? Number(selectedId) : null;
  let selectedFound = false;
  projectsCache.forEach(project => {
    const option = document.createElement('option');
    option.value = project.project_id;
    option.textContent = project.project_name;
    if (selectedValue !== null && Number(project.project_id) === selectedValue) {
      option.selected = true;
      selectedFound = true;
    }
    selectElement.appendChild(option);
  });

  if (selectedValue !== null && !selectedFound) {
    const fallback = document.createElement('option');
    fallback.value = String(selectedValue);
    fallback.textContent = `Projekt #${selectedId}`;
    fallback.selected = true;
    selectElement.appendChild(fallback);
  }
}

function setupSaveHandler() {
  const saveButton = document.getElementById('saveBtn');
  if (!saveButton) {
    return;
  }

  saveButton.addEventListener('click', async (event) => {
    event.preventDefault();

    const projectSelectElement = document.getElementById('projektSelect');
    const projectId = parseInt(projectSelectElement.value, 10);
    const description = document.getElementById('opis').value;

    const selectedProject = getProjectById(projectId);
    const timeType = selectedProject ? selectedProject.time_type : 'constant';

    let hours, minutes, timeFrom = null, timeTo = null;
    if (timeType === 'from_to') {
      const fromEl = document.getElementById('czas_od');
      const toEl = document.getElementById('czas_do');
      const fromVal = fromEl ? fromEl.value : '';
      const toVal = toEl ? toEl.value : '';
      if (!fromVal || !toVal) {
        alert('Podaj przedział czasu: Od i Do');
        return;
      }
      timeFrom = fromVal;
      timeTo = toVal;
      const diff = diffHHMM(fromVal, toVal);
      if (!diff || diff.totalMinutes <= 0) {
        alert('Czas "Od" musi być wcześniejszy niż "Do"');
        return;
      }
      hours = diff.hours; minutes = diff.minutes;
    } else {
      hours = parseInt(document.getElementById('czas_h').value, 10);
      minutes = parseInt(document.getElementById('czas_m').value, 10);
    }

    let workDate = window.getCurrentWorkDate ? window.getCurrentWorkDate() : null;
    if (!workDate) {
      workDate = toApiDate(new Date());
    }

    if (!projectId) {
      alert('Wybierz projekt!');
      return;
    }

    if ((hours === 0 && minutes === 0) || hours > 24 || hours < 0 || minutes < 0 || minutes > 59) {
      alert('Podaj poprawny czas pracy (nie może być 0, max 24h)!');
      return;
    }

    try {
      const payload = {
        project_id: projectId,
        work_date: workDate,
        hours_spent: hours,
        minutes_spent: minutes,
        description
      };
      if (timeType === 'from_to') {
        payload.time_from = timeFrom;
        payload.time_to = timeTo;
      }

      const response = await fetch('/work_reports/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const message = await safeReadText(response);
        throw new Error(message || 'Błąd zapisu wpisu');
      }

      alert('Wpis dodany!');
      
      // Wyczyść formularz
  projectSelectElement.value = '';
  document.getElementById('opis').value = '';
  const timeGroup = document.getElementById('czas_group');
  if (timeGroup) timeGroup.classList.add('d-none');
  // reset pól czasu
  const hEl = document.getElementById('czas_h');
  const mEl = document.getElementById('czas_m');
  if (hEl) hEl.value = '0';
  if (mEl) mEl.value = '0';
  const fromEl2 = document.getElementById('czas_od');
  const toEl2 = document.getElementById('czas_do');
  if (fromEl2) fromEl2.value = '';
  if (toEl2) toEl2.value = '';
  const comp = document.getElementById('czas_wyliczony');
  if (comp) comp.textContent = '';

      pendingWorkDate = workDate;
      await loadReportedDatesForMonth(); // Odśwież kalendarz
      refreshReportsIfReady();
    } catch (error) {
      alert('Błąd: ' + (error && error.message ? error.message : 'Nieznany błąd'));
    }
  });
}

function setReportsContainerMessage(message) {
  if (reportsContainer) {
    reportsContainer.innerHTML = `<p>${message}</p>`;
  }
}

function getProjectById(id) {
  return projectsCache.find(p => Number(p.project_id) === Number(id)) || null;
}

function setupProjectSelectBehavior() {
  const select = document.getElementById('projektSelect');
  const timeGroup = ensureTimeGroupWrapper();
  // Ukryj na starcie aż do wyboru projektu
  if (timeGroup) timeGroup.classList.add('d-none');

  if (!select) return;
  select.addEventListener('change', () => {
    const val = select.value;
    if (!val) {
      if (timeGroup) timeGroup.classList.add('d-none');
      return;
    }
    const proj = getProjectById(val);
    const timeType = proj ? proj.time_type : 'constant';
    renderNewEntryTimeInputs(timeType);
    if (timeGroup) timeGroup.classList.remove('d-none');
  });
}

function ensureTimeGroupWrapper() {
  // Oznacz istniejącą grupę czasu id dla sterowania i dynamicznego renderowania
  const hoursEl = document.getElementById('czas_h');
  if (!hoursEl) return null;
  const timeGroup = hoursEl.closest('.mb-3');
  if (!timeGroup) return null;
  timeGroup.id = 'czas_group';
  return timeGroup;
}

function renderNewEntryTimeInputs(timeType) {
  const timeGroup = document.getElementById('czas_group');
  if (!timeGroup) return;
  const row = timeGroup.querySelector('.row');
  if (!row) return;

  // Usuń poprzednie pola Od/Do i licznik jeśli istnieją
  const oldFrom = document.getElementById('czas_od');
  const oldTo = document.getElementById('czas_do');
  const oldCalc = document.getElementById('czas_calc_row');
  if (oldFrom) oldFrom.closest('.col-6')?.remove();
  if (oldTo) oldTo.closest('.col-6')?.remove();
  if (oldCalc) oldCalc.remove();

  const hoursCol = row.children[0];
  const minsCol = row.children[1];
  if (!hoursCol || !minsCol) return;

  if (timeType === 'from_to') {
    // Schowaj H/M i pokaż Od/Do
    hoursCol.classList.add('d-none');
    minsCol.classList.add('d-none');

    const fromCol = document.createElement('div');
    fromCol.className = 'col-6';
    fromCol.innerHTML = `
      <div class="input-group">
        <span class="input-group-text">Od</span>
        <input type="time" id="czas_od" class="form-control" step="60" placeholder="HH:MM">
      </div>`;
    const toCol = document.createElement('div');
    toCol.className = 'col-6';
    toCol.innerHTML = `
      <div class="input-group">
        <span class="input-group-text">Do</span>
        <input type="time" id="czas_do" class="form-control" step="60" placeholder="HH:MM">
      </div>`;
    row.appendChild(fromCol);
    row.appendChild(toCol);

    const calcRow = document.createElement('div');
    calcRow.id = 'czas_calc_row';
    calcRow.className = 'mt-2';
    calcRow.innerHTML = `<small id="czas_wyliczony" class="text-muted"></small>`;
    timeGroup.appendChild(calcRow);

    const updateCalc = () => {
      const f = document.getElementById('czas_od')?.value || '';
      const t = document.getElementById('czas_do')?.value || '';
      const el = document.getElementById('czas_wyliczony');
      if (!el) return;
      if (!f || !t) { el.textContent = ''; return; }
      const diff = diffHHMM(f, t);
      if (!diff || diff.totalMinutes <= 0) {
        el.textContent = 'przepracowany czas: -';
      } else {
        el.textContent = `przepracowany czas: ${diff.hours}h ${String(diff.minutes).padStart(2,'0')}min`;
      }
    };
    document.getElementById('czas_od').addEventListener('input', updateCalc);
    document.getElementById('czas_do').addEventListener('input', updateCalc);
  } else {
    hoursCol.classList.remove('d-none');
    minsCol.classList.remove('d-none');
    const calc = document.getElementById('czas_calc_row');
    if (calc) calc.remove();
  }
}

function diffHHMM(fromStr, toStr) {
  const [fh, fm] = fromStr.split(':').map(n => parseInt(n, 10));
  const [th, tm] = toStr.split(':').map(n => parseInt(n, 10));
  if ([fh,fm,th,tm].some(n => Number.isNaN(n))) return null;
  const fromMin = fh * 60 + fm;
  const toMin = th * 60 + tm;
  const total = toMin - fromMin;
  if (total <= 0) return { totalMinutes: total, hours: 0, minutes: 0 };
  return { totalMinutes: total, hours: Math.floor(total/60), minutes: total % 60 };
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

function toApiDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function refreshReportsIfReady() {
  console.log('refreshReportsIfReady: Checking conditions...');
  console.log('  pendingWorkDate:', pendingWorkDate);
  console.log('  authHeader:', !!authHeader);
  console.log('  projectsReady:', projectsReady);
  console.log('  reportsContainer:', !!reportsContainer);
  
  if (!pendingWorkDate) {
    console.log('refreshReportsIfReady: No pending work date');
    return;
  }
  if (!authHeader) {
    console.log('refreshReportsIfReady: No auth header');
    return;
  }
  if (!projectsReady) {
    console.log('refreshReportsIfReady: Projects not ready');
    return;
  }
  if (!reportsContainer) {
    console.log('refreshReportsIfReady: No reports container');
    return;
  }
  
  console.log('refreshReportsIfReady: All conditions met, loading reports');
  loadReportsForDate(pendingWorkDate);
}

// =====================
// Simple Calendar (PL)
// =====================

async function initCalendar() {
  const container = document.getElementById('calendarContainer');
  if (!container) {
    console.warn('Calendar container not found');
    return;
  }

  const monthSelect = document.getElementById('calMonthSelect');
  const yearSelect = document.getElementById('calYearSelect');
  const prevBtn = document.getElementById('calPrevMonth');
  const nextBtn = document.getElementById('calNextMonth');

  if (!monthSelect || !yearSelect || !prevBtn || !nextBtn) {
    console.warn('Calendar controls not found');
    return;
  }

  // Populate month select
  monthSelect.innerHTML = '';
  monthNamesPl.forEach((name, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = name;
    monthSelect.appendChild(opt);
  });

  // Populate year select (currentYear-5 .. currentYear+5)
  yearSelect.innerHTML = '';
  const today = new Date(); // Always use current date for initialization
  const baseYear = today.getFullYear();
  for (let y = baseYear - 5; y <= baseYear + 5; y++) {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    yearSelect.appendChild(opt);
  }

  // ALWAYS initialize to current month/year
  const initDate = new Date();
  calYear = initDate.getFullYear();
  calMonth = initDate.getMonth();
  
  console.log('Calendar initialized to:', calYear, calMonth);
  
  syncMonthYearControls();
  await loadReportedDatesForMonth();
  renderCalendar();

  // Handlers
  monthSelect.addEventListener('change', async () => {
    calMonth = parseInt(monthSelect.value, 10);
    console.log('Month changed to:', calMonth);
    await loadReportedDatesForMonth();
    renderCalendar();
  });
  yearSelect.addEventListener('change', async () => {
    calYear = parseInt(yearSelect.value, 10);
    console.log('Year changed to:', calYear);
    await loadReportedDatesForMonth();
    renderCalendar();
  });
  prevBtn.addEventListener('click', async () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    console.log('Previous month:', calYear, calMonth);
    syncMonthYearControls();
    await loadReportedDatesForMonth();
    renderCalendar();
  });
  nextBtn.addEventListener('click', async () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    console.log('Next month:', calYear, calMonth);
    syncMonthYearControls();
    await loadReportedDatesForMonth();
    renderCalendar();
  });
}

function syncMonthYearControls() {
  const monthSelect = document.getElementById('calMonthSelect');
  const yearSelect = document.getElementById('calYearSelect');
  
  if (!monthSelect || !yearSelect) {
    console.warn('Month/Year selects not found in syncMonthYearControls');
    return;
  }
  
  console.log('Syncing controls to:', calYear, calMonth);
  
  if (monthSelect) {
    monthSelect.value = String(calMonth);
  }
  
  if (yearSelect) {
    // Ensure selected year exists in options; if not, extend range
    let yearOption = Array.from(yearSelect.options).some(o => Number(o.value) === calYear);
    if (!yearOption) {
      console.log('Adding year option:', calYear);
      // Extend to include calYear
      const opt = document.createElement('option');
      opt.value = String(calYear);
      opt.textContent = String(calYear);
      yearSelect.appendChild(opt);
    }
    yearSelect.value = String(calYear);
  }
}

async function loadReportedDatesForMonth() {
  if (!authHeader || calYear === null || calMonth === null) {
    return;
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
        month: calMonth + 1, // Backend expects 1-12
        year: calYear
      })
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      console.warn('Failed to load monthly summary for calendar');
      return;
    }

    const data = await response.json();
    
    // Wyczyść poprzednie daty
    reportedDates.clear();
    
    // Dodaj daty z raportami
    if (data.daily_hours && Array.isArray(data.daily_hours)) {
      data.daily_hours.forEach(dayData => {
        if (dayData.date) {
          reportedDates.add(dayData.date);
          console.log('Added reported date:', dayData.date);
        }
      });
    }
    
    console.log('Reported dates loaded:', reportedDates.size, 'dates:', Array.from(reportedDates));
  } catch (error) {
    console.error('Error loading reported dates:', error);
  }
}

function renderCalendar() {
  const grid = document.getElementById('calGrid');
  if (!grid) {
    console.warn('Calendar grid not found');
    return;
  }

  console.log('Rendering calendar for:', calYear, calMonth);

  // Get today's date for highlighting
  const today = new Date();
  const isCurrentMonth = (today.getFullYear() === calYear && today.getMonth() === calMonth);
  const todayDate = today.getDate();

  // Build table
  const table = document.createElement('table');
  table.setAttribute('role', 'grid');

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const weekDays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  weekDays.forEach(d => {
    const th = document.createElement('th');
    th.textContent = d;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const firstOfMonth = new Date(calYear, calMonth, 1);
  const jsDow = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const startOffset = (jsDow + 6) % 7; // 0-based index for Monday start
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  console.log('Days in month:', daysInMonth, 'Start offset:', startOffset);

  let day = 1;
  let rowsNeeded = Math.ceil((daysInMonth + startOffset) / 7);
  
  for (let r = 0; r < rowsNeeded; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < 7; c++) {
      const td = document.createElement('td');
      
      if (r === 0 && c < startOffset) {
        td.textContent = '';
      } else if (day > daysInMonth) {
        td.textContent = '';
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = String(day);
        btn.dataset.day = String(day);
        btn.addEventListener('click', onCalendarDayClick);

        // Sprawdź czy weekend (c: 5=So, 6=Nd)
        const isWeekend = (c === 5 || c === 6);
        // Sprawdź czy święto
        const isHoliday = isPolishHoliday(calYear, calMonth, day);
        // Sprawdź czy jest raport
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasReport = reportedDates.has(dateStr);
        
        console.log(`Day ${day}: dateStr=${dateStr}, hasReport=${hasReport}, isWeekend=${isWeekend}, isHoliday=${isHoliday}`);

        // Priorytet kolorowania:
        // 1. Weekend/święto z raportem -> fioletowy
        // 2. Weekend/święto bez raportu -> jasny czerwony
        // 3. Dzień roboczy z raportem -> pomarańczowy
        if ((isWeekend || isHoliday) && hasReport) {
          btn.classList.add('holiday-reported');
        } else if (isWeekend || isHoliday) {
          btn.classList.add('holiday');
        } else if (hasReport) {
          btn.classList.add('reported');
        }

        // Highlight if today
        if (isCurrentMonth && day === todayDate) {
          btn.classList.add('today');
        }

        // Highlight if matches currentDate
        const cur = window.currentDate instanceof Date ? window.currentDate : null;
        if (cur && cur.getFullYear() === calYear && cur.getMonth() === calMonth && cur.getDate() === day) {
          btn.classList.add('selected');
        }

        td.appendChild(btn);
        day++;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  grid.innerHTML = '';
  grid.appendChild(table);
  
  console.log('Calendar rendered successfully');
}

function highlightSelectedDay(dateObj) {
  const grid = document.getElementById('calGrid');
  if (!grid) return;
  const buttons = grid.querySelectorAll('button[data-day]');
  buttons.forEach(btn => {
    btn.classList.remove('selected');
  });
  if (!dateObj) return;
  if (dateObj.getFullYear() !== calYear || dateObj.getMonth() !== calMonth) return;
  const sel = grid.querySelector(`button[data-day="${dateObj.getDate()}"]`);
  if (sel) {
    sel.classList.add('selected');
  }
}

function onCalendarDayClick(ev) {
  const btn = ev.currentTarget;
  const day = parseInt(btn.dataset.day, 10);
  if (!Number.isFinite(day)) return;
  const picked = new Date(calYear, calMonth, day);
  
  // Update global currentDate
  window.currentDate = picked;
  
  // Notify date-navigator to update its internal state
  document.dispatchEvent(new CustomEvent('calendardatechange', {
    detail: { date: picked }
  }));
  
  // Update header (dayName, dateDisplay)
  updateHeaderFromDate(picked);
  
  // Notify the rest of the app
  notifyWorkDateChange(picked);
  
  // Highlight
  highlightSelectedDay(picked);
}

function updateHeaderFromDate(dateObj) {
  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const dayNameEl = document.getElementById('dayName');
  const dateDisplayEl = document.getElementById('dateDisplay');
  if (dayNameEl) dayNameEl.textContent = dayNames[dateObj.getDay()];
  if (dateDisplayEl) dateDisplayEl.textContent = dateObj.toLocaleDateString('pl-PL');
}

function notifyWorkDateChange(dateObj) {
  const isoDate = toApiDate(dateObj);
  document.dispatchEvent(new CustomEvent('workdatechange', { detail: { date: isoDate } }));
  if (typeof window.handleWorkDateChange === 'function') {
    try {
      window.handleWorkDateChange(isoDate);
    } catch (e) {
      console.error('handleWorkDateChange error:', e);
    }
  }
}

async function handleUpdateReport(reportId, formElement) {
  console.log('handleUpdateReport: Updating report', reportId);
  
  const projectSelect = formElement.querySelector('select[name="project"]');
  const descriptionArea = formElement.querySelector('textarea[name="description"]');
  const hoursInput = formElement.querySelector('input[name="hours"]');
  const minutesInput = formElement.querySelector('input[name="minutes"]');
  const tfInput = formElement.querySelector('input[name="time_from"]');
  const ttInput = formElement.querySelector('input[name="time_to"]');

  const projectId = parseInt(projectSelect.value, 10);
  const description = descriptionArea.value;
  const projectType = (getProjectById(projectId)?.time_type) || 'constant';
  let hours = 0, minutes = 0, timeFrom = null, timeTo = null;
  if (projectType === 'from_to') {
    const fromVal = tfInput ? tfInput.value : '';
    const toVal = ttInput ? ttInput.value : '';
    if (!fromVal || !toVal) {
      alert('Podaj przedział czasu: Od i Do');
      return;
    }
    const diff = diffHHMM(fromVal, toVal);
    if (!diff || diff.totalMinutes <= 0) {
      alert('Czas "Od" musi być wcześniejszy niż "Do"');
      return;
    }
    hours = diff.hours; minutes = diff.minutes;
    timeFrom = fromVal; timeTo = toVal;
  } else {
    hours = parseInt(hoursInput.value, 10);
    minutes = parseInt(minutesInput.value, 10);
  }

  if (!projectId) {
    alert('Wybierz projekt!');
    return;
  }

  if ((hours === 0 && minutes === 0) || hours > 24 || hours < 0 || minutes < 0 || minutes > 59) {
    alert('Podaj poprawny czas pracy (nie może być 0, max 24h)!');
    return;
  }

  let workDate = pendingWorkDate || window.getCurrentWorkDate() || toApiDate(new Date());

  try {
    const response = await fetch(`/work_reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify(Object.assign({
        project_id: projectId,
        work_date: workDate,
        hours_spent: hours,
        minutes_spent: minutes,
        description
      }, projectType === 'from_to' ? { time_from: timeFrom, time_to: timeTo } : {}))
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const message = await safeReadText(response);
      throw new Error(message || 'Błąd aktualizacji wpisu');
    }

    alert('Wpis zaktualizowany!');
    await loadReportedDatesForMonth(); // Odśwież kalendarz
    refreshReportsIfReady();
  } catch (error) {
    alert('Błąd: ' + (error && error.message ? error.message : 'Nieznany błąd'));
  }
}

async function handleDeleteReport(reportId) {
  console.log('handleDeleteReport: Deleting report', reportId);
  
  if (!confirm('Czy na pewno chcesz usunąć ten wpis?')) {
    return;
  }

  try {
    const response = await fetch(`/work_reports/${reportId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok && response.status !== 204) {
      const message = await safeReadText(response);
      throw new Error(message || 'Błąd usuwania wpisu');
    }

    alert('Wpis usunięty!');
    await loadReportedDatesForMonth(); // Odśwież kalendarz
    refreshReportsIfReady();
  } catch (error) {
    alert('Błąd: ' + (error && error.message ? error.message : 'Nieznany błąd'));
  }
}

// Funkcja do pobierania aktualnej daty z nawigacji
window.getCurrentWorkDate = function() {
  if (window.currentDate) {
    const d = window.currentDate;
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  return null;
};
