const API_BASE_URL = window.APP_CONFIG?.apiBaseUrl || 'http://localhost:4000';

const elements = {
    authSection: document.getElementById('authSection'),
    dashboardSection: document.getElementById('dashboardSection'),
    adminSection: document.getElementById('adminSection'),
    registerForm: document.getElementById('registerForm'),
    loginForm: document.getElementById('loginForm'),
    logoutButton: document.getElementById('logoutButton'),
    promptInput: document.getElementById('promptInput'),
    generateButton: document.getElementById('generateButton'),
    registerMessage: document.getElementById('registerMessage'),
    loginMessage: document.getElementById('loginMessage'),
    generateMessage: document.getElementById('generateMessage'),
    aiResponseCard: document.getElementById('aiResponseCard'),
    aiResponse: document.getElementById('aiResponse'),
    usageSummary: document.getElementById('usageSummary'),
    welcomeHeading: document.getElementById('welcomeHeading'),
    limitNotice: document.getElementById('limitNotice'),
    adminTableBody: document.getElementById('adminTableBody'),
    adminMessage: document.getElementById('adminMessage'),
    modelName: document.getElementById('modelName'),
};

const state = {
    user: null,
    adminUsers: [],
};

function setMessage(target, message, type = 'info') {
    if (!target) return;
    target.textContent = message || '';
    target.className = `message${type ? ` ${type}` : ''}`;
}

function toggleSection(element, shouldShow) {
    if (!element) return;
    element.classList.toggle('hidden', !shouldShow);
}

async function callApi(path, { method = 'GET', body } = {}) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, options);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error(data?.message || 'Request failed');
            error.status = response.status;
            error.data = data;
            throw error;
        }
        return data;
    } catch (error) {
        if (!error.status) {
            error.message = 'Network error. Please verify that the API server is online.';
        }
        throw error;
    }
}

function updateUsageSummary(user) {
    if (!user) {
        elements.usageSummary.textContent = '';
        return;
    }
    const used = Number(user.apiCallsUsed ?? 0);
    const limit = Number(user.freeCallLimit ?? 20);
    const remaining = Math.max(0, Number(user.freeCallsRemaining ?? limit - used));
    elements.usageSummary.textContent = `You have used ${used} of ${limit} free AI calls (${remaining} remaining).`;
    if (remaining === 0) {
        elements.limitNotice.textContent = 'You have reached the end of your complimentary calls. The AI is still available, but future usage may require payment.';
        elements.limitNotice.classList.add('warning');
        toggleSection(elements.limitNotice, true);
    } else {
        elements.limitNotice.textContent = '';
        elements.limitNotice.classList.remove('warning');
        toggleSection(elements.limitNotice, false);
    }
}

function applyUser(user) {
    state.user = user;
    if (!user) {
        toggleSection(elements.authSection, true);
        toggleSection(elements.dashboardSection, false);
        toggleSection(elements.adminSection, false);
        setMessage(elements.loginMessage, '');
        setMessage(elements.registerMessage, '');
        return;
    }

    toggleSection(elements.authSection, false);
    toggleSection(elements.dashboardSection, true);
    elements.welcomeHeading.textContent = `Welcome, ${user.email}`;
    updateUsageSummary(user);

    if (user.role === 'admin') {
        toggleSection(elements.adminSection, true);
        refreshAdminTable();
    } else {
        toggleSection(elements.adminSection, false);
    }
}

async function refreshSession() {
    try {
        const data = await callApi('/api/auth/me');
        if (data?.user) {
            applyUser(data.user);
        }
    } catch (error) {
        console.warn('Session check failed:', error.message);
        applyUser(null);
    }
}

async function refreshAdminTable() {
    if (!state.user || state.user.role !== 'admin') {
        return;
    }
    try {
        setMessage(elements.adminMessage, 'Loading user metrics…', 'info');
        const data = await callApi('/api/admin/users');
        state.adminUsers = data.users || [];
        renderAdminTable();
        setMessage(elements.adminMessage, `Last refreshed at ${new Date().toLocaleTimeString()}`, 'success');
    } catch (error) {
        console.error('Admin fetch failed:', error);
        setMessage(elements.adminMessage, error.message, 'error');
    }
}

