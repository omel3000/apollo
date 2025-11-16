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
  odrzucony: "Wpis został odrzucony – możesz zmienić decyzję, jeśli to konieczne.",
  roboczy: "Wpis jest w wersji roboczej – HR nie może go jeszcze oceniać.",
  zablokowany: "Okres rozliczeniowy został zamknięty. Edycja decyzji nie jest możliwa."
};

const GROUPING_MODES = {
  DAILY: "daily",
  MONTHLY: "monthly"
};

const REVIEWABLE_STATUSES = new Set(["oczekuje_na_akceptacje", "zaakceptowany", "odrzucony"]);
const AUTO_REFRESH_INTERVAL = 60000; // 60 sekund
const collator = new Intl.Collator("pl", { sensitivity: "base" });

let authHeader = "";
let queueData = [];
let groupedQueue = [];
let groupingMode = GROUPING_MODES.DAILY;
let activeGroupId = null;
let focusedEntryId = null;
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
    groupingRadios: Array.from(document.querySelectorAll("input[name='groupingMode']")),
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
    entryList: document.getElementById("entryList"),
    groupSelectAllBtn: document.getElementById("groupSelectAllBtn"),
    groupClearSelectionBtn: document.getElementById("groupClearSelectionBtn"),
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

function buildGroupedQueue(reports, mode = groupingMode) {
  if (mode === GROUPING_MODES.MONTHLY) {
    return buildMonthlyGroups(reports);
  }
  return buildDailyGroups(reports);
}

function buildDailyGroups(reports) {
  const groupsMap = new Map();
  reports.forEach(report => {
    const key = `${report.user_id}__${report.work_date}`;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        groupId: key,
        userId: report.user_id,
        workDate: report.work_date,
        entries: [],
        totalMinutes: 0,
        type: GROUPING_MODES.DAILY
      });
    }
    const group = groupsMap.get(key);
    group.entries.push(report);
    group.totalMinutes += getReportMinutes(report);
  });

  const groups = Array.from(groupsMap.values());
  groups.forEach(group => {
    group.entries.sort((a, b) => new Date(a.created_at || a.work_date) - new Date(b.created_at || b.work_date));
  });

  return groups.sort((a, b) => {
    const dateDiff = new Date(b.workDate) - new Date(a.workDate);
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return collator.compare(getUserLabel(a.userId), getUserLabel(b.userId));
  });
}

function buildMonthlyGroups(reports) {
  const groupsMap = new Map();
  reports.forEach(report => {
    const date = new Date(report.work_date || report.created_at);
    const year = Number.isNaN(date.getTime()) ? null : date.getFullYear();
    const month = Number.isNaN(date.getTime()) ? null : date.getMonth() + 1;
    const monthKey = year && month ? `${year}-${String(month).padStart(2, "0")}` : "brak-daty";
    const key = `${report.user_id}__${monthKey}`;

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        groupId: key,
        userId: report.user_id,
        workDate: null,
        entries: [],
        totalMinutes: 0,
        type: GROUPING_MODES.MONTHLY,
        month,
        year,
        sortKey: year && month ? new Date(year, month - 1, 1) : new Date(report.work_date || Date.now())
      });
    }
    const group = groupsMap.get(key);
    group.entries.push(report);
    group.totalMinutes += getReportMinutes(report);
  });

  const groups = Array.from(groupsMap.values());
  groups.forEach(group => {
    group.entries.sort((a, b) => {
      const dateDiff = new Date(a.work_date || a.created_at) - new Date(b.work_date || b.created_at);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return collator.compare(getProjectLabel(a.project_id), getProjectLabel(b.project_id));
    });
  });

  return groups.sort((a, b) => {
    const dateDiff = (b.sortKey?.getTime() || 0) - (a.sortKey?.getTime() || 0);
    if (dateDiff !== 0) {
      return dateDiff;
    }
    return collator.compare(getUserLabel(a.userId), getUserLabel(b.userId));
  });
}

