let authHeader = '';
let currentYear = null;
let currentMonth = null; // 0-11
let projectsMap = {}; // Map project_id -> project_name

const monthNamesPl = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

const dayNamesPl = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

document.addEventListener('DOMContentLoaded', async () => {
  console.log('summary.js: DOMContentLoaded fired');
  
  const rawToken = localStorage.getItem('token');
  const token = rawToken ? rawToken.trim() : '';
  console.log('summary.js: token exists:', !!token);
  
  if (!token) {
    console.warn('summary.js: No token, redirecting');
    handleUnauthorized();
    return;
  }

  authHeader = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
  
  // Initialize to current month
  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();
  
  // Setup navigation buttons
  setupNavigation();
  
  // Load projects first, then summary
  try {
    await loadProjects();
    await loadMonthlySummary();
  } catch (error) {
    console.error('Initialization error:', error);
  }
});

async function loadProjects() {
  console.log('Loading projects...');
  
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

  // Build map
  projectsMap = {};
  data.forEach(project => {
    projectsMap[project.project_id] = project.project_name;
  });

  console.log('Projects loaded:', projectsMap);
}

function setupNavigation() {
  const buttons = document.querySelectorAll('main form button');
  if (buttons.length < 3) {
    console.warn('Navigation buttons not found');
    return;
  }
  
  const prevBtn = buttons[0];
  const currentBtn = buttons[1];
  const nextBtn = buttons[2];
  
  prevBtn.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    loadMonthlySummary();
  });
  
  currentBtn.addEventListener('click', () => {
    const today = new Date();
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    loadMonthlySummary();
  });
  
  nextBtn.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    loadMonthlySummary();
  });
}

async function loadMonthlySummary() {
  console.log('Loading summary for:', currentYear, currentMonth);
  
  // Update header
  const header = document.querySelector('main h2');
  if (header) {
    header.textContent = `${monthNamesPl[currentMonth]} ${currentYear}`;
  }
  
  try {
    const response = await fetch('/work_reports/monthly_summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        month: currentMonth + 1, // Backend expects 1-12
        year: currentYear
      })
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const message = await safeReadText(response);
      throw new Error(message || 'Błąd pobierania podsumowania');
    }

    const data = await response.json();
    console.log('Monthly summary data:', data);
    
    renderSummary(data);
  } catch (error) {
    console.error('Error loading monthly summary:', error);
    alert('Nie udało się pobrać podsumowania miesięcznego.');
  }
}

function renderSummary(data) {
  // Update total time
  const totalHours = data.total_hours || 0;
  const totalMinutes = data.total_minutes || 0;
  
  const totalElement = document.querySelector('main h3 span');
  if (totalElement) {
    totalElement.textContent = `${totalHours}h ${totalMinutes}min`;
  }
  
  // Render detailed breakdown
  const section = document.querySelector('main section');
  if (!section) return;
  
  // Clear existing content except the heading
  const heading = section.querySelector('h3');
  section.innerHTML = '';
  if (heading) {
    section.appendChild(heading);
  } else {
    const newHeading = document.createElement('h3');
    newHeading.textContent = 'Szczegółowe rozpisanie';
    section.appendChild(newHeading);
  }
  
  // Group by date from daily_hours
  const dailyHours = data.daily_hours || [];
  
  if (dailyHours.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.textContent = 'Brak wpisów dla tego miesiąca.';
    section.appendChild(emptyMsg);
    return;
  }
  
  dailyHours.forEach(dayData => {
    const dateDiv = document.createElement('div');
    dateDiv.style.marginBottom = '15px';
    
    // Parse date (format: YYYY-MM-DD)
    const [year, month, day] = dayData.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = dayNamesPl[dateObj.getDay()];
    const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;
    
    const dateHeader = document.createElement('strong');
    dateHeader.textContent = `${dayName}, ${dateStr}`;
    dateDiv.appendChild(dateHeader);
    
    const projectsDiv = document.createElement('div');
    projectsDiv.style.marginLeft = '20px';
    
    // Iterate through projects for this day
    const projectHours = dayData.project_hours || {};
    Object.keys(projectHours).forEach(projectIdStr => {
      const projectId = parseInt(projectIdStr, 10);
      const projectData = projectHours[projectIdStr];
      const projectName = projectsMap[projectId] || `Projekt #${projectId}`;
      
      const hours = projectData.hours || 0;
      const minutes = projectData.minutes || 0;
      
      const projDiv = document.createElement('div');
      projDiv.textContent = `${projectName} — ${hours}h ${minutes}min`;
      projectsDiv.appendChild(projDiv);
    });
    
    dateDiv.appendChild(projectsDiv);
    section.appendChild(dateDiv);
  });
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
