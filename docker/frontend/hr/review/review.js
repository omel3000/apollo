const STATUS_LABELS = {
  roboczy: "Szkic",
  oczekuje_na_akceptacje: "Oczekuje na akceptację",
  zaakceptowany: "Zaakceptowany",
  odrzucony: "Odrzucony",
  zablokowany: "Zablokowany"
};

const STATUS_BADGES = {
  roboczy: "bg-secondary",
  oczekuje_na_akceptacje: "bg-warning text-dark",
  zaakceptowany: "bg-success",
  odrzucony: "bg-danger",
  zablokowany: "bg-dark"
};

const ACTION_MESSAGES = {
  oczekuje_na_akceptacje: "Wpis czeka na Twoją decyzję.",
  zaakceptowany: "Wpis jest zatwierdzony – możesz w razie potrzeby zmienić decyzję.",
  odrzucony: "Wpis został odrzucony. Użytkownik musi przesłać poprawioną wersję.",
  roboczy: "Wpis jest w wersji roboczej – HR nie może go jeszcze oceniać.",
  zablokowany: "Okres rozliczeniowy został zamknięty. Edycja decyzji nie jest możliwa."
};

const REVIEWABLE_STATUSES = new Set(["oczekuje_na_akceptacje", "zaakceptowany"]);
const AUTO_REFRESH_INTERVAL = 60000; // 60 sekund
const collator = new Intl.Collator("pl", { sensitivity: "base" });

let authHeader = "";
let queueData = [];
let selectedReportId = null;
let autoRefreshHandle = null;
const selectedIds = new Set();
let bulkActionInProgress = false;
const usersMap = new Map();
const projectsMap = new Map();

let selectors = {};

function cacheElements() {
  selectors = {
    statusSelect: document.getElementById("filterStatus"),
    monthSelect: document.getElementById("filterMonth"),
    yearSelect: document.getElementById("filterYear"),
    userSelect: document.getElementById("filterUser"),
    projectSelect: document.getElementById("filterProject"),
    applyFiltersBtn: document.getElementById("applyFiltersBtn"),
    clearFiltersBtn: document.getElementById("clearFiltersBtn"),
    autoRefreshSwitch: document.getElementById("autoRefreshSwitch"),
    queueList: document.getElementById("queueList"),
    queueLoader: document.getElementById("queueLoader"),
    queueEmpty: document.getElementById("queueEmpty"),
    queueCounter: document.getElementById("queueCounter"),
    selectAllCheckbox: document.getElementById("selectAllCheckbox"),
    selectedCounter: document.getElementById("selectedCounter"),
    bulkApproveBtn: document.getElementById("bulkApproveBtn"),
    bulkRejectBtn: document.getElementById("bulkRejectBtn"),
    bulkRejectionComment: document.getElementById("bulkRejectionComment"),
    detailsPlaceholder: document.getElementById("detailsPlaceholder"),
    detailsPanel: document.getElementById("detailsPanel"),
    detailDate: document.getElementById("detailDate"),
    detailUser: document.getElementById("detailUser"),
    detailStatus: document.getElementById("detailStatus"),
    detailProject: document.getElementById("detailProject"),
    detailTime: document.getElementById("detailTime"),
    detailSubmitted: document.getElementById("detailSubmitted"),
    detailDecision: document.getElementById("detailDecision"),
    detailDescription: document.getElementById("detailDescription"),
    detailComment: document.getElementById("detailComment"),
    actionSection: document.getElementById("actionSection"),
    actionInfo: document.getElementById("actionInfo"),
    rejectionComment: document.getElementById("rejectionComment"),
    approveBtn: document.getElementById("approveBtn"),
    rejectBtn: document.getElementById("rejectBtn"),
    historyList: document.getElementById("historyList"),
    refreshDetailsBtn: document.getElementById("refreshDetailsBtn")
  };
}

function initMonthYearSelects() {
  if (!selectors.monthSelect || !selectors.yearSelect) {
    return;
  }
  const monthNames = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
  ];
  const now = new Date();
  selectors.monthSelect.innerHTML = "";
  monthNames.forEach((name, idx) => {
    const option = document.createElement("option");
    option.value = String(idx + 1);
    option.textContent = name;
    if (idx === now.getMonth()) {
      option.selected = true;
    }
    selectors.monthSelect.appendChild(option);
  });

  const currentYear = now.getFullYear();
  selectors.yearSelect.innerHTML = "";
  for (let year = currentYear - 1; year <= currentYear + 1; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    if (year === currentYear) {
      option.selected = true;
    }
    selectors.yearSelect.appendChild(option);
  }
}

