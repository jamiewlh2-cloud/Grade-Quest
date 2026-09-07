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
import { getUserProfile, profileIsComplete, updateUserProfile } from './userProfileService.js';

const state = { mode: 'login', busy: false, initialized: false, signupInProgress: false, user: null, profile: null };
const elements = {};

function cacheElements() {
    [
        'authOverlay', 'authTitle', 'authDescription', 'authMessage', 'authForm',
        'authNameGroup', 'authName', 'authEmail', 'authPassword', 'authPasswordGroup',
        'authUniversityGroup', 'authUniversity', 'authProgramGroup', 'authProgram',
        'authStartYearGroup', 'authStartYear', 'authConfirmGroup', 'authConfirmPassword',
        'authSubmitButton', 'authForgotButton',
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
    const isProfile = mode === 'profile';
    const showProfileFields = isCreate || isProfile;
    elements.authTitle.textContent = isCreate ? 'Create your GradeQuest account' : isProfile ? 'Complete your profile' : 'Sign in to GradeQuest';
    elements.authDescription.textContent = isCreate
        ? 'Set up your account and academic profile in one step.'
        : isProfile
            ? 'Add your academic details to finish setting up your account.'
            : 'Your courses, grades, imports, and training records stay associated with your account.';
    elements.authNameGroup.hidden = !showProfileFields;
    elements.authUniversityGroup.hidden = !showProfileFields;
    elements.authProgramGroup.hidden = !showProfileFields;
    elements.authStartYearGroup.hidden = !showProfileFields;
    elements.authConfirmGroup.hidden = !isCreate;
    elements.authForgotButton.hidden = isCreate;
    elements.authToggleButton.hidden = isProfile;
    elements.authSubmitButton.textContent = isCreate ? 'Create account' : isProfile ? 'Save profile' : 'Sign in';
    elements.authPasswordGroup.hidden = isProfile;
    elements.authPassword.required = !isProfile;
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

function showApp(user, profile) {
    state.user = user;
    state.profile = profile;
    window.GradeQuestProfile = profile;
    applyTheme(profile.preferences?.theme || 'light');
    const profileSchool = Object.values(ALL_SCHOOLS || {}).find(school => String(school.name || '').toLowerCase() === String(profile.university || '').toLowerCase());
    document.getElementById('mainTitle').textContent = `${profile.displayName}'s GradeQuest`;
    document.getElementById('profileSubtitle').textContent = profileSchool
        ? `${profileSchool.name} • ${profileSchool.province}`
        : profile.university;
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
    if (typeof render === 'function') render();
}

async function resolveUser(user) {
    if (state.signupInProgress) return;
    if (!user) {
        showAuth();
        setMode('login');
        return;
    }
    setBusy(true);
    showMessage('Loading your profile...', 'info');
    try {
        const profile = await getUserProfile(user.uid);
        if (!profile || !profileIsComplete(profile)) {
            state.user = user;
            state.profile = profile || null;
            elements.authEmail.value = user.email || '';
            elements.authEmail.disabled = true;
            elements.authName.value = profile?.displayName || '';
            elements.authUniversity.value = profile?.university || '';
            elements.authProgram.value = profile?.program || '';
            elements.authStartYear.value = profile?.startYear || '';
            showAuth();
            setMode('profile');
            showMessage('Complete your profile to continue.', 'info');
            return;
        }
        showApp(user, profile);
    } catch (error) {
        showMessage(error.message || 'Unable to load your profile.', 'error');
    } finally {
        setBusy(false);
    }
}

async function handleSubmit(event) {
    event.preventDefault();
    if (state.busy) return;
    const email = elements.authEmail.value.trim();
    const password = elements.authPassword.value;
    const profile = {
        displayName: elements.authName.value,
        university: elements.authUniversity.value,
        program: elements.authProgram.value,
        startYear: elements.authStartYear.value,
        preferences: { theme: 'light' }
    };
    if ((state.mode === 'create' || state.mode === 'profile') && !profileIsComplete(profile)) {
        showMessage('Enter your name, university, program, and a valid start year.', 'error');
        return;
    }
    if (state.mode === 'profile') {
        setBusy(true);
        const result = await updateUserProfile(state.user.uid, profile).then(value => ({ ok: true, value })).catch(error => ({ ok: false, error: error.message }));
        setBusy(false);
        if (!result.ok) {
            showMessage(result.error, 'error');
            return;
        }
        showApp(state.user, result.value);
        showToast('Profile completed successfully.', 'success');
        return;
    }
    if (state.mode === 'create' && password !== elements.authConfirmPassword.value) {
        showMessage('Passwords do not match.');
        return;
    }
    state.signupInProgress = state.mode === 'create';
    setBusy(true);
    const result = state.mode === 'create' ? await createAccount(email, password, profile) : await login(email, password);
    if (!result.ok) {
        state.signupInProgress = false;
        setBusy(false);
        showMessage(result.error);
        return;
    }
    if (state.mode === 'create') {
        try {
            const createdProfile = await getUserProfile(result.value.uid);
            if (!createdProfile || !profileIsComplete(createdProfile)) {
                throw new Error('Account created, but the user profile could not be verified.');
            }
            showApp(result.value, createdProfile);
            showToast('Account created successfully.', 'success');
        } catch (error) {
            await logout();
            state.signupInProgress = false;
            setBusy(false);
            showAuth();
            setMode('login');
            showMessage(error.message || 'Unable to verify your new profile.', 'error');
            return;
        }
        state.signupInProgress = false;
        setBusy(false);
        return;
    }
    setBusy(false);
    showMessage('Signed in successfully.', 'success');
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
    observeAuthState(resolveUser);
}

elements.start = start;
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    elements.authForm.addEventListener('submit', handleSubmit);
    elements.authToggleButton.addEventListener('click', () => setMode(state.mode === 'login' ? 'create' : 'login'));
    elements.authForgotButton.addEventListener('click', handleForgotPassword);
    elements.authChangePasswordButton.addEventListener('click', handleChangePassword);
    elements.authLogoutButton.addEventListener('click', async () => { await logout(); });
    window.saveUserProfileFromSettings = async () => {
        const profile = {
            displayName: document.getElementById('profileDisplayName')?.value,
            university: document.getElementById('profileUniversity')?.value,
            program: document.getElementById('profileProgram')?.value,
            startYear: document.getElementById('profileStartYear')?.value,
            preferences: {
                theme: document.getElementById('profileTheme')?.value || document.querySelector('input[name="themeOption"]:checked')?.value || state.profile?.preferences?.theme || 'light'
            }
        };
        const result = await updateUserProfile(state.user.uid, profile).then(value => ({ ok: true, value })).catch(error => ({ ok: false, error: error.message }));
        if (!result.ok) {
            showToast(result.error, 'error');
            return;
        }
        state.profile = result.value;
        window.GradeQuestProfile = result.value;
        applyTheme(result.value.preferences?.theme || 'light');
        showToast('Profile saved.', 'success');
        render();
    };
    setMode('login');
});

window.GradeQuestAuthGate = { start };