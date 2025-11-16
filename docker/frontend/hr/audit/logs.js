'use strict';

(function initAuditLogsPage() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.replace('/');
    return;
  }

  const state = {
    page: 1,
    limit: 50,
    sortBy: 'created_at',
    sortOrder: 'desc',
    totalPages: 0,
    entityType: null,
  };

  const elements = {
    tableBody: document.getElementById('logsTableBody'),
    meta: document.getElementById('logsMeta'),
    summary: document.getElementById('logsSummary'),
    errorBox: document.getElementById('logsError'),
    filtersForm: document.getElementById('logFilters'),
    resetBtn: document.getElementById('resetFilters'),
    actionSelect: document.getElementById('actionFilter'),
    userSelect: document.getElementById('userFilter'),
    emailInput: document.getElementById('emailFilter'),
    entityIdInput: document.getElementById('entityIdFilter'),
    dateFromInput: document.getElementById('dateFrom'),
    dateToInput: document.getElementById('dateTo'),
    sortSelect: document.getElementById('sortSelect'),
    limitSelect: document.getElementById('limitSelect'),
    prevBtn: document.getElementById('prevPage'),
    nextBtn: document.getElementById('nextPage'),
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  elements.filtersForm.addEventListener('submit', event => {
    event.preventDefault();
    state.page = 1;
    state.limit = Number(elements.limitSelect.value) || 50;
    const [sortBy, sortOrder] = elements.sortSelect.value.split(':');
    state.sortBy = sortBy;
    state.sortOrder = sortOrder;
    fetchLogs();
  });

  elements.resetBtn.addEventListener('click', () => {
    elements.filtersForm.reset();
    elements.sortSelect.value = 'created_at:desc';
    elements.limitSelect.value = '50';
    state.page = 1;
    state.limit = 50;
    state.sortBy = 'created_at';
    state.sortOrder = 'desc';
    state.entityType = null;
    fetchLogs();
  });

  elements.actionSelect.addEventListener('change', () => {
    state.entityType = deriveEntityType(elements.actionSelect.value);
    updateEntityPlaceholder();
  });

  elements.prevBtn.addEventListener('click', () => {
    if (state.page <= 1) return;
    state.page -= 1;
    fetchLogs();
  });

  elements.nextBtn.addEventListener('click', () => {
    if (state.page >= state.totalPages) return;
    state.page += 1;
    fetchLogs();
  });

  async function fetchActions() {
    try {
      const response = await fetch('/audit_logs/actions', { headers });
      if (!response.ok) throw new Error('Nie udało się pobrać listy akcji');
      const data = await response.json();
      fillSelect(elements.actionSelect, data.map(action => ({ value: action, label: action })), 'Wszystkie akcje');
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchUsers() {
    try {
      const response = await fetch('/audit_logs/users', { headers });
      if (!response.ok) throw new Error('Nie udało się pobrać listy użytkowników');
      const data = await response.json();
      const options = data.map(user => ({
        value: user.user_id,
        label: user.user_email ? `${user.user_email} (ID ${user.user_id})` : `ID ${user.user_id}`,
      }));
      fillSelect(elements.userSelect, options, 'Wszyscy użytkownicy');
    } catch (error) {
      console.error(error);
    }
  }

  function fillSelect(select, options, placeholderText) {
    const currentValue = select.value;
    const placeholder = placeholderText || 'Wszystkie';
    select.innerHTML = `<option value="">${placeholder}</option>`;
    options.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      select.appendChild(opt);
    });
    if ([...select.options].some(opt => opt.value === currentValue)) {
      select.value = currentValue;
    }
  }

  function buildQuery() {
    const params = new URLSearchParams();
    params.set('page', state.page.toString());
    params.set('limit', state.limit.toString());
    params.set('sort_by', state.sortBy);
    params.set('sort_order', state.sortOrder);

    if (elements.actionSelect.value) {
      params.set('action_group', elements.actionSelect.value);
      if (state.entityType) {
        params.set('entity_type', state.entityType);
      }
    }
    if (elements.userSelect.value) params.set('user_id', elements.userSelect.value);
    if (elements.emailInput.value) params.set('user_email', elements.emailInput.value.trim());
    if (elements.entityIdInput.value) params.set('entity_id', elements.entityIdInput.value.trim());
    if (elements.dateFromInput.value) params.set('date_from', elements.dateFromInput.value);
    if (elements.dateToInput.value) params.set('date_to', elements.dateToInput.value);

    return params.toString();
  }

  async function fetchLogs() {
    toggleLoading(true);
    hideError();
    try {
      const query = buildQuery();
      const url = query ? `/audit_logs/?${query}` : '/audit_logs/';
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error('Nie udało się pobrać logów');
      }
      const data = await response.json();
      state.totalPages = data.pages || 1;
      renderLogs(data);
    } catch (error) {
      console.error(error);
      showError(error.message || 'Wystąpił błąd podczas pobierania logów.');
    } finally {
      toggleLoading(false);
    }
  }

  function renderLogs(data) {
    const { items, total, page, pages, limit } = data;
    elements.tableBody.innerHTML = '';
    if (!items || items.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.className = 'text-center py-4 text-muted';
      cell.textContent = 'Brak logów dla wybranych filtrów.';
      row.appendChild(cell);
      elements.tableBody.appendChild(row);
    } else {
      items.forEach(log => {
        const row = document.createElement('tr');
        row.append(
          buildDateCell(log),
          buildActionCell(log),
          buildUserCell(log),
          buildStatusCell(log),
          buildDetailCell(log)
        );
        elements.tableBody.appendChild(row);
      });
    }

    const firstItem = total === 0 ? 0 : (page - 1) * limit + 1;
    const lastItem = total === 0 ? 0 : Math.min(page * limit, total);
    elements.meta.textContent = `Pozycje ${firstItem}-${lastItem} z ${total} | Strona ${page}/${Math.max(pages, 1)}`;
    elements.summary.textContent = `Wyniki: ${total}`;
    elements.prevBtn.disabled = page <= 1;
    elements.nextBtn.disabled = page >= pages;
  }

  function buildDateCell(log) {
    const cell = document.createElement('td');
    const date = new Date(log.created_at);
    const strong = document.createElement('div');
    strong.textContent = date.toLocaleString('pl-PL');
    strong.className = 'fw-semibold';
    const meta = document.createElement('div');
    meta.className = 'small text-muted';
    meta.textContent = `Czas odpowiedzi: ${formatDuration(log.duration_ms)}`;
    cell.append(strong, meta);
    return cell;
  }

  function buildActionCell(log) {
    const cell = document.createElement('td');
    const methodBadge = document.createElement('span');
    methodBadge.className = 'badge text-bg-secondary me-2';
    methodBadge.textContent = log.method;
    const actionText = document.createElement('div');
    actionText.textContent = log.path;
    actionText.className = 'fw-semibold text-break';
    const detail = document.createElement('div');
    detail.className = 'small text-muted';
    detail.textContent = log.action_group || log.action;
    cell.append(methodBadge, actionText, detail);
    return cell;
  }

  function buildUserCell(log) {
    const cell = document.createElement('td');
    const main = document.createElement('div');
    main.className = 'fw-semibold text-break';
    if (log.user_email) {
      main.textContent = log.user_email;
    } else if (log.user_id) {
      main.textContent = `ID użytkownika: ${log.user_id}`;
    } else {
      main.textContent = 'Nieznany użytkownik';
    }
    const meta = document.createElement('div');
    meta.className = 'small text-muted';
    const role = log.user_role ? `rola: ${log.user_role}` : 'rola: brak danych';
    const idInfo = log.user_id ? `ID: ${log.user_id}` : 'ID: brak';
    meta.textContent = `${role} | ${idInfo}`;
    cell.append(main, meta);
    return cell;
  }

  function buildStatusCell(log) {
    const cell = document.createElement('td');
    const badge = document.createElement('span');
    const badgeClass = log.status_code >= 400 ? 'text-bg-danger' : 'text-bg-success';
    badge.className = `badge ${badgeClass}`;
    badge.textContent = log.status_code;
    const meta = document.createElement('div');
    meta.className = 'small text-muted mt-1';
    const ipText = log.ip_address ? `IP: ${log.ip_address}` : 'IP: brak';
    meta.textContent = ipText;
    cell.append(badge, meta);
    return cell;
  }

  function buildDetailCell(log) {
    const cell = document.createElement('td');
    const detail = document.createElement('pre');
    detail.className = 'small mb-2 text-break';
    detail.textContent = log.detail || 'Brak dodatkowych parametrów.';
    const ua = document.createElement('div');
    ua.className = 'small text-muted';
    ua.textContent = log.user_agent ? `UA: ${log.user_agent}` : 'UA: brak danych';
    cell.append(detail, ua);
    if (log.entity_type && log.entity_id !== null && log.entity_id !== undefined) {
      const entityInfo = document.createElement('div');
      entityInfo.className = 'small text-muted';
      entityInfo.textContent = `Encja: ${log.entity_type} (ID ${log.entity_id})`;
      cell.append(entityInfo);
    }
    return cell;
  }

  function formatDuration(ms) {
    if (!Number.isFinite(ms)) return 'brak danych';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  }

  function toggleLoading(isLoading) {
    elements.filtersForm.querySelectorAll('input, select, button').forEach(control => {
      control.disabled = isLoading && control.type !== 'button';
    });
  }

  function showError(message) {
    elements.errorBox.textContent = message;
    elements.errorBox.classList.remove('d-none');
  }

  function hideError() {
    elements.errorBox.classList.add('d-none');
    elements.errorBox.textContent = '';
  }

  function deriveEntityType(actionGroup) {
    if (!actionGroup) return null;
    const parts = actionGroup.split(' ');
    if (parts.length < 2) return null;
    const pathSegments = parts[1]
      .split('/')
      .filter(Boolean);
    if (pathSegments.length === 0) return null;
    return pathSegments[0];
  }

  function updateEntityPlaceholder() {
    if (!elements.entityIdInput) return;
    if (state.entityType) {
      elements.entityIdInput.placeholder = `ID dla ${state.entityType} (np. 42)`;
      elements.entityIdInput.disabled = false;
    } else {
      elements.entityIdInput.placeholder = 'ID encji (opcjonalnie)';
      elements.entityIdInput.disabled = false;
    }
  }

  updateEntityPlaceholder();
  fetchActions();
  fetchUsers();
  fetchLogs();
})();