async function loadUsers() {
  const response = await fetch("/users/?limit=1000", {
    headers: {
      Authorization: authHeader,
      Accept: "application/json"
    }
  });
  if (response.status === 401) {
    handleUnauthorized();
    return;
  }
  if (!response.ok) {
    throw new Error("Nie udało się pobrać użytkowników");
  }
  const users = await response.json();
  const sorted = users.slice().sort((a, b) => {
    const last = collator.compare(a.last_name || "", b.last_name || "");
    return last !== 0 ? last : collator.compare(a.first_name || "", b.first_name || "");
  });
  sorted.forEach(user => {
    usersMap.set(user.user_id, user);
  });
  if (selectors.userSelect) {
    sorted.forEach(user => {
      const option = document.createElement("option");
      option.value = String(user.user_id);
      option.textContent = `${user.first_name} ${user.last_name}`;
      selectors.userSelect.appendChild(option);
    });
  }
}

async function loadProjects() {
  const response = await fetch("/projects/", {
    headers: {
      Authorization: authHeader,
      Accept: "application/json"
    }
  });
  if (response.status === 401) {
    handleUnauthorized();
    return;
  }
  if (!response.ok) {
    throw new Error("Nie udało się pobrać projektów");
  }
  const projects = await response.json();
  projects.forEach(project => {
    projectsMap.set(project.project_id, project);
  });
  if (selectors.projectSelect) {
    projects
      .slice()
      .sort((a, b) => collator.compare(a.project_name || "", b.project_name || ""))
      .forEach(project => {
        const option = document.createElement("option");
        option.value = String(project.project_id);
        option.textContent = project.project_name;
        selectors.projectSelect.appendChild(option);
      });
  }
}

function buildFiltersPayload() {
  const payload = {};
  const statusVal = selectors.statusSelect?.value;
  if (statusVal === "") {
    payload.status = null;
  } else if (statusVal) {
    payload.status = statusVal;
  }
  const monthVal = selectors.monthSelect?.value;
  const yearVal = selectors.yearSelect?.value;
  if (monthVal && yearVal) {
    payload.month = Number(monthVal);
    payload.year = Number(yearVal);
  }
  const userVal = selectors.userSelect?.value;
  if (userVal) {
    payload.user_id = Number(userVal);
  }
  const projectVal = selectors.projectSelect?.value;
  if (projectVal) {
    payload.project_id = Number(projectVal);
  }
  return payload;
}

async function refreshQueue(options = {}) {
  const { preserveSelection = false, silent = false } = options;
  const previousSelection = preserveSelection ? selectedReportId : null;

  if (!preserveSelection) {
    clearDetails();
    clearSelection();
  }

  if (!silent && selectors.queueLoader) {
    selectors.queueLoader.classList.remove("d-none");
  }
  if (!silent && selectors.queueEmpty) {
    selectors.queueEmpty.classList.add("d-none");
  }
  if (!silent && selectors.queueList) {
    selectors.queueList.innerHTML = "";
  }

  try {
    const response = await fetch("/work_reports/review_queue", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(buildFiltersPayload())
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!response.ok) {
      throw new Error("Błąd pobierania kolejki");
    }

    queueData = await response.json();
    if (preserveSelection) {
      pruneInvalidSelections();
    }
    renderQueue(previousSelection);
    updateBulkControls();
  } catch (error) {
    console.error(error);
    showToast("Nie udało się pobrać kolejki.");
  } finally {
    if (selectors.queueLoader) {
      selectors.queueLoader.classList.add("d-none");
    }
  }
}

