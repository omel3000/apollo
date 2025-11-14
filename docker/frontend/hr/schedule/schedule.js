// schedule.js - logika grafiku HR

// TODO: Uzupełnij endpointy backendu zgodnie z API
const API_USERS = '/users/active';
const API_AVAILABILITY = '/availability/';
const API_SCHEDULE = '/schedule/';
const API_PROJECTS = '/user_projects/my_projects';

let currentMonth = new Date();

function formatMonth(date) {
    return date.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
}

function renderHeaderAndMenu() {
    // Załaduj header/menu z index.html HR (lub skopiuj kod, jeśli nie ma include)
    fetch('../index.html').then(r => r.text()).then(html => {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        document.getElementById('main-header').innerHTML = temp.querySelector('header').innerHTML;
        document.getElementById('main-menu').innerHTML = temp.querySelector('nav').innerHTML;
    });
}

function fetchUsers() {
    return fetch(API_USERS, { headers: authHeader() }).then(r => r.json());
}
function fetchProjects() {
    return fetch(API_PROJECTS, { headers: authHeader() }).then(r => r.json());
}
function fetchAvailability(month) {
    return fetch(API_AVAILABILITY + '?month=' + month, { headers: authHeader() }).then(r => r.json());
}
function fetchSchedule(month) {
    return fetch(API_SCHEDULE + '?month=' + month, { headers: authHeader() }).then(r => r.json());
}

function authHeader() {
    let token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token && !token.startsWith('Bearer ')) token = 'Bearer ' + token;
    return { 'Authorization': token };
}


function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getDayName(date) {
    return date.toLocaleString('pl-PL', { weekday: 'short' });
}

function getStatusClass(status) {
    switch (status) {
        case 'available': return 'status-available';
        case 'unavailable': return 'status-unavailable';
        case 'vacation': return 'status-vacation';
        case 'sick': return 'status-sick';
        case 'free': return 'status-free';
        case 'assigned': return 'status-assigned';
        default: return '';
    }
}

function findAvailabilityForDay(availability, user_id, dateStr) {
    return availability.find(a => a.user_id === user_id && a.date === dateStr);
}

function findScheduleForDay(schedule, user_id, dateStr) {
    return schedule.filter(s => s.user_id === user_id && s.work_date === dateStr);
}

