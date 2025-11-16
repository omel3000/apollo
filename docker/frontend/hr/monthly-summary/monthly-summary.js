// ============================================================================
// GLOBALS & STATE
// ============================================================================

let authHeader = '';
let currentYear = null;
let currentMonth = null; // 0-11 (JavaScript)
let overviewData = null;
let trendData = null;
let filteredUsers = [];
let filteredProjects = [];

// Wykresy
let usersChart = null;
let projectsChart = null;
let trendChart = null;

const monthNamesPl = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const monthNamesPlShort = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('monthly-summary.js: DOMContentLoaded');
  
  const rawToken = localStorage.getItem('token');
  const token = rawToken ? rawToken.trim() : '';
  
  if (!token) {
    console.warn('monthly-summary.js: No token, redirecting');
    window.location.replace('/');
    return;
  }

  authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  
  // Initialize to current month
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();
  
  // Setup UI
  setupMonthYearSelects();
  setupNavigation();
  setupEventListeners();
  
  // Load data
  await loadAllData();
});

// ============================================================================
// MONTH/YEAR NAVIGATION
// ============================================================================

function setupMonthYearSelects() {
  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');
  
  // Populate months
  monthSelect.innerHTML = '';
  monthNamesPl.forEach((name, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = name;
    monthSelect.appendChild(opt);
  });
  
  // Populate years (±5 from current)
  yearSelect.innerHTML = '';
  const baseYear = new Date().getFullYear();
  for (let y = baseYear - 5; y <= baseYear + 5; y++) {
    const opt = document.createElement('option');
    opt.value = String(y);
    opt.textContent = String(y);
    yearSelect.appendChild(opt);
  }
  
  syncMonthYearSelects();
}

function syncMonthYearSelects() {
  const monthSelect = document.getElementById('monthSelect');
  const yearSelect = document.getElementById('yearSelect');
  
  if (monthSelect) monthSelect.value = String(currentMonth);
  if (yearSelect) yearSelect.value = String(currentYear);
}

function setupNavigation() {
  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    syncMonthYearSelects();
    loadAllData();
  });
  
  document.getElementById('currentMonthBtn').addEventListener('click', () => {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    syncMonthYearSelects();
    loadAllData();
  });
  
  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    syncMonthYearSelects();
    loadAllData();
  });
  
  document.getElementById('monthSelect').addEventListener('change', (e) => {
    currentMonth = parseInt(e.target.value, 10);
    loadAllData();
  });
  
  document.getElementById('yearSelect').addEventListener('change', (e) => {
    currentYear = parseInt(e.target.value, 10);
    loadAllData();
  });
}

// ============================================================================
// DATA LOADING
// ============================================================================

async function loadAllData() {
  showSpinner();
  try {
    await Promise.all([
      loadMonthlyOverview(),
      loadMonthlyTrend()
    ]);
  } catch (error) {
    console.error('Error loading data:', error);
    alert('Błąd ładowania danych: ' + error.message);
  } finally {
    hideSpinner();
  }
}

async function loadMonthlyOverview() {
  const response = await fetch('/work_reports/hr_monthly_overview', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      month: currentMonth + 1, // Backend expects 1-12
      year: currentYear
    })
  });
  
  if (response.status === 401) {
    window.location.replace('/');
    return;
  }
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Błąd pobierania danych');
  }
  
  overviewData = await response.json();
  console.log('Overview data:', overviewData);
  
  renderOverview();
}