function renderAdminTable() {
    elements.adminTableBody.innerHTML = '';
    state.adminUsers.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${user.apiCallsUsed}</td>
            <td>${user.freeCallsRemaining}</td>
            <td>${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '—'}</td>
            <td>${user.lastRequestAt ? new Date(user.lastRequestAt).toLocaleString() : '—'}</td>
        `;
        elements.adminTableBody.appendChild(row);
    });
}

async function handleRegister(event) {
    event.preventDefault();
    const formData = new FormData(elements.registerForm);
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString();

    if (!email || !password) {
        setMessage(elements.registerMessage, 'Email and password are required.', 'error');
        return;
    }

    try {
        setMessage(elements.registerMessage, 'Registering…', 'info');
        const data = await callApi('/api/auth/register', { method: 'POST', body: { email, password } });
        setMessage(elements.registerMessage, data.message || 'Registration successful!', 'success');
        elements.registerForm.reset();
    } catch (error) {
        setMessage(elements.registerMessage, error.message, 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const formData = new FormData(elements.loginForm);
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString();

    if (!email || !password) {
        setMessage(elements.loginMessage, 'Email and password are required.', 'error');
        return;
    }

    try {
        setMessage(elements.loginMessage, 'Signing in…', 'info');
        const data = await callApi('/api/auth/login', { method: 'POST', body: { email, password } });
        setMessage(elements.loginMessage, 'Signed in successfully!', 'success');
        applyUser(data.user);
    } catch (error) {
        setMessage(elements.loginMessage, error.message, 'error');
    }
}

async function handleLogout() {
    try {
        await callApi('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.warn('Logout error:', error);
    } finally {
        applyUser(null);
        elements.aiResponseCard.classList.add('hidden');
        elements.aiResponse.textContent = '';
        elements.generateMessage.textContent = '';
    }
}

async function handleGenerate() {
    const prompt = elements.promptInput.value.trim();
    if (!prompt) {
        setMessage(elements.generateMessage, 'Please enter a prompt first.', 'error');
        return;
    }

    try {
        setMessage(elements.generateMessage, 'Generating…', 'info');
        const data = await callApi('/api/ai/generate', { method: 'POST', body: { prompt } });
        setMessage(elements.generateMessage, data.message || 'Done!', 'success');
        elements.aiResponse.textContent = data.generatedText || 'No text generated.';
        elements.aiResponseCard.classList.remove('hidden');

        if (state.user) {
            state.user.apiCallsUsed = data.usage?.total ?? state.user.apiCallsUsed;
            state.user.freeCallsRemaining = data.usage?.remaining ?? state.user.freeCallsRemaining;
            state.user.freeCallLimit = data.usage?.limit ?? state.user.freeCallLimit;
            updateUsageSummary(state.user);
        }

        if (data.limitReached) {
            setMessage(elements.generateMessage, data.message || 'Free tier exhausted. Service will continue.', 'error');
        }

        if (state.user?.role === 'admin') {
            refreshAdminTable();
        }
    } catch (error) {
        console.error('Generation failed:', error);
        setMessage(elements.generateMessage, error.message, 'error');
    }
}

async function fetchModelInfo() {
    try {
        const data = await callApi('/health');
        elements.modelName.textContent = data.model || 'Unknown model';
    } catch (error) {
        elements.modelName.textContent = 'Unavailable';
    }
}

function registerEventListeners() {
    elements.registerForm.addEventListener('submit', handleRegister);
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.logoutButton.addEventListener('click', handleLogout);
    elements.generateButton.addEventListener('click', handleGenerate);
}

(async function init() {
    registerEventListeners();
    await fetchModelInfo();
    await refreshSession();
})();