function renderCalendar(users, availability, schedule, projects) {
    const calendar = document.getElementById('schedule-calendar');
    calendar.innerHTML = '';
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    // Header
    let html = '<table class="schedule-table"><thead><tr><th>Pracownik</th>';
    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        html += `<th>${d}<br><span style='font-size:0.8em'>${getDayName(date)}</span></th>`;
    }
    html += '</tr></thead><tbody>';
    // Rows
    users.forEach(user => {
        html += `<tr><td>${user.first_name} ${user.last_name}</td>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateStr = date.toISOString().slice(0, 10);
            const av = findAvailabilityForDay(availability, user.user_id, dateStr);
            const sch = findScheduleForDay(schedule, user.user_id, dateStr);
            let cellClass = '';
            let cellContent = '';
            // Priorytet: schedule > availability
            if (sch.length > 0) {
                cellClass = 'status-assigned';
                cellContent = sch.map(s => {
                    let proj = projects.find(p => p.project_id === s.project_id);
                    let projName = proj ? proj.project_name : (s.project_name || '');
                    let color = proj ? `style='color:#2196f3'` : '';
                    return `<div ${color} title='${projName} ${s.time_from}-${s.time_to}'>${projName ? projName+': ' : ''}${s.time_from}-${s.time_to}</div>`;
                }).join('');
            } else if (av) {
                if (!av.is_available) {
                    cellClass = 'status-unavailable';
                    cellContent = '<span title="Niedostępny">ND</span>';
                } else if (av.time_from && av.time_to) {
                    cellClass = 'status-available';
                    cellContent = `<span title="Dostępny w godzinach">${av.time_from}-${av.time_to}</span>`;
                } else {
                    cellClass = 'status-available';
                    cellContent = '<span title="Dostępny cały dzień">✔</span>';
                }
            }
            html += `<td class="${cellClass}" data-user="${user.user_id}" data-date="${dateStr}">${cellContent}</td>`;
        }
        html += '</tr>';
    });
    html += '</tbody></table>';
    calendar.innerHTML = html;

    // Obsługa kliknięć w komórki
    calendar.querySelectorAll('td').forEach(td => {
        td.onclick = function() {
            const userId = this.getAttribute('data-user');
            const date = this.getAttribute('data-date');
            if (userId && date) openScheduleModal(userId, date, users, projects, schedule);
        };
    });
}


function renderSummary(users, schedule, projects) {
    // Podsumowanie godzin i projektów dla każdego pracownika
    const summary = document.getElementById('schedule-summary');
    let html = '<h3>Podsumowanie godzin</h3>';
    html += '<table class="schedule-table"><thead><tr><th>Pracownik</th><th>Suma godzin</th>';
    projects.forEach(p => { html += `<th>${p.project_name}</th>`; });
    html += '</tr></thead><tbody>';
    users.forEach(user => {
        let totalMinutes = 0;
        let projectMinutes = {};
        projects.forEach(p => { projectMinutes[p.project_id] = 0; });
        schedule.filter(s => s.user_id === user.user_id).forEach(s => {
            const from = s.time_from.split(':');
            const to = s.time_to.split(':');
            let minutes = (parseInt(to[0])*60+parseInt(to[1])) - (parseInt(from[0])*60+parseInt(from[1]));
            if (minutes < 0) minutes = 0;
            totalMinutes += minutes;
            if (s.project_id && projectMinutes[s.project_id] !== undefined) projectMinutes[s.project_id] += minutes;
        });
        html += `<tr><td>${user.first_name} ${user.last_name}</td><td>${(totalMinutes/60).toFixed(2)}h</td>`;
        projects.forEach(p => {
            html += `<td>${projectMinutes[p.project_id] ? (projectMinutes[p.project_id]/60).toFixed(2)+'h' : '-'}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    summary.innerHTML = html;
}


function setupFilters(projects) {
    // Projekty
    const filterProject = document.getElementById('filter-project');
    filterProject.innerHTML = '<option value="">Wszystkie projekty</option>' +
        projects.map(p => `<option value="${p.project_id}">${p.project_name}</option>`).join('');
    // Statusy są już w HTML
    // Filtrowanie po wpisaniu w input
    document.getElementById('search-user').oninput = loadDataAndRender;
    filterProject.onchange = loadDataAndRender;
    document.getElementById('filter-status').onchange = loadDataAndRender;
}


function openScheduleModal(userId, date, users, projects, schedule) {
    const modal = document.getElementById('schedule-modal');
    const user = users.find(u => u.user_id == userId);
    document.getElementById('modal-user-name').textContent = user ? user.first_name + ' ' + user.last_name : '';
    document.getElementById('modal-date').textContent = date;
    // Projekty do wyboru
    const modalProject = document.getElementById('modal-project');
    modalProject.innerHTML = '<option value="">(Brak)</option>' + projects.map(p => `<option value="${p.project_id}">${p.project_name}</option>`).join('');
    // Reset formy
    document.getElementById('modal-from').value = '';
    document.getElementById('modal-to').value = '';
    document.getElementById('modal-note').value = '';
    modal.classList.remove('hidden');
    modal.style.display = 'block';
    // Zamknięcie
    modal.querySelector('.close').onclick = () => { modal.classList.add('hidden'); modal.style.display = 'none'; };
    // Submit
    document.getElementById('schedule-form').onsubmit = function(e) {
        e.preventDefault();
        const projectId = modalProject.value ? parseInt(modalProject.value) : null;
        const from = document.getElementById('modal-from').value;
        const to = document.getElementById('modal-to').value;
        const note = document.getElementById('modal-note').value;
        if (!from || !to) { alert('Podaj godziny!'); return; }
        // POST do backendu
        fetch('/schedule/', {
            method: 'POST',
            headers: { ...authHeader(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: parseInt(userId),
                project_id: projectId,
                work_date: date,
                time_from: from,
                time_to: to,
                shift_type: 'normalna',
                note: note
            })
        }).then(r => {
            if (r.ok) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
                loadDataAndRender();
            } else {
                r.text().then(t => alert('Błąd: ' + t));
            }
        });
    };
}

