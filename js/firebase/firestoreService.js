import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    setDoc
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { getFirebaseAuth, getFirebaseFirestore } from './firebaseClient.js';

const USER_COLLECTIONS = ['courses', 'grades', 'imports', 'trainingRecords'];

function requireCurrentUser(userId) {
    const user = getFirebaseAuth().currentUser;
    if (!user || user.uid !== userId) throw new Error('Authenticated user does not own this data.');
}

function userCollection(userId, collectionName) {
    requireCurrentUser(userId);
    if (!USER_COLLECTIONS.includes(collectionName)) throw new Error('Unsupported user collection.');
    return collection(getFirebaseFirestore(), 'users', userId, collectionName);
}

export function userDocument(userId) {
    requireCurrentUser(userId);
    return doc(getFirebaseFirestore(), 'users', userId);
}

export async function saveUserRecord(userId, collectionName, recordId, data) {
    await setDoc(doc(userCollection(userId, collectionName), recordId), data, { merge: true });
}

export async function listUserRecords(userId, collectionName) {
    const snapshot = await getDocs(userCollection(userId, collectionName));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function deleteUserRecord(userId, collectionName, recordId) {
    await deleteDoc(doc(userCollection(userId, collectionName), recordId));
}