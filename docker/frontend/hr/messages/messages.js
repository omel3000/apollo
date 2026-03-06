let allMessages = [];
let selectedMessageId = null;
let isCreatingMessage = false;

const elements = {};

document.addEventListener('DOMContentLoaded', async () => {
    bindElements();
    bindEvents();
    await loadMessages();
});

function bindElements() {
    elements.pageAlert = document.getElementById('pageAlert');
    elements.btnNewMessage = document.getElementById('btnNewMessage');
    elements.searchMessages = document.getElementById('searchMessages');
    elements.statusFilter = document.getElementById('statusFilter');
    elements.messagesList = document.getElementById('messagesList');
    elements.messageDetails = document.getElementById('messageDetails');
}

function bindEvents() {
    elements.btnNewMessage.addEventListener('click', showCreateForm);
    elements.searchMessages.addEventListener('input', renderMessagesList);
    elements.statusFilter.addEventListener('change', renderMessagesList);
}

async function loadMessages(preferredMessageId = selectedMessageId) {
    try {
        const response = await fetchWithAuth('/messages/?include_inactive=true');
        if (!response.ok) {
            throw new Error('Nie udało się pobrać komunikatów.');
        }

        allMessages = await response.json();
        allMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        renderMessagesList();

        if (isCreatingMessage) {
            renderCreateForm();
            return;
        }

        if (preferredMessageId && allMessages.some(message => message.message_id === preferredMessageId)) {
            selectMessage(preferredMessageId);
            return;
        }

        if (allMessages.length > 0) {
            selectMessage(allMessages[0].message_id);
        } else {
            renderEmptyDetails('Brak komunikatów', 'Dodaj pierwszy komunikat, aby wyświetlił się tutaj podgląd i opcje edycji.');
        }
    } catch (error) {
        console.error('Błąd podczas pobierania komunikatów:', error);
        showAlert(error.message || 'Nie udało się pobrać komunikatów.', 'danger');
        renderMessagesList();
        renderEmptyDetails('Błąd ładowania', 'Nie udało się pobrać listy komunikatów. Spróbuj ponownie za chwilę.');
    }
}

function getFilteredMessages() {
    const searchTerm = elements.searchMessages.value.trim().toLowerCase();
    const statusValue = elements.statusFilter.value;

    return allMessages.filter(message => {
        const matchesSearch = !searchTerm
            || message.title.toLowerCase().includes(searchTerm)
            || message.content.toLowerCase().includes(searchTerm);

        const matchesStatus = statusValue === 'all'
            || (statusValue === 'active' && message.is_active)
            || (statusValue === 'inactive' && !message.is_active);

        return matchesSearch && matchesStatus;
    });
}

function renderMessagesList() {
    const filteredMessages = getFilteredMessages();

    if (filteredMessages.length === 0) {
        elements.messagesList.innerHTML = `
            <div class="empty-state py-4">
                <i class="bi bi-megaphone"></i>
                <p class="mb-0">Brak komunikatów pasujących do filtrów.</p>
            </div>
        `;
        return;
    }

    elements.messagesList.innerHTML = filteredMessages.map(message => {
        const isActive = message.message_id === selectedMessageId && !isCreatingMessage;
        return `
            <div class="message-list-item ${isActive ? 'active' : ''}" data-message-id="${message.message_id}">
                <div class="message-list-title">${escapeHtml(message.title)}</div>
                <div class="message-list-preview">${escapeHtml(truncateText(message.content, 110))}</div>
                <div class="message-meta">
                    <span class="message-status-badge ${message.is_active ? 'is-active' : 'is-inactive'}">
                        ${message.is_active ? 'Aktywny' : 'Nieaktywny'}
                    </span>
                    <span class="text-muted">${formatDate(message.created_at)}</span>
                </div>
            </div>
        `;
    }).join('');

    elements.messagesList.querySelectorAll('.message-list-item').forEach(item => {
        item.addEventListener('click', () => {
            const messageId = Number(item.dataset.messageId);
            selectMessage(messageId);
        });
    });
}

