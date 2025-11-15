// schedule.js - Logika strony grafiku pracowników

// ============================================================================
// GLOBALNE ZMIENNE
// ============================================================================

let authHeader = '';
let calYear = null;
let calMonth = null;
let selectedDate = null;
let scheduleModal = null;
let isEditMode = false;
let editingScheduleId = null;

// Dane
let allWorkers = [];
let allProjects = []; // Lista wszystkich projektów
let scheduleData = new Map(); // Map<'YYYY-MM-DD', Array<schedule>>
let availabilityData = new Map(); // Map<userId, Map<'YYYY-MM-DD', availability>>
let absenceData = new Map(); // Map<userId, Array<absence>>
let workerMonthlyHours = new Map(); // Map<userId, {totalMinutes, projects}>

// Nazwy miesięcy
const monthNamesPl = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const dayNamesPl = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

// ============================================================================
// INICJALIZACJA
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('schedule.js: DOMContentLoaded fired');
  
  const rawToken = localStorage.getItem('token');
  const token = rawToken ? rawToken.trim() : '';
  
  if (!token) {
    console.warn('schedule.js: No token, redirecting');
    handleUnauthorized();
    return;
  }

  authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;

  // Inicjalizacja Bootstrap Modal
  const modalElement = document.getElementById('scheduleModal');
  if (modalElement) {
    scheduleModal = new bootstrap.Modal(modalElement);
  }

  // Event listenery
  setupEventListeners();
  
  // Inicjalizacja kalendarza
  try {
    await initCalendar();
  } catch (err) {
    console.error('Calendar init error:', err);
  }

  // Załaduj projekty, pracowników i dane
  await loadProjects();
  await loadWorkers();
  await loadMonthData();
});

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Filtr aktywnych pracowników
  const filterActiveOnly = document.getElementById('filterActiveOnly');
  if (filterActiveOnly) {
    filterActiveOnly.addEventListener('change', renderWorkersList);
  }

  // Wyszukiwarka pracowników
  const workerSearch = document.getElementById('workerSearch');
  if (workerSearch) {
    workerSearch.addEventListener('input', renderWorkersList);
  }

  // === GŁÓWNY FORMULARZ (scheduleFormMain) ===
  
  // Formularz główny - submit
  const scheduleFormMain = document.getElementById('scheduleFormMain');
  if (scheduleFormMain) {
    scheduleFormMain.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleSaveShiftMain();
    });
    
    scheduleFormMain.addEventListener('reset', () => {
      resetMainForm();
    });
  }
  
  // Wybór pracownika w głównym formularzu
  const shiftWorkerMain = document.getElementById('shiftWorkerMain');
  if (shiftWorkerMain) {
    shiftWorkerMain.addEventListener('change', async () => {
      await checkWorkerAvailabilityMain();
      await loadWorkerProjectsMain();
    });
  }
  
  // Zmiana godzin w głównym formularzu
  const shiftTimeFromMain = document.getElementById('shiftTimeFromMain');
  const shiftTimeToMain = document.getElementById('shiftTimeToMain');
  if (shiftTimeFromMain) {
    shiftTimeFromMain.addEventListener('change', checkTimeConflictsMain);
  }
  if (shiftTimeToMain) {
    shiftTimeToMain.addEventListener('change', checkTimeConflictsMain);
  }
  
  // Przycisk usuń
  const btnDeleteShiftMain = document.getElementById('btnDeleteShiftMain');
  if (btnDeleteShiftMain) {
    btnDeleteShiftMain.addEventListener('click', handleDeleteShiftMain);
  }

  // === MODAL (zachowany dla kompatybilności) ===
  
  // Przycisk dodaj zmianę
  const btnAddShift = document.getElementById('btnAddShift');
  if (btnAddShift) {
    btnAddShift.addEventListener('click', () => openScheduleModal());
  }

  // Przycisk zapisz zmianę
  const btnSaveShift = document.getElementById('btnSaveShift');
  if (btnSaveShift) {
    btnSaveShift.addEventListener('click', handleSaveShift);
  }

  // Wybór pracownika - sprawdzanie dostępności i ładowanie jego projektów
  const shiftWorker = document.getElementById('shiftWorker');
  if (shiftWorker) {
    shiftWorker.addEventListener('change', async () => {
      await checkWorkerAvailability();
      await loadWorkerProjects();
    });
  }

  // Zmiana godzin - sprawdzanie konfliktów
  const shiftTimeFrom = document.getElementById('shiftTimeFrom');
  const shiftTimeTo = document.getElementById('shiftTimeTo');
  if (shiftTimeFrom) {
    shiftTimeFrom.addEventListener('change', checkTimeConflicts);
  }
  if (shiftTimeTo) {
    shiftTimeTo.addEventListener('change', checkTimeConflicts);
  }

  // Reset modalu po zamknięciu
  const modalElement = document.getElementById('scheduleModal');
  if (modalElement) {
    modalElement.addEventListener('hidden.bs.modal', resetScheduleForm);
  }
}

// ============================================================================
// KALENDARZ
// ============================================================================

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

  // Populate year select
  yearSelect.innerHTML = '';
  const today = new Date();
  const baseYear = today.getFullYear();
  for (let y = baseYear - 1; y <= baseYear + 2; y++) {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    yearSelect.appendChild(opt);
  }

  // Initialize to current month/year
  const initDate = new Date();
  calYear = initDate.getFullYear();
  calMonth = initDate.getMonth();
  
  console.log('Calendar initialized to:', calYear, calMonth);
  
  syncMonthYearControls();
  renderCalendar();
  
  // Załaduj dane dla bieżącego miesiąca
  await loadMonthData();
  renderCalendar(); // Przerenderuj z danymi

  // Handlers
  monthSelect.addEventListener('change', async () => {
    calMonth = parseInt(monthSelect.value, 10);
    await loadMonthData();
    renderCalendar();
  });
  
  yearSelect.addEventListener('change', async () => {
    calYear = parseInt(yearSelect.value, 10);
    await loadMonthData();
    renderCalendar();
  });
  
  prevBtn.addEventListener('click', async () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    syncMonthYearControls();
    await loadMonthData();
    renderCalendar();
  });
  
  nextBtn.addEventListener('click', async () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    syncMonthYearControls();
    await loadMonthData();
    renderCalendar();
  });
}

function syncMonthYearControls() {
  const monthSelect = document.getElementById('calMonthSelect');
  const yearSelect = document.getElementById('calYearSelect');
  
  if (monthSelect) {
    monthSelect.value = String(calMonth);
  }
  
  if (yearSelect) {
    let yearOption = Array.from(yearSelect.options).some(o => Number(o.value) === calYear);
    if (!yearOption) {
      const opt = document.createElement('option');
      opt.value = String(calYear);
      opt.textContent = String(calYear);
      yearSelect.appendChild(opt);
    }
    yearSelect.value = String(calYear);
  }
}