async function loadMonthlyTrend() {
  const response = await fetch('/work_reports/monthly_trend', {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      months: 6
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Błąd pobierania trendu');
  }
  
  trendData = await response.json();
  console.log('Trend data:', trendData);
  
  renderTrendChart();
}

// ============================================================================
// RENDERING
// ============================================================================

function renderOverview() {
  if (!overviewData) return;
  
  // Update stats
  document.getElementById('totalTime').textContent = 
    `${overviewData.total_hours}h ${overviewData.total_minutes}min`;
  document.getElementById('totalUsers').textContent = overviewData.total_users;
  document.getElementById('totalProjects').textContent = overviewData.total_projects;
  document.getElementById('avgTime').textContent = 
    `${overviewData.average_hours}h ${overviewData.average_minutes}min`;
  
  // Set filtered data to full data initially
  filteredUsers = [...overviewData.users];
  filteredProjects = [...overviewData.projects];
  
  // Render charts
  renderUsersChart();
  renderProjectsChart();
  
  // Render lists
  renderUsersList();
  renderProjectsList();
}

function renderUsersChart() {
  const ctx = document.getElementById('usersChart');
  if (!ctx) return;
  
  // Destroy previous chart
  if (usersChart) {
    usersChart.destroy();
  }
  
  // Get top 10 users by time
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const timeA = a.total_hours * 60 + a.total_minutes;
    const timeB = b.total_hours * 60 + b.total_minutes;
    return timeB - timeA;
  }).slice(0, 10);
  
  const labels = sortedUsers.map(u => `${u.first_name} ${u.last_name}`);
  const data = sortedUsers.map(u => u.total_hours + u.total_minutes / 60);
  
  usersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Godziny',
        data: data,
        backgroundColor: 'rgba(191, 110, 80, 0.8)',
        borderColor: 'rgba(191, 110, 80, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const hours = Math.floor(context.raw);
              const minutes = Math.round((context.raw - hours) * 60);
              return `${hours}h ${minutes}min`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value + 'h';
            }
          }
        }
      }
    }
  });
}

function renderProjectsChart() {
  const ctx = document.getElementById('projectsChart');
  if (!ctx) return;
  
  // Destroy previous chart
  if (projectsChart) {
    projectsChart.destroy();
  }
  
  const labels = filteredProjects.map(p => p.project_name);
  const data = filteredProjects.map(p => p.total_hours + p.total_minutes / 60);
  
  // Generate colors using internal palette
  const colors = filteredProjects.map((p, idx) => getProjectColorForChart(p.project_id, idx));
  
  projectsChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            generateLabels: function(chart) {
              const data = chart.data;
              return data.labels.map((label, i) => {
                const hours = Math.floor(data.datasets[0].data[i]);
                const minutes = Math.round((data.datasets[0].data[i] - hours) * 60);
                return {
                  text: `${label}: ${hours}h ${minutes}min`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const hours = Math.floor(context.raw);
              const minutes = Math.round((context.raw - hours) * 60);
              return `${context.label}: ${hours}h ${minutes}min`;
            }
          }
        }
      }
    }
  });
}

function renderTrendChart() {
  const ctx = document.getElementById('trendChart');
  if (!ctx || !trendData) return;
  
  // Destroy previous chart
  if (trendChart) {
    trendChart.destroy();
  }
  
  const labels = trendData.map(item => `${monthNamesPlShort[item.month - 1]} ${item.year}`);
  const data = trendData.map(item => item.total_hours + item.total_minutes / 60);
  
  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Łączny czas pracy',
        data: data,
        borderColor: 'rgba(191, 110, 80, 1)',
        backgroundColor: 'rgba(191, 110, 80, 0.2)',
        tension: 0.3,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const hours = Math.floor(context.raw);
              const minutes = Math.round((context.raw - hours) * 60);
              return `${hours}h ${minutes}min`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return value + 'h';
            }
          }
        }
      }
    }
  });
}