function selectMessage(messageId) {
    const message = allMessages.find(item => item.message_id === messageId);
    if (!message) {
        return;
    }

    isCreatingMessage = false;
    selectedMessageId = messageId;
    renderMessagesList();
    renderEditForm(message);
}

function showCreateForm() {
    isCreatingMessage = true;
    selectedMessageId = null;
    renderMessagesList();
    renderCreateForm();
}

function renderCreateForm() {
    elements.messageDetails.innerHTML = getFormMarkup({
        heading: 'Nowy komunikat',
        lead: 'Utwórz nowy komunikat widoczny na stronach głównych użytkowników.',
        submitLabel: 'Dodaj komunikat',
        message: {
            title: '',
            content: '',
            is_active: true,
            created_at: null,
        },
        isExisting: false,
    });
    attachFormListeners();
}

function renderEditForm(message) {
    elements.messageDetails.innerHTML = getFormMarkup({
        heading: 'Edycja komunikatu',
        lead: 'Zaktualizuj treść, status aktywności lub usuń komunikat.',
        submitLabel: 'Zapisz zmiany',
        message,
        isExisting: true,
    });
    attachFormListeners(message);
}

function getFormMarkup({ heading, lead, submitLabel, message, isExisting }) {
    return `
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
            <div>
                <h4 class="mb-1">${heading}</h4>
                <p class="text-muted mb-0">${lead}</p>
            </div>
            ${isExisting ? `<span class="message-status-badge ${message.is_active ? 'is-active' : 'is-inactive'}">${message.is_active ? 'Aktywny' : 'Nieaktywny'}</span>` : ''}
        </div>

        <form id="messageForm" class="needs-validation" novalidate>
            <div class="mb-3">
                <label for="messageTitle" class="form-label">Tytuł</label>
                <input type="text" class="form-control" id="messageTitle" maxlength="150" value="${escapeHtml(message.title || '')}" required>
                <div class="invalid-feedback">Podaj tytuł komunikatu.</div>
            </div>

            <div class="mb-3">
                <label for="messageContent" class="form-label">Treść</label>
                <textarea class="form-control" id="messageContent" rows="7" required>${escapeHtml(message.content || '')}</textarea>
                <div class="invalid-feedback">Podaj treść komunikatu.</div>
            </div>

            <div class="form-check form-switch mb-4">
                <input class="form-check-input" type="checkbox" role="switch" id="messageIsActive" ${message.is_active ? 'checked' : ''}>
                <label class="form-check-label" for="messageIsActive">Komunikat aktywny</label>
            </div>

            <div class="message-form-actions mb-4">
                <button type="submit" class="btn btn-primary">
                    <i class="bi bi-save me-2"></i>${submitLabel}
                </button>
                <button type="button" class="btn btn-outline-secondary" id="btnCancelMessageForm">
                    <i class="bi bi-x-circle me-2"></i>${isExisting ? 'Anuluj zmiany' : 'Wyczyść formularz'}
                </button>
                ${isExisting ? `
                    <button type="button" class="btn btn-outline-danger ms-auto" id="btnDeleteMessage">
                        <i class="bi bi-trash me-2"></i>Usuń komunikat
                    </button>
                ` : ''}
            </div>
        </form>

        <div class="message-preview-card">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                <h5 class="mb-0">Podgląd komunikatu</h5>
                ${message.created_at ? `<small class="text-muted">Utworzono: ${formatDate(message.created_at)}</small>` : '<small class="text-muted">Nowy komunikat nie został jeszcze zapisany.</small>'}
            </div>
            <h6 class="fw-bold">${escapeHtml(message.title || 'Brak tytułu')}</h6>
            <div class="message-preview-content">${escapeHtml(message.content || 'Treść komunikatu pojawi się tutaj po uzupełnieniu formularza.')}</div>
        </div>
    `;
}

