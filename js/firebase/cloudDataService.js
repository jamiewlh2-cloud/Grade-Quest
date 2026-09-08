import { getDoc, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { userDocument } from './firestoreService.js';

export async function getUserDataSnapshot(userId) {
    const snapshot = await getDoc(userDocument(userId));
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    return data.appData && typeof data.appData === 'object' ? data.appData : null;
}

export async function saveUserDataSnapshot(userId, appData) {
    await setDoc(userDocument(userId), {
        appData,
        appDataUpdatedAt: serverTimestamp()
    }, { merge: true });
}