function renderQueue(selectedId = null) {
  if (!selectors.queueList || !selectors.queueEmpty || !selectors.queueCounter) {
    return;
  }
  selectors.queueList.innerHTML = "";
  if (!Array.isArray(queueData) || queueData.length === 0) {
    selectors.queueEmpty.classList.remove("d-none");
    selectors.queueCounter.textContent = "0 wpisów";
    clearSelection();
    updateBulkControls();
    if (selectedReportId) {
      clearDetails();
    }
    return;
  }
  selectors.queueEmpty.classList.add("d-none");
  selectors.queueCounter.textContent = formatCounter(queueData.length);

  queueData.forEach(report => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "list-group-item list-group-item-action queue-item";
    item.dataset.reportId = String(report.report_id);
    if (report.report_id === selectedId) {
      item.classList.add("active");
    }

    const statusKey = report.status || "roboczy";
    const canSelect = REVIEWABLE_STATUSES.has(statusKey);

    const header = document.createElement("div");
    header.className = "d-flex align-items-start gap-3";

    const selectionWrapper = document.createElement("div");
    selectionWrapper.className = "form-check mt-1";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input queue-select";
    checkbox.checked = selectedIds.has(report.report_id);
    checkbox.disabled = !canSelect || bulkActionInProgress;
    if (!canSelect) {
      selectionWrapper.title = "Wpis w tym statusie nie może być masowo przetworzony";
    }
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", (event) => toggleSelection(report.report_id, event.target.checked));
    selectionWrapper.appendChild(checkbox);

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "flex-grow-1";

    const topRow = document.createElement("div");
    topRow.className = "d-flex justify-content-between align-items-start";

    const title = document.createElement("div");
    title.innerHTML = `<strong>${formatDateShort(report.work_date)}</strong><br>${escapeHtml(getUserLabel(report.user_id))}`;

    const status = document.createElement("span");
    status.className = `badge ${STATUS_BADGES[statusKey] || "bg-secondary"}`;
    status.textContent = STATUS_LABELS[statusKey] || statusKey;

    topRow.appendChild(title);
    topRow.appendChild(status);

    const meta = document.createElement("div");
    meta.className = "mt-2 small text-muted";
    meta.innerHTML = `${escapeHtml(getProjectLabel(report.project_id))} • ${formatDuration(report)}`;

    contentWrapper.appendChild(topRow);
    contentWrapper.appendChild(meta);

    header.appendChild(selectionWrapper);
    header.appendChild(contentWrapper);

    item.appendChild(header);

    item.addEventListener("click", () => {
      selectReport(report.report_id);
    });

    selectors.queueList.appendChild(item);
  });

  if (selectedId) {
    selectReport(selectedId);
  }

  updateBulkControls();
}

function selectReport(reportId) {
  const report = queueData.find(r => r.report_id === reportId);
  if (!report) {
    clearDetails();
    return;
  }
  selectedReportId = reportId;

  const buttons = selectors.queueList ? selectors.queueList.querySelectorAll(".queue-item") : [];
  buttons.forEach(btn => {
    const btnId = Number(btn.dataset?.reportId);
    btn.classList.toggle("active", btnId === reportId);
  });

  showDetails(report);
}

function showDetails(report) {
  if (!selectors.detailsPanel || !selectors.detailsPlaceholder) {
    return;
  }
  selectors.detailsPlaceholder.classList.add("d-none");
  selectors.detailsPanel.classList.remove("d-none");
  selectors.refreshDetailsBtn?.removeAttribute("disabled");

  selectors.detailDate.textContent = formatDateLong(report.work_date);
  selectors.detailUser.textContent = `${getUserLabel(report.user_id)} • ${formatEmail(report.user_id)}`;
  const statusKey = report.status || "roboczy";
  selectors.detailStatus.className = `badge status-badge ${STATUS_BADGES[statusKey] || "bg-secondary"}`;
  selectors.detailStatus.textContent = STATUS_LABELS[statusKey] || statusKey;

  selectors.detailProject.textContent = getProjectLabel(report.project_id);
  selectors.detailTime.textContent = formatTimeRange(report);
  selectors.detailSubmitted.textContent = report.submitted_at ? formatDateTime(report.submitted_at) : "brak informacji";
  selectors.detailDecision.textContent = buildDecisionText(report);
  selectors.detailDescription.textContent = report.description?.trim() || "Brak opisu.";
  selectors.detailComment.textContent = report.reviewer_comment?.trim() || "Brak komentarza.";

  updateActionSection(report);
  loadHistory(report.report_id);
}

function buildDecisionText(report) {
  if (report.status === "zaakceptowany" && report.approved_at) {
    return `Zaakceptowano ${formatDateTime(report.approved_at)}`;
  }
  if (report.status === "odrzucony" && report.rejected_at) {
    return `Odrzucono ${formatDateTime(report.rejected_at)}`;
  }
  if (report.status === "oczekuje_na_akceptacje" && report.submitted_at) {
    return `Oczekuje od ${formatDateTime(report.submitted_at)}`;
  }
  return "Brak historii decyzji";
}

