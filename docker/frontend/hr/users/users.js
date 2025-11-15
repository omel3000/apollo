let allUsers = [];
let allProjects = [];
let filteredUsersCache = [];
let selectedUser = null;
let currentUser = null;
let isCreatingNewUser = false;
const STATUS_FILTER_MAP = {
    active: ["aktywny", "active"],
    inactive: ["nieaktywny", "inactive"],
    blocked: ["zablokowany", "blocked"]
};
const STATUS_SORT_ORDER = {
    aktywny: 0,
    active: 0,
    nieaktywny: 1,
    inactive: 1,
    zablokowany: 2,
    blocked: 2
};

document.addEventListener('DOMContentLoaded', initUsersPage);

async function initUsersPage() {
    setupEventHandlers();
    await loadCurrentUser();
    await Promise.all([loadProjects(), loadUsers()]);
    applyFilters();
}

function setupEventHandlers() {
    const newUserBtn = document.getElementById('btnNewUser');
    if (newUserBtn) {
        newUserBtn.addEventListener('click', toggleNewUserForm);
    }

    const searchInput = document.getElementById('searchUsers');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    document.querySelectorAll('.filter-role').forEach(input => {
        input.addEventListener('change', applyFilters);
    });

    document.querySelectorAll('.filter-status').forEach(input => {
        input.addEventListener('change', applyFilters);
    });

    const resetFiltersBtn = document.getElementById('resetFilters');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', event => {
            event.preventDefault();
            resetFilters();
        });
    }
}

async function loadCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) {
        return;
    }
    try {
        const response = await fetch('/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            currentUser = await response.json();
        }
    } catch (error) {
        console.error('Błąd pobierania zalogowanego użytkownika:', error);
    }
}

async function loadProjects() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/projects', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            allProjects = await response.json();
            allProjects.sort((a, b) => a.project_name.localeCompare(b.project_name, 'pl'));
        }
    } catch (error) {
        console.error('Błąd pobierania projektów:', error);
    }
}

async function loadUsers() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            showError('Nie udało się pobrać użytkowników');
            return;
        }
        const data = await response.json();
        data.sort(compareUsersByStatusThenName);
        allUsers = data;
        if (selectedUser) {
            selectedUser = allUsers.find(user => user.user_id === selectedUser.user_id) || null;
        }
    } catch (error) {
        console.error('Błąd pobierania użytkowników:', error);
        showError('Błąd połączenia z serwerem');
    }
}

function applyFilters() {
    const searchTerm = (document.getElementById('searchUsers')?.value || '').trim().toLowerCase();
    const selectedRoles = getSelectedValues('.filter-role');
    const selectedStatuses = getSelectedValues('.filter-status');

    let filtered = allUsers.filter(user => shouldDisplayUser(user));

    if (selectedUser && !shouldDisplayUser(selectedUser)) {
        selectedUser = null;
        clearUserDetails();
    }

    if (searchTerm) {
        filtered = filtered.filter(user => {
            const haystack = [
                `${user.first_name} ${user.last_name}`,
                user.email,
                user.phone_number || ''
            ].join(' ').toLowerCase();
            return haystack.includes(searchTerm);
        });
    }

    if (selectedRoles.length > 0) {
        filtered = filtered.filter(user => selectedRoles.includes(normalizeRoleValue(user.role)));
    }

    if (selectedStatuses.length > 0) {
        filtered = filtered.filter(user => statusMatchesFilter(user.account_status, selectedStatuses));
    }

    filtered.sort(compareUsersByStatusThenName);

    filteredUsersCache = filtered;
    renderUsersList(filtered);
}

