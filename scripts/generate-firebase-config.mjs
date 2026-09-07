import { writeFile } from 'node:fs/promises';

const requiredVariables = [
    'FIREBASE_API_KEY', 'FIREBASE_AUTH_DOMAIN', 'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET', 'FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_APP_ID'
];
const missingVariables = requiredVariables.filter(name => !process.env[name]);
if (missingVariables.length) throw new Error(`Missing Firebase deployment variables: ${missingVariables.join(', ')}`);

const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

await writeFile(new URL('../firebase-config.js', import.meta.url), `window.GRADEQUEST_FIREBASE_CONFIG = ${JSON.stringify(config, null, 4)};\n`, 'utf8');