function renderUsersList() {
  const container = document.getElementById('usersList');
  document.getElementById('userCountBadge').textContent = filteredUsers.length;
  
  if (filteredUsers.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">Brak danych dla wybranych filtrów</p>';
    return;
  }
  
  container.innerHTML = filteredUsers.map((user, idx) => {
    const totalMinutes = user.total_hours * 60 + user.total_minutes;
    const maxMinutes = Math.max(...filteredUsers.map(u => u.total_hours * 60 + u.total_minutes));
    const percentage = maxMinutes > 0 ? (totalMinutes / maxMinutes * 100) : 0;
    
    return `
      <div class="user-card" data-user-id="${user.user_id}">
        <div class="card-header-custom" onclick="toggleUserCard(${user.user_id})">
          <div>
            <strong>${idx + 1}. <i class="bi bi-person-circle me-1"></i>${user.first_name} ${user.last_name}</strong>
            <div class="small text-muted">
              ${user.email ? `<i class="bi bi-envelope me-1"></i>${user.email}` : ''}
              ${user.phone_number ? `| <i class="bi bi-telephone me-1"></i>${user.phone_number}` : ''}
            </div>
          </div>
          <div class="text-end">
            <strong>${user.total_hours}h ${user.total_minutes}min</strong>
            <div class="small text-muted">${user.days_worked} dni</div>
          </div>
        </div>
        <div class="progress-bar-custom">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="card-body-custom" id="user-body-${user.user_id}">
          <h6><i class="bi bi-folder me-1"></i>Szczegóły projektów (${user.projects.length}):</h6>
          ${user.projects.length > 0 ? `
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Projekt</th>
                  <th class="text-end">Czas</th>
                  <th class="text-end">%</th>
                </tr>
              </thead>
              <tbody>
                ${user.projects.map(proj => {
                  const projMinutes = proj.total_hours * 60 + proj.total_minutes;
                  const projPercentage = totalMinutes > 0 ? (projMinutes / totalMinutes * 100) : 0;
                  return `
                    <tr>
                      <td>${proj.project_name}</td>
                      <td class="text-end">${proj.total_hours}h ${proj.total_minutes}min</td>
                      <td class="text-end">${projPercentage.toFixed(0)}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : '<p class="text-muted">Brak projektów</p>'}
          <button class="btn btn-sm btn-primary mt-2" onclick="showUserDetails(${user.user_id})">
            <i class="bi bi-calendar2-week me-1"></i>Zobacz szczegóły dni
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderProjectsList() {
  const container = document.getElementById('projectsList');
  document.getElementById('projectCountBadge').textContent = filteredProjects.length;
  
  if (filteredProjects.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">Brak danych dla wybranych filtrów</p>';
    return;
  }
  
  container.innerHTML = filteredProjects.map((project, idx) => {
    const totalMinutes = project.total_hours * 60 + project.total_minutes;
    const maxMinutes = Math.max(...filteredProjects.map(p => p.total_hours * 60 + p.total_minutes));
    const percentage = maxMinutes > 0 ? (totalMinutes / maxMinutes * 100) : 0;
    
    return `
      <div class="project-card" data-project-id="${project.project_id}">
        <div class="card-header-custom" onclick="toggleProjectCard(${project.project_id})">
          <div>
            <strong>${idx + 1}. <i class="bi bi-folder-fill me-1"></i>${project.project_name}</strong>
          </div>
          <div class="text-end">
            <strong>${project.total_hours}h ${project.total_minutes}min</strong>
            <div class="small text-muted">${project.users.length} pracowników</div>
          </div>
        </div>
        <div class="progress-bar-custom">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="card-body-custom" id="project-body-${project.project_id}">
          <h6><i class="bi bi-people me-1"></i>Pracownicy (${project.users.length}):</h6>
          ${project.users.length > 0 ? `
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Pracownik</th>
                  <th class="text-end">Czas</th>
                  <th class="text-end">%</th>
                </tr>
              </thead>
              <tbody>
                ${project.users.map(user => {
                  const userMinutes = user.total_hours * 60 + user.total_minutes;
                  const userPercentage = totalMinutes > 0 ? (userMinutes / totalMinutes * 100) : 0;
                  return `
                    <tr>
                      <td>${user.first_name} ${user.last_name}</td>
                      <td class="text-end">${user.total_hours}h ${user.total_minutes}min</td>
                      <td class="text-end">${userPercentage.toFixed(0)}%</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : '<p class="text-muted">Brak pracowników</p>'}
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================================
// TOGGLE CARDS
// ============================================================================

function toggleUserCard(userId) {
  const body = document.getElementById(`user-body-${userId}`);
  if (body) {
    body.classList.toggle('show');
  }
}

function toggleProjectCard(projectId) {
  const body = document.getElementById(`project-body-${projectId}`);
  if (body) {
    body.classList.toggle('show');
  }
}

// ============================================================================
// SEARCH & FILTERS
// ============================================================================

function setupEventListeners() {
  // User search
  document.getElementById('userSearch').addEventListener('input', applyFilters);
  document.getElementById('userSortSelect').addEventListener('change', applyFilters);
  
  // Project search
  document.getElementById('projectSearch').addEventListener('input', applyFilters);
  document.getElementById('projectSortSelect').addEventListener('change', applyFilters);
  
  // Advanced filters
  document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
}

function applyFilters() {
  if (!overviewData) return;
  
  // User filters
  const userSearch = document.getElementById('userSearch').value.toLowerCase();
  const userSort = document.getElementById('userSortSelect').value;
  const minHours = parseInt(document.getElementById('minHours').value) || 0;
  const maxHours = parseInt(document.getElementById('maxHours').value) || Infinity;
  const hideZero = document.getElementById('hideZeroTime').checked;
  
  // Filter users
  filteredUsers = overviewData.users.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const matchSearch = fullName.includes(userSearch) || 
                       (user.email && user.email.toLowerCase().includes(userSearch));
    
    const totalHours = user.total_hours + user.total_minutes / 60;
    const matchRange = totalHours >= minHours && totalHours <= maxHours;
    const matchZero = !hideZero || totalHours > 0;
    
    return matchSearch && matchRange && matchZero;
  });
  
  // Sort users
  filteredUsers.sort((a, b) => {
    switch (userSort) {
      case 'name-asc':
        return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
      case 'name-desc':
        return `${b.last_name} ${b.first_name}`.localeCompare(`${a.last_name} ${a.first_name}`);
      case 'time-desc':
        return (b.total_hours * 60 + b.total_minutes) - (a.total_hours * 60 + a.total_minutes);
      case 'time-asc':
        return (a.total_hours * 60 + a.total_minutes) - (b.total_hours * 60 + b.total_minutes);
      case 'days-desc':
        return b.days_worked - a.days_worked;
      default:
        return 0;
    }
  });
  
  // Project filters
  const projectSearch = document.getElementById('projectSearch').value.toLowerCase();
  const projectSort = document.getElementById('projectSortSelect').value;
  
  // Filter projects
  filteredProjects = overviewData.projects.filter(project => {
    return project.project_name.toLowerCase().includes(projectSearch);
  });
  
  // Sort projects
  filteredProjects.sort((a, b) => {
    switch (projectSort) {
      case 'name-asc':
        return a.project_name.localeCompare(b.project_name);
      case 'name-desc':
        return b.project_name.localeCompare(a.project_name);
      case 'time-desc':
        return (b.total_hours * 60 + b.total_minutes) - (a.total_hours * 60 + a.total_minutes);
      case 'time-asc':
        return (a.total_hours * 60 + a.total_minutes) - (b.total_hours * 60 + b.total_minutes);
      default:
        return 0;
    }
  });
  
  // Update active filters display
  updateActiveFilters();
  
  // Re-render
  renderUsersChart();
  renderProjectsChart();
  renderUsersList();
  renderProjectsList();
}

function updateActiveFilters() {
  const container = document.getElementById('activeFilters');
  const filters = [];
  
  const minHours = document.getElementById('minHours').value;
  const maxHours = document.getElementById('maxHours').value;
  const hideZero = document.getElementById('hideZeroTime').checked;
  
  if (minHours) filters.push(`Min: ${minHours}h`);
  if (maxHours) filters.push(`Max: ${maxHours}h`);
  if (hideZero) filters.push('Ukryj bez czasu');
  
  if (filters.length > 0) {
    container.innerHTML = filters.map(f => 
      `<span class="filter-badge">${f}<span class="remove" onclick="resetFilters()">×</span></span>`
    ).join('');
  } else {
    container.innerHTML = '';
  }
}

function resetFilters() {
  document.getElementById('userSearch').value = '';
  document.getElementById('projectSearch').value = '';
  document.getElementById('minHours').value = '';
  document.getElementById('maxHours').value = '';
  document.getElementById('hideZeroTime').checked = false;
  document.getElementById('userSortSelect').value = 'name-asc';
  document.getElementById('projectSortSelect').value = 'time-desc';
  
  applyFilters();
}

// ============================================================================
// USER DETAILS MODAL
// ============================================================================

async function showUserDetails(userId) {
  const user = overviewData.users.find(u => u.user_id === userId);
  if (!user) return;
  
  // Set modal title
  document.getElementById('userDetailModalTitle').textContent = 
    `${user.first_name} ${user.last_name} - ${monthNamesPl[currentMonth]} ${currentYear}`;
  
  // Prepare modal body with loading state
  const modalBody = document.getElementById('userDetailModalBody');
  modalBody.innerHTML = '<div class="text-center"><div class="spinner-border"></div></div>';
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('userDetailModal'));
  modal.show();
  
  // Load detailed data for each project
  try {
    const detailedData = await Promise.all(
      user.projects.map(async (project) => {
        const response = await fetch('/users/user_project_detailed', {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            project_id: project.project_id,
            user_id: userId,
            month: currentMonth + 1,
            year: currentYear
          })
        });
        
        if (response.ok) {
          return await response.json();
        }
        return null;
      })
    );
    
    // Combine all reports
    const allReports = detailedData
      .filter(d => d && d.reports)
      .flatMap(d => d.reports)
      .sort((a, b) => new Date(a.work_date) - new Date(b.work_date));
    
    // Render detailed view
    modalBody.innerHTML = `
      <div class="row mb-3">
        <div class="col-md-3">
          <div class="card">
            <div class="card-body text-center">
              <h6>Łączny czas</h6>
              <h4>${user.total_hours}h ${user.total_minutes}min</h4>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card">
            <div class="card-body text-center">
              <h6>Dni robocze</h6>
              <h4>${user.days_worked}</h4>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card">
            <div class="card-body text-center">
              <h6>Średnia dzienna</h6>
              <h4>${user.days_worked > 0 ? Math.floor((user.total_hours * 60 + user.total_minutes) / user.days_worked / 60) : 0}h ${user.days_worked > 0 ? Math.round(((user.total_hours * 60 + user.total_minutes) / user.days_worked) % 60) : 0}min</h4>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card">
            <div class="card-body text-center">
              <h6>Projektów</h6>
              <h4>${user.projects.length}</h4>
            </div>
          </div>
        </div>
      </div>
      
      <h6><i class="bi bi-calendar2-week me-1"></i>Kalendarz dzienny:</h6>
      <div class="table-responsive">
        <table class="table table-sm table-hover detail-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Projekt</th>
              <th>Czas</th>
              <th>Opis</th>
            </tr>
          </thead>
          <tbody>
            ${allReports.length > 0 ? allReports.map(report => `
              <tr>
                <td>${new Date(report.work_date).toLocaleDateString('pl-PL')}</td>
                <td>${report.project_name}</td>
                <td>${report.hours_spent}h ${report.minutes_spent}min</td>
                <td>${report.description || '-'}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" class="text-center text-muted">Brak raportów</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading user details:', error);
    modalBody.innerHTML = '<p class="text-danger">Błąd ładowania szczegółów</p>';
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function showSpinner() {
  document.getElementById('loadingSpinner').classList.add('show');
}

function hideSpinner() {
  document.getElementById('loadingSpinner').classList.remove('show');
}

function getProjectColorForChart(projectId, index) {
  // Fallback colors - używamy zawsze wewnętrznej palety
  const colors = [
    'rgba(46, 125, 50, 0.8)',    // Zielony
    'rgba(25, 118, 210, 0.8)',   // Niebieski
    'rgba(211, 47, 47, 0.8)',    // Czerwony
    'rgba(245, 124, 0, 0.8)',    // Pomarańczowy
    'rgba(123, 31, 162, 0.8)',   // Fioletowy
    'rgba(0, 151, 167, 0.8)',    // Cyjan
    'rgba(194, 24, 91, 0.8)',    // Różowy
    'rgba(93, 64, 55, 0.8)',     // Brązowy
    'rgba(97, 97, 97, 0.8)',     // Szary
    'rgba(0, 121, 107, 0.8)',    // Morski
    'rgba(230, 74, 25, 0.8)',    // Głęboka pomarańcza
    'rgba(48, 63, 159, 0.8)'     // Indygo
  ];
  
  return colors[index % colors.length];
}

// Make functions global for onclick handlers
window.toggleUserCard = toggleUserCard;
window.toggleProjectCard = toggleProjectCard;
window.showUserDetails = showUserDetails;
