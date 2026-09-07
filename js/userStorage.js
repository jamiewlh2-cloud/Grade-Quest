(function () {
    const USER_KEYS = [
        'courses',
        'studyFiles',
        'plannerTasks',
        'studyNotes',
        'courseOutlines',
        'studySessions',
        'semesterGoals',
        'weeklyReviewHistory',
        'achievements',
        'flashcards',
        'dashboardConfig',
        'pdfImportLearningTest.assessmentMemory',
        'pdfImportLearningTest.trainingDataset',
        'pdfImportLearningTest.hybridTrainingRecords'
    ];
    const DEVICE_KEYS = new Set(['theme', 'activeDashboardTab', 'lastBackupDate']);
    const LEGACY_PREFIX = 'gradequest.legacy.';
    let activeUid = null;

    function validateUid(uid) {
        if (!uid || typeof uid !== 'string') {
            throw new Error('An authenticated user is required for user data.');
        }
        return uid;
    }

    function scopedKey(baseKey, uid = activeUid) {
        return `${baseKey}_${validateUid(uid)}`;
    }

    function quarantineLegacyKeys() {
        USER_KEYS.forEach(baseKey => {
            const legacyKey = baseKey;
            const quarantineKey = `${LEGACY_PREFIX}${baseKey}`;
            const legacyValue = localStorage.getItem(legacyKey);
            if (legacyValue !== null) {
                if (localStorage.getItem(quarantineKey) === null) {
                    localStorage.setItem(quarantineKey, legacyValue);
                }
                localStorage.removeItem(legacyKey);
            }
        });
    }

    function setActiveUser(uid) {
        activeUid = validateUid(uid);
        quarantineLegacyKeys();
        return activeUid;
    }

    function clearActiveUser() {
        activeUid = null;
    }

    function getActiveUser() {
        return activeUid;
    }

    function get(baseKey, fallback, uid = activeUid) {
        const value = localStorage.getItem(scopedKey(baseKey, uid));
        return value === null ? fallback : value;
    }

    function getJson(baseKey, fallback, uid = activeUid) {
        try {
            return JSON.parse(get(baseKey, null, uid)) ?? fallback;
        } catch (error) {
            return fallback;
        }
    }

    function set(baseKey, value, uid = activeUid) {
        localStorage.setItem(scopedKey(baseKey, uid), value);
    }

    function setJson(baseKey, value, uid = activeUid) {
        set(baseKey, JSON.stringify(value), uid);
    }

    function remove(baseKey, uid = activeUid) {
        localStorage.removeItem(scopedKey(baseKey, uid));
    }

    function clearUser(uid = activeUid) {
        const validUid = validateUid(uid);
        USER_KEYS.forEach(baseKey => localStorage.removeItem(scopedKey(baseKey, validUid)));
    }

    window.GradeQuestStorage = {
        USER_KEYS,
        DEVICE_KEYS,
        quarantineLegacyKeys,
        setActiveUser,
        clearActiveUser,
        getActiveUser,
        get,
        getJson,
        set,
        setJson,
        remove,
        clearUser
    };
}());