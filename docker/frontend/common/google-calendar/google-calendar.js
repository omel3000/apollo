/**
 * google-calendar.js
 *
 * Moduł frontendu obsługujący integrację Apollo z Google Calendar.
 * Renderuje panel w elemencie #googleCalendarPanel na stronie grafiku miesięcznego.
 *
 * Wymagania:
 *  - Element <div id="googleCalendarPanel"> musi istnieć na stronie
 *  - scheduleMonthSelect i scheduleYearSelect muszą istnieć (schedule-view.js)
 *  - Użytkownik musi być zalogowany (token w localStorage)
 */

(function () {
  const PANEL_ID = 'googleCalendarPanel';

  // ===== POMOCNICZE =====

  function getToken() {
    return localStorage.getItem('token') || '';
  }

  function authHeaders() {
    return {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    };
  }

  function getSelectedMonth() {
    const monthEl = document.getElementById('scheduleMonthSelect');
    const yearEl = document.getElementById('scheduleYearSelect');
    const month = monthEl ? parseInt(monthEl.value, 10) : new Date().getMonth() + 1;
    const year = yearEl ? parseInt(yearEl.value, 10) : new Date().getFullYear();
    return { month, year };
  }

  // ===== API CALLS =====

  async function fetchStatus() {
    const resp = await fetch('/integrations/google/status', {
      headers: authHeaders(),
    });
    if (!resp.ok) throw new Error(`Błąd pobierania statusu: ${resp.status}`);
    return resp.json();
  }

  async function syncMonth(year, month) {
    const resp = await fetch('/integrations/google/sync-month', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ year, month }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.detail || `Błąd synchronizacji: ${resp.status}`);
    }
    return resp.json();
  }

  async function disconnect() {
    const resp = await fetch('/integrations/google/disconnect', {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.detail || `Błąd odłączania: ${resp.status}`);
    }
    return resp.json();
  }

  // ===== RENDER =====

  function renderNotConnected(panel) {
    panel.innerHTML = `
      <p class="text-muted small mb-3">
        Połącz swoje konto Google, aby synchronizować grafik miesięczny z&nbsp;Google Calendar.
      </p>
      <button type="button" class="btn btn-outline-danger btn-sm" id="gcalConnectBtn">
        <i class="bi bi-google me-1"></i> Połącz z Google
      </button>
      <div id="gcalMessage" class="mt-2"></div>
    `;
    document.getElementById('gcalConnectBtn').addEventListener('click', handleConnect);
  }

  async function handleConnect() {
    const btn = document.getElementById('gcalConnectBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Łączenie...'; }
    try {
      const resp = await fetch('/integrations/google/connect', {
        headers: authHeaders(),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.detail || 'Błąd połączenia z Google.');
      }
      const data = await resp.json();
      window.location.href = data.url;
    } catch (err) {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-google me-1"></i> Połącz z Google'; }
      const msgEl = document.getElementById('gcalMessage');
      if (msgEl) msgEl.innerHTML = `<div class="alert alert-danger py-1 px-2 small mb-0">${escapeHtml(err.message)}</div>`;
    }
  }

  function renderConnected(panel, status) {
    const lastSync = status.last_sync_at
      ? new Date(status.last_sync_at).toLocaleString('pl-PL')
      : '—';

    panel.innerHTML = `
      <div class="mb-2 d-flex align-items-center gap-2 flex-wrap">
        <span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Połączono</span>
        <span class="small text-muted">${escapeHtml(status.google_email || '')}</span>
      </div>
      <p class="small text-muted mb-1">
        Kalendarz: <strong>${escapeHtml(status.calendar_summary || 'Apollo')}</strong>
      </p>
      <p class="small text-muted mb-3">
        Ostatnia synchronizacja: <strong>${lastSync}</strong>
      </p>
      <div class="d-flex gap-2 flex-wrap">
        <button type="button" class="btn btn-primary btn-sm" id="gcalSyncBtn">
          <i class="bi bi-arrow-repeat me-1"></i> Synchronizuj miesiąc
        </button>
        <button type="button" class="btn btn-outline-secondary btn-sm" id="gcalDisconnectBtn">
          <i class="bi bi-x-circle me-1"></i> Odłącz konto
        </button>
      </div>
      <div id="gcalMessage" class="mt-2"></div>
    `;

    document.getElementById('gcalSyncBtn').addEventListener('click', handleSync);
    document.getElementById('gcalDisconnectBtn').addEventListener('click', handleDisconnect);
  }

  function showMessage(type, text) {
    const msgEl = document.getElementById('gcalMessage');
    if (!msgEl) return;
    msgEl.innerHTML = `<div class="alert alert-${type} py-1 px-2 small mt-2 mb-0">${escapeHtml(text)}</div>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ===== HANDLERS =====

  async function handleSync() {
    const btn = document.getElementById('gcalSyncBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Synchronizuję...'; }
    try {
      const { month, year } = getSelectedMonth();
      const result = await syncMonth(year, month);
      showMessage(
        'success',
        result.message || `Synchronizacja zakończona. Utworzono: ${result.created}, zaktualizowano: ${result.updated}.`,
      );
    } catch (err) {
      showMessage('danger', err.message || 'Wystąpił błąd synchronizacji.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> Synchronizuj miesiąc';
      }
    }
  }

  async function handleDisconnect() {
    if (!confirm('Czy na pewno chcesz odłączyć konto Google? Istniejące wydarzenia w kalendarzu pozostaną niezmienione.')) {
      return;
    }
    try {
      await disconnect();
      await init(); // odświeżamy panel
    } catch (err) {
      showMessage('danger', err.message || 'Błąd odłączania konta Google.');
    }
  }

  // ===== INICJALIZACJA =====

  async function init() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    try {
      const status = await fetchStatus();
      if (status.is_connected) {
        renderConnected(panel, status);
      } else {
        renderNotConnected(panel);
      }
    } catch (err) {
      panel.innerHTML = `<p class="text-muted small mb-0">Nie udało się załadować statusu Google Calendar.</p>`;
    }
  }

  // Uruchom po załadowaniu DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