function renderUsersList(users) {
    const container = document.getElementById('usersList');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="bi bi-people text-muted"></i><p>Brak użytkowników</p></div>';
        return;
    }

    container.innerHTML = users.map(user => {
        const isActive = selectedUser && selectedUser.user_id === user.user_id;
        const normalizedRole = normalizeRoleValue(user.role);
        const statusClass = getStatusColorClass(user.account_status);
        return `
            <div class="user-list-item ${statusClass} ${isActive ? 'active' : ''}" data-user-id="${user.user_id}">
                <div class="user-name d-flex justify-content-between align-items-center">
                    <span>${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</span>
                    <span class="badge-role ${normalizedRole}">${escapeHtml(formatRoleLabel(user.role))}</span>
                </div>
                <div class="user-meta">
                    <div><i class="bi bi-envelope me-2"></i>${escapeHtml(user.email)}</div>
                    <div><i class="bi bi-shield-check me-2"></i>${escapeHtml(formatStatusLabel(user.account_status))}</div>
                </div>
                ${isActive ? `<div class="mobile-detail-inline" id="mobileDetail-${user.user_id}"></div>` : ''}
            </div>
        `;
    }).join('');

    setTimeout(() => {
        document.querySelectorAll('.user-list-item').forEach(item => {
            const clone = item.cloneNode(true);
            item.parentNode.replaceChild(clone, item);
            clone.addEventListener('click', event => {
                if (event.target.closest('form') ||
                    event.target.closest('button') ||
                    event.target.closest('input') ||
                    event.target.closest('select') ||
                    event.target.closest('textarea') ||
                    event.target.closest('label')) {
                    return;
                }
                const userId = Number(clone.dataset.userId);
                selectUser(userId);
            });
        });
    }, 0);
}

async function selectUser(userId, options = {}) {
    const { force = false } = options;
    if (!force && selectedUser && selectedUser.user_id === userId) {
        selectedUser = null;
        renderUsersList(filteredUsersCache);
        clearUserDetails();
        hideNewUserForm();
        return;
    }

    hideNewUserForm();
    selectedUser = allUsers.find(user => user.user_id === userId) || null;
    if (!selectedUser) {
        showError('Nie znaleziono użytkownika');
        return;
    }

    renderUsersList(filteredUsersCache);

    const assignments = await loadUserAssignments(userId);
    renderUserDetails(selectedUser, assignments);

    if (window.innerWidth < 768) {
        const element = document.querySelector(`[data-user-id="${userId}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

async function loadUserAssignments(userId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/user_projects/?user_id=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            showError('Nie udało się pobrać przypisań użytkownika');
            return [];
        }
        const assignments = await response.json();
        return assignments.map(item => {
            const project = allProjects.find(p => p.project_id === item.project_id);
            return {
                ...item,
                project_name: project ? project.project_name : `Projekt #${item.project_id}`
            };
        });
    } catch (error) {
        console.error('Błąd pobierania przypisań:', error);
        showError('Błąd połączenia z serwerem');
        return [];
    }
}

function renderUserDetails(user, assignedProjects) {
    const assignedIds = assignedProjects.map(p => p.project_id);
    const availableProjects = allProjects.filter(project => !assignedIds.includes(project.project_id));

    const desktopHtml = generateUserDetailsHtml(user, assignedProjects, availableProjects, `desktop-${user.user_id}`);
    const mobileHtml = generateUserDetailsHtml(user, assignedProjects, availableProjects, `mobile-${user.user_id}`);

    const desktopContainer = document.getElementById('userDetails');
    if (desktopContainer) {
        desktopContainer.innerHTML = desktopHtml;
    }

    const mobileContainer = document.getElementById(`mobileDetail-${user.user_id}`);
    if (mobileContainer) {
        mobileContainer.innerHTML = mobileHtml;
    }

    attachUserDetailListeners();
}

