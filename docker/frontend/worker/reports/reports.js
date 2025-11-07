(function () {
  // Stan
  const dayNames = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'];
  let selectedDate = new Date(); selectedDate.setHours(0,0,0,0);
  let currentMonth = selectedDate.getMonth();
  let currentYear = selectedDate.getFullYear();
  let entryCounter = 0;
  let initialized = false;
  let assignedProjects = []; // NOWE: projekty przypisane do usera

  // NEW: przechowywanie wybranego dnia między odświeżeniami
  const SELECTED_DATE_KEY = 'worker_reports_selected_date';

  function saveSelectedDate() {
    try {
      localStorage.setItem(SELECTED_DATE_KEY, dateISO(selectedDate));
    } catch {}
  }

  function restoreSelectedDate() {
    try {
      const iso = localStorage.getItem(SELECTED_DATE_KEY);
      if (!iso) return;
      const parts = iso.split('-'); // YYYY-MM-DD
      if (parts.length !== 3) return;
      const d = new Date(Date.UTC(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10)));
      // ustaw lokalny dzień bez czasu
      selectedDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      selectedDate.setHours(0,0,0,0);
      currentMonth = selectedDate.getMonth();
      currentYear = selectedDate.getFullYear();
    } catch {}
  }

  // Utils
  function token() { return localStorage.getItem('token'); }
  function dateISO(d) { return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().split('T')[0]; }
  function showNotification(message, type='success') {
    const n = document.createElement('div'); n.className = `notification ${type}`; n.textContent = message;
    document.body.appendChild(n); setTimeout(()=>n.remove(), 3000);
  }

  // Pobierz projekty przypisane do zalogowanego użytkownika
  async function loadAssignedProjects() {
    const t = token();
    if (!t) return [];
    try {
      const resp = await fetch('/user_projects/my_projects', {
        headers: { 'Authorization': `Bearer ${t}` }
      });
      if (!resp.ok) {
        console.warn('Nie udało się pobrać projektów:', resp.status);
        assignedProjects = [];
        return [];
      }
      const data = await resp.json();
      // Mapuj do {id, name}
      assignedProjects = (data || []).map(p => ({ id: p.project_id, name: p.project_name }));
      return assignedProjects;
    } catch (e) {
      console.error('Błąd pobierania projektów:', e);
      assignedProjects = [];
      return [];
    }
  }

  // Nagłówek dnia
  function updateDateDisplay() {
    document.getElementById('selectedDayName').textContent = dayNames[selectedDate.getDay()];
    document.getElementById('selectedDate').textContent = selectedDate.toLocaleDateString('pl-PL');
  }

  // Kalendarz
  function buildYears() {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect.options.length) {
      const nowY = new Date().getFullYear();
      for (let y = nowY - 5; y <= nowY + 5; y++) {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y; if (y===currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
      }
    } else {
      yearSelect.value = currentYear;
    }
    document.getElementById('monthSelect').value = currentMonth;
  }

  function generateCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'].forEach(d => {
      const h = document.createElement('div'); h.className='calendar-day-header'; h.textContent=d; grid.appendChild(h);
    });
    const first = new Date(currentYear, currentMonth, 1);
    const start = new Date(first);
    const dow = first.getDay(); const mondayOffset = dow === 0 ? 6 : dow - 1; start.setDate(start.getDate()-mondayOffset);
    const today = new Date(); today.setHours(0,0,0,0);

    for (let i=0;i<42;i++) {
      const dt = new Date(start); dt.setDate(start.getDate()+i);
      const el = document.createElement('div'); el.className='calendar-day'; el.textContent = dt.getDate();
      if (dt.getMonth()!==currentMonth) el.classList.add('other-month');
      if (+dt===+today) el.classList.add('today');
      if (+dt===+selectedDate) el.classList.add('selected');
      el.addEventListener('click', () => {
        selectedDate = new Date(dt);
        selectedDate.setHours(0,0,0,0);
        currentMonth = selectedDate.getMonth();
        currentYear = selectedDate.getFullYear();
        saveSelectedDate();                 // NEW: zapisz wybór dnia
        buildYears();
        generateCalendar();
        updateDateDisplay();
        loadEntriesForDate();               // NEW: zawsze pobierz wpisy przed wyświetleniem dnia
      });
      grid.appendChild(el);
    }
  }

  // Formularz nowego lub istniejącego wpisu (edit-mode)
  function createEntryElement(report) {
    entryCounter++;
    const id = `entry_${entryCounter}`;
    const div = document.createElement('div');
    div.className = 'entry-container';
    div.dataset.entryId = id;
    if (report && report.report_id) {
      div.dataset.reportId = String(report.report_id);
    }

    const optionsHtml = assignedProjects.length
      ? `<option value="">Wybierz projekt...</option>${assignedProjects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}`
      : `<option value="">Brak przypisanych projektów</option>`;

    div.innerHTML = `
      <div class="form-row">
        <div class="form-group full-width">
          <label class="form-label">Projekt</label>
          <select class="form-select" id="project_${id}" ${assignedProjects.length ? '' : 'disabled'}>
            ${optionsHtml}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group full-width">
          <label class="form-label">Opis (opcjonalny)</label>
          <textarea class="form-textarea" id="description_${id}" placeholder="Opisz wykonane zadania..."></textarea>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group half-width">
          <label class="form-label">Czas pracy</label>
          <div class="time-input-group">
            <div class="time-control">
              <button type="button" class="time-button" data-action="dec-h" data-target="${id}">-</button>
              <input type="number" class="time-input" id="hours_${id}" min="0" max="24" value="0">
              <button type="button" class="time-button" data-action="inc-h" data-target="${id}">+</button>
              <span class="time-separator">h</span>
            </div>
            <div class="time-control">
              <button type="button" class="time-button" data-action="dec-m" data-target="${id}">-</button>
              <input type="number" class="time-input" id="minutes_${id}" min="0" max="59" step="5" value="0">
              <button type="button" class="time-button" data-action="inc-m" data-target="${id}">+</button>
              <span class="time-separator">min</span>
            </div>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn btn-save" data-save="${id}">${report && report.report_id ? 'Zapisz zmiany' : 'Zapisz'}</button>
        <button class="btn btn-delete" data-remove="${id}">Usuń</button>
      </div>
    `;

    // Ustaw wartości dla trybu edycji
    if (report) {
      const select = div.querySelector(`#project_${id}`);
      const desc = div.querySelector(`#description_${id}`);
      const hours = div.querySelector(`#hours_${id}`);
      const minutes = div.querySelector(`#minutes_${id}`);

      if (select) select.value = String(report.project_id ?? '');
      if (desc) desc.value = report.description ?? '';
      if (hours) hours.value = String(report.hours_spent ?? 0);
      if (minutes) minutes.value = String(report.minutes_spent ?? 0);
    }

    return div;
  }

  function addNewEntry() {
    const c = document.getElementById('entriesContainer');
    c.appendChild(createEntryElement());
  }

  // Zapis nowego wpisu
  async function saveEntry(entryId) {
    const container = document.querySelector(`[data-entry-id="${entryId}"]`);
    const projectId = parseInt(document.getElementById(`project_${entryId}`).value || '0', 10);
    const description = (document.getElementById(`description_${entryId}`).value || '').trim();
    const hours = Math.max(0, Math.min(24, parseInt(document.getElementById(`hours_${entryId}`).value || '0', 10)));
    const minutes = Math.max(0, Math.min(59, parseInt(document.getElementById(`minutes_${entryId}`).value || '0', 10)));

    if (!projectId) { showNotification('Wybierz projekt', 'error'); return; }
    if (hours===0 && minutes===0) { showNotification('Wprowadź czas pracy', 'error'); return; }

    try {
      const resp = await fetch('/work_reports', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          work_date: dateISO(selectedDate),
          hours_spent: hours,
          minutes_spent: minutes,
          description
        })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(()=>({detail:'Błąd'}));
        showNotification(err.detail || `Błąd (${resp.status})`, 'error');
        return;
      }
      const saved = await resp.json();
      // Ustaw tryb edycji na tym samym formularzu
      if (container && saved && saved.report_id) {
        container.dataset.reportId = String(saved.report_id);
        const saveBtn = container.querySelector('[data-save]');
        if (saveBtn) saveBtn.textContent = 'Zapisz zmiany';
      }
      showNotification('Wpis został zapisany', 'success');
      // nie przeładowujemy listy – wpis zostaje w formie edycji
    } catch {
      showNotification('Błąd połączenia z serwerem', 'error');
    }
  }

  // Aktualizacja istniejącego wpisu
  async function updateEntry(entryId, reportId) {
    const projectId = parseInt(document.getElementById(`project_${entryId}`).value || '0', 10);
    const description = (document.getElementById(`description_${entryId}`).value || '').trim();
    const hours = Math.max(0, Math.min(24, parseInt(document.getElementById(`hours_${entryId}`).value || '0', 10)));
    const minutes = Math.max(0, Math.min(59, parseInt(document.getElementById(`minutes_${entryId}`).value || '0', 10)));

    if (!projectId) { showNotification('Wybierz projekt', 'error'); return; }
    if (hours===0 && minutes===0) { showNotification('Wprowadź czas pracy', 'error'); return; }

    try {
      const resp = await fetch(`/work_reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          work_date: dateISO(selectedDate),
          hours_spent: hours,
          minutes_spent: minutes,
          description
        })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(()=>({detail:'Błąd'}));
        showNotification(err.detail || `Błąd (${resp.status})`, 'error');
        return;
      }
      showNotification('Zmiany zapisane', 'success');
    } catch {
      showNotification('Błąd połączenia z serwerem', 'error');
    }
  }

  async function deleteStoredEntry(reportId, entryId) {
    try {
      const resp = await fetch(`/work_reports/${reportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` }
      });
      if (resp.ok) {
        const el = document.querySelector(`[data-entry-id="${entryId}"]`);
        if (el) el.remove();
        showNotification('Wpis został usunięty', 'success');
      } else {
        showNotification('Nie udało się usunąć wpisu', 'error');
      }
    } catch {
      showNotification('Błąd połączenia z serwerem', 'error');
    }
  }

  // Wczytanie wpisów na dzień – teraz w trybie edycji
  async function loadEntriesForDate() {
    const c = document.getElementById('entriesContainer');
    c.innerHTML = '';
    try {
      const resp = await fetch(`/work_reports?work_date=${encodeURIComponent(dateISO(selectedDate))}`, {
        headers: { 'Authorization': `Bearer ${token()}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        (data || []).forEach(entry => {
          c.appendChild(createEntryElement(entry));
        });
      }
      // zawsze dodaj pusty formularz na końcu
      addNewEntry();
    } catch {
      // błąd – ale nadal pozwól dodać nowy
      addNewEntry();
    }
  }

  // Pomocnicze
  function escapeHtml(t){ const d=document.createElement('div'); d.textContent=t||''; return d.innerHTML; }
  function adjustTime(entryId, type, delta) {
    const input = document.getElementById(`${type}_${entryId}`);
    const max = type==='hours'?24:59, min=0;
    let v = parseInt(input.value||'0',10) + delta;
    v = Math.max(min, Math.min(max, v)); input.value = v;
  }

  // Zdarzenia
  function wireEvents() {
    document.getElementById('addEntryBtn')?.addEventListener('click', addNewEntry);
    document.getElementById('prevDayBtn')?.addEventListener('click', ()=>{
      selectedDate.setDate(selectedDate.getDate()-1);
      selectedDate.setHours(0,0,0,0);
      currentMonth=selectedDate.getMonth(); currentYear=selectedDate.getFullYear();
      saveSelectedDate();                  // NEW
      buildYears(); generateCalendar(); updateDateDisplay(); loadEntriesForDate();
    });
    document.getElementById('nextDayBtn')?.addEventListener('click', ()=>{
      selectedDate.setDate(selectedDate.getDate()+1);
      selectedDate.setHours(0,0,0,0);
      currentMonth=selectedDate.getMonth(); currentYear=selectedDate.getFullYear();
      saveSelectedDate();                  // NEW
      buildYears(); generateCalendar(); updateDateDisplay(); loadEntriesForDate();
    });
    document.getElementById('todayBtn')?.addEventListener('click', ()=>{
      selectedDate = new Date();
      selectedDate.setHours(0,0,0,0);
      currentMonth=selectedDate.getMonth(); currentYear=selectedDate.getFullYear();
      saveSelectedDate();                  // NEW
      buildYears(); generateCalendar(); updateDateDisplay(); loadEntriesForDate();
    });

    document.getElementById('entriesContainer').addEventListener('click', (e)=>{
      const t = e.target;
      if (t.matches('[data-action]')) {
        const entryId = t.getAttribute('data-target');
        const action = t.getAttribute('data-action');
        if (action==='inc-h') adjustTime(entryId,'hours',+1);
        if (action==='dec-h') adjustTime(entryId,'hours',-1);
        if (action==='inc-m') adjustTime(entryId,'minutes',+5);
        if (action==='dec-m') adjustTime(entryId,'minutes',-5);
      }
      if (t.matches('[data-save]')) {
        const entryId = t.getAttribute('data-save');
        const container = document.querySelector(`[data-entry-id="${entryId}"]`);
        const reportId = container?.dataset?.reportId;
        if (reportId) {
          updateEntry(entryId, parseInt(reportId, 10));
        } else {
          saveEntry(entryId);
        }
      }
      if (t.matches('[data-remove]')) {
        const entryId = t.getAttribute('data-remove');
        const container = document.querySelector(`[data-entry-id="${entryId}"]`);
        const reportId = container?.dataset?.reportId;
        if (reportId) {
          deleteStoredEntry(parseInt(reportId, 10), entryId);
        } else {
          // niezapisany — usuń tylko formularz
          container?.remove();
        }
      }
    });

    document.getElementById('monthSelect')?.addEventListener('change', function(){
      currentMonth = parseInt(this.value,10); generateCalendar();
    });
    document.getElementById('yearSelect')?.addEventListener('change', function(){
      currentYear = parseInt(this.value,10); generateCalendar();
    });
  }

  async function init() {
    if (initialized) return;
    initialized = true;
    if (!token()) return; // auth.js obsłuży
    restoreSelectedDate();                // NEW: odtwórz poprzednio wybrany dzień
    await loadAssignedProjects();         // najpierw projekty (dla selectów)
    buildYears(); generateCalendar(); updateDateDisplay();
    wireEvents();
    loadEntriesForDate();                 // NEW: przed pokazaniem dnia pobierz wpisy z backendu
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('contentLoaded', init);
})();
