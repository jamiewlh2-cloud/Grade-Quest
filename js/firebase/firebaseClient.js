import { getApps, getApp, initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

export function getFirebaseApp() {
    if (!firebaseConfig) throw new Error('Firebase is not configured for this deployment.');
    return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth() {
    return getAuth(getFirebaseApp());
}

export function getFirebaseFirestore() {
    return getFirestore(getFirebaseApp());
}