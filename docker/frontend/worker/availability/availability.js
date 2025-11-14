let authHeader = '';
let calYear = null;
let calMonth = null;
let availabilityData = new Map(); // Map<'YYYY-MM-DD', {is_available, time_from, time_to}>
let absenceData = []; // Array of absence objects

const monthNamesPl = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

// ============================================================================
// Inicjalizacja
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('availability.js: DOMContentLoaded fired');
  
  const rawToken = localStorage.getItem('token');
  const token = rawToken ? rawToken.trim() : '';
  
  if (!token) {
    console.warn('availability.js: No token, redirecting');
    handleUnauthorized();
    return;
  }

  authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;

  // Inicjalizacja formularzy
  setupAvailabilityForm();
  setupAbsenceForm();
  setupAvailabilityRadioHandlers();

  // Inicjalizacja kalendarza
  try {
    await initCalendar();
  } catch (err) {
    console.error('Calendar init error:', err);
  }

  // Załaduj dane
  await loadDataForMonth();
});

// ============================================================================
// Obsługa formularza dostępności
// ============================================================================

function setupAvailabilityRadioHandlers() {
  const fullRadio = document.getElementById('availableFull');
  const partialRadio = document.getElementById('availablePartial');
  const unavailableRadio = document.getElementById('unavailable');
  const timeRangeGroup = document.getElementById('timeRangeGroup');
  const timeFrom = document.getElementById('timeFrom');
  const timeTo = document.getElementById('timeTo');

  const toggleTimeRange = () => {
    if (partialRadio.checked) {
      timeRangeGroup.style.display = 'block';
      timeFrom.required = true;
      timeTo.required = true;
    } else {
      timeRangeGroup.style.display = 'none';
      timeFrom.required = false;
      timeTo.required = false;
      timeFrom.value = '';
      timeTo.value = '';
    }
  };

  if (fullRadio) fullRadio.addEventListener('change', toggleTimeRange);
  if (partialRadio) partialRadio.addEventListener('change', toggleTimeRange);
  if (unavailableRadio) unavailableRadio.addEventListener('change', toggleTimeRange);
}

function setupAvailabilityForm() {
  const form = document.getElementById('availabilityForm');
  if (!form) return;

  // Ustaw dzisiejszą datę jako domyślną
  const dateInput = document.getElementById('availabilityDate');
  if (dateInput && !dateInput.value) {
    dateInput.value = toApiDate(new Date());
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAvailabilitySubmit();
  });

  form.addEventListener('reset', () => {
    const dateInput = document.getElementById('availabilityDate');
    if (dateInput) {
      dateInput.value = toApiDate(new Date());
    }
    document.getElementById('timeRangeGroup').style.display = 'none';
  });
}