function updateActionSection(report) {
  if (!selectors.actionSection) {
    return;
  }
  const statusKey = report.status || "roboczy";
  const canReview = REVIEWABLE_STATUSES.has(statusKey);
  selectors.actionInfo.textContent = ACTION_MESSAGES[statusKey] || "Brak dodatkowych informacji.";
  selectors.approveBtn.disabled = !canReview;
  selectors.rejectBtn.disabled = !canReview;
  selectors.rejectionComment.disabled = !canReview;
  if (!canReview && selectors.rejectionComment) {
    selectors.rejectionComment.value = "";
  }
}

async function loadHistory(reportId) {
  if (!selectors.historyList) {
    return;
  }
  selectors.historyList.innerHTML = "Ładowanie historii...";
  try {
    const response = await fetch(`/work_reports/${reportId}/history`, {
      headers: {
        Authorization: authHeader,
        Accept: "application/json"
      }
    });
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!response.ok) {
      throw new Error("Błąd pobierania historii");
    }
    const entries = await response.json();
    if (!entries.length) {
      selectors.historyList.innerHTML = "Brak historii decyzji.";
      return;
    }
    selectors.historyList.innerHTML = "";
    entries.forEach(entry => {
      const div = document.createElement("div");
      div.className = "history-entry";
      const actor = getUserLabel(entry.actor_user_id) || "System";
      const actionLabel = escapeHtml(mapAction(entry.action));
      div.innerHTML = `
        <div class="d-flex justify-content-between">
          <strong>${actionLabel}</strong>
          <span class="text-muted small">${formatDateTime(entry.created_at)}</span>
        </div>
        <div class="small text-muted">${escapeHtml(actor)}</div>
        ${entry.comment ? `<div class="mt-1">${escapeHtml(entry.comment)}</div>` : ""}
      `;
      selectors.historyList.appendChild(div);
    });
  } catch (error) {
    console.error(error);
    selectors.historyList.innerHTML = "Nie udało się pobrać historii.";
  }
}

function mapAction(action) {
  switch (action) {
    case "submit":
      return "Wysłano do akceptacji";
    case "approve":
      return "Akceptacja";
    case "reject":
      return "Odrzucenie";
    default:
      return action || "Zdarzenie";
  }
}

async function handleDecision(decision) {
  if (!selectedReportId) {
    return;
  }
  const report = queueData.find(r => r.report_id === selectedReportId);
  if (!report || !REVIEWABLE_STATUSES.has(report.status || "")) {
    return;
  }
  const payload = { decision };
  if (decision === "reject") {
    const comment = selectors.rejectionComment.value.trim();
    if (!comment) {
      showToast("Podaj komentarz przy odrzuceniu.");
      return;
    }
    payload.comment = comment;
  }

  setActionButtonsDisabled(true);
  try {
    const response = await fetch(`/work_reports/${selectedReportId}/review`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Błąd zapisu decyzji");
    }
    selectors.rejectionComment.value = "";
    await refreshQueue({ preserveSelection: true });
    showToast("Decyzja została zapisana.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Nie udało się zapisać decyzji.");
  } finally {
    setActionButtonsDisabled(false);
  }
}

function setActionButtonsDisabled(state) {
  if (!selectors.approveBtn || !selectors.rejectBtn || !selectors.rejectionComment) {
    return;
  }
  if (state) {
    selectors.approveBtn.disabled = true;
    selectors.rejectBtn.disabled = true;
    selectors.rejectionComment.disabled = true;
    return;
  }
  const report = queueData.find(r => r.report_id === selectedReportId);
  if (report) {
    updateActionSection(report);
  } else {
    selectors.approveBtn.disabled = true;
    selectors.rejectBtn.disabled = true;
    selectors.rejectionComment.disabled = true;
  }
}

function clearDetails() {
  selectedReportId = null;
  selectors.detailsPanel?.classList.add("d-none");
  selectors.detailsPlaceholder?.classList.remove("d-none");
  selectors.refreshDetailsBtn?.setAttribute("disabled", "disabled");
  if (selectors.historyList) {
    selectors.historyList.innerHTML = "";
  }
  if (selectors.rejectionComment) {
    selectors.rejectionComment.value = "";
  }
}