function renderCalendar() {
  const grid = document.getElementById('calGrid');
  if (!grid) {
    console.warn('Calendar grid not found');
    return;
  }

  console.log('Rendering calendar for:', calYear, calMonth);

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
  const jsDow = firstOfMonth.getDay();
  const startOffset = (jsDow + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

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

        const dateStr = toApiDate(new Date(calYear, calMonth, day));
        const daySchedules = scheduleData.get(dateStr) || [];
        
        // Kolorowanie według zapełnienia grafiku - tylko 2 kolory
        if (daySchedules.length > 0) {
          btn.classList.add('schedule-full'); // zielony - jest grafik
        } else {
          btn.classList.add('schedule-empty'); // szary - brak grafiku
        }

        // Badge z liczbą zmian
        if (daySchedules.length > 0) {
          const badge = document.createElement('span');
          badge.className = 'shift-count';
          badge.textContent = String(daySchedules.length);
          btn.appendChild(badge);
        }

        // Highlight if today
        if (isCurrentMonth && day === todayDate) {
          btn.classList.add('today');
        }

        // Highlight if selected
        if (selectedDate === dateStr) {
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
}

function onCalendarDayClick(ev) {
  const btn = ev.currentTarget;
  const day = parseInt(btn.dataset.day, 10);
  if (!Number.isFinite(day)) return;
  
  selectedDate = toApiDate(new Date(calYear, calMonth, day));
  
  // Odznacz wszystkie dni
  const allBtns = document.querySelectorAll('#calGrid button[data-day]');
  allBtns.forEach(b => b.classList.remove('selected'));
  
  // Zaznacz kliknięty dzień
  btn.classList.add('selected');
  
  // Pokaż szczegóły dnia
  renderDayDetails();
  
  // Odśwież listę pracowników (aktualizuje kolory dostępności)
  renderWorkersList();
  
  // Ustaw datę w głównym formularzu
  const shiftDateMain = document.getElementById('shiftDateMain');
  if (shiftDateMain) {
    shiftDateMain.value = selectedDate;
  }
  
  // Aktywuj przycisk dodawania zmiany
  const btnAddShift = document.getElementById('btnAddShift');
  if (btnAddShift) {
    btnAddShift.disabled = false;
  }
}

// ============================================================================
// ŁADOWANIE DANYCH
// ============================================================================

async function loadProjects() {
  try {
    const response = await fetch('/projects/', {
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
      console.warn('Failed to load projects');
      return;
    }

    const data = await response.json();
    allProjects = data;
    
    console.log('Projects loaded:', allProjects.length);
  } catch (error) {
    console.error('Error loading projects:', error);
  }
}

async function loadWorkers() {
  try {
    const response = await fetch('/users/', {
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
      console.warn('Failed to load workers');
      return;
    }

    const data = await response.json();
    allWorkers = data.filter(u => u.role === 'worker' || u.role === 'hr');
    
    console.log('Workers loaded:', allWorkers.length);
    
    // Załaduj podsumowania godzin dla każdego pracownika
    await loadWorkersMonthlyHours();
    
    // Render listy
    renderWorkersList();
    
    // Populate select w modalu
    populateWorkerSelect();
    
    // Populate select w głównym formularzu
    populateWorkerSelectMain();
  } catch (error) {
    console.error('Error loading workers:', error);
  }
}

async function loadWorkersMonthlyHours() {
  if (!calYear || calMonth === null) return;
  
  workerMonthlyHours.clear();
  
  for (const worker of allWorkers) {
    try {
      // Załaduj sumę godzin z grafiku
      const schedules = await loadWorkerSchedules(worker.user_id, calMonth + 1, calYear);
      
      // Oblicz sumy
      let totalMinutes = 0;
      const projects = new Map();
      
      // Sumujemy wyłącznie zmiany typu 'normalna' (realne godziny w grafiku)
      schedules
        .filter(s => s.shift_type === 'normalna')
        .forEach(schedule => {
          const minutes = calculateMinutesBetween(schedule.time_from, schedule.time_to);
          totalMinutes += minutes;

          if (schedule.project_id) {
            const current = projects.get(schedule.project_id) || 0;
            projects.set(schedule.project_id, current + minutes);
          }
        });
      
      workerMonthlyHours.set(worker.user_id, {
        totalMinutes,
        projects: Array.from(projects.entries()).map(([id, mins]) => {
          const project = allProjects.find(p => p.project_id === id);
          return {
            project_id: id,
            project_name: project ? project.project_name : 'Nieznany',
            minutes: mins
          };
        })
      });
    } catch (error) {
      console.error(`Error loading hours for worker ${worker.user_id}:`, error);
      workerMonthlyHours.set(worker.user_id, { totalMinutes: 0, projects: [] });
    }
  }
  
  console.log('Workers monthly hours loaded');
}

async function loadWorkerSchedules(userId, month, year) {
  try {
    // Oblicz zakres dat dla miesiąca
    const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const url = `/schedule/user/${userId}?date_from=${dateFrom}&date_to=${dateTo}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading worker schedules:', error);
    return [];
  }
}

async function loadMonthData() {
  if (!authHeader || calYear === null || calMonth === null) {
    return;
  }

  // Załaduj grafik miesiąca
  await loadScheduleMonth();
  
  // Załaduj dostępności
  await loadAvailabilities();
  
  // Załaduj nieobecności
  await loadAbsences();
  
  // Załaduj podsumowania pracowników
  await loadWorkersMonthlyHours();
  
  // Odśwież widoki
  renderWorkersList();
  if (selectedDate) {
    renderDayDetails();
  }
}

async function loadScheduleMonth() {
  try {
    const url = '/schedule/month';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        month: calMonth + 1,
        year: calYear
      })
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      console.warn('Failed to load schedule month');
      return;
    }

    const data = await response.json();
    
    // Wyczyść poprzednie dane
    scheduleData.clear();
    
    // Zapisz dane (data jest array of DaySchedule)
    if (Array.isArray(data)) {
      data.forEach(daySchedule => {
        scheduleData.set(daySchedule.work_date, daySchedule.schedules || []);
      });
    }
    
    console.log('Schedule month loaded:', scheduleData.size, 'days');
  } catch (error) {
    console.error('Error loading schedule month:', error);
  }
}

async function loadAvailabilities() {
  try {
    const startDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
    const endDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const url = `/availability/?date_from=${encodeURIComponent(startDate)}&date_to=${encodeURIComponent(endDate)}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('Failed to load availabilities');
      return;
    }

    const data = await response.json();
    
    // Wyczyść poprzednie dane
    availabilityData.clear();
    
    // Zapisz dane pogrupowane po użytkownikach
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (!availabilityData.has(item.user_id)) {
          availabilityData.set(item.user_id, new Map());
        }
        availabilityData.get(item.user_id).set(item.date, item);
      });
    }
    
    console.log('Availabilities loaded');
  } catch (error) {
    console.error('Error loading availabilities:', error);
  }
}

