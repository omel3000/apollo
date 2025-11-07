(function () {
  // Stan
  const dayNames = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'];
  let selectedDate = new Date(); selectedDate.setHours(0,0,0,0);
  let currentMonth = selectedDate.getMonth();
  let currentYear = selectedDate.getFullYear();
  let entryCounter = 0;
  let initialized = false; // NEW: flaga by uniknąć podwójnej inicjalizacji

  // Uwaga: docelowo pobierz listę projektów z backendu; tu lista poglądowa (name + id)
  const projects = [
    { id: 1, name: 'Projekt A - Rozwój aplikacji' },
    { id: 2, name: 'Projekt B - Analiza danych' },
    { id: 3, name: 'Projekt C - Testowanie' },
    { id: 4, name: 'Projekt D - Dokumentacja' },
    { id: 5, name: 'Projekt E - Szkolenia' },
    { id: 6, name: 'Administracja' },
    { id: 7, name: 'Spotkania' },
    { id: 8, name: 'Inne' }
  ];

  // Utils
  function token() { return localStorage.getItem('token'); }
  function dateISO(d) { return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().split('T')[0]; }
  function showNotification(message, type='success') {
    const n = document.createElement('div'); n.className = `notification ${type}`; n.textContent = message;
    document.body.appendChild(n); setTimeout(()=>n.remove(), 3000);
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
      el.addEventListener('click', () => { selectedDate = new Date(dt); selectedDate.setHours(0,0,0,0); currentMonth=selectedDate.getMonth(); currentYear=selectedDate.getFullYear(); buildYears(); generateCalendar(); updateDateDisplay(); loadEntriesForDate(); });
      grid.appendChild(el);
    }
  }

  // Formularz nowego wpisu
  function createEntryElement() {
    entryCounter++;
    const id = `entry_${entryCounter}`;
    const div = document.createElement('div');
    div.className = 'entry-container'; div.dataset.entryId = id;
    div.innerHTML = `
      <div class="form-row">
        <div class="form-group full-width">
          <label class="form-label">Projekt</label>
          <select class="form-select" id="project_${id}">
            <option value="">Wybierz projekt...</option>
            ${projects.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
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
        <button class="btn btn-save" data-save="${id}">Zapisz</button>
        <button class="btn btn-delete" data-remove="${id}">Usuń</button>
      </div>
    `;
    return div;
  }

  function addNewEntry() {
    const c = document.getElementById('entriesContainer');
    c.appendChild(createEntryElement());
  }

  // Zapis/Usuwanie przez backend
  async function saveEntry(entryId) {
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
      showNotification('Wpis został zapisany', 'success');
      loadEntriesForDate();
    } catch {
      showNotification('Błąd połączenia z serwerem', 'error');
    }
  }

  async function deleteStoredEntry(reportId) {
    try {
      const resp = await fetch(`/work_reports/${reportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token()}` }
      });
      if (resp.ok) {
        showNotification('Wpis został usunięty', 'success');
        loadEntriesForDate();
      } else {
        showNotification('Nie udało się usunąć wpisu', 'error');
      }
    } catch {
      showNotification('Błąd połączenia z serwerem', 'error');
    }
  }

  // Wczytanie wpisów na dzień
  async function loadEntriesForDate() {
    const c = document.getElementById('entriesContainer');
    c.innerHTML = '';
    try {
      const resp = await fetch(`/work_reports?work_date=${encodeURIComponent(dateISO(selectedDate))}`, {
        headers: { 'Authorization': `Bearer ${token()}` }
      });
      if (!resp.ok) { addNewEntry(); return; }
      const data = await resp.json();
      if (!data || data.length===0) { addNewEntry(); return; }

      data.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'entry-container';
        div.style.borderColor = '#48bb78';
        div.innerHTML = `
          <div class="form-row">
            <div class="form-group full-width">
              <label class="form-label">Projekt</label>
              <div style="padding:12px 15px;background:#f7fafc;border-radius:8px;font-weight:600;">
                ${escapeHtml(projects.find(p=>p.id===entry.project_id)?.name || ('Projekt #' + entry.project_id))}
              </div>
            </div>
          </div>
          ${entry.description ? `
          <div class="form-row">
            <div class="form-group full-width">
              <label class="form-label">Opis</label>
              <div style="padding:12px 15px;background:#f7fafc;border-radius:8px;font-weight:600;">
                ${escapeHtml(entry.description)}
              </div>
            </div>
          </div>` : ''}

          <div class="form-row">
            <div class="form-group half-width">
              <label class="form-label">Czas pracy</label>
              <div style="padding:12px 15px;background:#f7fafc;border-radius:8px;font-weight:600;">
                ${entry.hours_spent}h ${entry.minutes_spent}min
              </div>
            </div>
          </div>

          <div class="action-buttons">
            <button class="btn btn-delete" data-delete-id="${entry.report_id}">Usuń</button>
          </div>
        `;
        c.appendChild(div);
      });
      // przyciski usuwania
      c.querySelectorAll('[data-delete-id]').forEach(btn=>{
        btn.addEventListener('click', ()=> deleteStoredEntry(parseInt(btn.getAttribute('data-delete-id'),10)));
      });
      // dodaj formularz na końcu
      addNewEntry();
    } catch {
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
    document.getElementById('prevDayBtn')?.addEventListener('click', ()=>{ selectedDate.setDate(selectedDate.getDate()-1); currentMonth=selectedDate.getMonth(); currentYear=selectedDate.getFullYear(); buildYears(); generateCalendar(); updateDateDisplay(); loadEntriesForDate(); });
    document.getElementById('nextDayBtn')?.addEventListener('click', ()=>{ selectedDate.setDate(selectedDate.getDate()+1); currentMonth=selectedDate.getMonth(); currentYear=selectedDate.getFullYear(); buildYears(); generateCalendar(); updateDateDisplay(); loadEntriesForDate(); });
    document.getElementById('todayBtn')?.addEventListener('click', ()=>{ selectedDate=new Date(); selectedDate.setHours(0,0,0,0); currentMonth=selectedDate.getMonth(); currentYear=selectedDate.getFullYear(); buildYears(); generateCalendar(); updateDateDisplay(); loadEntriesForDate(); });

    // Delegacja: plus/minus i zapisz/usuń formularza
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
      if (t.matches('[data-save]')) saveEntry(t.getAttribute('data-save'));
      if (t.matches('[data-remove]')) {
        const entryId = t.getAttribute('data-remove');
        const el = document.querySelector(`[data-entry-id="${entryId}"]`); if (el) el.remove();
      }
    });

    document.getElementById('monthSelect')?.addEventListener('change', function(){
      currentMonth = parseInt(this.value,10); generateCalendar();
    });
    document.getElementById('yearSelect')?.addEventListener('change', function(){
      currentYear = parseInt(this.value,10); generateCalendar();
    });
  }

  function init() {
    if (initialized) return; // NEW: zabezpieczenie przed podwójną inicjalizacją (np. DOMContentLoaded + contentLoaded)
    initialized = true;
    if (!token()) return; // auth.js pokaże ekran logowania/komunikat
    buildYears(); generateCalendar(); updateDateDisplay(); wireEvents(); loadEntriesForDate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('contentLoaded', init);
})();
