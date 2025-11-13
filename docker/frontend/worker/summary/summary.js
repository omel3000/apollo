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
  
  // Render pie chart
  renderPieChart(data);
  
  // Render detailed breakdown
  const section = document.querySelector('main section');
  if (!section) return;
  
  // Zachowaj nagłówek i wyczyść resztę
  const heading = section.querySelector('h3');
  section.innerHTML = '';
  if (heading) {
    section.appendChild(heading);
  } else {
    const newHeading = document.createElement('h3');
    newHeading.className = 'h4';
    newHeading.textContent = 'Szczegółowe rozpisanie';
    section.appendChild(newHeading);
  }

  // Kontener listy w stylu komunikatów
  const listContainer = document.createElement('div');
  listContainer.id = 'summary-details';
  listContainer.className = 'list-group';
  section.appendChild(listContainer);
  
  // Dane per dzień
  const dailyHours = data.daily_hours || [];
  
  if (dailyHours.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'list-group-item list-group-item-light';
    emptyMsg.textContent = 'Brak wpisów dla tego miesiąca.';
    listContainer.appendChild(emptyMsg);
    return;
  }
  
  dailyHours.forEach(dayData => {
    // Element dnia
    const dayItem = document.createElement('div');
    dayItem.className = 'list-group-item list-group-item-action list-group-item-light';
    
    // Parse date (format: YYYY-MM-DD)
    const [year, month, day] = dayData.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayName = dayNamesPl[dateObj.getDay()];
    const dateStr = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;

    // Nagłówek dnia + suma
    const headerRow = document.createElement('div');
    headerRow.className = 'd-flex justify-content-between align-items-center mb-2';
    
    const titleEl = document.createElement('strong');
    titleEl.textContent = `${dayName}, ${dateStr}`;
    headerRow.appendChild(titleEl);

    // Oblicz sumę dla dnia
    const projectHours = dayData.project_hours || {};
    let dayTotalMin = 0;
    Object.values(projectHours).forEach(ph => {
      const h = (ph.hours || 0);
      const m = (ph.minutes || 0);
      dayTotalMin += h * 60 + m;
    });
    const totalH = Math.floor(dayTotalMin / 60);
    const totalM = dayTotalMin % 60;

    const totalEl = document.createElement('span');
    totalEl.className = 'badge badge-summary-day';
    totalEl.textContent = `Łącznie: ${totalH}h ${totalM}min`;
    headerRow.appendChild(totalEl);

    dayItem.appendChild(headerRow);

    // Lista projektów dla dnia
    const projectsList = document.createElement('ul');
    projectsList.className = 'mb-0 ps-3';

    Object.keys(projectHours).forEach(projectIdStr => {
      const projectId = parseInt(projectIdStr, 10);
      const projectData = projectHours[projectIdStr];
      const hours = projectData.hours || 0;
      const minutes = projectData.minutes || 0;
      const projectName = projectsMap[projectId] || `Projekt #${projectId}`;

      const li = document.createElement('li');
      li.textContent = `${projectName} — ${hours}h ${minutes}min`;
      projectsList.appendChild(li);
    });

    dayItem.appendChild(projectsList);
    listContainer.appendChild(dayItem);
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

function renderPieChart(data) {
  const canvas = document.getElementById('projectChart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = 150;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Calculate project totals in minutes
  const projectTotals = {};
  const dailyHours = data.daily_hours || [];
  
  dailyHours.forEach(dayData => {
    const projectHours = dayData.project_hours || {};
    Object.keys(projectHours).forEach(projectIdStr => {
      const projectId = parseInt(projectIdStr, 10);
      const projectData = projectHours[projectIdStr];
      const hours = projectData.hours || 0;
      const minutes = projectData.minutes || 0;
      const totalMinutes = hours * 60 + minutes;
      
      if (!projectTotals[projectId]) {
        projectTotals[projectId] = 0;
      }
      projectTotals[projectId] += totalMinutes;
    });
  });
  
  // Calculate total and percentages
  const totalMinutes = Object.values(projectTotals).reduce((sum, mins) => sum + mins, 0);
  
  if (totalMinutes === 0) {
    ctx.fillStyle = '#666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Brak danych', centerX, centerY);
    return;
  }
  
  // Predefined colors
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF9F40'
  ];
  
  // Sort projects by time (descending - most hours first)
  const projectEntries = Object.entries(projectTotals).sort((a, b) => b[1] - a[1]);
  
  // Draw pie slices
  let currentAngle = -Math.PI / 2; // Start at top
  
  projectEntries.forEach(([projectIdStr, minutes], index) => {
    const projectId = parseInt(projectIdStr, 10);
    const percentage = (minutes / totalMinutes) * 100;
    const sliceAngle = (minutes / totalMinutes) * 2 * Math.PI;
    
    // Draw slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw percentage label in the middle of slice
    const labelAngle = currentAngle + sliceAngle / 2;
    const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
    const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
    
    ctx.fillStyle = '#000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percentage.toFixed(1)}%`, labelX, labelY);
    
    currentAngle += sliceAngle;
  });
  
  // Draw legend below chart
  const legendY = canvas.height - 80;
  let legendX = 20;
  const legendItemWidth = 180;
  
  projectEntries.forEach(([projectIdStr, minutes], index) => {
    const projectId = parseInt(projectIdStr, 10);
    const projectName = projectsMap[projectId] || `Projekt #${projectId}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    // Color box
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(legendX, legendY + (index * 25), 15, 15);
    
    // Text
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${projectName} (${hours}h ${mins}min)`, legendX + 20, legendY + (index * 25) + 12);
  });
}