async function loadAbsences() {
  try {
    const startDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
    const endDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const url = `/absences/?date_from=${encodeURIComponent(startDate)}&date_to=${encodeURIComponent(endDate)}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn('Failed to load absences');
      return;
    }

    const data = await response.json();
    
    // Wyczyść poprzednie dane
    absenceData.clear();
    
    // Zapisz dane pogrupowane po użytkownikach
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (!absenceData.has(item.user_id)) {
          absenceData.set(item.user_id, []);
        }
        absenceData.get(item.user_id).push(item);
      });
    }
    
    console.log('Absences loaded');
  } catch (error) {
    console.error('Error loading absences:', error);
  }
}

// ============================================================================
// RENDEROWANIE LISTY PRACOWNIKÓW
// ============================================================================

function renderWorkersList() {
  const container = document.getElementById('workersList');
  if (!container) return;

  // Pobierz filtry
  const filterActive = document.getElementById('filterActiveOnly')?.checked || false;
  const searchTerm = document.getElementById('workerSearch')?.value.toLowerCase() || '';

  // Filtruj pracowników
  let filtered = allWorkers.filter(worker => {
    if (filterActive && worker.account_status !== 'aktywny') {
      return false;
    }
    if (searchTerm) {
      const fullName = `${worker.first_name} ${worker.last_name}`.toLowerCase();
      return fullName.includes(searchTerm);
    }
    return true;
  });

  // Sortuj według dostępności i alfabetycznie
  filtered.sort((a, b) => {
    // Jeśli zaznaczono dzień, sortuj według dostępności
    if (selectedDate) {
      const availA = getWorkerAvailabilityForDate(a.user_id, selectedDate);
      const availB = getWorkerAvailabilityForDate(b.user_id, selectedDate);
      
      const priorityA = getAvailabilityPriority(availA);
      const priorityB = getAvailabilityPriority(availB);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
    }
    
    // Sortuj alfabetycznie po imieniu (drugorzędnie)
    return a.first_name.localeCompare(b.first_name);
  });

  // Render
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-muted">Brak pracowników spełniających kryteria.</p>';
    return;
  }

  filtered.forEach(worker => {
    const card = createWorkerCard(worker);
    container.appendChild(card);
  });
}

function createWorkerCard(worker) {
  const card = document.createElement('div');
  card.className = 'worker-card';
  card.dataset.workerId = worker.user_id;

  // Avatar (inicjały)
  const initials = (worker.first_name[0] + worker.last_name[0]).toUpperCase();
  
  // Podsumowanie godzin
  const monthlyData = workerMonthlyHours.get(worker.user_id) || { totalMinutes: 0, projects: [] };
  const hours = Math.floor(monthlyData.totalMinutes / 60);
  const minutes = monthlyData.totalMinutes % 60;
  
  // Dostępność dla wybranego dnia
  let availabilityBadge = '';
  if (selectedDate) {
    const availability = getWorkerAvailabilityForDate(worker.user_id, selectedDate);
    availabilityBadge = getAvailabilityBadge(availability);
  }

  card.innerHTML = `
    <div class="d-flex align-items-center">
      <div class="worker-avatar">${initials}</div>
      <div class="worker-info">
        <div class="worker-name">${worker.first_name} ${worker.last_name}</div>
        <div class="worker-role">${getRoleNamePL(worker.role)}</div>
      </div>
      ${availabilityBadge}
      <div class="worker-hours-badge ms-auto">
        ${hours}h ${minutes}min
      </div>
    </div>
    <div class="worker-projects">
      <h6>Projekty w ${monthNamesPl[calMonth]}:</h6>
      ${monthlyData.projects.length === 0 ? '<p class="text-muted small mb-0">Brak przypisanych projektów</p>' : ''}
      ${monthlyData.projects.map(proj => {
        const projHours = Math.floor(proj.minutes / 60);
        const projMinutes = proj.minutes % 60;
        return `
          <div class="project-item">
            <span class="project-name">${proj.project_name}</span>
            <span class="project-hours">${projHours}h ${projMinutes}min</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Kliknięcie - wypełnij formularz i rozwiń/zwiń projekty
  card.addEventListener('click', (e) => {
    // Nie rozwijaj jeśli kliknięto w ikonę dostępności
    if (e.target.closest('.availability-icon')) return;
    
    // Wypełnij formularz główny
    const shiftWorkerMain = document.getElementById('shiftWorkerMain');
    if (shiftWorkerMain) {
      shiftWorkerMain.value = worker.user_id;
      // Załaduj projekty dla tego pracownika
      loadWorkerProjectsMain();
      // Sprawdź dostępność
      checkWorkerAvailabilityMain();
    }
    
    card.classList.toggle('expanded');
  });

  return card;
}

function getRoleNamePL(role) {
  const roles = {
    'worker': 'Pracownik',
    'hr': 'HR',
    'admin': 'Administrator'
  };
  return roles[role] || role;
}

function getWorkerAvailabilityForDate(userId, dateStr) {
  // Sprawdź nieobecności
  const userAbsences = absenceData.get(userId) || [];
  const absence = userAbsences.find(a => dateStr >= a.date_from && dateStr <= a.date_to);
  if (absence) {
    return { type: 'absence', data: absence };
  }
  
  // Sprawdź dostępność
  const userAvailability = availabilityData.get(userId);
  if (userAvailability) {
    const availability = userAvailability.get(dateStr);
    if (availability) {
      if (!availability.is_available) {
        return { type: 'unavailable' };
      } else if (availability.time_from && availability.time_to) {
        return { type: 'partial', data: availability };
      } else {
        return { type: 'available' };
      }
    }
  }
  
  return null;
}

function getAvailabilityIcon(availability) {
  if (!availability) return '';
  
  const icons = {
    'available': '<i class="bi bi-check-circle-fill availability-icon available" title="Dostępny cały dzień"></i>',
    'partial': '<i class="bi bi-clock-fill availability-icon partial" title="Dostępny częściowo"></i>',
    'unavailable': '<i class="bi bi-x-circle-fill availability-icon unavailable" title="Niedostępny"></i>',
    'absence': '<i class="bi bi-calendar-x-fill availability-icon absence" title="Nieobecność"></i>'
  };
  
  return icons[availability.type] || '';
}

function getAvailabilityPriority(availability) {
  // Zwraca priorytet sortowania (niższy = wyżej na liście):
  // 1 = available (cały dzień)
  // 2 = partial (częściowa dostępność)
  // 3 = null (brak wpisu)
  // 4 = unavailable (niedostępny)
  // 5 = absence (nieobecność - urlop/L4/inne)
  if (!availability) return 3;
  
  switch (availability.type) {
    case 'available': return 1;
    case 'partial': return 2;
    case 'unavailable': return 4;
    case 'absence': return 5;
    default: return 3;
  }
}

function getAvailabilityBadge(availability) {
  if (!availability) return '';
  
  let badgeClass = '';
  let badgeText = '';
  
  switch (availability.type) {
    case 'available':
      badgeClass = 'available';
      badgeText = '\u2713'; // checkmark
      break;
    case 'partial':
      badgeClass = 'partial';
      // Pokaż godziny dostępności
      if (availability.data && availability.data.time_from && availability.data.time_to) {
        badgeText = `${availability.data.time_from.substring(0, 5)}-${availability.data.time_to.substring(0, 5)}`;
      } else {
        badgeText = '~';
      }
      break;
    case 'unavailable':
    case 'absence':
      badgeClass = 'unavailable';
      badgeText = '\u2715'; // x mark
      break;
  }
  
  return `<div class="availability-badge ${badgeClass}">${badgeText}</div>`;
}

// ============================================================================
// RENDEROWANIE SZCZEGÓŁÓW DNIA
// ============================================================================

function renderDayDetails() {
  const container = document.getElementById('dayDetailsContainer');
  const titleElement = document.getElementById('selectedDayTitle');
  
  if (!container || !selectedDate) return;

  // Aktualizuj tytuł
  const date = new Date(selectedDate);
  const dayName = dayNamesPl[date.getDay()];
  const dateFormatted = date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'long', year: 'numeric' });
  titleElement.textContent = `${dayName}, ${dateFormatted}`;

  // Pobierz grafik dla dnia
  const daySchedules = scheduleData.get(selectedDate) || [];

  container.innerHTML = '';

  // Render timeline
  const timelineHtml = renderTimeline(daySchedules);
  container.insertAdjacentHTML('beforeend', timelineHtml);

  // Render lista zmian
  const shiftsListHtml = renderShiftsList(daySchedules);
  container.insertAdjacentHTML('beforeend', shiftsListHtml);
}

function renderTimeline(schedules) {
  if (schedules.length === 0) {
    return `
      <div class="empty-state">
        <i class="bi bi-calendar-x"></i>
        <p>Brak zmian w grafiku dla tego dnia</p>
      </div>
    `;
  }

  // Sortuj zmiany po czasie rozpoczęcia
  const sorted = schedules.slice().sort((a, b) => {
    return a.time_from.localeCompare(b.time_from);
  });

  // Generuj oś czasu (0-24)
  let axisHtml = '<div class="timeline-axis">';
  for (let h = 0; h <= 24; h++) {
    axisHtml += `<div class="timeline-hour">${h}</div>`;
  }
  axisHtml += '</div>';

  // Generuj siatkę godzin
  let gridHtml = '<div class="timeline-hours-grid">';
  for (let h = 0; h < 24; h++) {
    gridHtml += '<div class="timeline-hour-column"></div>';
  }
  gridHtml += '</div>';

  // Generuj bloki zmian
  let shiftsHtml = '<div class="timeline-shifts">';
  
  // Grupuj zmiany po projektach
  const projectShifts = new Map();
  sorted.forEach(schedule => {
    const key = schedule.project_id || 'absence'; // Klucz dla nieobecności
    if (!projectShifts.has(key)) {
      projectShifts.set(key, {
        project_id: schedule.project_id,
        project_name: schedule.project_name || getShiftTypeName(schedule.shift_type),
        shifts: []
      });
    }
    projectShifts.get(key).shifts.push(schedule);
  });

  // Sortuj projekty alfabetycznie (nieobecności na końcu)
  const sortedProjects = Array.from(projectShifts.values()).sort((a, b) => {
    if (a.project_id === null && b.project_id !== null) return 1;
    if (a.project_id !== null && b.project_id === null) return -1;
    return a.project_name.localeCompare(b.project_name);
  });

  sortedProjects.forEach(projectGroup => {
    const projectColor = getProjectColor(projectGroup.project_id);
    
    // Pogrupuj zmiany w wierszu według nakładających się godzin
    const rows = [];
    projectGroup.shifts.forEach(shift => {
      const fromHour = parseTimeToDecimal(shift.time_from);
      const toHour = parseTimeToDecimal(shift.time_to);
      
      // Znajdź pierwszy wiersz, w którym ta zmiana się zmieści (nie nakłada się)
      let placed = false;
      for (let i = 0; i < rows.length; i++) {
        const canFit = !rows[i].some(existingShift => {
          const existingFrom = parseTimeToDecimal(existingShift.time_from);
          const existingTo = parseTimeToDecimal(existingShift.time_to);
          // Sprawdź czy nakładają się
          return fromHour < existingTo && toHour > existingFrom;
        });
        
        if (canFit) {
          rows[i].push(shift);
          placed = true;
          break;
        }
      }
      
      // Jeśli nie zmieściła się w żadnym wierszu, utwórz nowy
      if (!placed) {
        rows.push([shift]);
      }
    });
    
    // Renderuj grupę projektu z wieloma wierszami
    shiftsHtml += `<div class="timeline-project-group">`;
    shiftsHtml += `<div class="timeline-project-label" style="background-color: ${projectColor};" title="${projectGroup.project_name}">`;
    shiftsHtml += `${projectGroup.project_name}`;
    shiftsHtml += `</div>`;
    shiftsHtml += `<div class="timeline-project-rows">`;
    
    // Renderuj każdy wiersz
    rows.forEach(rowShifts => {
      shiftsHtml += `<div class="timeline-project-row-shifts">`;
      
      rowShifts.forEach(shift => {
        const fromHour = parseTimeToDecimal(shift.time_from);
        const toHour = parseTimeToDecimal(shift.time_to);
        const left = (fromHour / 24) * 100;
        const width = ((toHour - fromHour) / 24) * 100;
        
        const workerName = `${shift.first_name} ${shift.last_name}`;
        const projectInfo = shift.project_name ? ` - ${shift.project_name}` : '';
        
        shiftsHtml += `
          <div class="timeline-shift-block" 
               style="left: ${left}%; width: ${width}%; background-color: ${projectColor};"
               onclick="editSchedule(${shift.schedule_id})"
               title="${workerName} ${shift.time_from}-${shift.time_to}${projectInfo}">
            <span class="timeline-shift-worker">${shift.first_name} ${shift.last_name[0]}.</span>
            <span class="timeline-shift-time">${shift.time_from.substring(0,5)}</span>
          </div>
        `;
      });
      
      shiftsHtml += `</div>`; // timeline-project-row-shifts
    });
    
    shiftsHtml += `</div>`; // timeline-project-rows
    shiftsHtml += `</div>`; // timeline-project-group
  });
  
  shiftsHtml += '</div>';

  return `
    <div class="timeline-container">
      <div class="timeline-header">
        <span><i class="bi bi-clock-history me-2"></i>Timeline dnia (0-24h)</span>
        <span class="text-muted small">${schedules.length} ${schedules.length === 1 ? 'zmiana' : 'zmian'}</span>
      </div>
      ${axisHtml}
      <div class="timeline-grid">
        ${gridHtml}
      </div>
      ${shiftsHtml}
    </div>
  `;
}

function renderShiftsList(schedules) {
  if (schedules.length === 0) {
    return '';
  }

  // Sortuj zmiany
  const sorted = schedules.slice().sort((a, b) => {
    return a.time_from.localeCompare(b.time_from);
  });

  let html = '<div class="shifts-list"><h6 class="mb-3">Lista zmian:</h6>';

  sorted.forEach(schedule => {
    const workerName = `${schedule.first_name} ${schedule.last_name}`;
    const projectInfo = schedule.project_name ? `<span class="shift-project-name">${schedule.project_name}</span>` : '';
    
    html += `
      <div class="shift-card">
        <div class="d-flex justify-content-between align-items-start flex-wrap">
          <div class="shift-info">
            <span class="shift-worker-name"><i class="bi bi-person-fill me-1"></i>${workerName}</span>
            <span class="shift-time"><i class="bi bi-clock-fill me-1"></i>${schedule.time_from} - ${schedule.time_to}</span>
            ${projectInfo}
            <span class="badge shift-type-badge type-${schedule.shift_type}">${getShiftTypeName(schedule.shift_type)}</span>
          </div>
          <div class="d-flex gap-2 mt-2 mt-md-0">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="editSchedule(${schedule.schedule_id})">
              <i class="bi bi-pencil"></i> Edytuj
            </button>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="deleteSchedule(${schedule.schedule_id})">
              <i class="bi bi-trash"></i> Usuń
            </button>
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

function getShiftTypeName(type) {
  const types = {
    'normalna': 'Normalna',
    'urlop': 'Urlop',
    'L4': 'L4',
    'inne': 'Inne'
  };
  return types[type] || type;
}

// ============================================================================
// MODAL DODAWANIA/EDYCJI ZMIANY
// ============================================================================

function populateWorkerSelect() {
  const select = document.getElementById('shiftWorker');
  if (!select) return;

  select.innerHTML = '<option value="">Wybierz pracownika...</option>';

  const activeWorkers = allWorkers.filter(w => w.account_status === 'aktywny');
  activeWorkers.sort((a, b) => {
    const nameA = `${a.first_name} ${a.last_name}`;
    const nameB = `${b.first_name} ${b.last_name}`;
    return nameA.localeCompare(nameB);
  });

  activeWorkers.forEach(worker => {
    const option = document.createElement('option');
    option.value = worker.user_id;
    option.textContent = `${worker.first_name} ${worker.last_name}`;
    select.appendChild(option);
  });
}

async function openScheduleModal(scheduleId = null) {
  if (!scheduleModal) return;

  isEditMode = !!scheduleId;
  editingScheduleId = scheduleId;

  // Resetuj formularz
  resetScheduleForm();

  // Ustaw datę
  const dateInput = document.getElementById('shiftDate');
  if (dateInput) {
    dateInput.value = selectedDate || toApiDate(new Date());
  }

  if (isEditMode) {
    // Tryb edycji - załaduj dane zmiany
    await loadScheduleForEdit(scheduleId);
    document.getElementById('scheduleModalLabel').innerHTML = '<i class="bi bi-pencil me-2"></i>Edytuj zmianę';
  } else {
    // Tryb dodawania
    document.getElementById('scheduleModalLabel').innerHTML = '<i class="bi bi-plus-circle me-2"></i>Dodaj zmianę';
  }

  scheduleModal.show();
}

async function loadWorkerProjects() {
  const workerSelect = document.getElementById('shiftWorker');
  const projectSelect = document.getElementById('shiftProject');
  
  if (!workerSelect || !projectSelect) return;
  
  const userId = parseInt(workerSelect.value);
  
  if (!userId) {
    projectSelect.innerHTML = '<option value="">Najpierw wybierz pracownika...</option>';
    projectSelect.disabled = true;
    return;
  }
  
  try {
    // Pobierz wszystkie projekty
    const projectsResponse = await fetch('/projects', {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    
    if (!projectsResponse.ok) {
      console.warn('Failed to load projects');
      projectSelect.innerHTML = '<option value="">Błąd ładowania projektów</option>';
      return;
    }
    
    const allProjects = await projectsResponse.json();
    
    // Pobierz przypisania dla wybranego użytkownika
    const assignmentsResponse = await fetch(`/user_projects?user_id=${userId}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });
    
    if (!assignmentsResponse.ok) {
      console.warn('Failed to load user assignments');
      projectSelect.innerHTML = '<option value="">Błąd ładowania przypisanych projektów</option>';
      return;
    }
    
    const assignments = await assignmentsResponse.json();
    
    // Pobierz ID projektów przypisanych do użytkownika
    const userProjectIds = assignments.map(a => a.project_id);
    
    // Filtruj projekty przypisane do wybranego użytkownika
    const userProjects = allProjects.filter(p => userProjectIds.includes(p.project_id));
    
    projectSelect.innerHTML = '<option value="">Wybierz projekt...</option>';
    
    if (userProjects.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Brak przypisanych projektów dla tego pracownika';
      option.disabled = true;
      projectSelect.appendChild(option);
      projectSelect.disabled = true;
    } else {
      // Sortuj projekty alfabetycznie
      userProjects.sort((a, b) => a.project_name.localeCompare(b.project_name));
      
      userProjects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.project_id;
        option.textContent = project.project_name;
        projectSelect.appendChild(option);
      });
      projectSelect.disabled = false;
    }
  } catch (error) {
    console.error('Error loading worker projects:', error);
    projectSelect.innerHTML = '<option value="">Błąd ładowania projektów</option>';
  }
}

async function loadScheduleForEdit(scheduleId) {
  try {
    const response = await fetch(`/schedule/${scheduleId}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load schedule');
    }

    const schedule = await response.json();
    
    // Wypełnij formularz
    document.getElementById('shiftDate').value = schedule.work_date;
    document.getElementById('shiftWorker').value = schedule.user_id;
    document.getElementById('shiftTimeFrom').value = schedule.time_from;
    document.getElementById('shiftTimeTo').value = schedule.time_to;
    
    // Załaduj projekty pracownika
    await loadWorkerProjects();
    
    // Ustaw projekt jeśli jest
    if (schedule.project_id) {
      document.getElementById('shiftProject').value = schedule.project_id;
    }
    
    // Sprawdź dostępność
    await checkWorkerAvailability();
  } catch (error) {
    console.error('Error loading schedule for edit:', error);
    alert('Błąd ładowania danych zmiany');
    scheduleModal.hide();
  }
}

async function checkWorkerAvailability() {
  const workerSelect = document.getElementById('shiftWorker');
  const dateInput = document.getElementById('shiftDate');
  const infoDiv = document.getElementById('workerAvailabilityInfo');
  
  if (!workerSelect || !dateInput || !infoDiv) return;
  
  const userId = parseInt(workerSelect.value);
  const date = dateInput.value;
  
  if (!userId || !date) {
    infoDiv.innerHTML = '';
    infoDiv.className = 'form-text mt-2';
    return;
  }
  
  const availability = getWorkerAvailabilityForDate(userId, date);
  
  infoDiv.className = 'form-text mt-2';
  
  if (!availability) {
    infoDiv.innerHTML = '<i class="bi bi-info-circle me-1"></i>Brak deklaracji dostępności dla tego dnia';
    return;
  }
  
  if (availability.type === 'available') {
    infoDiv.classList.add('available');
    infoDiv.innerHTML = '<i class="bi bi-check-circle me-1"></i>Pracownik dostępny cały dzień';
  } else if (availability.type === 'partial') {
    infoDiv.classList.add('partial');
    infoDiv.innerHTML = `<i class="bi bi-clock me-1"></i>Pracownik dostępny w godzinach: ${availability.data.time_from} - ${availability.data.time_to}`;
  } else if (availability.type === 'unavailable') {
    infoDiv.classList.add('unavailable');
    infoDiv.innerHTML = '<i class="bi bi-x-circle me-1"></i>Uwaga: Pracownik oznaczony jako niedostępny';
  } else if (availability.type === 'absence') {
    infoDiv.classList.add('absence');
    infoDiv.innerHTML = `<i class="bi bi-calendar-x me-1"></i>Uwaga: Pracownik ma nieobecność (${availability.data.absence_type})`;
  }
}

async function checkTimeConflicts() {
  const workerSelect = document.getElementById('shiftWorker');
  const dateInput = document.getElementById('shiftDate');
  const timeFrom = document.getElementById('shiftTimeFrom');
  const timeTo = document.getElementById('shiftTimeTo');
  const conflictWarning = document.getElementById('conflictWarning');
  const conflictMessage = document.getElementById('conflictMessage');
  
  if (!workerSelect || !dateInput || !timeFrom || !timeTo || !conflictWarning || !conflictMessage) return;
  
  const userId = parseInt(workerSelect.value);
  const date = dateInput.value;
  const from = timeFrom.value;
  const to = timeTo.value;
  
  if (!userId || !date || !from || !to) {
    conflictWarning.style.display = 'none';
    return;
  }
  
  // Sprawdź czy godziny są poprawne
  if (from >= to) {
    conflictWarning.style.display = 'block';
    conflictMessage.textContent = 'Godzina rozpoczęcia musi być wcześniejsza niż godzina zakończenia';
    return;
  }
  
  // Pobierz zmiany dla tego dnia
  const daySchedules = scheduleData.get(date) || [];
  
  // Sprawdź konflikty dla tego samego pracownika
  const workerSchedules = daySchedules.filter(s => s.user_id === userId && s.schedule_id !== editingScheduleId);
  
  const hasConflict = workerSchedules.some(schedule => {
    return timeRangesOverlap(from, to, schedule.time_from, schedule.time_to);
  });
  
  if (hasConflict) {
    conflictWarning.style.display = 'block';
    conflictMessage.textContent = 'Uwaga: Ten pracownik ma już zmianę w tym czasie!';
  } else {
    conflictWarning.style.display = 'none';
  }
}

function timeRangesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

async function handleSaveShift() {
  const form = document.getElementById('scheduleForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Pobierz dane z formularza
  const userId = parseInt(document.getElementById('shiftWorker').value);
  const date = document.getElementById('shiftDate').value;
  const timeFrom = document.getElementById('shiftTimeFrom').value;
  const timeTo = document.getElementById('shiftTimeTo').value;
  
  // Typ zmiany - zawsze normalna
  const shiftType = 'normalna';
  
  // Projekt - zawsze wymagany
  const projectId = parseInt(document.getElementById('shiftProject').value);
  if (!projectId) {
    alert('Wybierz projekt');
    return;
  }

  // Walidacja czasu
  if (timeFrom >= timeTo) {
    alert('Godzina rozpoczęcia musi być wcześniejsza niż zakończenia');
    return;
  }

  // Sprawdź konflikty
  const daySchedules = scheduleData.get(date) || [];
  const workerSchedules = daySchedules.filter(s => s.user_id === userId && s.schedule_id !== editingScheduleId);
  const hasConflict = workerSchedules.some(schedule => {
    return timeRangesOverlap(timeFrom, timeTo, schedule.time_from, schedule.time_to);
  });

  if (hasConflict) {
    if (!confirm('Ten pracownik ma już zmianę w tym czasie. Czy na pewno chcesz dodać kolejną?')) {
      return;
    }
  }

  // Przygotuj payload
  const payload = {
    user_id: userId,
    work_date: date,
    time_from: timeFrom + ':00',
    time_to: timeTo + ':00',
    shift_type: shiftType,
    project_id: projectId
  };

  try {
    let response;
    
    if (isEditMode) {
      // PUT - edycja
      response = await fetch(`/schedule/${editingScheduleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } else {
      // POST - nowa zmiana
      response = await fetch('/schedule/', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || 'Błąd zapisywania zmiany');
    }

    // Sukces
    alert(isEditMode ? 'Zmiana zaktualizowana!' : 'Zmiana dodana do grafiku!');
    scheduleModal.hide();
    
    // Odśwież dane
    await loadMonthData();
    renderCalendar();
    if (selectedDate) {
      renderDayDetails();
    }
  } catch (error) {
    console.error('Error saving shift:', error);
    alert('Błąd: ' + (error.message || 'Nieznany błąd'));
  }
}

function resetScheduleForm() {
  const form = document.getElementById('scheduleForm');
  if (form) {
    form.reset();
  }
  
  isEditMode = false;
  editingScheduleId = null;
  
  // Reset listy projektów
  const projectSelect = document.getElementById('shiftProject');
  if (projectSelect) {
    projectSelect.innerHTML = '<option value="">Najpierw wybierz pracownika...</option>';
    projectSelect.disabled = true;
  }
  
  // Wyczyść ostrzeżenia
  document.getElementById('conflictWarning').style.display = 'none';
  document.getElementById('workerAvailabilityInfo').innerHTML = '';
  document.getElementById('workerAvailabilityInfo').className = 'form-text mt-2';
}

// ============================================================================
// EDYCJA I USUWANIE ZMIAN
// ============================================================================

window.editSchedule = async function(scheduleId) {
  await editScheduleMain(scheduleId);
};

async function editScheduleMain(scheduleId) {
  // Znajdź zmianę w danych
  let scheduleToEdit = null;
  for (const [date, schedules] of scheduleData.entries()) {
    const found = schedules.find(s => s.schedule_id === scheduleId);
    if (found) {
      scheduleToEdit = found;
      break;
    }
  }
  
  if (!scheduleToEdit) {
    alert('Nie znaleziono zmiany do edycji');
    return;
  }
  
  // Przejdź do trybu edycji
  isEditMode = true;
  editingScheduleId = scheduleId;
  
  // Wypełnij formularz
  document.getElementById('formTitle').textContent = 'Edytuj zmianę';
  document.getElementById('shiftDateMain').value = scheduleToEdit.work_date;
  document.getElementById('shiftWorkerMain').value = scheduleToEdit.user_id;
  
  // Załaduj projekty dla wybranego pracownika
  await loadWorkerProjectsMain();
  
  // Ustaw projekt
  document.getElementById('shiftProjectMain').value = scheduleToEdit.project_id;
  
  // Ustaw godziny (usuń sekundy)
  const timeFrom = scheduleToEdit.time_from.substring(0, 5);
  const timeTo = scheduleToEdit.time_to.substring(0, 5);
  document.getElementById('shiftTimeFromMain').value = timeFrom;
  document.getElementById('shiftTimeToMain').value = timeTo;
  
  // Pokaż przycisk usuń
  document.getElementById('btnDeleteShiftMain').style.display = 'inline-block';
  
  // Sprawdź dostępność
  await checkWorkerAvailabilityMain();
  await checkTimeConflictsMain();
  
  // Przewiń do formularza
  document.getElementById('scheduleFormMain').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

window.deleteSchedule = async function(scheduleId) {
  if (!confirm('Czy na pewno chcesz usunąć tę zmianę z grafiku?')) {
    return;
  }

  try {
    const response = await fetch(`/schedule/${scheduleId}`, {
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
      const errorText = await safeReadText(response);
      throw new Error(errorText || 'Błąd usuwania zmiany');
    }

    alert('Zmiana usunięta z grafiku!');
    
    // Odśwież dane
    await loadMonthData();
    renderCalendar();
    if (selectedDate) {
      renderDayDetails();
    }
  } catch (error) {
    console.error('Error deleting shift:', error);
    alert('Błąd: ' + (error.message || 'Nieznany błąd'));
  }
};

// ============================================================================
// FUNKCJE POMOCNICZE
// ============================================================================

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

function parseTimeToDecimal(timeStr) {
  // "HH:MM" -> decimal (e.g., "14:30" -> 14.5)
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + (minutes / 60);
}

function getProjectColor(projectId) {
  // Generuje spójny kolor dla projektu na podstawie ID
  if (!projectId) {
    return '#8b5cf6'; // Fioletowy dla nieobecności (urlop/L4/inne)
  }
  
  // Paleta kolorów dla projektów (ciepłe, czytelne kolory)
  const colors = [
    '#2e7d32', // Zielony
    '#1976d2', // Niebieski
    '#d32f2f', // Czerwony
    '#f57c00', // Pomarańczowy
    '#7b1fa2', // Fioletowy
    '#0097a7', // Cyjan
    '#c2185b', // Różowy
    '#5d4037', // Brązowy
    '#616161', // Szary
    '#00796b', // Morski
    '#e64a19', // Głęboka pomarańcza
    '#303f9f'  // Indygo
  ];
  
  return colors[projectId % colors.length];
}

function calculateMinutesBetween(timeFrom, timeTo) {
  const from = parseTimeToDecimal(timeFrom);
  const to = parseTimeToDecimal(timeTo);
  return Math.round((to - from) * 60);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// OBSŁUGA GŁÓWNEGO FORMULARZA (scheduleFormMain)
// ============================================================================

async function checkWorkerAvailabilityMain() {
  const workerSelect = document.getElementById('shiftWorkerMain');
  const dateInput = document.getElementById('shiftDateMain');
  const infoDiv = document.getElementById('workerAvailabilityInfoMain');
  
  if (!workerSelect || !dateInput || !infoDiv) return;
  
  const userId = parseInt(workerSelect.value);
  const date = dateInput.value;
  
  if (!userId || !date) {
    infoDiv.innerHTML = '';
    infoDiv.className = 'form-text mt-2';
    return;
  }
  
  const availability = getWorkerAvailabilityForDate(userId, date);
  
  infoDiv.className = 'form-text mt-2';
  
  if (!availability) {
    infoDiv.innerHTML = '<i class="bi bi-info-circle me-1"></i>Brak deklaracji dostępności dla tego dnia';
    return;
  }
  
  if (availability.type === 'available') {
    infoDiv.classList.add('available');
    infoDiv.innerHTML = '<i class="bi bi-check-circle me-1"></i>Pracownik dostępny cały dzień';
  } else if (availability.type === 'partial') {
    infoDiv.classList.add('partial');
    infoDiv.innerHTML = `<i class="bi bi-clock me-1"></i>Pracownik dostępny w godzinach: ${availability.data.time_from} - ${availability.data.time_to}`;
  } else if (availability.type === 'unavailable') {
    infoDiv.classList.add('unavailable');
    infoDiv.innerHTML = '<i class="bi bi-x-circle me-1"></i>Uwaga: Pracownik oznaczony jako niedostępny';
  } else if (availability.type === 'absence') {
    infoDiv.classList.add('absence');
    infoDiv.innerHTML = `<i class="bi bi-calendar-x me-1"></i>Uwaga: Pracownik ma nieobecność (${availability.data.absence_type})`;
  }
}

async function loadWorkerProjectsMain() {
  const workerSelect = document.getElementById('shiftWorkerMain');
  const projectSelect = document.getElementById('shiftProjectMain');
  
  if (!workerSelect || !projectSelect) return;
  
  const userId = parseInt(workerSelect.value);
  
  if (!userId) {
    projectSelect.innerHTML = '<option value="">Najpierw wybierz pracownika...</option>';
    projectSelect.disabled = true;
    return;
  }
  
  try {
    // Załaduj przypisania projektów dla tego użytkownika
    const userProjectsResponse = await fetch(`/user_projects?user_id=${userId}`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!userProjectsResponse.ok) {
      throw new Error('Błąd ładowania projektów użytkownika');
    }

    const userProjects = await userProjectsResponse.json();
    
    // Załaduj wszystkie projekty
    const projectsResponse = await fetch('/projects/', {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      }
    });

    if (!projectsResponse.ok) {
      throw new Error('Błąd ładowania projektów');
    }

    const allProjects = await projectsResponse.json();
    
    // Filtruj projekty przypisane do użytkownika
    const assignedProjectIds = new Set(userProjects.map(up => up.project_id));
    const assignedProjects = allProjects.filter(p => assignedProjectIds.has(p.project_id));
    
    // Wypełnij select
    projectSelect.innerHTML = '';
    
    if (assignedProjects.length === 0) {
      projectSelect.innerHTML = '<option value="">Brak przypisanych projektów</option>';
      projectSelect.disabled = true;
      return;
    }
    
    projectSelect.innerHTML = '<option value="">Wybierz projekt...</option>';
    assignedProjects.forEach(project => {
      const opt = document.createElement('option');
      opt.value = project.project_id;
      opt.textContent = project.project_name;
      projectSelect.appendChild(opt);
    });
    
    projectSelect.disabled = false;
  } catch (error) {
    console.error('Error loading worker projects:', error);
    projectSelect.innerHTML = '<option value="">Błąd ładowania projektów</option>';
    projectSelect.disabled = true;
  }
}

async function checkTimeConflictsMain() {
  const workerSelect = document.getElementById('shiftWorkerMain');
  const dateInput = document.getElementById('shiftDateMain');
  const timeFrom = document.getElementById('shiftTimeFromMain');
  const timeTo = document.getElementById('shiftTimeToMain');
  const conflictWarning = document.getElementById('conflictWarningMain');
  const conflictMessage = document.getElementById('conflictMessageMain');
  
  if (!workerSelect || !dateInput || !timeFrom || !timeTo || !conflictWarning || !conflictMessage) return;
  
  const userId = parseInt(workerSelect.value);
  const date = dateInput.value;
  const from = timeFrom.value;
  const to = timeTo.value;
  
  if (!userId || !date || !from || !to) {
    conflictWarning.style.display = 'none';
    return;
  }
  
  // Sprawdź czy godziny są poprawne
  if (from >= to) {
    conflictWarning.style.display = 'block';
    conflictMessage.textContent = 'Godzina rozpoczęcia musi być wcześniejsza niż godzina zakończenia';
    return;
  }
  
  // Pobierz zmiany dla tego dnia
  const daySchedules = scheduleData.get(date) || [];
  
  // Sprawdź konflikty dla tego samego pracownika
  const workerSchedules = daySchedules.filter(s => s.user_id === userId && s.schedule_id !== editingScheduleId);
  
  const hasConflict = workerSchedules.some(schedule => {
    return timeRangesOverlap(from, to, schedule.time_from, schedule.time_to);
  });
  
  if (hasConflict) {
    conflictWarning.style.display = 'block';
    conflictMessage.textContent = 'Uwaga: Ten pracownik ma już zmianę w tym czasie!';
  } else {
    conflictWarning.style.display = 'none';
  }
}

async function handleSaveShiftMain() {
  const form = document.getElementById('scheduleFormMain');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  // Pobierz dane z formularza
  const userId = parseInt(document.getElementById('shiftWorkerMain').value);
  const date = document.getElementById('shiftDateMain').value;
  const timeFrom = document.getElementById('shiftTimeFromMain').value;
  const timeTo = document.getElementById('shiftTimeToMain').value;
  
  // Typ zmiany - zawsze normalna
  const shiftType = 'normalna';
  
  // Projekt - zawsze wymagany
  const projectId = parseInt(document.getElementById('shiftProjectMain').value);
  if (!projectId) {
    alert('Wybierz projekt');
    return;
  }

  // Walidacja czasu
  if (timeFrom >= timeTo) {
    alert('Godzina rozpoczęcia musi być wcześniejsza niż zakończenia');
    return;
  }

  // Sprawdź konflikty
  const daySchedules = scheduleData.get(date) || [];
  const workerSchedules = daySchedules.filter(s => s.user_id === userId && s.schedule_id !== editingScheduleId);
  const hasConflict = workerSchedules.some(schedule => {
    return timeRangesOverlap(timeFrom, timeTo, schedule.time_from, schedule.time_to);
  });

  if (hasConflict) {
    if (!confirm('Ten pracownik ma już zmianę w tym czasie. Czy na pewno chcesz dodać kolejną?')) {
      return;
    }
  }

  // Przygotuj payload
  const payload = {
    user_id: userId,
    work_date: date,
    time_from: timeFrom + ':00',
    time_to: timeTo + ':00',
    shift_type: shiftType,
    project_id: projectId
  };

  try {
    let response;
    
    if (isEditMode) {
      // PUT - edycja
      response = await fetch(`/schedule/${editingScheduleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } else {
      // POST - nowa zmiana
      response = await fetch('/schedule/', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || 'Błąd zapisywania zmiany');
    }

    // Sukces
    alert(isEditMode ? 'Zmiana zaktualizowana!' : 'Zmiana dodana do grafiku!');
    resetMainForm();
    
    // Odśwież dane
    await loadMonthData();
    renderCalendar();
    renderWorkersList();
    if (selectedDate) {
      renderDayDetails();
    }
  } catch (error) {
    console.error('Error saving shift:', error);
    alert('Błąd: ' + (error.message || 'Nieznany błąd'));
  }
}

async function handleDeleteShiftMain() {
  if (!editingScheduleId) return;
  
  if (!confirm('Czy na pewno chcesz usunąć tę zmianę z grafiku?')) {
    return;
  }

  try {
    const response = await fetch(`/schedule/${editingScheduleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader
      }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const errorText = await safeReadText(response);
      throw new Error(errorText || 'Błąd usuwania zmiany');
    }

    alert('Zmiana usunięta z grafiku!');
    resetMainForm();
    
    // Odśwież dane
    await loadMonthData();
    renderCalendar();
    renderWorkersList();
    if (selectedDate) {
      renderDayDetails();
    }
  } catch (error) {
    console.error('Error deleting shift:', error);
    alert('Błąd: ' + (error.message || 'Nieznany błąd'));
  }
}

function resetMainForm() {
  const form = document.getElementById('scheduleFormMain');
  if (form) {
    form.reset();
  }
  
  isEditMode = false;
  editingScheduleId = null;
  
  // Reset tytułu
  document.getElementById('formTitle').textContent = 'Dodaj zmianę do grafiku';
  
  // Ukryj przycisk usuń
  document.getElementById('btnDeleteShiftMain').style.display = 'none';
  
  // Reset listy projektów
  const projectSelect = document.getElementById('shiftProjectMain');
  if (projectSelect) {
    projectSelect.innerHTML = '<option value="">Najpierw wybierz pracownika...</option>';
    projectSelect.disabled = true;
  }
  
  // Wyczyść ostrzeżenia
  document.getElementById('conflictWarningMain').style.display = 'none';
  document.getElementById('workerAvailabilityInfoMain').innerHTML = '';
  document.getElementById('workerAvailabilityInfoMain').className = 'form-text mt-2';
  
  // Załaduj wszystkich pracowników do selecta
  populateWorkerSelectMain();
}

function populateWorkerSelectMain() {
  const select = document.getElementById('shiftWorkerMain');
  if (!select) return;
  
  select.innerHTML = '<option value="">Wybierz pracownika...</option>';
  
  allWorkers
    .filter(w => w.account_status === 'aktywny')
    .sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`;
      const nameB = `${b.first_name} ${b.last_name}`;
      return nameA.localeCompare(nameB);
    })
    .forEach(worker => {
      const opt = document.createElement('option');
      opt.value = worker.user_id;
      opt.textContent = `${worker.first_name} ${worker.last_name}`;
      select.appendChild(opt);
    });
}