function generateUserDetailsHtml(user, assignedProjects, availableProjects, suffix) {
    const adminLocked = user.role === 'admin' && currentUser?.role !== 'admin';
    const normalizedRole = normalizeRoleValue(user.role);
    const statusOptions = [
        { value: 'aktywny', label: 'Aktywny' },
        { value: 'nieaktywny', label: 'Nieaktywny' },
        { value: 'zablokowany', label: 'Zablokowany' }
    ];
    const canManageAdmins = currentUser?.role === 'admin';
    const roleOptions = [
        { value: 'worker', label: 'Pracownik', disabled: false },
        { value: 'hr', label: 'HR', disabled: false }
    ];
    if (canManageAdmins || normalizedRole === 'admin') {
        roleOptions.push({ value: 'admin', label: 'Admin', disabled: !canManageAdmins });
    }

    return `
        <h5>Dane użytkownika</h5>
        ${adminLocked ? '<div class="alert alert-warning">Zmiany konta administratora wymagają uprawnień administratora.</div>' : ''}
        <form class="user-form" data-user-id="${user.user_id}" data-instance="${suffix}">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label" for="firstName-${suffix}">Imię</label>
                    <input type="text" class="form-control" id="firstName-${suffix}" name="first_name" value="${escapeHtml(user.first_name)}" ${adminLocked ? 'disabled' : ''} required>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="lastName-${suffix}">Nazwisko</label>
                    <input type="text" class="form-control" id="lastName-${suffix}" name="last_name" value="${escapeHtml(user.last_name)}" ${adminLocked ? 'disabled' : ''} required>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="email-${suffix}">Email</label>
                    <input type="email" class="form-control" id="email-${suffix}" name="email" value="${escapeHtml(user.email)}" ${adminLocked ? 'disabled' : ''} required>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="phone-${suffix}">Telefon</label>
                    <input type="text" class="form-control" id="phone-${suffix}" name="phone_number" value="${escapeHtml(user.phone_number || '')}" ${adminLocked ? 'disabled' : ''}>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="role-${suffix}">Rola</label>
                    <select class="form-select" id="role-${suffix}" name="role" ${adminLocked ? 'disabled' : ''}>
                        ${roleOptions.map(option => `
                            <option value="${option.value}" ${option.disabled ? 'disabled' : ''} ${option.value === normalizedRole ? 'selected' : ''}>
                                ${option.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="status-${suffix}">Status konta</label>
                    <select class="form-select" id="status-${suffix}" name="account_status" ${adminLocked ? 'disabled' : ''}>
                        ${statusOptions.map(option => `
                            <option value="${option.value}" ${option.value === normalizeStatus(user.account_status) ? 'selected' : ''}>
                                ${option.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="birth-${suffix}">Data urodzenia</label>
                    <input type="date" class="form-control" id="birth-${suffix}" name="birth_date" value="${user.birth_date ? user.birth_date : ''}" ${adminLocked ? 'disabled' : ''}>
                </div>
                <div class="col-12">
                    <label class="form-label" for="address-${suffix}">Adres</label>
                    <textarea class="form-control" id="address-${suffix}" name="address" rows="2" ${adminLocked ? 'disabled' : ''}>${escapeHtml(user.address || '')}</textarea>
                </div>
            </div>
            <div class="d-flex gap-2 flex-wrap mt-3">
                <button type="submit" class="btn btn-primary" ${adminLocked ? 'disabled' : ''}>
                    <i class="bi bi-save me-2"></i>Zapisz zmiany
                </button>
                <button type="button" class="btn btn-danger delete-user-btn" data-user-id="${user.user_id}" ${adminLocked ? 'disabled' : ''}>
                    <i class="bi bi-trash me-2"></i>Usuń użytkownika
                </button>
            </div>
            <small class="text-muted d-block mt-2">Zarejestrowany: ${new Date(user.registration_date).toLocaleString('pl-PL')}</small>
        </form>
        <hr>
        <h6>Reset hasła</h6>
        ${adminLocked ? '<p class="text-muted"><small>Reset hasła administratora wymaga zalogowania jako administrator.</small></p>' : ''}
        <form class="user-password-form" data-user-id="${user.user_id}" data-instance="${suffix}">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label" for="newPass-${suffix}">Nowe hasło</label>
                    <input type="password" class="form-control" id="newPass-${suffix}" name="new_password" ${adminLocked ? 'disabled' : ''}>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="confirmPass-${suffix}">Powtórz hasło</label>
                    <input type="password" class="form-control" id="confirmPass-${suffix}" name="confirm_password" ${adminLocked ? 'disabled' : ''}>
                </div>
            </div>
            <button type="submit" class="btn btn-outline-secondary mt-3" ${adminLocked ? 'disabled' : ''}>
                <i class="bi bi-key me-2"></i>Ustaw nowe hasło
            </button>
        </form>
        <hr>
        <h6>Przypisane projekty</h6>
        <div class="mb-3">
            ${assignedProjects.length === 0 ? '<p class="text-muted"><small>Brak przypisanych projektów</small></p>' : ''}
            <div>
                ${assignedProjects.map(project => `
                    <div class="user-project-item">
                        <span>
                            <i class="bi bi-folder-fill me-2"></i>
                            ${escapeHtml(project.project_name)}
                        </span>
                        <button type="button" class="btn btn-sm btn-danger remove-project-btn" data-user-id="${user.user_id}" data-project-id="${project.project_id}">
                            <i class="bi bi-x-circle"></i> Usuń
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
        ${availableProjects.length > 0 ? `
            <div class="input-group">
                <select class="form-select" id="assignSelect-${suffix}">
                    <option value="">-- Wybierz projekt --</option>
                    ${availableProjects.map(project => `
                        <option value="${project.project_id}">
                            ${escapeHtml(project.project_name)}
                        </option>
                    `).join('')}
                </select>
                <button type="button" class="btn btn-success add-project-btn" data-user-id="${user.user_id}" data-select-id="assignSelect-${suffix}">
                    <i class="bi bi-plus-circle me-1"></i>Dodaj
                </button>
            </div>
        ` : '<p class="text-muted"><small>Wszystkie projekty są już przypisane.</small></p>'}
    `;
}

function attachUserDetailListeners() {
    document.querySelectorAll('.user-form').forEach(form => {
        form.removeEventListener('submit', handleUserUpdate);
        form.addEventListener('submit', handleUserUpdate);
    });

    document.querySelectorAll('.user-password-form').forEach(form => {
        form.removeEventListener('submit', handlePasswordReset);
        form.addEventListener('submit', handlePasswordReset);
    });

    document.querySelectorAll('.delete-user-btn').forEach(button => {
        button.removeEventListener('click', handleDeleteUser);
        button.addEventListener('click', handleDeleteUser);
    });

    document.querySelectorAll('.add-project-btn').forEach(button => {
        button.removeEventListener('click', handleAddProject);
        button.addEventListener('click', handleAddProject);
    });

    document.querySelectorAll('.remove-project-btn').forEach(button => {
        button.removeEventListener('click', handleRemoveProject);
        button.addEventListener('click', handleRemoveProject);
    });
}

async function handleUserUpdate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const userId = Number(form.dataset.userId);
    const adminLocked = form.querySelector('[name="first_name"]').disabled;
    if (adminLocked) {
        return;
    }

    const formData = new FormData(form);
    const firstName = formData.get('first_name').trim();
    const lastName = formData.get('last_name').trim();
    const email = formData.get('email').trim().toLowerCase();
    const chosenRole = sanitizeRoleInput(formData.get('role'));

    if (!firstName || !lastName || !email) {
        showError('Imię, nazwisko i email są obowiązkowe');
        return;
    }

    const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: normalizeEmpty(formData.get('phone_number')),
        role: chosenRole,
        account_status: normalizeEmpty(formData.get('account_status')),
        birth_date: normalizeEmpty(formData.get('birth_date')),
        address: normalizeEmpty(formData.get('address'))
    };

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Nie udało się zaktualizować użytkownika');
        }
        showSuccess('Dane użytkownika zostały zapisane');
        await loadUsers();
        applyFilters();
        await refreshSelectedUserDetails();
    } catch (error) {
        console.error('Błąd aktualizacji użytkownika:', error);
        showError(error.message);
    }
}

async function handlePasswordReset(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const userId = Number(form.dataset.userId);
    if (form.querySelector('[name="new_password"]').disabled) {
        return;
    }

    const newPassword = form.querySelector('[name="new_password"]').value.trim();
    const confirmPassword = form.querySelector('[name="confirm_password"]').value.trim();

    if (!newPassword || !confirmPassword) {
        showError('Uzupełnij oba pola hasła');
        return;
    }

    if (newPassword !== confirmPassword) {
        showError('Hasła nie są identyczne');
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/users/${userId}/password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                new_password: newPassword,
                confirm_new_password: confirmPassword
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Nie udało się zresetować hasła');
        }
        form.reset();
        showSuccess('Hasło zostało ustawione');
    } catch (error) {
        console.error('Błąd resetowania hasła:', error);
        showError(error.message);
    }
}

function handleDeleteUser(event) {
    event.preventDefault();
    event.stopPropagation();
    const userId = Number(event.currentTarget.dataset.userId);
    deleteUserAccount(userId);
}

function handleAddProject(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const userId = Number(button.dataset.userId);
    const selectId = button.dataset.selectId;
    addProjectToUser(userId, selectId);
}

function handleRemoveProject(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const userId = Number(button.dataset.userId);
    const projectId = Number(button.dataset.projectId);
    removeProjectAssignment(userId, projectId);
}

async function deleteUserAccount(userId) {
    if (!confirm('Czy na pewno chcesz usunąć tego użytkownika?')) {
        return;
    }
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 204) {
            showSuccess('Użytkownik został usunięty');
            if (selectedUser && selectedUser.user_id === userId) {
                selectedUser = null;
                clearUserDetails();
            }
            await loadUsers();
            applyFilters();
        } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Nie udało się usunąć użytkownika');
        }
    } catch (error) {
        console.error('Błąd usuwania użytkownika:', error);
        showError(error.message);
    }
}

async function addProjectToUser(userId, selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const projectId = Number(select.value);
    if (!projectId) {
        showError('Wybierz projekt do dodania');
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/user_projects/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId, project_id: projectId })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Nie udało się dodać użytkownika do projektu');
        }
        showSuccess('Projekt został przypisany');
        select.value = '';
        await refreshSelectedUserDetails();
    } catch (error) {
        console.error('Błąd przypisywania projektu:', error);
        showError(error.message);
    }
}

async function removeProjectAssignment(userId, projectId) {
    if (!confirm('Czy na pewno chcesz usunąć ten projekt z tego użytkownika?')) {
        return;
    }
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/user_projects/${userId}/${projectId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Nie udało się usunąć przypisania');
        }
        showSuccess('Przypisanie zostało usunięte');
        await refreshSelectedUserDetails();
    } catch (error) {
        console.error('Błąd usuwania przypisania:', error);
        showError(error.message);
    }
}

async function refreshSelectedUserDetails() {
    if (!selectedUser) {
        return;
    }
    await loadUsers();
    applyFilters();
    const updated = allUsers.find(user => user.user_id === selectedUser.user_id);
    if (!updated) {
        selectedUser = null;
        clearUserDetails();
        return;
    }
    selectedUser = updated;
    const assignments = await loadUserAssignments(selectedUser.user_id);
    renderUserDetails(selectedUser, assignments);
}

function clearUserDetails() {
    const container = document.getElementById('userDetails');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="bi bi-people text-muted"></i>
                <p>Wybierz użytkownika z listy lub utwórz nowego</p>
            </div>
        `;
    }
    document.querySelectorAll('.mobile-detail-inline').forEach(node => node.innerHTML = '');
}

function toggleNewUserForm() {
    if (isCreatingNewUser) {
        hideNewUserForm();
    } else {
        showNewUserForm();
    }
}

function showNewUserForm() {
    isCreatingNewUser = true;
    selectedUser = null;
    renderUsersList(filteredUsersCache);

    const html = generateNewUserFormHtml();
    const container = window.innerWidth < 768 ? document.getElementById('newUserFormContainer') : document.getElementById('userDetails');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = html;
    }
    attachNewUserFormListener();
    updateNewUserButtonLabel();
}

function hideNewUserForm() {
    if (!isCreatingNewUser) {
        return;
    }
    isCreatingNewUser = false;
    const mobileContainer = document.getElementById('newUserFormContainer');
    if (mobileContainer) {
        mobileContainer.style.display = 'none';
        mobileContainer.innerHTML = '';
    }
    if (window.innerWidth >= 768) {
        clearUserDetails();
    }
    updateNewUserButtonLabel();
}

function updateNewUserButtonLabel() {
    const button = document.getElementById('btnNewUser');
    if (!button) return;
    if (isCreatingNewUser) {
        button.innerHTML = '<i class="bi bi-x-circle me-2"></i>Zamknij formularz';
    } else {
        button.innerHTML = '<i class="bi bi-person-plus me-2"></i>Nowy użytkownik';
    }
}

function generateNewUserFormHtml() {
    const canManageAdmins = currentUser?.role === 'admin';
    return `
        <h5>Nowy użytkownik</h5>
        <form id="newUserForm">
            <div class="row g-3">
                <div class="col-md-6">
                    <label class="form-label" for="newFirstName">Imię</label>
                    <input type="text" class="form-control" id="newFirstName" name="first_name" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="newLastName">Nazwisko</label>
                    <input type="text" class="form-control" id="newLastName" name="last_name" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="newEmail">Email</label>
                    <input type="email" class="form-control" id="newEmail" name="email" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="newPhone">Telefon</label>
                    <input type="text" class="form-control" id="newPhone" name="phone_number">
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="newRole">Rola</label>
                    <select class="form-select" id="newRole" name="role" required>
                        <option value="worker">Pracownik</option>
                        <option value="hr">HR</option>
                        ${canManageAdmins ? '<option value="admin">Admin</option>' : ''}
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="newPassword">Hasło</label>
                    <input type="password" class="form-control" id="newPassword" name="password" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="newPasswordConfirm">Powtórz hasło</label>
                    <input type="password" class="form-control" id="newPasswordConfirm" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label" for="newBirth">Data urodzenia</label>
                    <input type="date" class="form-control" id="newBirth" name="birth_date">
                </div>
                <div class="col-12">
                    <label class="form-label" for="newAddress">Adres</label>
                    <textarea class="form-control" id="newAddress" name="address" rows="2"></textarea>
                </div>
            </div>
            <div class="d-flex gap-2 flex-wrap mt-3">
                <button type="submit" class="btn btn-success">
                    <i class="bi bi-plus-circle me-2"></i>Utwórz użytkownika
                </button>
                <button type="button" class="btn btn-secondary" id="cancelNewUser">
                    Anuluj
                </button>
            </div>
        </form>
    `;
}

function attachNewUserFormListener() {
    const form = document.getElementById('newUserForm');
    if (form) {
        form.addEventListener('submit', handleCreateUser);
    }
    const cancelButton = document.getElementById('cancelNewUser');
    if (cancelButton) {
        cancelButton.addEventListener('click', hideNewUserForm);
    }
}

async function handleCreateUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const firstName = formData.get('first_name').trim();
    const lastName = formData.get('last_name').trim();
    const email = formData.get('email').trim().toLowerCase();
    const password = formData.get('password').trim();
    const confirmPassword = document.getElementById('newPasswordConfirm').value.trim();

    if (!firstName || !lastName || !email || !password) {
        showError('Wszystkie podstawowe pola są wymagane');
        return;
    }

    if (password !== confirmPassword) {
        showError('Hasła nie są identyczne');
        return;
    }

    const payload = {
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: normalizeEmpty(formData.get('phone_number')),
        role: sanitizeRoleInput(formData.get('role')),
        password,
        birth_date: normalizeEmpty(formData.get('birth_date')),
        address: normalizeEmpty(formData.get('address'))
    };

    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/users/register', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Nie udało się utworzyć użytkownika');
        }
        showSuccess('Nowy użytkownik został utworzony');
        hideNewUserForm();
        await loadUsers();
        applyFilters();
    } catch (error) {
        console.error('Błąd tworzenia użytkownika:', error);
        showError(error.message);
    }
}

