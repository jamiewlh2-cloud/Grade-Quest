// Inject this object from the deployment environment. Firebase web config is
// intentionally not hard-coded here; credentials and backend secrets never belong in source control.
export const firebaseConfig = window.GRADEQUEST_FIREBASE_CONFIG || null;