async function handleAvailabilitySubmit() {
  const dateInput = document.getElementById('availabilityDate');
  const statusRadios = document.getElementsByName('availabilityStatus');
  const timeFrom = document.getElementById('timeFrom');
  const timeTo = document.getElementById('timeTo');

  const date = dateInput.value;
  if (!date) {
    alert('Wybierz datę!');
    return;
  }

  let selectedStatus = null;
  for (const radio of statusRadios) {
    if (radio.checked) {
      selectedStatus = radio.value;
      break;
    }
  }

  if (!selectedStatus) {
    alert('Wybierz status dostępności!');
    return;
  }

  let payload = {
    date: date,
    is_available: selectedStatus !== 'unavailable',
    time_from: null,
    time_to: null
  };

  if (selectedStatus === 'partial') {
    if (!timeFrom.value || !timeTo.value) {
      alert('Podaj godziny dostępności!');
      return;
    }
    if (timeFrom.value >= timeTo.value) {
      alert('Godzina "Od" musi być wcześniejsza niż "Do"!');
      return;
    }
    payload.time_from = timeFrom.value + ':00';
    payload.time_to = timeTo.value + ':00';
  }

  try {
    const response = await fetch('/availability/my_availability', {
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
      throw new Error(message || 'Błąd zapisu dostępności');
    }

    alert('Dostępność zapisana!');
    
    // Wyczyść formularz
    document.getElementById('availabilityForm').reset();
    document.getElementById('availabilityDate').value = toApiDate(new Date());
    document.getElementById('timeRangeGroup').style.display = 'none';

    // Odśwież dane
    await loadDataForMonth();
  } catch (error) {
    alert('Błąd: ' + (error && error.message ? error.message : 'Nieznany błąd'));
  }
}

// ============================================================================
// Obsługa formularza nieobecności
// ============================================================================

function setupAbsenceForm() {
  const form = document.getElementById('absenceForm');
  if (!form) return;

  // Ustaw dzisiejszą datę jako domyślną
  const dateFromInput = document.getElementById('absenceDateFrom');
  const dateToInput = document.getElementById('absenceDateTo');
  if (dateFromInput && !dateFromInput.value) {
    dateFromInput.value = toApiDate(new Date());
  }
  if (dateToInput && !dateToInput.value) {
    dateToInput.value = toApiDate(new Date());
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAbsenceSubmit();
  });

  form.addEventListener('reset', () => {
    const dateFromInput = document.getElementById('absenceDateFrom');
    const dateToInput = document.getElementById('absenceDateTo');
    if (dateFromInput) dateFromInput.value = toApiDate(new Date());
    if (dateToInput) dateToInput.value = toApiDate(new Date());
  });
}

