// projects.js - Zarządzanie projektami

let allProjects = [];
let allUsers = [];
let selectedProject = null;

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', async function() {
    await loadProjects();
    await loadUsers();
    
    // Event listeners
    document.getElementById('btnNewProject').addEventListener('click', showNewProjectForm);
    document.getElementById('searchProjects').addEventListener('input', filterProjects);
});

// Pobierz wszystkie projekty
async function loadProjects() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/projects', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            allProjects = await response.json();
            // Sortowanie alfabetycznie po nazwie projektu
            allProjects.sort((a, b) => a.project_name.localeCompare(b.project_name, 'pl'));
            renderProjectsList(allProjects);
        } else {
            showError('Nie udało się pobrać listy projektów');
        }
    } catch (error) {
        console.error('Błąd:', error);
        showError('Błąd połączenia z serwerem');
    }
}

// Pobierz wszystkich użytkowników
async function loadUsers() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            allUsers = await response.json();
        }
    } catch (error) {
        console.error('Błąd pobierania użytkowników:', error);
    }
}

// Renderuj listę projektów
function renderProjectsList(projects) {
    const container = document.getElementById('projectsList');
    
    if (projects.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Brak projektów</p></div>';
        return;
    }
    
    container.innerHTML = projects.map(project => {
        const owner = allUsers.find(u => u.user_id === project.owner_user_id);
        const ownerName = owner ? `${owner.first_name} ${owner.last_name}` : 'Nieznany';
        const isActive = selectedProject && selectedProject.project_id === project.project_id;
        
        return `
            <div class="project-list-item ${isActive ? 'active' : ''}" 
                 onclick="selectProject(${project.project_id})" data-project-id="${project.project_id}">
                <div class="project-name">${escapeHtml(project.project_name)}</div>
                <div class="project-meta">
                    <small>
                        <i class="bi bi-person"></i> ${escapeHtml(ownerName)} | 
                        <i class="bi bi-clock"></i> ${project.time_type === 'constant' ? 'Stały' : 'Przedziały czasowe'}
                    </small>
                </div>
                ${isActive ? `<div class="mobile-detail-inline" id="mobileDetail-${project.project_id}"></div>` : ''}
            </div>
        `;
    }).join('');
}

// Filtrowanie projektów
function filterProjects() {
    const searchTerm = document.getElementById('searchProjects').value.toLowerCase();
    const filtered = allProjects.filter(project => {
        const owner = allUsers.find(u => u.user_id === project.owner_user_id);
        const ownerName = owner ? `${owner.first_name} ${owner.last_name}`.toLowerCase() : '';
        
        return project.project_name.toLowerCase().includes(searchTerm) ||
               (project.description && project.description.toLowerCase().includes(searchTerm)) ||
               ownerName.includes(searchTerm);
    });
    
    // Sortowanie alfabetycznie
    filtered.sort((a, b) => a.project_name.localeCompare(b.project_name, 'pl'));
    
    renderProjectsList(filtered);
}

