import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { getFirebaseAuth, getFirebaseFirestore } from './firebaseClient.js';

function profileReference(userId) {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser || currentUser.uid !== userId) {
        throw new Error('Authenticated user does not own this profile.');
    }
    return doc(getFirebaseFirestore(), 'users', userId);
}

function normalizeProfile(input = {}) {
    return {
        displayName: String(input.displayName || '').trim(),
        university: String(input.university || '').trim(),
        program: String(input.program || '').trim(),
        startYear: input.startYear ? Number(input.startYear) : null,
        preferences: {
            theme: input.preferences && input.preferences.theme === 'dark' ? 'dark' : 'light',
            ...input.preferences
        }
    };
}

export async function getUserProfile(userId) {
    const snapshot = await getDoc(profileReference(userId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function createUserProfile(user, profile) {
    const normalized = normalizeProfile(profile);
    await setDoc(profileReference(user.uid), {
        ...normalized,
        email: user.email || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return normalized;
}

export async function updateUserProfile(userId, profile) {
    const normalized = normalizeProfile(profile);
    await setDoc(profileReference(userId), {
        ...normalized,
        updatedAt: serverTimestamp()
    }, { merge: true });
    return normalized;
}

export function profileIsComplete(profile) {
    return Boolean(
        profile &&
        String(profile.displayName || '').trim() &&
        String(profile.university || '').trim() &&
        String(profile.program || '').trim() &&
        Number.isInteger(Number(profile.startYear))
    );
}