function attachFormListeners(message = null) {
    const form = document.getElementById('messageForm');
    const titleInput = document.getElementById('messageTitle');
    const contentInput = document.getElementById('messageContent');
    const isActiveInput = document.getElementById('messageIsActive');
    const cancelButton = document.getElementById('btnCancelMessageForm');
    const deleteButton = document.getElementById('btnDeleteMessage');

    const refreshPreview = () => {
        const previewTitle = elements.messageDetails.querySelector('.message-preview-card h6');
        const previewContent = elements.messageDetails.querySelector('.message-preview-content');
        if (previewTitle) {
            previewTitle.textContent = titleInput.value.trim() || 'Brak tytułu';
        }
        if (previewContent) {
            previewContent.textContent = contentInput.value.trim() || 'Treść komunikatu pojawi się tutaj po uzupełnieniu formularza.';
        }
    };

    titleInput.addEventListener('input', refreshPreview);
    contentInput.addEventListener('input', refreshPreview);
    isActiveInput.addEventListener('change', () => {
        const badge = elements.messageDetails.querySelector('.message-status-badge');
        if (badge) {
            badge.textContent = isActiveInput.checked ? 'Aktywny' : 'Nieaktywny';
            badge.classList.toggle('is-active', isActiveInput.checked);
            badge.classList.toggle('is-inactive', !isActiveInput.checked);
        }
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.classList.add('was-validated');
            return;
        }

        const payload = {
            title: titleInput.value.trim(),
            content: contentInput.value.trim(),
            is_active: isActiveInput.checked,
        };

        if (!payload.title || !payload.content) {
            form.classList.add('was-validated');
            return;
        }

        try {
            const isExisting = Boolean(message && message.message_id);
            const url = isExisting ? `/messages/${message.message_id}` : '/messages/';
            const method = isExisting ? 'PUT' : 'POST';
            const response = await fetchWithAuth(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const detail = await extractErrorMessage(response, isExisting ? 'Nie udało się zapisać zmian komunikatu.' : 'Nie udało się utworzyć komunikatu.');
                throw new Error(detail);
            }

            const savedMessage = await response.json();
            isCreatingMessage = false;
            selectedMessageId = savedMessage.message_id;
            showAlert(isExisting ? 'Zapisano zmiany komunikatu.' : 'Dodano nowy komunikat.', 'success');
            await loadMessages(savedMessage.message_id);
        } catch (error) {
            console.error('Błąd zapisu komunikatu:', error);
            showAlert(error.message || 'Nie udało się zapisać komunikatu.', 'danger');
        }
    });

    cancelButton.addEventListener('click', () => {
        if (message && message.message_id) {
            renderEditForm(message);
            return;
        }
        form.reset();
        isActiveInput.checked = true;
        refreshPreview();
    });

    if (deleteButton && message && message.message_id) {
        deleteButton.addEventListener('click', async () => {
            const confirmed = window.confirm(`Czy na pewno chcesz usunąć komunikat „${message.title}”?`);
            if (!confirmed) {
                return;
            }

            try {
                const response = await fetchWithAuth(`/messages/${message.message_id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const detail = await extractErrorMessage(response, 'Nie udało się usunąć komunikatu.');
                    throw new Error(detail);
                }

                showAlert('Komunikat został usunięty.', 'success');
                isCreatingMessage = false;
                selectedMessageId = null;
                await loadMessages();
            } catch (error) {
                console.error('Błąd usuwania komunikatu:', error);
                showAlert(error.message || 'Nie udało się usunąć komunikatu.', 'danger');
            }
        });
    }
}

function renderEmptyDetails(title, description) {
    elements.messageDetails.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-chat-left-text"></i>
            <h4 class="mb-2">${escapeHtml(title)}</h4>
            <p class="mb-0">${escapeHtml(description)}</p>
        </div>
    `;
}

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('/');
        throw new Error('Brak tokenu autoryzacji.');
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            ...(options.headers || {}),
        },
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.replace('/');
        throw new Error('Sesja wygasła. Zaloguj się ponownie.');
    }

    return response;
}

async function extractErrorMessage(response, fallbackMessage) {
    try {
        const data = await response.json();
        return data.detail || fallbackMessage;
    } catch {
        return fallbackMessage;
    }
}

function showAlert(message, type) {
    elements.pageAlert.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Zamknij"></button>
        </div>
    `;
}

function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength - 1)}…`;
}

function formatDate(dateString) {
    if (!dateString) {
        return 'Brak daty';
    }

    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
