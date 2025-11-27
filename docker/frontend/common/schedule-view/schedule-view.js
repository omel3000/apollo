(function() {
  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];
  const weekdayShort = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

  const state = {
    authHeader: '',
    currentUser: null,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear(),
    dataByDate: new Map(),
    filteredByDate: new Map(),
    filters: {
      users: new Set(),
      projects: new Set(),
      onlyMe: false
    },
    collections: {
      users: new Map(),
      projects: new Map()
    },
    selectedDate: null
  };

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    const token = localStorage.getItem('token');
    if (!token) {
      redirectToLogin();
      return;
    }

    state.authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;

    try {
      await loadCurrentUser();
      setupControls();
      await loadMonth(state.currentYear, state.currentMonth);
    } catch (error) {
      console.error('Błąd inicjalizacji widoku grafiku', error);
      showError('Nie udało się wczytać danych grafiku. Spróbuj ponownie później.');
    }
  }

  async function loadCurrentUser() {
    const resp = await fetch('/users/me', {
      headers: {
        'Authorization': state.authHeader
      }
    });

    if (resp.status === 401) {
      redirectToLogin();
      return;
    }

    if (!resp.ok) {
      throw new Error('Nie można pobrać danych użytkownika');
    }

    state.currentUser = await resp.json();
  }

  function setupControls() {
    const monthSelect = document.getElementById('scheduleMonthSelect');
    const yearSelect = document.getElementById('scheduleYearSelect');
    const prevBtn = document.getElementById('schedulePrevMonth');
    const nextBtn = document.getElementById('scheduleNextMonth');
    const todayBtn = document.getElementById('scheduleCurrentMonth');
    const projectContainer = document.getElementById('scheduleProjectFilter');
    const userContainer = document.getElementById('scheduleUserFilter');
    const onlyMeToggle = document.getElementById('scheduleOnlyMe');
    const resetBtn = document.getElementById('scheduleResetFilters');

    if (monthSelect) {
      monthNames.forEach((name, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = name;
        monthSelect.appendChild(option);
      });
      monthSelect.value = state.currentMonth;
      monthSelect.addEventListener('change', async (event) => {
        state.currentMonth = Number(event.target.value);
        await loadMonth(state.currentYear, state.currentMonth);
      });
    }

    if (yearSelect) {
      buildYearOptions(yearSelect);
      yearSelect.value = state.currentYear;
      yearSelect.addEventListener('change', async (event) => {
        state.currentYear = Number(event.target.value);
        await loadMonth(state.currentYear, state.currentMonth);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', async () => {
        const date = new Date(state.currentYear, state.currentMonth, 1);
        date.setMonth(date.getMonth() - 1);
        state.currentYear = date.getFullYear();
        state.currentMonth = date.getMonth();
        syncDateControls();
        await loadMonth(state.currentYear, state.currentMonth);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        const date = new Date(state.currentYear, state.currentMonth, 1);
        date.setMonth(date.getMonth() + 1);
        state.currentYear = date.getFullYear();
        state.currentMonth = date.getMonth();
        syncDateControls();
        await loadMonth(state.currentYear, state.currentMonth);
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', async () => {
        const now = new Date();
        state.currentYear = now.getFullYear();
        state.currentMonth = now.getMonth();
        syncDateControls();
        await loadMonth(state.currentYear, state.currentMonth);
      });
    }

    if (onlyMeToggle) {
      onlyMeToggle.addEventListener('change', () => {
        state.filters.onlyMe = onlyMeToggle.checked;
        applyFilters();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.filters.projects.clear();
        state.filters.users.clear();
        state.filters.onlyMe = false;
        [projectContainer, userContainer].forEach(container => {
          if (!container) {
            return;
          }
          container.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.checked = false;
          });
        });
        if (onlyMeToggle) {
          onlyMeToggle.checked = false;
        }
        applyFilters();
      });
    }

    const grid = document.getElementById('scheduleCalendarGrid');
    if (grid) {
      grid.addEventListener('click', (event) => {
        const dayCard = event.target.closest('.schedule-day');
        if (!dayCard) {
          return;
        }
        const iso = dayCard.getAttribute('data-date');
        if (!iso) {
          return;
        }
        state.selectedDate = iso;
        highlightSelectedDay();
        renderDayDetails(iso);
      });
    }
  }

  function buildYearOptions(selectEl) {
    selectEl.innerHTML = '';
    const current = new Date().getFullYear();
    for (let year = current - 2; year <= current + 2; year += 1) {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      selectEl.appendChild(option);
    }
  }

  function syncDateControls() {
    const monthSelect = document.getElementById('scheduleMonthSelect');
    const yearSelect = document.getElementById('scheduleYearSelect');
    if (monthSelect) {
      monthSelect.value = state.currentMonth;
    }
    if (yearSelect && Array.from(yearSelect.options).every(o => Number(o.value) !== state.currentYear)) {
      buildYearOptions(yearSelect);
    }
    if (yearSelect) {
      yearSelect.value = state.currentYear;
    }
  }

  async function loadMonth(year, monthIndex) {
    toggleLoading(true);
    clearError();
    const payload = { month: monthIndex + 1, year };

    const resp = await fetch('/schedule/month', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': state.authHeader
      },
      body: JSON.stringify(payload)
    });

    if (resp.status === 401) {
      redirectToLogin();
      return;
    }

    if (!resp.ok) {
      toggleLoading(false);
      showError('Nie udało się pobrać grafiku dla wybranego miesiąca.');
      return;
    }

    const days = await resp.json();
    rebuildCollections(days);
    populateFilterOptions();
    pickDefaultDay();
    applyFilters();
    updateToolbarLabel();
    toggleLoading(false);
  }

  function rebuildCollections(days) {
    state.dataByDate.clear();
    state.collections.users.clear();
    state.collections.projects.clear();

    days.forEach(day => {
      const iso = day.work_date;
      const normalized = Array.isArray(day.schedules) ? day.schedules.map(item => ({
        ...item,
        short_name: `${item.first_name} ${item.last_name}`.trim(),
        iso_date: iso
      })) : [];
      state.dataByDate.set(iso, normalized);
      normalized.forEach(entry => {
        if (!state.collections.users.has(entry.user_id)) {
          state.collections.users.set(entry.user_id, {
            id: entry.user_id,
            label: `${entry.first_name} ${entry.last_name}`.trim()
          });
        }
        const projectKey = entry.project_id === null ? 'absence' : String(entry.project_id);
        if (!state.collections.projects.has(projectKey)) {
          state.collections.projects.set(projectKey, {
            id: entry.project_id,
            label: entry.project_name || labelForShift(entry.shift_type)
          });
        }
      });
    });
  }

  function populateFilterOptions() {
    renderCheckboxList(
      'scheduleProjectFilter',
      Array.from(state.collections.projects.values()).sort((a, b) => a.label.localeCompare(b.label, 'pl')),
      {
        key: project => (project.id === null ? 'absence' : String(project.id)),
        label: project => project.label,
        targetSet: state.filters.projects
      }
    );

    renderCheckboxList(
      'scheduleUserFilter',
      Array.from(state.collections.users.values()).sort((a, b) => a.label.localeCompare(b.label, 'pl')),
      {
        key: user => user.id,
        label: user => user.label,
        targetSet: state.filters.users
      }
    );
  }

  function pickDefaultDay() {
    const todayIso = toIsoDate(new Date());
    const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
    let fallback = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-01`;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (state.dataByDate.has(iso)) {
        fallback = iso;
        break;
      }
    }
    state.selectedDate = state.dataByDate.has(todayIso) ? todayIso : fallback;
  }

  function applyFilters() {
    state.filteredByDate.clear();
    let visibleEntries = 0;
    const visibleUsers = new Set();

    const projectsFilter = state.filters.projects;
    const usersFilter = state.filters.users;

    state.dataByDate.forEach((entries, iso) => {
      const filtered = entries.filter(entry => {
        if (state.filters.onlyMe && entry.user_id !== state.currentUser.user_id) {
          return false;
        }
        if (projectsFilter.size > 0) {
          const projectKey = entry.project_id === null ? 'absence' : String(entry.project_id);
          if (!projectsFilter.has(projectKey)) {
            return false;
          }
        }
        if (usersFilter.size > 0 && !usersFilter.has(entry.user_id)) {
          return false;
        }
        return true;
      });
      if (filtered.length > 0) {
        filtered.forEach(entry => visibleUsers.add(entry.user_id));
        visibleEntries += filtered.length;
      }
      state.filteredByDate.set(iso, filtered);
    });

    renderCalendar();
    if (state.selectedDate) {
      renderDayDetails(state.selectedDate);
    }
    updateStats(visibleEntries, visibleUsers.size);
    updateMonthSummary();
  }

  function renderCalendar() {
    const grid = document.getElementById('scheduleCalendarGrid');
    if (!grid) {
      return;
    }
    grid.innerHTML = '';

    const daysInMonth = getDaysInMonth(state.currentYear, state.currentMonth);
    const fragment = document.createDocumentFragment();

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const entries = state.dataByDate.get(iso) || [];
      const filteredEntries = state.filteredByDate.get(iso) || [];
      const card = createDayCard(day, iso, entries, filteredEntries);
      fragment.appendChild(card);
    }

    if (fragment.childNodes.length === 0) {
      grid.innerHTML = '<p class="text-muted">Brak danych dla tego miesiąca.</p>';
      return;
    }

    grid.appendChild(fragment);
    highlightSelectedDay();
  }

  function createDayCard(dayNumber, iso, entries, filteredEntries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'schedule-day btn btn-light text-start';
    button.setAttribute('data-date', iso);

    if (filteredEntries.length > 0) {
      button.classList.add('schedule-day--busy');
    } else if (entries.length > 0) {
      button.classList.add('schedule-day--no-match');
    } else {
      button.classList.add('schedule-day--empty');
    }

    if (iso === state.selectedDate) {
      button.classList.add('schedule-day--selected');
    }

    if (iso === toIsoDate(new Date())) {
      button.classList.add('schedule-day--today');
    }

    const date = new Date(iso);
    const header = document.createElement('div');
    header.className = 'schedule-day__header';
    header.innerHTML = `
      <span class="schedule-day__date">${dayNumber}</span>
      <span class="schedule-day__weekday">${weekdayShort[date.getDay()]}</span>
    `;
    button.appendChild(header);

    if (filteredEntries.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'schedule-day__empty';
      emptyMsg.textContent = entries.length > 0 ? 'Brak wpisów po filtrach' : 'Brak wpisów';
      button.appendChild(emptyMsg);
      return button;
    }

    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'schedule-day__chips';

    const topEntries = filteredEntries.slice(0, 3);
    topEntries.forEach(entry => {
      const chip = document.createElement('span');
      chip.className = 'schedule-chip';
      if (entry.project_id === null || entry.shift_type !== 'normalna') {
        chip.classList.add('schedule-chip--absence');
      }
      chip.style.backgroundColor = getEntryColor(entry);
      chip.textContent = chipLabel(entry);
      chipsContainer.appendChild(chip);
    });

    if (filteredEntries.length > topEntries.length) {
      const moreChip = document.createElement('span');
      moreChip.className = 'schedule-chip schedule-chip--muted';
      moreChip.textContent = `+${filteredEntries.length - topEntries.length}`;
      chipsContainer.appendChild(moreChip);
    }

    button.appendChild(chipsContainer);

    const count = document.createElement('div');
    count.className = 'schedule-day__count';
    count.textContent = formatEntryCount(filteredEntries.length);
    button.appendChild(count);

    return button;
  }

  function highlightSelectedDay() {
    const grid = document.getElementById('scheduleCalendarGrid');
    if (!grid) {
      return;
    }
    grid.querySelectorAll('.schedule-day').forEach(card => {
      if (card.getAttribute('data-date') === state.selectedDate) {
        card.classList.add('schedule-day--selected');
      } else {
        card.classList.remove('schedule-day--selected');
      }
    });
  }

  function renderDayDetails(iso) {
    const container = document.getElementById('scheduleDayDetails');
    if (!container) {
      return;
    }
    container.innerHTML = '';

    const allEntries = state.dataByDate.get(iso) || [];
    const filteredEntries = state.filteredByDate.get(iso) || [];

    const header = document.createElement('div');
    header.className = 'schedule-details__header';
    header.innerHTML = `
      <div>
        <div class="schedule-details__date">${formatFullDate(iso)}</div>
        <div class="text-muted">${weekdayLabel(iso)}</div>
      </div>
      <div class="text-end text-muted">${filteredEntries.length} / ${allEntries.length} wpisów</div>
    `;
    container.appendChild(header);

    if (filteredEntries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'schedule-details__empty';
      empty.textContent = allEntries.length > 0
        ? 'Wybrane filtry ukrywają wpisy w tym dniu.'
        : 'Brak grafiku dla wybranego dnia.';
      container.appendChild(empty);
      return;
    }

    const sorted = filteredEntries.slice().sort((a, b) => a.time_from.localeCompare(b.time_from));
    sorted.forEach(entry => {
      container.appendChild(renderDetailEntry(entry));
    });
  }

  function renderDetailEntry(entry) {
    const wrapper = document.createElement('div');
    wrapper.className = 'schedule-details__entry';

    const header = document.createElement('div');
    header.className = 'd-flex justify-content-between align-items-start mb-1 flex-wrap gap-2';
    const userLabel = document.createElement('div');
    userLabel.className = 'schedule-details__user';
    userLabel.textContent = entry.short_name;
    const shiftPill = document.createElement('span');
    shiftPill.className = `shift-pill shift-pill--${entry.shift_type}`;
    shiftPill.textContent = labelForShift(entry.shift_type);
    header.appendChild(userLabel);
    header.appendChild(shiftPill);

    const times = document.createElement('div');
    times.className = 'text-muted';
    const projectName = entry.project_name || labelForShift(entry.shift_type);
    times.textContent = `${entry.time_from} - ${entry.time_to} · ${projectName}`;

    wrapper.appendChild(header);
    wrapper.appendChild(times);

    return wrapper;
  }

  function updateToolbarLabel() {
    const label = document.getElementById('schedulePeriodLabel');
    if (!label) {
      return;
    }
    label.textContent = `${monthNames[state.currentMonth]} ${state.currentYear}`;
  }

  function updateMonthSummary() {
    const container = document.getElementById('scheduleMonthSummary');
    if (!container || !state.currentUser) {
      return;
    }

    let totalMinutes = 0;
    const perProject = new Map();

    state.dataByDate.forEach(entries => {
      entries.forEach(entry => {
        if (entry.user_id !== state.currentUser.user_id) {
          return;
        }
        const duration = getDurationInMinutes(entry.time_from, entry.time_to);
        totalMinutes += duration;
        const key = entry.project_id === null ? `shift-${entry.shift_type}` : `project-${entry.project_id}`;
        const label = entry.project_name || labelForShift(entry.shift_type);
        if (!perProject.has(key)) {
          perProject.set(key, { label, minutes: 0 });
        }
        perProject.get(key).minutes += duration;
      });
    });

    container.innerHTML = '';

    if (totalMinutes === 0) {
      container.innerHTML = '<p class="text-muted mb-0">Brak wpisów w tym miesiącu.</p>';
      return;
    }

    const totalBox = document.createElement('div');
    totalBox.className = 'schedule-summary__total';
    totalBox.innerHTML = `
      <small class="text-muted d-block mb-1">Łącznie w miesiącu</small>
      <strong>${formatDuration(totalMinutes)}</strong>
    `;
    container.appendChild(totalBox);

    const list = document.createElement('ul');
    list.className = 'schedule-summary__list';

    Array.from(perProject.values())
      .sort((a, b) => b.minutes - a.minutes)
      .forEach(item => {
        const li = document.createElement('li');
        li.className = 'schedule-summary__item';
        li.innerHTML = `
          <span>${item.label}</span>
          <span>${formatDuration(item.minutes)}</span>
        `;
        list.appendChild(li);
      });

    container.appendChild(list);
  }

  function updateStats(entriesCount, usersCount) {
    const summary = document.getElementById('scheduleStats');
    if (!summary) {
      return;
    }
    summary.textContent = `Widoczne ${formatEntryCount(entriesCount)} dla ${formatUserCount(usersCount)}.`;
  }

  function toggleLoading(isLoading) {
    const loader = document.getElementById('scheduleLoader');
    if (!loader) {
      return;
    }
    loader.classList.toggle('active', isLoading);
    loader.textContent = isLoading ? 'Trwa ładowanie grafiku...' : '';
  }

  function showError(message) {
    const errorBox = document.getElementById('scheduleError');
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.classList.remove('d-none');
    }
  }

  function clearError() {
    const errorBox = document.getElementById('scheduleError');
    if (errorBox) {
      errorBox.classList.add('d-none');
      errorBox.textContent = '';
    }
  }

  function getDaysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate();
  }

  function toIsoDate(date) {
    return date.toISOString().split('T')[0];
  }

  function formatFullDate(iso) {
    const formatter = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
    return formatter.format(new Date(iso));
  }

  function weekdayLabel(iso) {
    const formatter = new Intl.DateTimeFormat('pl-PL', { weekday: 'long' });
    return formatter.format(new Date(iso));
  }

  function labelForShift(shiftType) {
    switch (shiftType) {
      case 'normalna':
        return 'Zmiana robocza';
      case 'urlop':
        return 'Urlop';
      case 'L4':
        return 'Zwolnienie lekarskie';
      default:
        return 'Inna zmiana';
    }
  }

  function chipLabel(entry) {
    if (entry.project_name) {
      return entry.project_name.slice(0, 20);
    }
    return labelForShift(entry.shift_type);
  }

  function renderCheckboxList(containerId, items, options) {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }
    container.innerHTML = '';

    if (!items.length) {
      container.innerHTML = '<p class="text-muted small mb-0">Brak dostępnych opcji.</p>';
      return;
    }

    items.forEach(item => {
      const value = options.key(item);
      const labelText = options.label(item);
      const wrapper = document.createElement('label');
      wrapper.className = 'schedule-checkbox';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = options.targetSet.has(value);

      input.addEventListener('change', () => {
        if (input.checked) {
          options.targetSet.add(value);
        } else {
          options.targetSet.delete(value);
        }
        applyFilters();
      });

      const text = document.createElement('span');
      text.textContent = labelText;

      wrapper.appendChild(input);
      wrapper.appendChild(text);
      container.appendChild(wrapper);
    });
  }

  function formatEntryCount(quantity) {
    return `${quantity} ${declinePl(quantity, ['wpis', 'wpisy', 'wpisów'])}`;
  }

  function formatUserCount(quantity) {
    return `${quantity} ${declinePl(quantity, ['osoba', 'osoby', 'osób'])}`;
  }

  function declinePl(quantity, forms) {
    if (quantity === 1) {
      return forms[0];
    }
    const mod10 = quantity % 10;
    const mod100 = quantity % 100;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
      return forms[1];
    }
    return forms[2];
  }

  function getDurationInMinutes(from, to) {
    return timeStringToMinutes(to) - timeStringToMinutes(from);
  }

  function timeStringToMinutes(value) {
    if (!value) {
      return 0;
    }
    const [hours, minutes] = value.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  function formatDuration(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}min`;
  }

  function getEntryColor(entry) {
    const absenceColor = typeof getAbsenceColor === 'function' ? getAbsenceColor() : '#8b5cf6';
    if (typeof getProjectColor === 'function') {
      if (entry.project_id === null || entry.shift_type !== 'normalna') {
        return absenceColor;
      }
      return getProjectColor(entry.project_id);
    }
    return entry.project_id === null ? absenceColor : '#2e7d32';
  }

  function redirectToLogin() {
    window.location.replace('/');
  }
})();