function getGroupById(groupId) {
  return groupedQueue.find(group => group.groupId === groupId) || null;
}

async function refreshQueue(options = {}) {
  const { preserveSelection = false, silent = false } = options;
  const previousGroupId = preserveSelection ? activeGroupId : null;

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
    groupedQueue = buildGroupedQueue(queueData, groupingMode);
    if (preserveSelection) {
      pruneInvalidSelections();
    }
    renderQueue(previousGroupId);
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

function renderQueue(selectedGroupId = null) {
  if (!selectors.queueList || !selectors.queueEmpty || !selectors.queueCounter) {
    return;
  }
  selectors.queueList.innerHTML = "";

  if (!Array.isArray(groupedQueue) || groupedQueue.length === 0) {
    selectors.queueEmpty.classList.remove("d-none");
    selectors.queueCounter.textContent = "0 wpisów";
    clearSelection();
    updateBulkControls();
    clearDetails();
    return;
  }

  selectors.queueEmpty.classList.add("d-none");
  const totalEntries = queueData.length;
  selectors.queueCounter.textContent = formatCounter(totalEntries);

  groupedQueue.forEach(group => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "list-group-item list-group-item-action queue-item";
    item.dataset.groupId = group.groupId;
    if (group.groupId === selectedGroupId) {
      item.classList.add("active");
    }

    const header = document.createElement("div");
    header.className = "d-flex align-items-start gap-3";

    const selectionWrapper = document.createElement("div");
    selectionWrapper.className = "form-check mt-1";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input queue-select";
    const groupSelectableIds = getGroupSelectableIds(group);
    const selectableCount = groupSelectableIds.length;
    const selectedCount = groupSelectableIds.filter(id => selectedIds.has(id)).length;
    checkbox.checked = selectableCount > 0 && selectedCount === selectableCount;
    checkbox.indeterminate = selectableCount > 0 && selectedCount > 0 && selectedCount < selectableCount;
    checkbox.disabled = selectableCount === 0 || bulkActionInProgress;
    if (selectableCount === 0) {
      selectionWrapper.title = "Wpisy w tej grupie są w statusie, którego nie można masowo przetworzyć";
    }
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", (event) => {
      event.stopPropagation();
      toggleGroupSelection(group, event.target.checked);
    });
    selectionWrapper.appendChild(checkbox);

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "flex-grow-1";

    const topRow = document.createElement("div");
    topRow.className = "d-flex justify-content-between align-items-start flex-wrap gap-2";

    const title = document.createElement("div");
    title.innerHTML = `<strong>${escapeHtml(getGroupPrimaryLabel(group))}</strong><br>${escapeHtml(getUserLabel(group.userId))}`;

    const statusInfo = getGroupStatusInfo(group);
    const statusBadge = document.createElement("span");
    statusBadge.className = `badge ${statusInfo.className}`;
    statusBadge.textContent = statusInfo.label;

    topRow.appendChild(title);
    topRow.appendChild(statusBadge);

    const meta = document.createElement("div");
    meta.className = "mt-2 small text-muted";
    meta.innerHTML = `${group.entries.length} wpisów • ${formatTotalMinutes(group.totalMinutes)}`;

    contentWrapper.appendChild(topRow);
    contentWrapper.appendChild(meta);

    header.appendChild(selectionWrapper);
    header.appendChild(contentWrapper);

    item.appendChild(header);

    item.addEventListener("click", () => {
      selectGroup(group.groupId);
    });

    selectors.queueList.appendChild(item);
  });

  if (selectedGroupId) {
    selectGroup(selectedGroupId);
  }

  updateBulkControls();
}

