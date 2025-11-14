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

function renderCalendar(users, availability, schedule, projects) {
    // TODO: Renderuj kalendarz miesięczny/tygodniowy z danymi
    // ...
}

function renderSummary(users, schedule, projects) {
    // TODO: Renderuj podsumowania godzin i projektów
    // ...
}

function setupFilters(projects) {
    // TODO: Uzupełnij selecty filtrów projektów/statusów
    // ...
}

function setupModal(projects) {
    // TODO: Obsługa modala przypisywania do grafiku
    // ...
}

function setupExport(schedule) {
    // TODO: Eksport do CSV/PDF
    // ...
}

function setupCopySchedule() {
    // TODO: Kopiowanie grafiku
    // ...
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
        renderCalendar(users, availability, schedule, projects);
        renderSummary(users, schedule, projects);
        setupFilters(projects);
        setupModal(projects);
        setupExport(schedule);
        setupCopySchedule();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderHeaderAndMenu();
    document.getElementById('prev-month').onclick = () => { currentMonth.setMonth(currentMonth.getMonth()-1); loadDataAndRender(); };
    document.getElementById('next-month').onclick = () => { currentMonth.setMonth(currentMonth.getMonth()+1); loadDataAndRender(); };
    loadDataAndRender();
});