function formatRoleLabel(role) {
    const normalized = normalizeRoleValue(role);
    const map = {
        worker: 'Pracownik',
        hr: 'HR',
        admin: 'Admin'
    };
    return map[normalized] || (role || '');
}

function formatStatusLabel(status) {
    const normalized = normalizeStatus(status);
    const map = {
        aktywny: 'Aktywny',
        nieaktywny: 'Nieaktywny',
        zablokowany: 'Zablokowany'
    };
    return map[normalized] || (status || '');
}

function normalizeStatus(status) {
    return (status || '').toLowerCase();
}

function normalizeRoleValue(role) {
    const normalized = (role || '').toLowerCase();
    if (normalized === 'user') {
        return 'worker';
    }
    return normalized;
}

function sanitizeRoleInput(role) {
    const normalized = normalizeRoleValue(role) || 'worker';
    if (normalized === 'admin' && currentUser?.role !== 'admin') {
        return 'worker';
    }
    if (normalized !== 'worker' && normalized !== 'hr' && normalized !== 'admin') {
        return 'worker';
    }
    return normalized;
}

function normalizeEmpty(value) {
    if (value === null || value === undefined) return null;
    const trimmed = value.toString().trim();
    return trimmed === '' ? null : trimmed;
}

function resetFilters() {
    document.querySelectorAll('.filter-role, .filter-status').forEach(input => {
        input.checked = false;
    });
    applyFilters();
}