function setupModal(projects) {
    // Modal obsługiwany dynamicznie przez openScheduleModal
}


function setupExport(schedule) {
    document.getElementById('export-csv').onclick = function() {
        // Prosty eksport do CSV
        let csv = 'Pracownik,Data,Projekt,Godzina od,Godzina do\n';
        schedule.forEach(s => {
            csv += `${s.user_id},${s.work_date},${s.project_id || ''},${s.time_from},${s.time_to}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'grafik.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    document.getElementById('export-pdf').onclick = function() {
        alert('Eksport do PDF będzie dostępny w kolejnej wersji.');
    };
}


function setupCopySchedule() {
    document.getElementById('copy-schedule').onclick = function() {
        alert('Kopiowanie grafiku będzie dostępne w kolejnej wersji.');
    };
}


function loadDataAndRender() {
    const ym = currentMonth.toISOString().slice(0,7);
    document.getElementById('current-month').textContent = formatMonth(currentMonth);
    Promise.all([
        fetchUsers(),
        fetchProjects(),
        fetchAvailability(ym),
        fetchSchedule(ym)
    ]).then(([users, projects, availability, schedule]) => {
        // Filtrowanie
        const search = (document.getElementById('search-user')?.value || '').toLowerCase();
        const projectFilter = document.getElementById('filter-project')?.value;
        const statusFilter = document.getElementById('filter-status')?.value;
        let filteredUsers = users.filter(u =>
            (!search || (u.first_name + ' ' + u.last_name).toLowerCase().includes(search))
        );
        let filteredSchedule = schedule;
        if (projectFilter) {
            filteredSchedule = filteredSchedule.filter(s => String(s.project_id) === String(projectFilter));
        }
        if (statusFilter) {
            // statusFilter: available, unavailable, vacation, sick, free
            // Dla uproszczenia: filtruj po availability i schedule
            filteredUsers = filteredUsers.filter(u => {
                const uid = u.user_id;
                if (statusFilter === 'available') {
                    return availability.some(a => a.user_id === uid && a.is_available);
                } else if (statusFilter === 'unavailable') {
                    return availability.some(a => a.user_id === uid && !a.is_available);
                } else if (statusFilter === 'vacation') {
                    return schedule.some(s => s.user_id === uid && s.shift_type === 'urlop');
                } else if (statusFilter === 'sick') {
                    return schedule.some(s => s.user_id === uid && s.shift_type === 'L4');
                } else if (statusFilter === 'free') {
                    return schedule.some(s => s.user_id === uid && s.shift_type === 'inne');
                }
                return true;
            });
        }
        renderCalendar(filteredUsers, availability, filteredSchedule, projects);
        renderSummary(filteredUsers, filteredSchedule, projects);
        setupFilters(projects);
        setupModal(projects);
        setupExport(filteredSchedule);
        setupCopySchedule();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderHeaderAndMenu();
    document.getElementById('prev-month').onclick = () => { currentMonth.setMonth(currentMonth.getMonth()-1); loadDataAndRender(); };
    document.getElementById('next-month').onclick = () => { currentMonth.setMonth(currentMonth.getMonth()+1); loadDataAndRender(); };
    loadDataAndRender();
});
