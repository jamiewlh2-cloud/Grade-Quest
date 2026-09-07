import {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signOut,
    updatePassword
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirebaseAuth } from './firebaseClient.js';
import { createUserProfile } from './userProfileService.js';

let authInitializationError = null;

function toAuthError(error) {
    const messages = {
        'auth/invalid-credential': 'The email or password is incorrect.',
        'auth/email-already-in-use': 'An account already exists for this email.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/weak-password': 'Use a stronger password with at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
        'auth/user-not-found': 'No account was found for this email.',
        'auth/network-request-failed': 'Check your connection and try again.'
    };
    return messages[error && error.code] || 'We could not complete that request. Try again.';
}

async function withAuthErrors(operation) {
    try {
        return { ok: true, value: await operation() };
    } catch (error) {
        return { ok: false, error: toAuthError(error), code: error && error.code };
    }
}

export async function initializeAuth() {
    try {
        const firebaseAuth = getFirebaseAuth();
        await setPersistence(firebaseAuth, browserLocalPersistence);
        return { ok: true, auth: firebaseAuth };
    } catch (error) {
        authInitializationError = error;
        return { ok: false, error: error.message };
    }
}

export function getAuthInitializationError() {
    return authInitializationError;
}

export function observeAuthState(callback) {
    return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function createAccount(email, password, profile) {
    return withAuthErrors(async () => {
        const result = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
        await createUserProfile(result.user, profile);
        await sendEmailVerification(result.user);
        return result.user;
    });
}

export function login(email, password) {
    return withAuthErrors(() => signInWithEmailAndPassword(getFirebaseAuth(), email, password));
}

export function logout() {
    return withAuthErrors(() => signOut(getFirebaseAuth()));
}

export function sendPasswordReset(email) {
    return withAuthErrors(() => sendPasswordResetEmail(getFirebaseAuth(), email));
}

export function changePassword(password) {
    return withAuthErrors(() => updatePassword(getFirebaseAuth().currentUser, password));
}