function getGroupStatusInfo(group) {
  const statuses = new Set(group.entries.map(entry => entry.status || "roboczy"));
  if (statuses.size === 1) {
    const statusKey = statuses.values().next().value;
    return {
      label: STATUS_LABELS[statusKey] || statusKey,
      className: STATUS_BADGES[statusKey] || "bg-secondary"
    };
  }
  return { label: "Różne statusy", className: "bg-primary" };
}

function formatTotalMinutes(totalMinutes) {
  const total = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${hours}h ${minutes}min`;
}

function toggleGroupSelection(group, isSelected) {
  const selectableIds = getGroupSelectableIds(group);
  selectableIds.forEach(id => {
    if (isSelected) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
    }
  });
  updateBulkControls();
  renderQueue(activeGroupId);
}

function getGroupSelectableIds(group) {
  return group.entries
    .filter(entry => REVIEWABLE_STATUSES.has(entry.status || ""))
    .map(entry => entry.report_id);
}

function selectAllInActiveGroup() {
  if (!activeGroupId) {
    return;
  }
  const group = getGroupById(activeGroupId);
  if (!group) {
    return;
  }
  toggleGroupSelection(group, true);
}

function clearActiveGroupSelection() {
  if (!activeGroupId) {
    return;
  }
  const group = getGroupById(activeGroupId);
  if (!group) {
    return;
  }
  const selectableIds = getGroupSelectableIds(group);
  selectableIds.forEach(id => selectedIds.delete(id));
  updateBulkControls();
  renderQueue(activeGroupId);
}

function selectGroup(groupId) {
  const group = getGroupById(groupId);
  if (!group) {
    clearDetails();
    return;
  }
  activeGroupId = groupId;
  const buttons = selectors.queueList ? selectors.queueList.querySelectorAll(".queue-item") : [];
  buttons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset?.groupId === groupId);
  });

  const entryExists = group.entries.some(entry => entry.report_id === focusedEntryId);
  if (!entryExists) {
    focusedEntryId = group.entries[0]?.report_id || null;
  }

  renderGroupDetails(group);
}

function renderGroupDetails(group) {
  if (!selectors.detailsPanel || !selectors.detailsPlaceholder) {
    return;
  }
  selectors.detailsPlaceholder.classList.add("d-none");
  selectors.detailsPanel.classList.remove("d-none");
  selectors.refreshDetailsBtn?.removeAttribute("disabled");

  selectors.detailDate.textContent = getGroupDetailLabel(group);
  selectors.detailUser.textContent = `${getUserLabel(group.userId)} • ${formatEmail(group.userId)}`;

  renderEntryList(group);
  updateFocusedEntryDetails(group);
}

function renderEntryList(group) {
  if (!selectors.entryList) {
    return;
  }
  selectors.entryList.innerHTML = "";
  if (!group.entries.length) {
    selectors.entryList.innerHTML = "<div class=\"text-muted\">Brak wpisów w tym dniu.</div>";
    updateGroupQuickActions(group);
    return;
  }

  group.entries.forEach(entry => {
    const row = document.createElement("div");
    row.className = "list-group-item list-group-item-action d-flex align-items-center justify-content-between gap-3 entry-row";
    row.dataset.entryId = String(entry.report_id);
    if (entry.report_id === focusedEntryId) {
      row.classList.add("active");
    }

    const left = document.createElement("div");
    left.className = "d-flex align-items-center gap-3 flex-grow-1";

    const checkboxWrapper = document.createElement("div");
    checkboxWrapper.className = "form-check mb-0";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input";
    const selectable = REVIEWABLE_STATUSES.has(entry.status || "");
    checkbox.checked = selectedIds.has(entry.report_id);
    checkbox.disabled = !selectable || bulkActionInProgress;
    if (!selectable) {
      checkbox.title = "Tego wpisu nie można masowo przetworzyć";
    }
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", (event) => {
      event.stopPropagation();
      toggleSelection(entry.report_id, event.target.checked);
    });
    checkboxWrapper.appendChild(checkbox);

    const info = document.createElement("div");
    info.className = "flex-grow-1";
    const subtitleParts = [];
    if (group.type === GROUPING_MODES.MONTHLY) {
      subtitleParts.push(formatDateShort(entry.work_date));
    }
    subtitleParts.push(formatTimeRange(entry));
    info.innerHTML = `
      <div><strong>${escapeHtml(getProjectLabel(entry.project_id))}</strong></div>
      <div class="text-muted">${subtitleParts.join(" • ")}</div>
    `;

    left.appendChild(checkboxWrapper);
    left.appendChild(info);

    const badge = document.createElement("span");
    const statusKey = entry.status || "roboczy";
    badge.className = `badge ${STATUS_BADGES[statusKey] || "bg-secondary"}`;
    badge.textContent = STATUS_LABELS[statusKey] || statusKey;

    row.appendChild(left);
    row.appendChild(badge);

    row.addEventListener("click", () => setFocusedEntry(entry.report_id));

    selectors.entryList.appendChild(row);
  });

  updateGroupQuickActions(group);
}

function updateGroupQuickActions(group) {
  if (selectors.groupSelectAllBtn) {
    const selectable = getGroupSelectableIds(group);
    selectors.groupSelectAllBtn.disabled = selectable.length === 0 || bulkActionInProgress;
  }
  if (selectors.groupClearSelectionBtn) {
    const selectedCount = group.entries.filter(entry => selectedIds.has(entry.report_id)).length;
    selectors.groupClearSelectionBtn.disabled = selectedCount === 0 || bulkActionInProgress;
  }
}

function setFocusedEntry(entryId) {
  if (!activeGroupId) {
    return;
  }
  const group = getGroupById(activeGroupId);
  if (!group) {
    return;
  }
  const exists = group.entries.some(entry => entry.report_id === entryId);
  if (!exists) {
    return;
  }
  focusedEntryId = entryId;
  renderEntryList(group);
  updateFocusedEntryDetails(group);
}

function getFocusedEntry() {
  if (!activeGroupId || !focusedEntryId) {
    return null;
  }
  const group = getGroupById(activeGroupId);
  if (!group) {
    return null;
  }
  return group.entries.find(entry => entry.report_id === focusedEntryId) || null;
}

function getSelectedIdsForActiveGroup() {
  if (!activeGroupId) {
    return [];
  }
  const group = getGroupById(activeGroupId);
  if (!group) {
    return [];
  }
  return group.entries
    .filter(entry => selectedIds.has(entry.report_id) && REVIEWABLE_STATUSES.has(entry.status || ""))
    .map(entry => entry.report_id);
}

function updateFocusedEntryDetails(group) {
  const entry = group.entries.find(item => item.report_id === focusedEntryId) || group.entries[0];
  if (!entry) {
    clearDetails();
    return;
  }
  focusedEntryId = entry.report_id;

  const statusKey = entry.status || "roboczy";
  selectors.detailStatus.className = `badge status-badge ${STATUS_BADGES[statusKey] || "bg-secondary"}`;
  selectors.detailStatus.textContent = STATUS_LABELS[statusKey] || statusKey;
  selectors.detailProject.textContent = getProjectLabel(entry.project_id);
  selectors.detailTime.textContent = formatTimeRange(entry);
  selectors.detailSubmitted.textContent = entry.submitted_at ? formatDateTime(entry.submitted_at) : "brak informacji";
  selectors.detailDecision.textContent = buildDecisionText(entry);
  selectors.detailDescription.textContent = entry.description?.trim() || "Brak opisu.";

  updateActionSection(entry);
  loadEntryHistory(entry.report_id);
}

function buildDecisionText(entry) {
  if (entry.status === "zaakceptowany" && entry.approved_at) {
    return `Zaakceptowano ${formatDateTime(entry.approved_at)}`;
  }
  if (entry.status === "odrzucony" && entry.rejected_at) {
    return `Odrzucono ${formatDateTime(entry.rejected_at)}`;
  }
  if (entry.status === "oczekuje_na_akceptacje" && entry.submitted_at) {
    return `Oczekuje od ${formatDateTime(entry.submitted_at)}`;
  }
  return "Brak historii decyzji";
}

function updateActionSection(entry) {
  if (!selectors.actionSection) {
    return;
  }
  const statusKey = entry?.status || "roboczy";
  const isReviewableStatus = REVIEWABLE_STATUSES.has(statusKey);
  const canReview = isReviewableStatus && !bulkActionInProgress;
  selectors.actionInfo.textContent = ACTION_MESSAGES[statusKey] || "Brak dodatkowych informacji.";
  selectors.approveBtn.disabled = !canReview;
  selectors.rejectBtn.disabled = !canReview;
  selectors.rejectionComment.disabled = !canReview;
  if (!isReviewableStatus && selectors.rejectionComment) {
    selectors.rejectionComment.value = "";
  }
}

async function loadEntryHistory(reportId) {
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
    if (focusedEntryId !== reportId) {
      return;
    }
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
    if (focusedEntryId === reportId) {
      selectors.historyList.innerHTML = "Nie udało się pobrać historii.";
    }
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
  const groupSelection = getSelectedIdsForActiveGroup();
  let targetIds = groupSelection;
  if (!targetIds.length && focusedEntryId) {
    const entry = queueData.find(item => item.report_id === focusedEntryId);
    if (entry && REVIEWABLE_STATUSES.has(entry.status || "")) {
      targetIds = [focusedEntryId];
    }
  }
  if (!targetIds.length) {
    showToast("Zaznacz wpisy lub wybierz wpis w statusie możliwym do oceny.");
    return;
  }

  let comment = null;
  if (decision === "reject") {
    comment = selectors.rejectionComment?.value.trim() || "";
    if (!comment) {
      showToast("Podaj komentarz przy odrzuceniu.");
      return;
    }
  }

  setActionButtonsDisabled(true);
  try {
    const success = await handleBulkDecision(decision, targetIds, comment, { skipBulkCommentReset: true });
    if (success && selectors.rejectionComment) {
      selectors.rejectionComment.value = "";
    }
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
  const entry = getFocusedEntry();
  if (entry) {
    updateActionSection(entry);
    return;
  }
  selectors.approveBtn.disabled = true;
  selectors.rejectBtn.disabled = true;
  selectors.rejectionComment.disabled = true;
}

function clearDetails() {
  activeGroupId = null;
  focusedEntryId = null;
  selectors.detailsPanel?.classList.add("d-none");
  selectors.detailsPlaceholder?.classList.remove("d-none");
  selectors.refreshDetailsBtn?.setAttribute("disabled", "disabled");
  if (selectors.historyList) {
    selectors.historyList.innerHTML = "";
  }
  if (selectors.rejectionComment) {
    selectors.rejectionComment.value = "";
  }
  if (selectors.groupSelectAllBtn) {
    selectors.groupSelectAllBtn.disabled = true;
  }
  if (selectors.groupClearSelectionBtn) {
    selectors.groupClearSelectionBtn.disabled = true;
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

function setGroupingMode(mode) {
  const normalized = mode === GROUPING_MODES.MONTHLY ? GROUPING_MODES.MONTHLY : GROUPING_MODES.DAILY;
  if (groupingMode === normalized) {
    return;
  }
  groupingMode = normalized;
  clearDetails();
  (selectors.groupingRadios || []).forEach(radio => {
    radio.checked = radio.value === normalized;
  });
  refreshQueue({ preserveSelection: true });
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

  const autoFilterControls = [
    selectors.statusSelect,
    selectors.monthSelect,
    selectors.yearSelect,
    selectors.userSelect,
    selectors.projectSelect
  ];
  autoFilterControls.forEach(control => {
    control?.addEventListener("change", () => refreshQueue());
  });

  (selectors.groupingRadios || []).forEach(radio => {
    radio.addEventListener("change", (event) => {
      if (event.target.checked) {
        const mode = event.target.value === GROUPING_MODES.MONTHLY ? GROUPING_MODES.MONTHLY : GROUPING_MODES.DAILY;
        setGroupingMode(mode);
      }
    });
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
    renderQueue(activeGroupId);
  });
  selectors.groupSelectAllBtn?.addEventListener("click", selectAllInActiveGroup);
  selectors.groupClearSelectionBtn?.addEventListener("click", clearActiveGroupSelection);
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

function getGroupPrimaryLabel(group) {
  if (!group) {
    return "-";
  }
  if (isMonthlyGroup(group)) {
    return formatMonthYearLong(group.year, group.month);
  }
  return formatDateShort(group.workDate);
}

function getGroupDetailLabel(group) {
  if (!group) {
    return "-";
  }
  if (isMonthlyGroup(group)) {
    return formatMonthYearLong(group.year, group.month);
  }
  return formatDateLong(group.workDate);
}

function isMonthlyGroup(group) {
  return group?.type === GROUPING_MODES.MONTHLY;
}

function formatMonthYearLong(year, month) {
  if (!year || !month) {
    return "-";
  }
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });
}

function formatDuration(report) {
  const hours = Number(report.hours_spent) || 0;
  const minutes = Number(report.minutes_spent) || 0;
  return `${hours}h ${minutes}min`;
}

function getReportMinutes(report) {
  const hours = Number(report.hours_spent) || 0;
  const minutes = Number(report.minutes_spent) || 0;
  return hours * 60 + minutes;
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
  window.setTimeout(() => {
    renderQueue(activeGroupId);
  }, 0);
}

async function handleBulkDecision(decision, overrideIds = null, overrideComment = null, options = {}) {
  const { skipBulkCommentReset = false } = options;
  const sourceIds = Array.isArray(overrideIds) && overrideIds.length ? overrideIds : Array.from(selectedIds);
  if (!sourceIds.length) {
    showToast("Zaznacz przynajmniej jeden wpis.");
    return false;
  }

  const validIds = sourceIds.filter(id => {
    const report = queueData.find(item => item.report_id === id);
    return report && REVIEWABLE_STATUSES.has(report.status || "");
  });
  if (!validIds.length) {
    showToast("Wybrane wpisy nie są w statusie pozwalającym na decyzję.");
    return false;
  }

  let comment = "";
  if (decision === "reject") {
    if (overrideComment !== null) {
      comment = overrideComment;
    } else {
      comment = selectors.bulkRejectionComment?.value.trim() || "";
    }
    if (!comment) {
      showToast("Podaj komentarz dla odrzucenia.");
      return false;
    }
  }

  bulkActionInProgress = true;
  updateBulkControls();
  renderQueue(activeGroupId);

  const errors = [];
  for (const reportId of validIds) {
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
        return false;
      }
      if (!response.ok) {
        const message = await response.text();
        errors.push({ reportId, message: message || "Nieznany błąd" });
      }
    } catch (error) {
      errors.push({ reportId, message: error.message });
    }
  }

  if (decision === "reject" && selectors.bulkRejectionComment && !skipBulkCommentReset) {
    selectors.bulkRejectionComment.value = "";
  }

  validIds.forEach(id => selectedIds.delete(id));

  bulkActionInProgress = false;
  await refreshQueue({ preserveSelection: true });
  updateBulkControls();

  if (errors.length) {
    console.error("Błędy podczas masowego przetwarzania:", errors);
    showToast(`Nie udało się przetworzyć ${errors.length} wpisów. Sprawdź konsolę.`);
    return false;
  }
  showToast(decision === "approve" ? "Zatwierdzono wskazane wpisy." : "Odrzucono wskazane wpisy.");
  return true;
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