// Wybierz projekt i pokaż szczegóły
async function selectProject(projectId) {
    // Jeśli kliknięto ten sam projekt, zamknij go
    if (selectedProject && selectedProject.project_id === projectId) {
        selectedProject = null;
        renderProjectsList(allProjects);
        cancelNewProject();
        return;
    }
    
    selectedProject = allProjects.find(p => p.project_id === projectId);
    if (!selectedProject) return;
    
    // Zaktualizuj aktywny element na liście
    renderProjectsList(allProjects);
    
    // Pobierz użytkowników przypisanych do projektu
    const assignedUsers = await loadAssignedUsers(projectId);
    
    // Renderuj szczegóły (desktop i mobile)
    renderProjectDetails(selectedProject, assignedUsers);
    
    // Scroll do wybranego projektu na mobile
    if (window.innerWidth < 768) {
        const projectElement = document.querySelector(`[data-project-id="${projectId}"]`);
        if (projectElement) {
            projectElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// Pobierz użytkowników przypisanych do projektu
async function loadAssignedUsers(projectId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/user_projects/assigned_users/${projectId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.error('Błąd pobierania przypisanych użytkowników:', error);
    }
    return [];
}

// Renderuj szczegóły projektu
function renderProjectDetails(project, assignedUsers) {
    const owner = allUsers.find(u => u.user_id === project.owner_user_id);
    const creator = allUsers.find(u => u.user_id === project.created_by_user_id);
    
    // Użytkownicy dostępni do przypisania (nie są już przypisani)
    const assignedUserIds = assignedUsers.map(u => u.user_id);
    const availableUsers = allUsers.filter(u => !assignedUserIds.includes(u.user_id));
    
    const detailsHtml = generateProjectDetailsHtml(project, assignedUsers, availableUsers, owner, creator);
    
    // Desktop - panel po prawej
    const desktopContainer = document.getElementById('projectDetails');
    if (desktopContainer) {
        desktopContainer.innerHTML = detailsHtml;
        attachProjectFormListeners();
    }
    
    // Mobile - inline pod projektem
    const mobileContainer = document.getElementById(`mobileDetail-${project.project_id}`);
    if (mobileContainer) {
        mobileContainer.innerHTML = detailsHtml;
        attachProjectFormListeners();
    }
}

// Generuj HTML szczegółów projektu (współdzielony między desktop i mobile)
function generateProjectDetailsHtml(project, assignedUsers, availableUsers, owner, creator) {
    return `
        <h5>Szczegóły projektu</h5>
        
        <form id="projectForm" class="mb-4">
            <div class="mb-3">
                <label for="projectName" class="form-label">Nazwa projektu</label>
                <input type="text" class="form-control" id="projectName" value="${escapeHtml(project.project_name)}" required>
            </div>
            
            <div class="mb-3">
                <label for="projectDescription" class="form-label">Opis</label>
                <textarea class="form-control" id="projectDescription" rows="3">${escapeHtml(project.description || '')}</textarea>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Typ rejestracji czasu</label>
                <div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="timeType" id="timeTypeConstant" value="constant" ${project.time_type === 'constant' ? 'checked' : ''}>
                        <label class="form-check-label" for="timeTypeConstant">
                            Stały (tylko godziny)
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="timeType" id="timeTypeFromTo" value="from_to" ${project.time_type === 'from_to' ? 'checked' : ''}>
                        <label class="form-check-label" for="timeTypeFromTo">
                            Przedziały czasowe (od-do)
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="mb-3">
                <label for="projectOwner" class="form-label">Właściciel projektu</label>
                <select class="form-select" id="projectOwner" required>
                    ${allUsers.map(user => `
                        <option value="${user.user_id}" ${user.user_id === project.owner_user_id ? 'selected' : ''}>
                            ${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div class="mb-3">
                <small class="text-muted">
                    Utworzony przez: ${creator ? escapeHtml(`${creator.first_name} ${creator.last_name}`) : 'Nieznany'}<br>
                    Data utworzenia: ${new Date(project.created_at).toLocaleString('pl-PL')}
                </small>
            </div>
            
            <div class="d-flex gap-2 flex-wrap">
                <button type="submit" class="btn btn-primary">
                    <i class="bi bi-save me-2"></i>Zapisz zmiany
                </button>
                <button type="button" class="btn btn-danger" onclick="deleteProject(${project.project_id})">
                    <i class="bi bi-trash me-2"></i>Usuń projekt
                </button>
            </div>
        </form>
        
        <hr>
        
        <h6>Użytkownicy w projekcie</h6>
        
        <div class="mb-3">
            ${assignedUsers.length === 0 ? '<p class="text-muted"><small>Brak przypisanych użytkowników</small></p>' : ''}
            <div id="assignedUsersList">
                ${assignedUsers.map(user => `
                    <div class="user-assignment-item">
                        <span>
                            <i class="bi bi-person-fill me-2"></i>
                            ${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}
                        </span>
                        <button class="btn btn-sm btn-danger" onclick="removeUserFromProject(${user.user_id}, ${project.project_id})">
                            <i class="bi bi-x-circle"></i> Usuń
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
        
        ${availableUsers.length > 0 ? `
            <div class="input-group">
                <select class="form-select" id="userToAdd">
                    <option value="">-- Wybierz użytkownika --</option>
                    ${availableUsers.map(user => `
                        <option value="${user.user_id}">
                            ${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}
                        </option>
                    `).join('')}
                </select>
                <button class="btn btn-success" onclick="addUserToProject()">
                    <i class="bi bi-plus-circle me-1"></i>Dodaj
                </button>
            </div>
        ` : '<p class="text-muted"><small>Wszyscy użytkownicy są już przypisani do tego projektu</small></p>'}
    `;
}

// Podłącz listenery do formularza projektu
function attachProjectFormListeners() {
    const forms = document.querySelectorAll('#projectForm');
    forms.forEach(form => {
        form.removeEventListener('submit', updateProject);
        form.addEventListener('submit', updateProject);
    });
}

// Pokaż formularz nowego projektu
function showNewProjectForm() {
    selectedProject = null;
    
    const formHtml = `
        <h5>Nowy projekt</h5>
        
        <form id="newProjectForm">
            <div class="mb-3">
                <label for="newProjectName" class="form-label">Nazwa projektu</label>
                <input type="text" class="form-control" id="newProjectName" required>
            </div>
            
            <div class="mb-3">
                <label for="newProjectDescription" class="form-label">Opis</label>
                <textarea class="form-control" id="newProjectDescription" rows="3"></textarea>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Typ rejestracji czasu</label>
                <div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="newTimeType" id="newTimeTypeConstant" value="constant" checked>
                        <label class="form-check-label" for="newTimeTypeConstant">
                            Stały (tylko godziny)
                        </label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="newTimeType" id="newTimeTypeFromTo" value="from_to">
                        <label class="form-check-label" for="newTimeTypeFromTo">
                            Przedziały czasowe (od-do)
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="mb-3">
                <label for="newProjectOwner" class="form-label">Właściciel projektu</label>
                <select class="form-select" id="newProjectOwner" required>
                    <option value="">-- Wybierz właściciela --</option>
                    ${allUsers.map(user => `
                        <option value="${user.user_id}">
                            ${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div class="d-flex gap-2 flex-wrap">
                <button type="submit" class="btn btn-success">
                    <i class="bi bi-plus-circle me-2"></i>Utwórz projekt
                </button>
                <button type="button" class="btn btn-secondary" onclick="cancelNewProject()">
                    Anuluj
                </button>
            </div>
        </form>
    `;
    
    // Desktop - panel po prawej
    const desktopContainer = document.getElementById('projectDetails');
    if (desktopContainer) {
        desktopContainer.innerHTML = formHtml;
    }
    
    // Mobile - kontener na górze
    const mobileContainer = document.getElementById('newProjectFormContainer');
    if (mobileContainer && window.innerWidth < 768) {
        mobileContainer.innerHTML = formHtml;
        mobileContainer.style.display = 'block';
        // Scroll do góry
        mobileContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    // Podłącz event listener do formularza
    const forms = document.querySelectorAll('#newProjectForm');
    forms.forEach(form => {
        form.addEventListener('submit', createProject);
    });
}

// Utwórz nowy projekt
async function createProject(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    const projectData = {
        project_name: document.getElementById('newProjectName').value,
        description: document.getElementById('newProjectDescription').value || null,
        time_type: document.querySelector('input[name="newTimeType"]:checked').value,
        owner_user_id: parseInt(document.getElementById('newProjectOwner').value)
    };
    
    try {
        const response = await fetch('/projects', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });
        
        if (response.ok) {
            const newProject = await response.json();
            showSuccess('Projekt utworzony pomyślnie');
            await loadProjects();
            selectProject(newProject.project_id);
        } else {
            const error = await response.json();
            showError(error.detail || 'Nie udało się utworzyć projektu');
        }
    } catch (error) {
        console.error('Błąd:', error);
        showError('Błąd połączenia z serwerem');
    }
}

// Aktualizuj projekt
async function updateProject(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    const projectData = {
        project_name: document.getElementById('projectName').value,
        description: document.getElementById('projectDescription').value || null,
        time_type: document.querySelector('input[name="timeType"]:checked').value,
        owner_user_id: parseInt(document.getElementById('projectOwner').value)
    };
    
    try {
        const response = await fetch(`/projects/${selectedProject.project_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(projectData)
        });
        
        if (response.ok) {
            showSuccess('Projekt zaktualizowany pomyślnie');
            await loadProjects();
            selectProject(selectedProject.project_id);
        } else {
            const error = await response.json();
            showError(error.detail || 'Nie udało się zaktualizować projektu');
        }
    } catch (error) {
        console.error('Błąd:', error);
        showError('Błąd połączenia z serwerem');
    }
}

// Usuń projekt
async function deleteProject(projectId) {
    if (!confirm('Czy na pewno chcesz usunąć ten projekt? Ta operacja jest nieodwracalna.')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/projects/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showSuccess('Projekt usunięty pomyślnie');
            await loadProjects();
            cancelNewProject();
        } else {
            const error = await response.json();
            showError(error.detail || 'Nie udało się usunąć projektu');
        }
    } catch (error) {
        console.error('Błąd:', error);
        showError('Błąd połączenia z serwerem');
    }
}

// Dodaj użytkownika do projektu
async function addUserToProject() {
    const userId = parseInt(document.getElementById('userToAdd').value);
    if (!userId) {
        showError('Wybierz użytkownika z listy');
        return;
    }
    
    const token = localStorage.getItem('token');
    const assignmentData = {
        user_id: userId,
        project_id: selectedProject.project_id
    };
    
    try {
        const response = await fetch('/user_projects', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assignmentData)
        });
        
        if (response.ok) {
            showSuccess('Użytkownik dodany do projektu');
            selectProject(selectedProject.project_id);
        } else {
            const error = await response.json();
            showError(error.detail || 'Nie udało się dodać użytkownika');
        }
    } catch (error) {
        console.error('Błąd:', error);
        showError('Błąd połączenia z serwerem');
    }
}

// Usuń użytkownika z projektu
async function removeUserFromProject(userId, projectId) {
    if (!confirm('Czy na pewno chcesz usunąć tego użytkownika z projektu?')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/user_projects/${userId}/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            showSuccess('Użytkownik usunięty z projektu');
            selectProject(projectId);
        } else {
            const error = await response.json();
            showError(error.detail || 'Nie udało się usunąć użytkownika');
        }
    } catch (error) {
        console.error('Błąd:', error);
        showError('Błąd połączenia z serwerem');
    }
}

// Anuluj tworzenie nowego projektu
function cancelNewProject() {
    selectedProject = null;
    
    // Desktop
    const desktopContainer = document.getElementById('projectDetails');
    if (desktopContainer) {
        desktopContainer.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-folder text-muted"></i>
                <p>Wybierz projekt z listy lub utwórz nowy</p>
            </div>
        `;
    }
    
    // Mobile
    const mobileContainer = document.getElementById('newProjectFormContainer');
    if (mobileContainer) {
        mobileContainer.innerHTML = '';
        mobileContainer.style.display = 'none';
    }
    
    // Odśwież listę projektów
    renderProjectsList(allProjects);
}

// Funkcje pomocnicze
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

function showSuccess(message) {
    // Możesz dodać toast/alert Bootstrap
    alert(message);
}

function showError(message) {
    // Możesz dodać toast/alert Bootstrap
    alert('Błąd: ' + message);
}
