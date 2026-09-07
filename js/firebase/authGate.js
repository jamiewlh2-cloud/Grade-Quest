import {
    changePassword,
    createAccount,
    getAuthInitializationError,
    initializeAuth,
    login,
    logout,
    observeAuthState,
    sendPasswordReset
} from './authService.js';

const state = { mode: 'login', busy: false, initialized: false };
const elements = {};

function cacheElements() {
    [
        'authOverlay', 'authTitle', 'authDescription', 'authMessage', 'authForm',
        'authNameGroup', 'authName', 'authEmail', 'authPassword', 'authPasswordGroup',
        'authConfirmGroup', 'authConfirmPassword', 'authSubmitButton', 'authForgotButton',
        'authToggleButton', 'authChangePasswordButton',
        'authLogoutButton', 'authUserLabel'
    ].forEach(id => { elements[id] = document.getElementById(id); });
}

function showMessage(message, type = 'error') {
    if (!elements.authMessage) return;
    elements.authMessage.textContent = message;
    elements.authMessage.className = `auth-message ${type}`;
    elements.authMessage.hidden = !message;
}

function setBusy(busy) {
    state.busy = busy;
    if (elements.authSubmitButton) {
        elements.authSubmitButton.disabled = busy;
        elements.authSubmitButton.textContent = busy ? 'Please wait...' : state.mode === 'login' ? 'Sign in' : 'Create account';
    }
    elements.authForm?.querySelectorAll('input, button').forEach(element => { element.disabled = busy; });
}

function setMode(mode) {
    state.mode = mode;
    const isCreate = mode === 'create';
    elements.authTitle.textContent = isCreate ? 'Create your GradeQuest account' : 'Sign in to GradeQuest';
    elements.authDescription.textContent = isCreate
        ? 'Use an email and password to keep your academic data tied to your account.'
        : 'Your courses, grades, imports, and training records stay associated with your account.';
    elements.authNameGroup.hidden = !isCreate;
    elements.authConfirmGroup.hidden = !isCreate;
    elements.authForgotButton.hidden = isCreate;
    elements.authSubmitButton.textContent = isCreate ? 'Create account' : 'Sign in';
    elements.authToggleButton.textContent = isCreate ? 'Already have an account? Sign in' : 'Create an account';
    elements.authPassword.autocomplete = isCreate ? 'new-password' : 'current-password';
    showMessage('');
}

function showAuth() {
    document.body.classList.add('auth-required');
    elements.authOverlay.hidden = false;
    elements.authChangePasswordButton.hidden = true;
    elements.authLogoutButton.hidden = true;
    elements.authUserLabel.hidden = true;
}

function showApp(user) {
    document.body.classList.remove('auth-required');
    elements.authOverlay.hidden = true;
    elements.authUserLabel.textContent = user.email || 'Signed in';
    elements.authUserLabel.hidden = false;
    elements.authChangePasswordButton.hidden = false;
    elements.authLogoutButton.hidden = false;
    if (!state.initialized) {
        state.initialized = true;
        getDashboardConfig();
        initGlobalSearch();
        initApp();
    }
}

async function handleSubmit(event) {
    event.preventDefault();
    if (state.busy) return;
    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;
    if (state.mode === 'create' && password !== elements.authConfirmPassword.value) {
        showMessage('Passwords do not match.');
        return;
    }
    setBusy(true);
    const result = state.mode === 'create' ? await createAccount(email, password) : await login(email, password);
    setBusy(false);
    if (!result.ok) {
        showMessage(result.error);
        return;
    }
    showMessage(state.mode === 'create' ? 'Account created. Check your email to verify it.' : 'Signed in successfully.', 'success');
}

async function handleForgotPassword() {
    const email = elements.authEmail.value.trim();
    if (!email) {
        showMessage('Enter your email address first.');
        elements.authEmail.focus();
        return;
    }
    setBusy(true);
    const result = await sendPasswordReset(email);
    setBusy(false);
    showMessage(result.ok ? 'Password reset email sent. Check your inbox.' : result.error, result.ok ? 'success' : 'error');
}

async function handleChangePassword() {
    const password = await showTextDialog({
        title: 'Change password',
        message: 'Enter a new password with at least 6 characters.',
        confirmLabel: 'Change password'
    });
    if (!password) return;
    const result = await changePassword(password);
    showToast(result.ok ? 'Password changed successfully.' : result.error, result.ok ? 'success' : 'error');
}

async function start() {
    cacheElements();
    showAuth();
    setBusy(true);
    showMessage('Checking your session...', 'info');
    const initialized = await initializeAuth();
    if (!initialized.ok) {
        setBusy(false);
        showMessage(getAuthInitializationError()?.message || initialized.error);
        return;
    }
    setBusy(false);
    showMessage('');
    observeAuthState(user => user ? showApp(user) : showAuth());
}

elements.start = start;
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    elements.authForm.addEventListener('submit', handleSubmit);
    elements.authToggleButton.addEventListener('click', () => setMode(state.mode === 'login' ? 'create' : 'login'));
    elements.authForgotButton.addEventListener('click', handleForgotPassword);
    elements.authChangePasswordButton.addEventListener('click', handleChangePassword);
    elements.authLogoutButton.addEventListener('click', async () => { await logout(); });
    setMode('login');
});

window.GradeQuestAuthGate = { start };