function getSelectedValues(selector) {
    return Array.from(document.querySelectorAll(selector))
        .filter(input => input.checked)
        .map(input => input.value);
}

function statusMatchesFilter(status, filters) {
    if (!filters || filters.length === 0) return true;
    const normalized = normalizeStatus(status);
    return filters.some(filter => {
        const candidates = STATUS_FILTER_MAP[filter] || [filter];
        return candidates.includes(normalized);
    });
}

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
    alert(message);
}

function showError(message) {
    alert('Błąd: ' + message);
}

function compareUsersByStatusThenName(a, b) {
    const statusDiff = getStatusSortValue(a.account_status) - getStatusSortValue(b.account_status);
    if (statusDiff !== 0) {
        return statusDiff;
    }

    const first = a.first_name.localeCompare(b.first_name, 'pl');
    if (first !== 0) {
        return first;
    }
    return a.last_name.localeCompare(b.last_name, 'pl');
}

function getStatusSortValue(status) {
    const normalized = normalizeStatus(status);
    return STATUS_SORT_ORDER.hasOwnProperty(normalized)
        ? STATUS_SORT_ORDER[normalized]
        : Number.POSITIVE_INFINITY;
}

function shouldDisplayUser(user) {
    const role = normalizeRoleValue(user.role);
    if (role === 'admin' && currentUser?.role !== 'admin') {
        return false;
    }
    return true;
}

function getStatusColorClass(status) {
    const normalized = normalizeStatus(status);
    if (normalized === 'aktywny' || normalized === 'active') {
        return 'status-active';
    }
    if (normalized === 'nieaktywny' || normalized === 'inactive') {
        return 'status-inactive';
    }
    if (normalized === 'zablokowany' || normalized === 'blocked') {
        return 'status-blocked';
    }
    return '';
}