async function handleAbsenceSubmit() {
  const absenceType = document.getElementById('absenceType');
  const dateFrom = document.getElementById('absenceDateFrom');
  const dateTo = document.getElementById('absenceDateTo');

  if (!absenceType.value) {
    alert('Wybierz typ nieobecności!');
    return;
  }

  if (!dateFrom.value || !dateTo.value) {
    alert('Podaj daty nieobecności!');
    return;
  }

  if (dateFrom.value > dateTo.value) {
    alert('Data "Od" musi być wcześniejsza lub równa dacie "Do"!');
    return;
  }

  const payload = {
    absence_type: absenceType.value,
    date_from: dateFrom.value,
    date_to: dateTo.value
  };

  try {
    const response = await fetch('/absences/my_absences', {
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
      throw new Error(message || 'Błąd zapisu nieobecności');
    }

    alert('Nieobecność zapisana!');
    
    // Wyczyść formularz
    document.getElementById('absenceForm').reset();
    document.getElementById('absenceDateFrom').value = toApiDate(new Date());
    document.getElementById('absenceDateTo').value = toApiDate(new Date());

    // Odśwież dane
    await loadDataForMonth();
  } catch (error) {
    alert('Błąd: ' + (error && error.message ? error.message : 'Nieznany błąd'));
  }
}

// ============================================================================
// Ładowanie danych
// ============================================================================

async function loadDataForMonth() {
  if (!authHeader || calYear === null || calMonth === null) {
    return;
  }

  const startDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
  const endDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  // Załaduj dostępności
  await loadAvailability(startDate, endDate);
  
  // Załaduj nieobecności
  await loadAbsences(startDate, endDate);

  // Odśwież kalendarz
  renderCalendar();

  // Odśwież listy
  renderAvailabilityList();
  renderAbsenceList();
}

async function loadAvailability(dateFrom, dateTo) {
  try {
    const url = `/availability/my_availability?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`;
    const response = await fetch(url, {
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
      console.warn('Failed to load availability');
      return;
    }

    const data = await response.json();
    
    // Wyczyść poprzednie dane
    availabilityData.clear();
    
    // Zapisz dane
    if (Array.isArray(data)) {
      data.forEach(item => {
        availabilityData.set(item.date, {
          is_available: item.is_available,
          time_from: item.time_from,
          time_to: item.time_to
        });
      });
    }
    
    console.log('Availability loaded:', availabilityData.size, 'entries');
  } catch (error) {
    console.error('Error loading availability:', error);
  }
}

async function loadAbsences(dateFrom, dateTo) {
  try {
    const url = `/absences/my_absences?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`;
    const response = await fetch(url, {
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
      console.warn('Failed to load absences');
      return;
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      absenceData = data;
    } else {
      absenceData = [];
    }
    
    console.log('Absences loaded:', absenceData.length, 'entries');
  } catch (error) {
    console.error('Error loading absences:', error);
  }
}

// ============================================================================
// Kalendarz
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
  await loadDataForMonth();

  // Handlers
  monthSelect.addEventListener('change', async () => {
    calMonth = parseInt(monthSelect.value, 10);
    await loadDataForMonth();
  });
  
  yearSelect.addEventListener('change', async () => {
    calYear = parseInt(yearSelect.value, 10);
    await loadDataForMonth();
  });
  
  prevBtn.addEventListener('click', async () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    syncMonthYearControls();
    await loadDataForMonth();
  });
  
  nextBtn.addEventListener('click', async () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    syncMonthYearControls();
    await loadDataForMonth();
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

        // Sprawdź status dnia
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const availability = availabilityData.get(dateStr);
        const absence = isDateInAbsenceRange(dateStr);
        
        // Priorytet: nieobecność > dostępność
        if (absence) {
          btn.classList.add('absence');
          btn.title = `${absence.absence_type}: ${absence.date_from} - ${absence.date_to}`;
        } else if (availability) {
          if (!availability.is_available) {
            btn.classList.add('unavailable');
            btn.title = 'Niedostępny';
          } else if (availability.time_from && availability.time_to) {
            btn.classList.add('available-partial');
            btn.title = `Dostępny ${availability.time_from} - ${availability.time_to}`;
          } else {
            btn.classList.add('available-full');
            btn.title = 'Dostępny cały dzień';
          }
        }

        // Highlight if today
        if (isCurrentMonth && day === todayDate) {
          btn.classList.add('today');
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

function isDateInAbsenceRange(dateStr) {
  for (const absence of absenceData) {
    if (dateStr >= absence.date_from && dateStr <= absence.date_to) {
      return absence;
    }
  }
  return null;
}

function onCalendarDayClick(ev) {
  const btn = ev.currentTarget;
  const day = parseInt(btn.dataset.day, 10);
  if (!Number.isFinite(day)) return;
  
  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  // Usuń klasę selected z wszystkich przycisków
  const allBtns = document.querySelectorAll('#calGrid button[data-day]');
  allBtns.forEach(b => b.classList.remove('selected'));
  
  // Dodaj klasę selected do klikniętego przycisku
  btn.classList.add('selected');
  
  // Ustaw datę w formularzu dostępności
  const dateInput = document.getElementById('availabilityDate');
  if (dateInput) {
    dateInput.value = dateStr;
  }
  
  // Ustaw datę w formularzu nieobecności
  const absenceDateFrom = document.getElementById('absenceDateFrom');
  const absenceDateTo = document.getElementById('absenceDateTo');
  if (absenceDateFrom) {
    absenceDateFrom.value = dateStr;
  }
  if (absenceDateTo) {
    absenceDateTo.value = dateStr;
  }
  
  // Sprawdź czy istnieje dostępność dla tego dnia
  const availability = availabilityData.get(dateStr);
  if (availability) {
    // Załaduj dane do formularza
    if (!availability.is_available) {
      document.getElementById('unavailable').checked = true;
    } else if (availability.time_from && availability.time_to) {
      document.getElementById('availablePartial').checked = true;
      document.getElementById('timeFrom').value = availability.time_from.substring(0, 5);
      document.getElementById('timeTo').value = availability.time_to.substring(0, 5);
      document.getElementById('timeRangeGroup').style.display = 'block';
    } else {
      document.getElementById('availableFull').checked = true;
    }
  }
}

// ============================================================================
// Renderowanie list
// ============================================================================

function renderAvailabilityList() {
  const container = document.getElementById('availabilityList');
  if (!container) return;

  container.innerHTML = '';

  if (availabilityData.size === 0) {
    container.innerHTML = '<p class="text-muted">Brak wpisów dostępności w tym miesiącu.</p>';
    return;
  }

  // Sortuj po dacie
  const sorted = Array.from(availabilityData.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  sorted.forEach(([dateStr, data]) => {
    const card = document.createElement('div');
    card.className = 'card mb-2';
    
    let statusText = '';
    let badgeClass = '';
    if (!data.is_available) {
      statusText = 'Niedostępny';
      badgeClass = 'bg-danger';
    } else if (data.time_from && data.time_to) {
      statusText = `Dostępny ${data.time_from.substring(0, 5)} - ${data.time_to.substring(0, 5)}`;
      badgeClass = 'bg-warning text-dark';
    } else {
      statusText = 'Dostępny cały dzień';
      badgeClass = 'bg-success';
    }

    card.innerHTML = `
      <div class="card-body py-2">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${formatDatePL(dateStr)}</strong>
            <span class="badge ${badgeClass} ms-2">${statusText}</span>
          </div>
          <button type="button" class="btn btn-sm btn-danger" onclick="deleteAvailability('${dateStr}')">
            <i class="bi bi-trash"></i> Usuń
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

function renderAbsenceList() {
  const container = document.getElementById('absenceList');
  if (!container) return;

  container.innerHTML = '';

  if (absenceData.length === 0) {
    container.innerHTML = '<p class="text-muted">Brak nieobecności w tym miesiącu.</p>';
    return;
  }

  // Sortuj po dacie rozpoczęcia
  const sorted = absenceData.slice().sort((a, b) => a.date_from.localeCompare(b.date_from));

  sorted.forEach(absence => {
    const card = document.createElement('div');
    card.className = 'card mb-2';
    
    let typeText = '';
    switch (absence.absence_type) {
      case 'urlop': typeText = 'Urlop'; break;
      case 'L4': typeText = 'L4'; break;
      case 'inne': typeText = 'Inne'; break;
      default: typeText = absence.absence_type;
    }

    card.innerHTML = `
      <div class="card-body py-2">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${formatDatePL(absence.date_from)} - ${formatDatePL(absence.date_to)}</strong>
            <span class="badge bg-purple text-white ms-2">${typeText}</span>
          </div>
          <button type="button" class="btn btn-sm btn-danger" onclick="deleteAbsence('${absence.date_from}')">
            <i class="bi bi-trash"></i> Usuń
          </button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

// ============================================================================
// Usuwanie wpisów
// ============================================================================

window.deleteAvailability = async function(dateStr) {
  if (!confirm(`Czy na pewno chcesz usunąć dostępność z dnia ${formatDatePL(dateStr)}?`)) {
    return;
  }

  try {
    const response = await fetch(`/availability/my_availability/${dateStr}`, {
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
      throw new Error(message || 'Błąd usuwania dostępności');
    }

    alert('Dostępność usunięta!');
    await loadDataForMonth();
  } catch (error) {
    alert('Błąd: ' + (error && error.message ? error.message : 'Nieznany błąd'));
  }
};

window.deleteAbsence = async function(dateStr) {
  if (!confirm(`Czy na pewno chcesz usunąć nieobecność obejmującą ${formatDatePL(dateStr)}?`)) {
    return;
  }

  try {
    const response = await fetch(`/absences/my_absences/${dateStr}`, {
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
      throw new Error(message || 'Błąd usuwania nieobecności');
    }

    alert('Nieobecność usunięta!');
    await loadDataForMonth();
  } catch (error) {
    alert('Błąd: ' + (error && error.message ? error.message : 'Nieznany błąd'));
  }
};

// ============================================================================
// Funkcje pomocnicze
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

function formatDatePL(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