function clearSelection() {
  if (selectedIds.size === 0) {
    updateBulkControls();
    return;
  }
  selectedIds.clear();
  updateBulkControls();
}

function startAutoRefresh() {
  stopAutoRefresh();
  autoRefreshHandle = window.setInterval(() => {
    refreshQueue({ preserveSelection: true, silent: true });
  }, AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh() {
  if (autoRefreshHandle) {
    window.clearInterval(autoRefreshHandle);
    autoRefreshHandle = null;
  }
}

function attachEvents() {
  selectors.applyFiltersBtn?.addEventListener("click", () => refreshQueue());
  selectors.clearFiltersBtn?.addEventListener("click", () => {
    if (selectors.statusSelect) {
      selectors.statusSelect.value = "oczekuje_na_akceptacje";
    }
    if (selectors.userSelect) {
      selectors.userSelect.value = "";
    }
    if (selectors.projectSelect) {
      selectors.projectSelect.value = "";
    }
    initMonthYearSelects();
    refreshQueue();
  });
  selectors.autoRefreshSwitch?.addEventListener("change", (event) => {
    if (event.target.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });
  selectors.selectAllCheckbox?.addEventListener("change", (event) => {
    if (event.target.checked) {
      queueData.forEach(report => {
        if (REVIEWABLE_STATUSES.has(report.status || "")) {
          selectedIds.add(report.report_id);
        }
      });
    } else {
      const selectable = new Set(getSelectableReportIds());
      selectable.forEach(id => selectedIds.delete(id));
    }
    updateBulkControls();
    renderQueue(selectedReportId);
  });
  selectors.approveBtn?.addEventListener("click", () => handleDecision("approve"));
  selectors.rejectBtn?.addEventListener("click", () => handleDecision("reject"));
  selectors.bulkApproveBtn?.addEventListener("click", () => handleBulkDecision("approve"));
  selectors.bulkRejectBtn?.addEventListener("click", () => handleBulkDecision("reject"));
  selectors.refreshDetailsBtn?.addEventListener("click", () => refreshQueue({ preserveSelection: true }));
}

function handleUnauthorized() {
  localStorage.removeItem("token");
  window.location.replace("/");
}

function formatCounter(value) {
  if (value === 1) {
    return "1 wpis";
  }
  if (value >= 2 && value <= 4) {
    return `${value} wpisy`;
  }
  return `${value} wpisów`;
}

function formatSelectedCounter(value) {
  if (value === 0) {
    return "0 zaznaczonych";
  }
  if (value === 1) {
    return "1 wpis zaznaczony";
  }
  if (value >= 2 && value <= 4) {
    return `${value} wpisy zaznaczone`;
  }
  return `${value} wpisów zaznaczonych`;
}

function formatDateShort(isoDate) {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  return date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

function formatDateLong(isoDate) {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  return date.toLocaleDateString("pl-PL", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function formatDateTime(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  return date.toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(report) {
  const hours = Number(report.hours_spent) || 0;
  const minutes = Number(report.minutes_spent) || 0;
  return `${hours}h ${minutes}min`;
}

function formatTimeRange(report) {
  if (report.time_from && report.time_to) {
    return `${report.time_from} - ${report.time_to} (${formatDuration(report)})`;
  }
  return formatDuration(report);
}

function getUserLabel(userId) {
  if (!userId || !usersMap.has(userId)) {
    return `Użytkownik #${userId ?? "-"}`;
  }
  const user = usersMap.get(userId);
  return `${user.first_name} ${user.last_name}`;
}

function formatEmail(userId) {
  if (!userId || !usersMap.has(userId)) {
    return "brak adresu";
  }
  return usersMap.get(userId).email;
}

function getProjectLabel(projectId) {
  if (!projectId || !projectsMap.has(projectId)) {
    return `Projekt #${projectId ?? "-"}`;
  }
  return projectsMap.get(projectId).project_name;
}

function escapeHtml(text) {
  if (text === undefined || text === null) {
    return "";
  }
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  if (!message) return;
  const alert = document.createElement("div");
  alert.className = "alert alert-warning position-fixed top-0 start-50 translate-middle-x mt-3 shadow";
  alert.style.zIndex = "1055";
  alert.textContent = message;
  document.body.appendChild(alert);
  setTimeout(() => {
    alert.classList.add("opacity-0");
    setTimeout(() => alert.remove(), 400);
  }, 2500);
}

function updateBulkControls() {
  if (selectors.selectedCounter) {
    selectors.selectedCounter.textContent = formatSelectedCounter(selectedIds.size);
  }
  const disableActions = selectedIds.size === 0 || bulkActionInProgress;
  if (selectors.bulkApproveBtn) {
    selectors.bulkApproveBtn.disabled = disableActions;
  }
  if (selectors.bulkRejectBtn) {
    selectors.bulkRejectBtn.disabled = disableActions;
  }
  if (selectors.bulkRejectionComment) {
    selectors.bulkRejectionComment.disabled = bulkActionInProgress;
  }
  if (selectors.selectAllCheckbox) {
    const selectableIds = getSelectableReportIds();
    const hasSelectable = selectableIds.length > 0;
    selectors.selectAllCheckbox.disabled = !hasSelectable || bulkActionInProgress;
    const selectedCount = selectableIds.filter(id => selectedIds.has(id)).length;
    selectors.selectAllCheckbox.checked = hasSelectable && selectedCount === selectableIds.length && selectableIds.length > 0;
    selectors.selectAllCheckbox.indeterminate = hasSelectable && selectedCount > 0 && selectedCount < selectableIds.length;
  }
}

function getSelectableReportIds() {
  return queueData
    .filter(report => REVIEWABLE_STATUSES.has(report.status || ""))
    .map(report => report.report_id);
}

function pruneInvalidSelections() {
  const validIds = new Set(getSelectableReportIds());
  let changed = false;
  selectedIds.forEach(id => {
    if (!validIds.has(id)) {
      selectedIds.delete(id);
      changed = true;
    }
  });
  if (changed) {
    updateBulkControls();
  }
}

function toggleSelection(reportId, isSelected) {
  if (isSelected) {
    selectedIds.add(reportId);
  } else {
    selectedIds.delete(reportId);
  }
  updateBulkControls();
}

async function handleBulkDecision(decision) {
  const ids = Array.from(selectedIds);
  if (!ids.length) {
    return;
  }
  let comment = "";
  if (decision === "reject") {
    comment = selectors.bulkRejectionComment?.value.trim() || "";
    if (!comment) {
      showToast("Podaj komentarz dla masowego odrzucenia.");
      return;
    }
  }

  bulkActionInProgress = true;
  updateBulkControls();
  renderQueue(selectedReportId);

  const errors = [];
  for (const reportId of ids) {
    try {
      const payload = { decision };
      if (decision === "reject") {
        payload.comment = comment;
      }
      const response = await fetch(`/work_reports/${reportId}/review`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (response.status === 401) {
        handleUnauthorized();
        bulkActionInProgress = false;
        updateBulkControls();
        return;
      }
      if (!response.ok) {
        const message = await response.text();
        errors.push({ reportId, message: message || "Nieznany błąd" });
      }
    } catch (error) {
      errors.push({ reportId, message: error.message });
    }
  }

  if (decision === "reject" && selectors.bulkRejectionComment) {
    selectors.bulkRejectionComment.value = "";
  }

  bulkActionInProgress = false;
  clearSelection();
  await refreshQueue({ preserveSelection: false });
  if (errors.length) {
    console.error("Błędy podczas masowego przetwarzania:", errors);
    showToast(`Nie udało się przetworzyć ${errors.length} wpisów. Sprawdź konsolę.`);
  } else {
    showToast(decision === "approve" ? "Zatwierdzono wszystkie zaznaczone wpisy." : "Odrzucono wszystkie zaznaczone wpisy.");
  }
  updateBulkControls();
}

async function initPage() {
  const token = localStorage.getItem("token");
  if (!token) {
    handleUnauthorized();
    return;
  }
  authHeader = token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;

  cacheElements();
  initMonthYearSelects();
  attachEvents();
  updateBulkControls();

  try {
    await Promise.all([loadUsers(), loadProjects()]);
  } catch (error) {
    console.error(error);
    showToast("Nie udało się załadować słowników użytkowników/projektów.");
  }

  await refreshQueue();
  if (selectors.autoRefreshSwitch?.checked) {
    startAutoRefresh();
  }
}

document.addEventListener("DOMContentLoaded", initPage);
