let authHeader = '';
let projectsCache = [];
let projectsReady = false;
let pendingWorkDate = null;
let reportsContainer = null;
let mainProjectSelect = null;

// Reakcja na zmianę dnia w nawigacji.
document.addEventListener('workdatechange', (event) => {
  const newDate = (event && event.detail && event.detail.date) || window.getCurrentWorkDate() || null;
  pendingWorkDate = newDate;
  if (projectsReady && authHeader && pendingWorkDate) {
    loadReportsForDate(pendingWorkDate);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const rawToken = localStorage.getItem('token');
  const token = rawToken ? rawToken.trim() : '';
  if (!token) {
    handleUnauthorized();
    return;
  }

  authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  reportsContainer = document.getElementById('existingReports');
  mainProjectSelect = document.getElementById('projektSelect');

  try {
    await loadProjects();
    projectsReady = true;
    const initialDate = pendingWorkDate || window.getCurrentWorkDate() || toApiDate(new Date());
    pendingWorkDate = initialDate;
    if (initialDate) {
      await loadReportsForDate(initialDate);
    }
  } catch (error) {
    console.error(error);
    alert('Nie udało się pobrać listy projektów.');
  }

  setupSaveHandler();
});

async function loadProjects() {
  const response = await fetch('/user_projects/my_projects', {
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
    throw new Error(message || 'Błąd pobierania projektów');
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Błąd API: niepoprawny format odpowiedzi przy pobieraniu projektów');
  }

  projectsCache = data.map(project => ({
    project_id: Number(project.project_id),
    project_name: project.project_name
  }));

  if (mainProjectSelect) {
    populateProjectSelect(mainProjectSelect);
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
    return;
  }

  const fragment = document.createDocumentFragment();
  reports.forEach(report => {
    fragment.appendChild(buildReportForm(report));
  });
  reportsContainer.appendChild(fragment);
}

function buildReportForm(report) {
  const form = document.createElement('form');
  form.className = 'report-entry';
  form.dataset.reportId = report.report_id;
  form.addEventListener('submit', (event) => event.preventDefault());

  const projectLabel = document.createElement('label');
  const projectFieldId = `existing-project-${report.report_id}`;
  projectLabel.setAttribute('for', projectFieldId);
  projectLabel.textContent = 'Projekt:';

  const projectSelect = document.createElement('select');
  projectSelect.id = projectFieldId;
  projectSelect.disabled = true;
  populateProjectSelect(projectSelect, report.project_id);

  const breakAfterProject = document.createElement('br');
  const breakAfterProject2 = document.createElement('br');

  const descriptionLabel = document.createElement('label');
  const descriptionId = `existing-description-${report.report_id}`;
  descriptionLabel.setAttribute('for', descriptionId);
  descriptionLabel.textContent = 'Opis (opcjonalny):';

  const descriptionArea = document.createElement('textarea');
  descriptionArea.id = descriptionId;
  descriptionArea.value = report.description || '';
  descriptionArea.readOnly = true;

  const breakAfterDescription = document.createElement('br');
  const breakAfterDescription2 = document.createElement('br');

  const timeLabel = document.createElement('label');
  timeLabel.textContent = 'Czas pracy:';

  const hoursInput = document.createElement('input');
  hoursInput.type = 'number';
  hoursInput.min = '0';
  hoursInput.max = '24';
  hoursInput.value = Number(report.hours_spent) || 0;
  hoursInput.disabled = true;

  const minutesInput = document.createElement('input');
  minutesInput.type = 'number';
  minutesInput.min = '0';
  minutesInput.max = '59';
  minutesInput.value = Number(report.minutes_spent) || 0;
  minutesInput.disabled = true;

  const hoursLabel = document.createTextNode(' h ');
  const minutesLabel = document.createTextNode(' min');

  const breakAfterTime = document.createElement('br');
  const breakAfterTime2 = document.createElement('br');

  form.appendChild(projectLabel);
  form.appendChild(projectSelect);
  form.appendChild(breakAfterProject);
  form.appendChild(breakAfterProject2);
  form.appendChild(descriptionLabel);
  form.appendChild(descriptionArea);
  form.appendChild(breakAfterDescription);
  form.appendChild(breakAfterDescription2);
  form.appendChild(timeLabel);
  form.appendChild(hoursInput);
  form.appendChild(hoursLabel);
  form.appendChild(minutesInput);
  form.appendChild(minutesLabel);
  form.appendChild(breakAfterTime);
  form.appendChild(breakAfterTime2);

  return form;
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
    const hours = parseInt(document.getElementById('czas_h').value, 10);
    const minutes = parseInt(document.getElementById('czas_m').value, 10);

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
      const response = await fetch('/work_reports/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify({
          project_id: projectId,
          work_date: workDate,
          hours_spent: hours,
          minutes_spent: minutes,
          description
        })
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
      const form = document.querySelector('form[action="/worker/addreport"]');
      if (form) {
        form.reset();
      }

      pendingWorkDate = workDate;
      await loadReportsForDate(workDate);
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
