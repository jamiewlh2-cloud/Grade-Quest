let courses = {};
let studyFiles = [];
let plannerTasks = [];
let notes = '';
let courseOutlines = {};
let slotSelection = null;

let studySessions = [];
let semesterGoals = [];
let weeklyReviewHistory = [];
let achievements = [];
let currentTheme = localStorage.getItem('theme') || 'light';

function hydrateUserData(uid) {
    GradeQuestStorage.setActiveUser(uid);
    courses = GradeQuestStorage.getJson('courses', {});
    studyFiles = GradeQuestStorage.getJson('studyFiles', []);
    plannerTasks = GradeQuestStorage.getJson('plannerTasks', []);
    notes = GradeQuestStorage.get('studyNotes', '') || '';
    courseOutlines = GradeQuestStorage.getJson('courseOutlines', {});
    studySessions = GradeQuestStorage.getJson('studySessions', []);
    semesterGoals = GradeQuestStorage.getJson('semesterGoals', []);
    weeklyReviewHistory = GradeQuestStorage.getJson('weeklyReviewHistory', []);
    achievements = GradeQuestStorage.getJson('achievements', []);
    if (typeof hydrateProductivityData === 'function') hydrateProductivityData(uid);
}

function clearUserDataState() {
    courses = {};
    studyFiles = [];
    plannerTasks = [];
    notes = '';
    courseOutlines = {};
    studySessions = [];
    semesterGoals = [];
    weeklyReviewHistory = [];
    achievements = [];
    if (typeof clearProductivityDataState === 'function') clearProductivityDataState();
    if (typeof render === 'function') render();
}

window.hydrateGradeQuestData = hydrateUserData;
window.clearGradeQuestDataState = clearUserDataState;

const letterToPercent = {
    'A+': 95, 'A': 87, 'A-': 82, 'B+': 78, 'B': 75, 'B-': 72,
    'C+': 68, 'C': 65, 'C-': 62, 'D+': 58, 'D': 55, 'D-': 52, 'F': 35
};

function getCurrentProfile() {
    return window.GradeQuestProfile || {};
}

function getProfileSchoolKey() {
    const university = String(getCurrentProfile().university || '').toLowerCase();
    return Object.keys(ALL_SCHOOLS).find(key => {
        const school = ALL_SCHOOLS[key];
        return key.toLowerCase() === university || String(school.name || '').toLowerCase() === university;
    }) || 'mcmaster';
}

function applyUserConfig(name, schoolKey) {
    const school = ALL_SCHOOLS[schoolKey] || ALL_SCHOOLS.mcmaster;
    document.documentElement.style.setProperty('--primary', school.primary);
    document.documentElement.style.setProperty('--accent', school.accent);

    const titleEl = document.getElementById('mainTitle');
    const subtitleEl = document.getElementById('profileSubtitle');
    if (titleEl) {
        titleEl.textContent = `${name}'s GradeQuest`;
    }
    if (subtitleEl) {
        subtitleEl.textContent = `${school.name} • ${school.province}`;
    }

    applyTheme(currentTheme);
    render();
}

function saveAchievements() {
    if (!GradeQuestStorage.getActiveUser()) return;
    GradeQuestStorage.setJson('achievements', achievements);
}

function applyTheme(theme) {
    currentTheme = theme || 'light';
    localStorage.setItem('theme', currentTheme);
    document.body.classList.toggle('dark-mode', currentTheme === 'dark');
}

function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    render();
}

function save() {
    if (!GradeQuestStorage.getActiveUser()) return;
    GradeQuestStorage.setJson('courses', courses);
    render();
}

function saveStudyData() {
    if (!GradeQuestStorage.getActiveUser()) return;
    GradeQuestStorage.setJson('studyFiles', studyFiles);
    GradeQuestStorage.setJson('plannerTasks', plannerTasks);
    GradeQuestStorage.set('studyNotes', notes);
    GradeQuestStorage.setJson('courseOutlines', courseOutlines);
}

function saveStudySessions() {
    if (!GradeQuestStorage.getActiveUser()) return;
    GradeQuestStorage.setJson('studySessions', studySessions);
}

function stopGradeQuestStudyTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
}

window.stopGradeQuestStudyTimer = stopGradeQuestStudyTimer;

function normalizeText(value) {
    return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parseOutlineText(text, courseCode) {
    if (!text) return [];

    const lines = text.split(/\n/).map(line => line.trim()).filter(Boolean);
    const parsed = [];

    lines.forEach(line => {
        const match = line.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
        if (!match) return;

        const weight = parseFloat(match[1]);
        let name = line.replace(match[0], '').trim();
        name = name.replace(/^[-•*\d.\s]+/, '').trim();
        name = name.replace(/[:\-–—]\s*$/, '').trim();
        name = name.replace(/\s+/g, ' ');

        if (name && weight > 0) {
            parsed.push({ name, weight, courseCode: (courseCode || 'General').toUpperCase() });
        }
    });

    return parsed.filter((item, index, array) => array.findIndex(other => normalizeText(other.name) === normalizeText(item.name)) === index);
}

function saveOutlineForCourse(courseCode, items) {
    if (!courseCode || !items.length) return;
    courseOutlines[courseCode.toUpperCase()] = items;
    saveStudyData();
}

function ensureCourseEntry(courseCode) {
    const normalizedCode = (courseCode || 'GENERAL').toUpperCase();
    if (!courses[normalizedCode]) {
        courses[normalizedCode] = { grades: [], target: 80, units: 3 };
        if (GradeQuestStorage.getActiveUser()) GradeQuestStorage.setJson('courses', courses);
    }
}

function getCourseOutline(courseCode) {
    return courseOutlines[(courseCode || '').toUpperCase()] || [];
}

function findLinkedAssessment(courseCode, title) {
    const outline = getCourseOutline(courseCode);
    const normalizedTitle = normalizeText(title);

    return outline.find(item => {
        const normalizedName = normalizeText(item.name);
        return normalizedName === normalizedTitle || normalizedName.includes(normalizedTitle) || normalizedTitle.includes(normalizedName);
    }) || null;
}

function setActiveTab(tab) {
    localStorage.setItem('activeDashboardTab', tab);

    document.querySelectorAll('.tab-btn').forEach(btn => {
        const label = (btn.dataset.tab || btn.textContent.trim().toLowerCase()).toLowerCase();
        btn.classList.toggle('active', label === tab || (tab === 'home' && label === 'home'));
    });

    document.querySelectorAll('.dashboard-panel').forEach(panel => {
        panel.classList.remove('active-panel');
    });

    const targetPanel = document.getElementById(`${tab}Panel`);
    if (targetPanel) {
        targetPanel.classList.add('active-panel');
        window.requestAnimationFrame(() => {
            targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    const mobileTabSelect = document.getElementById('mobileTabSelect');
    if (mobileTabSelect && mobileTabSelect.value !== tab) {
        mobileTabSelect.value = tab;
    }
}

function renderHomeHub() {
    const hub = document.getElementById('hubWidgets');
    if (!hub) return;

    const courseNames = Object.keys(courses);
    const totalCourses = courseNames.length;
    const pendingTasks = plannerTasks.filter(task => !task.done);
    const nextTask = [...pendingTasks].sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))[0];
    const latestResource = studyFiles[0];

    let gradeSum = 0;
    let gradeCount = 0;

    courseNames.forEach(name => {
        const course = courses[name];
        let weight = 0;
        let weighted = 0;
        course.grades.forEach(grade => {
            weighted += grade.score * (grade.weight / 100);
            weight += grade.weight;
        });
        if (weight > 0) {
            gradeSum += weighted / (weight / 100);
            gradeCount += 1;
        }
    });

    const average = gradeCount > 0 ? (gradeSum / gradeCount).toFixed(1) : '0.0';
    const previewNote = notes ? notes.split(/\n+/).find(Boolean)?.slice(0, 92) || 'No notes yet' : 'No notes yet';

    const focusPlan = computeFocusPlan();
    const topFocus = (focusPlan && focusPlan.length) ? focusPlan[0] : null;
    const topTitle = topFocus ? topFocus.task.title : 'No immediate focus';
    const topCourse = topFocus ? topFocus.task.course : '';
    const topDue = topFocus ? (topFocus.daysUntil <= 0 ? 'Due today' : `Due in ${topFocus.daysUntil} days`) : '';

    const health = computeAcademicHealth();
    const healthGpa = health.overallGpa !== null ? health.overallGpa.toFixed(2) : 'N/A';
    const healthAtRisk = health.coursesAtRisk;
    const healthDueWeek = health.dueThisWeek;
    const healthOverdue = health.overdueTasks;
    const healthStreak = getCurrentStreak();

    const overallGoalsProgress = computeOverallGoalsProgress();
    const notifications = computeNotifications();
    const topNotifications = notifications.slice(0, 3);
    const closestGoal = (semesterGoals || []).slice().sort((a,b)=> computeGoalProgress(b).percent - computeGoalProgress(a).percent)[0] || null;
    const closestLabel = closestGoal ? `${closestGoal.title || closestGoal.type} ${computeGoalProgress(closestGoal).percent}%` : '—';
    const currentWeekStats = getWeekStats(getWeekStart(new Date()));
    const weeklyPreview = currentWeekStats.mostStudiedCourse ? `${currentWeekStats.mostStudiedCourse} • ${currentWeekStats.studyHours} hrs` : 'No study yet';

    hub.innerHTML = `
        <button class="widget-card widget-planner widget-span-4" onclick="setActiveTab('planner')">
            <div class="widget-top">
                <span class="widget-icon">🗓️</span>
                <span class="widget-badge">Planner</span>
            </div>
            <div class="widget-preview">
                <span class="mini-date">${nextTask ? (nextTask.deadline || 'No date') : 'No deadlines yet'}</span>
                <span class="mini-task">${nextTask ? nextTask.title : 'Add your first task'}</span>
            </div>
            <div class="widget-footer">
                <span>${pendingTasks.length} pending</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>

        <button class="widget-card widget-grader widget-span-2" onclick="setActiveTab('grades')">
            <div class="widget-top">
                <span class="widget-icon">📈</span>
                <span class="widget-badge">Grader</span>
            </div>
            <div class="widget-preview">
                <div class="widget-grade">
                    <div class="widget-ring"><span>${average}%</span></div>
                    <div>
                        <strong>${totalCourses} courses</strong>
                        <div class="notes-line">Current standing across your tracked classes.</div>
                    </div>
                </div>
            </div>
            <div class="widget-footer">
                <span>${gradeCount ? 'Live average' : 'Add grades'}</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>

        ${renderAdvisorWidgetHtml()}

        ${renderAssignmentsWidgetHtml()}

        <button class="widget-card widget-files widget-span-1" onclick="setActiveTab('files')">
            <div class="widget-top">
                <span class="widget-icon">🗂️</span>
                <span class="widget-badge">Resources</span>
            </div>
            <div class="widget-preview">
                <div class="widget-list">
                    <span class="mini-chip">${studyFiles.length} saved resources</span>
                    <span class="mini-chip">${latestResource ? latestResource.title : 'Add a file or outline'}</span>
                </div>
            </div>
            <div class="widget-footer">
                <span>${courseOutlines ? Object.keys(courseOutlines).length : 0} outlines</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>

        <button class="widget-card widget-notes widget-span-1" onclick="setActiveTab('notes')">
            <div class="widget-top">
                <span class="widget-icon">✍️</span>
                <span class="widget-badge">Notes</span>
            </div>
            <div class="widget-preview">
                <div class="notes-line">${previewNote}</div>
            </div>
            <div class="widget-footer">
                <span>${notes ? 'Saved note' : 'Empty note pad'}</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>

        <button class="widget-card widget-study widget-span-1" onclick="setActiveTab('study')">
            <div class="widget-top">
                <span class="widget-icon">⏱️</span>
                <span class="widget-badge">Study</span>
            </div>
            <div class="widget-preview">
                <div class="mini-chip">${getMinutesThisWeek()} min this week</div>
                <div class="notes-line">Streak: ${getCurrentStreak()} days</div>
            </div>
            <div class="widget-footer">
                <span>${mostStudiedCourseThisWeek() || 'No data'}</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>

        <button class="widget-card widget-goals widget-span-2" onclick="setActiveTab('goals')">
            <div class="widget-top">
                <span class="widget-icon">🎯</span>
                <span class="widget-badge">Goals</span>
            </div>
            <div class="widget-preview">
                <div class="mini-chip">${semesterGoals.length} active</div>
                <div class="notes-line">${overallGoalsProgress || 0}% overall</div>
            </div>
            <div class="widget-footer">
                <span>Closest: ${closestLabel}</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>

        <button class="widget-card widget-notification widget-span-1" onclick="setActiveTab('settings')">
            <div class="widget-top">
                <span class="widget-icon">🔔</span>
                <span class="widget-badge">Notifications</span>
            </div>
            <div class="widget-preview">
                ${topNotifications.map(note => `<span class="mini-chip">${note.text}</span>`).join('')}
            </div>
            <div class="widget-footer">
                <span>${notifications.length} active</span>
                <span class="widget-pill">View</span>
            </div>
        </button>

        <button class="widget-card widget-academic widget-span-2" onclick="setActiveTab('weekly')">
            <div class="widget-top">
                <span class="widget-icon">📅</span>
                <span class="widget-badge">Weekly Review</span>
            </div>
            <div class="widget-preview">
                <div class="mini-chip">${currentWeekStats.studyHours} hrs this week</div>
                <div class="notes-line">${weeklyPreview}</div>
            </div>
            <div class="widget-footer">
                <span>${currentWeekStats.coursesStudied} courses</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>

        ${renderTimelineWidgetHtml()}

        ${renderFlashcardsWidgetHtml()}

        <button class="widget-card widget-snapshot widget-span-2" onclick="setActiveTab('study')">
            <div class="widget-top">
                <span class="widget-icon">🧭</span>
                <span class="widget-badge">Snapshot</span>
            </div>
            <div class="widget-preview">
                <div class="mini-chip">${average}% avg • ${currentWeekStats.studyHours} hrs</div>
                <div class="notes-line">${overallGoalsProgress || 0}% goals • ${healthStreak} day streak</div>
            </div>
            <div class="widget-footer">
                <span>${topNotifications.length} key alerts</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>

        <button class="widget-card widget-academic widget-span-2" onclick="setActiveTab('health')">
            <div class="widget-top">
                <span class="widget-icon">🩺</span>
                <span class="widget-badge">Academic Health</span>
            </div>
            <div class="widget-preview">
                <div class="mini-chip">GPA: ${healthGpa}</div>
                <div class="notes-line">At Risk: ${healthAtRisk} • Due this week: ${healthDueWeek}</div>
            </div>
            <div class="widget-footer">
                <span>Overdue: ${healthOverdue}</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>

        <button class="widget-card widget-focus widget-span-2" onclick="setActiveTab('focus')">
            <div class="widget-top">
                <span class="widget-icon">🎯</span>
                <span class="widget-badge">Focus Today</span>
            </div>
            <div class="widget-preview">
                <div class="mini-task">${topTitle}</div>
                <div class="notes-line">${topCourse} ${topDue ? ' • ' + topDue : ''}</div>
            </div>
            <div class="widget-footer">
                <span>${focusPlan.length} priorities</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>
    `;
}

function getTodayDateStr() {
    const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().split('T')[0];
}

function formatLocalDateStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0,0,0,0);
    return monday;
}

function minutesFromSeconds(s) { return Math.round(s/60); }

function getTodaySessions() {
    const today = getTodayDateStr();
    return (studySessions || []).filter(s => s.date === today);
}

function getMinutesThisWeek() {
    const monday = getWeekStart(new Date());
    const end = new Date(monday); end.setDate(end.getDate() + 6);
    let mins = 0;
    studySessions.forEach(s => {
        const sd = new Date(s.date);
        if (sd >= monday && sd <= end) mins += (s.durationMinutes || 0);
    });
    return mins;
}

function mostStudiedCourseThisWeek() {
    const monday = getWeekStart(new Date());
    const end = new Date(monday); end.setDate(end.getDate() + 6);
    const totals = {};
    studySessions.forEach(s => {
        const sd = new Date(s.date);
        if (sd >= monday && sd <= end) {
            const c = (s.course || 'General').toUpperCase();
            totals[c] = (totals[c] || 0) + (s.durationMinutes || 0);
        }
    });
    const keys = Object.keys(totals);
    if (!keys.length) return null;
    return keys.sort((a,b)=>totals[b]-totals[a])[0];
}

function getCurrentStreak() {
    // count consecutive days back from today with at least one session
    let count = 0;
    let day = new Date(); day.setHours(0,0,0,0);
    while (true) {
        const dayStr = day.toISOString().split('T')[0];
        const has = studySessions.some(s => s.date === dayStr);
        if (has) { count++; day.setDate(day.getDate() - 1); } else break;
    }
    return count;
}


// -------------------- Focus plan helpers & rendering --------------------

function daysBetweenFromToday(dateStr) {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr);
    d.setHours(0,0,0,0);
    const diff = Math.ceil((d - today) / (1000*60*60*24));
    return diff;
}

function daysSinceLastStudy(courseCode) {
    const code = (courseCode || 'General').toUpperCase();
    const sessions = (studySessions || []).filter(s => ((s.course || 'General').toUpperCase()) === code);
    if (!sessions.length) return null;
    const latest = sessions.map(s => new Date(s.date)).sort((a,b)=>b-a)[0];
    const today = new Date(); today.setHours(0,0,0,0);
    latest.setHours(0,0,0,0);
    return Math.round((today - latest) / (1000*60*60*24));
}

function computeCourseAverage(course) {
    if (!course) return 0;
    let totalWeighted = 0, totalWeight = 0;
    (course.grades || []).forEach(g => { totalWeighted += g.score * (g.weight/100); totalWeight += g.weight; });
    const avg = totalWeight > 0 ? (totalWeighted / (totalWeight/100)) : 0;
    return avg;
}

function computeFocusPlan() {
    const today = new Date();
    const pending = (plannerTasks || []).filter(t => !t.done);
    const plan = pending.map(task => {
        const daysUntil = task.deadline ? daysBetweenFromToday(task.deadline) : null;
        const dueScore = daysUntil === null ? 0.2 : (daysUntil <= 0 ? 8 : (1 / (daysUntil + 1)) * 8);
        const priorityScore = (task.priority === 'High') ? 1.6 : (task.priority === 'Medium' ? 1.15 : 0.8);
        const linkedWeight = (task.linkedAssessment && task.linkedAssessment.weight) ? (task.linkedAssessment.weight / 100) : 0.05;

        const courseCode = (task.course || 'General').toUpperCase();
        const courseObj = courses[courseCode] || { grades: [], target: 80 };
        const avg = computeCourseAverage(courseObj);
        const target = courseObj.target || 80;
        const diff = target - avg; // positive when below target
        const courseRisk = diff > 5 ? 1.5 : (diff > 0 ? 1.2 : 0.8);

        const daysSince = daysSinceLastStudy(courseCode);
        let recency = 1.0;
        if (daysSince === null) recency = 1.25;
        else if (daysSince > 14) recency = 1.5;
        else if (daysSince > 7) recency = 1.25;

        // base score composition
        let score = dueScore * priorityScore * (1 + linkedWeight) * courseRisk * recency;

        // penalize very distant deadlines
        if (daysUntil !== null && daysUntil > 60) score *= 0.4;

        // build reason snippets
        const reasons = [];
        if (task.linkedAssessment && task.linkedAssessment.weight) reasons.push(`Worth ${task.linkedAssessment.weight}%`);
        if (diff > 0) reasons.push(`Course avg ${avg.toFixed(1)}% below target ${target}%`);
        if (task.priority === 'High') reasons.push('Marked High priority');
        if (daysUntil !== null) reasons.push(daysUntil <= 0 ? 'Due today' : `Due in ${daysUntil} day${daysUntil>1?'s':''}`);
        if (daysSince !== null && daysSince > 7) reasons.push(`Not studied in ${daysSince} days`);

        return { task, score, daysUntil: daysUntil === null ? 9999 : daysUntil, reasons };
    });

    return plan.sort((a,b)=>b.score - a.score);
}

function computeAppStats() {
    return {
        courses: Object.keys(courses).length,
        assignments: plannerTasks.length,
        studySessions: studySessions.length,
        files: studyFiles.length,
        goals: semesterGoals.length,
        studyHours: Math.round(getSemesterTotalHours())
    };
}

function unlockAchievement(id, label) {
    if (!achievements.some(a => a.id === id)) {
        achievements.push({ id, label, unlockedAt: new Date().toISOString() });
        saveAchievements();
    }
}

function evaluateAchievements() {
    if (Object.keys(courses).length >= 1) unlockAchievement('first_course_added', 'First Course Added');
    if (Object.keys(courses).length >= 5) unlockAchievement('five_courses_added', 'Five Courses Added');
    if (studySessions.length >= 1) unlockAchievement('first_study_session', 'First Study Session');
    if (studySessions.length >= 10) unlockAchievement('ten_study_sessions', 'Ten Study Sessions');
    if (studySessions.length >= 25) unlockAchievement('twenty_five_study_sessions', 'Twenty Five Study Sessions');
    if (getCurrentStreak() >= 7) unlockAchievement('seven_day_streak', 'Seven Day Streak');
    if (getCurrentStreak() >= 30) unlockAchievement('thirty_day_streak', 'Thirty Day Streak');
    if ((plannerTasks || []).length > 0 && (plannerTasks || []).filter(task => !task.done && task.deadline && daysBetweenFromToday(task.deadline) < 0).length === 0) {
        unlockAchievement('no_overdue_tasks', 'No Overdue Tasks');
    }
    if ((semesterGoals || []).some(g => computeGoalProgress(g).percent >= 100)) unlockAchievement('goal_reached', 'Goal Reached');
}

function computeNotifications() {
    const notifications = [];
    const overdueTasks = (plannerTasks || []).filter(task => !task.done && task.deadline && daysBetweenFromToday(task.deadline) < 0);
    overdueTasks.forEach(task => {
        notifications.push({ type: 'warning', text: `⚠ ${task.title} is overdue`, date: task.deadline });
    });

    const dueTomorrow = (plannerTasks || []).filter(task => !task.done && task.deadline && daysBetweenFromToday(task.deadline) === 1);
    dueTomorrow.forEach(task => {
        notifications.push({ type: 'alert', text: `⚠ ${task.title} is due tomorrow`, date: task.deadline });
    });

    Object.keys(courses).forEach(name => {
        const course = courses[name];
        const avg = computeCourseAverage(course);
        const target = course.target || 0;
        if (target > 0 && avg < target) {
            notifications.push({ type: 'risk', text: `⚠ ${name} is ${Math.round(target - avg)}% below target`, date: null });
        }
    });

    Object.keys(courses).forEach(name => {
        const days = daysSinceLastStudy(name);
        if (days === null || days >= 7) {
            notifications.push({ type: 'info', text: `⚠ ${name} has not been studied in ${days === null ? 'many' : days} days`, date: null });
        }
    });

    (semesterGoals || []).forEach(g => {
        const progress = computeGoalProgress(g);
        if (progress.percent >= 100) {
            notifications.push({ type: 'celebration', text: `🎯 Goal reached: ${g.title || g.type}`, date: null });
        }
    });

    achievements.forEach(a => {
        notifications.push({ type: 'achievement', text: `🏆 ${a.label}`, date: a.unlockedAt });
    });

    if (!notifications.length) {
        notifications.push({ type: 'empty', text: 'No notifications right now. Keep going!', date: null });
    }

    return notifications.sort((a, b) => {
        if (a.type === 'empty') return 1;
        if (b.type === 'empty') return -1;
        if (a.date && b.date) return new Date(b.date) - new Date(a.date);
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
    }).slice(0, 5);
}

function formatBackupDate(dateStr) {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function getLastBackupDate() {
    return localStorage.getItem('lastBackupDate');
}

function saveLastBackupDate() {
    const now = new Date().toISOString();
    localStorage.setItem('lastBackupDate', now);
}

function getBackupStatus() {
    const lastDate = getLastBackupDate();
    if (!lastDate) return { message: 'No backup exists.', status: 'warning' };
    const diffDays = Math.round((new Date() - new Date(lastDate)) / (1000*60*60*24));
    if (diffDays > 14) return { message: `Last backup older than 14 days: ${formatBackupDate(lastDate)}`, status: 'warning' };
    return { message: `Last Backup: ${formatBackupDate(lastDate)}`, status: 'healthy' };
}

function exportBackup() {
    const backup = {
        courses,
        plannerTasks,
        studyFiles,
        studySessions,
        semesterGoals,
        notes,
        courseOutlines,
        weeklyReviewHistory,
        achievements,
        flashcards,
        dashboardConfig
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `gradequest_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    saveLastBackupDate();
    render();
}

function importBackupFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            if (!GradeQuestStorage.getActiveUser()) return;
            const data = JSON.parse(e.target.result);
            if (typeof data !== 'object' || !data) throw new Error('Invalid backup file.');
            if (data.courses !== undefined) GradeQuestStorage.setJson('courses', data.courses);
            if (data.plannerTasks !== undefined) GradeQuestStorage.setJson('plannerTasks', data.plannerTasks);
            if (data.studyFiles !== undefined) GradeQuestStorage.setJson('studyFiles', data.studyFiles);
            if (data.studySessions !== undefined) GradeQuestStorage.setJson('studySessions', data.studySessions);
            if (data.semesterGoals !== undefined) GradeQuestStorage.setJson('semesterGoals', data.semesterGoals);
            if (data.courseOutlines !== undefined) GradeQuestStorage.setJson('courseOutlines', data.courseOutlines);
            if (data.weeklyReviewHistory !== undefined) GradeQuestStorage.setJson('weeklyReviewHistory', data.weeklyReviewHistory);
            if (data.achievements !== undefined) GradeQuestStorage.setJson('achievements', data.achievements);
            if (data.notes !== undefined) GradeQuestStorage.set('studyNotes', data.notes);
            if (data.flashcards !== undefined) GradeQuestStorage.setJson('flashcards', data.flashcards);
            if (data.dashboardConfig !== undefined) GradeQuestStorage.setJson('dashboardConfig', data.dashboardConfig);
            showToast('Backup restored successfully.', 'success');
            location.reload();
        } catch (error) {
            showToast('Invalid backup data. Please select a valid GradeQuest JSON file.', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

async function resetAllData() {
    const confirmed = await showConfirmDialog({
        title: 'Reset all data?',
        message: 'This permanently deletes all local GradeQuest data and cannot be undone.',
        confirmLabel: 'Reset data',
        danger: true
    });
    if (!confirmed) return;
    const activeUid = GradeQuestStorage.getActiveUser();
    if (activeUid) GradeQuestStorage.clearUser(activeUid);
    location.reload();
}

function renderSettingsDashboard() {
    const panel = document.getElementById('settingsContainer');
    if (!panel) return;
    const profile = window.GradeQuestProfile || {};
    const stats = computeAppStats();
    const notifications = computeNotifications();
    const backupStatus = getBackupStatus();
    const achievementsDisplay = achievements.map(a => `<div class="achievement">${a.label} • ${formatBackupDate(a.unlockedAt)}</div>`).join('') || '<p class="notes-line">No achievements earned yet.</p>';

    panel.innerHTML = `
        <div class="settings-layout">
            <div class="settings-column settings-left">
                <div class="settings-card">
                    <h4>Profile</h4>
                        <div class="settings-card">
                            <h4>Profile</h4>
                            <p class="notes-line">Manage your academic identity and preferences on the Profile page.</p>
                            <button class="panel-btn" onclick="setActiveTab('profile')">Open Profile</button>
                        </div>
                    <h4>Appearance</h4>
                    <div class="panel-form">
                        <div class="radio-group">
                            <label><input type="radio" name="themeOption" value="light" ${currentTheme==='light'?'checked':''}> Light Mode</label>
                            <label><input type="radio" name="themeOption" value="dark" ${currentTheme==='dark'?'checked':''}> Dark Mode</label>
                        </div>
                        <button class="panel-btn" onclick="applySelectedTheme()">Apply Theme</button>
                    </div>
                </div>

                <div id="dashboardCustomizationContainer" class="settings-card"></div>
            </div>

            <div class="settings-column settings-right">
                <div class="settings-card">
                    <h4>Notifications</h4>
                    <div class="notification-list">${notifications.map(note => `<div class="achievement">${note.text}</div>`).join('')}</div>
                </div>

                <div class="settings-card">
                    <h4>Application Statistics</h4>
                    <div class="stats-grid">
                        <div class="stat"><label>Courses</label><div class="val">${stats.courses}</div></div>
                        <div class="stat"><label>Assignments</label><div class="val">${stats.assignments}</div></div>
                        <div class="stat"><label>Study Sessions</label><div class="val">${stats.studySessions}</div></div>
                        <div class="stat"><label>Files</label><div class="val">${stats.files}</div></div>
                        <div class="stat"><label>Goals</label><div class="val">${stats.goals}</div></div>
                        <div class="stat"><label>Study Hours</label><div class="val">${stats.studyHours}h</div></div>
                    </div>
                </div>

                <div class="settings-card">
                    <h4>GradeQuest Health</h4>
                    <div class="notes-line">${backupStatus.message}</div>
                    <div class="settings-health-grid">
                        <div><strong>${stats.courses}</strong><p>Courses</p></div>
                        <div><strong>${stats.assignments}</strong><p>Assignments</p></div>
                        <div><strong>${stats.files}</strong><p>Files</p></div>
                        <div><strong>${stats.goals}</strong><p>Goals</p></div>
                        <div><strong>${stats.studySessions}</strong><p>Study Sessions</p></div>
                        <div><strong>${stats.studyHours}h</strong><p>Study Hours</p></div>
                    </div>
                </div>

                <div class="settings-card">
                    <h4>Achievements</h4>
                    <div class="achievement-list">${achievementsDisplay}</div>
                </div>

                <div class="settings-card">
                    <h4>Data Management</h4>
                    <div class="settings-actions">
                        <button class="panel-btn" onclick="exportBackup()">Export Backup</button>
                        <button class="secondary-btn" onclick="document.getElementById('backupImportInput').click()">Import Backup</button>
                        <button class="secondary-btn" onclick="resetAllData()">Reset All Data</button>
                    </div>
                    <p class="notes-line">${backupStatus.message}</p>
                    <input id="backupImportInput" type="file" accept=".json" class="hidden" onchange="importBackupFile(event)">
                </div>
            </div>
        </div>
    `;

    renderDashboardCustomization();
}

function renderProfileDashboard() {
    const panel = document.getElementById('profileContainer');
    if (!panel) return;
    const profile = getCurrentProfile();
    panel.innerHTML = `
        <div class="panel-card profile-page-card">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Profile</p>
                    <h3>Your academic identity</h3>
                    <p class="helper-text">This information is securely stored with your account.</p>
                </div>
            </div>
            <div class="panel-form profile-form">
                <label for="profileDisplayName">Name</label>
                <input id="profileDisplayName" placeholder="Your name" value="${escapeAttr(profile.displayName || '')}">
                <label for="profileUniversity">University</label>
                <input id="profileUniversity" placeholder="University" value="${escapeAttr(profile.university || '')}">
                <label for="profileProgram">Program</label>
                <input id="profileProgram" placeholder="Program" value="${escapeAttr(profile.program || '')}">
                <label for="profileStartYear">Start year</label>
                <input id="profileStartYear" type="number" min="1900" max="2100" placeholder="2026" value="${profile.startYear || ''}">
                <label for="profileTheme">Theme preference</label>
                <select id="profileTheme">
                    <option value="light" ${(profile.preferences?.theme || 'light') === 'light' ? 'selected' : ''}>Light mode</option>
                    <option value="dark" ${profile.preferences?.theme === 'dark' ? 'selected' : ''}>Dark mode</option>
                </select>
                <button class="panel-btn" onclick="saveUserProfileFromSettings()">Save Profile</button>
            </div>
        </div>
    `;
}

function applySelectedTheme() {
    const selectedTheme = document.querySelector(
        'input[name="themeOption"]:checked'
    );

    if (!selectedTheme) return;

    applyTheme(selectedTheme.value);
}

function saveSettings() {
    if (typeof saveUserProfileFromSettings === 'function') saveUserProfileFromSettings();
}

function saveSemesterGoals() {
    if (!GradeQuestStorage.getActiveUser()) return;
    GradeQuestStorage.setJson('semesterGoals', semesterGoals);
}

function addGoal(goal) {
    goal.id = Date.now();
    goal.created = new Date().toISOString();
    semesterGoals.push(goal);
    saveSemesterGoals();
    render();
}

function deleteGoal(id) {
    semesterGoals = semesterGoals.filter(g => g.id !== id);
    saveSemesterGoals();
    render();
}

function updateGoal(id, updates) {
    semesterGoals = semesterGoals.map(g => g.id === id ? Object.assign({}, g, updates) : g);
    saveSemesterGoals();
    render();
}

function getSemesterTotalHours() {
    const totalMins = (studySessions || []).reduce((acc,s)=> acc + (s.durationMinutes||0), 0);
    return Math.round((totalMins/60)*10)/10; // hours rounded
}

function getLongestStreak() {
    if (!studySessions.length) return 0;
    const days = Array.from(new Set(studySessions.map(s => (new Date(s.date)).toISOString().split('T')[0])))
        .map(d=>new Date(d)).sort((a,b)=>a-b);
    let longest = 0, current = 1;
    for (let i=1;i<days.length;i++) {
        const diff = (days[i]-days[i-1])/(1000*60*60*24);
        if (diff === 1) { current++; } else { longest = Math.max(longest, current); current=1; }
    }
    longest = Math.max(longest, current);
    return longest;
}

function getWeeklyAverageMinutesLast4Weeks() {
    const now = new Date();
    const weeks = [];
    for (let i=0;i<4;i++) {
        const start = new Date(now); start.setDate(start.getDate() - (i*7)); start.setHours(0,0,0,0);
        const end = new Date(start); end.setDate(end.getDate()+6); end.setHours(23,59,59,999);
        const mins = (studySessions || []).reduce((acc,s)=>{ const sd=new Date(s.date); if (sd>=start && sd<=end) return acc + (s.durationMinutes||0); return acc; },0);
        weeks.push(mins);
    }
    const avg = weeks.reduce((a,b)=>a+b,0)/4;
    return avg; // minutes
}

function computeGoalProgress(goal) {
    // returns { current, target, percent, projected }
    let current = 0, target = goal.target || 0, projected = null;
    const health = computeAcademicHealth();
    switch (goal.type) {
        case 'gpa':
            current = health.overallGpa || 0;
            projected = current; // no further data to project
            break;
        case 'study_hours':
            current = getSemesterTotalHours();
            // project based on weekly avg over last 4 weeks and assume 12 weeks semester
            const weeklyAvg = getWeeklyAverageMinutesLast4Weeks()/60;
            const assumedWeeksRemaining = goal.assumedWeeks || 12;
            projected = Math.round((current + weeklyAvg * assumedWeeksRemaining)*10)/10;
            break;
        case 'assignment_completion':
            const total = (plannerTasks || []).length;
            const completed = (plannerTasks || []).filter(t=>t.done).length;
            const percentDone = total? (completed/total)*100 : 0;
            current = Math.round(percentDone*10)/10;
            projected = current;
            break;
        case 'study_streak':
            current = getCurrentStreak();
            projected = current;
            break;
        case 'course_goal':
            const code = (goal.course||'').toUpperCase();
            const course = courses[code] || { grades: [], target: 0 };
            current = computeCourseAverage(course);
            projected = current;
            break;
        default:
            current = 0; projected = 0;
    }
    const percent = target ? Math.round((Math.min(current, target)/target)*1000)/10 : 0;
    return { current, target, percent, projected };
}

function computeOverallGoalsProgress() {
    if (!semesterGoals || !semesterGoals.length) return 0;
    const totalPercent = semesterGoals.reduce((sum, goal) => sum + computeGoalProgress(goal).percent, 0);
    return Math.round(totalPercent / semesterGoals.length);
}
  
function saveWeeklyReviewHistory() {
    if (!GradeQuestStorage.getActiveUser()) return;
    GradeQuestStorage.setJson('weeklyReviewHistory', weeklyReviewHistory);
}

function getWeekKey(date) {
    const monday = getWeekStart(new Date(date));
    return monday.toISOString().split('T')[0];
}

function getWeeklySnapshot(weekKey) {
    return weeklyReviewHistory.find(item => item.weekKey === weekKey) || null;
}

function recordWeeklyReviewSnapshot() {
    if (!GradeQuestStorage.getActiveUser()) return;
    const weekKey = getWeekKey(new Date());
    const snapshot = {
        weekKey,
        timestamp: new Date().toISOString(),
        gpa: computeAcademicHealth().overallGpa || 0
    };
    const existingIndex = weeklyReviewHistory.findIndex(item => item.weekKey === weekKey);
    if (existingIndex >= 0) {
        weeklyReviewHistory[existingIndex] = snapshot;
    } else {
        weeklyReviewHistory.push(snapshot);
    }
    saveWeeklyReviewHistory();
}

function getWeekStats(weekStart) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekSessions = (studySessions || []).filter(s => {
        const sd = new Date(s.date);
        sd.setHours(0, 0, 0, 0);
        return sd >= weekStart && sd <= weekEnd;
    });

    const studyMinutes = weekSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const studyHours = Math.round((studyMinutes / 60) * 10) / 10;
    const daysStudied = Array.from(new Set(weekSessions.map(s => new Date(s.date).toISOString().split('T')[0]))).length;

    const courseTotals = {};
    weekSessions.forEach(s => {
        const course = (s.course || 'General').toUpperCase();
        courseTotals[course] = (courseTotals[course] || 0) + (s.durationMinutes || 0);
    });
    const coursesStudied = Object.keys(courseTotals);
    const mostStudiedCourse = coursesStudied.length ? coursesStudied.sort((a,b) => courseTotals[b] - courseTotals[a])[0] : null;
    const mostStudiedHours = mostStudiedCourse ? Math.round((courseTotals[mostStudiedCourse] / 60) * 10) / 10 : 0;

    const assignmentsAdded = (plannerTasks || []).filter(task => {
        let created = task.createdAt ? new Date(task.createdAt) : null;
        if (created) {
            created.setHours(0, 0, 0, 0);
            return created >= weekStart && created <= weekEnd;
        }
        if (task.deadline) {
            const d = new Date(task.deadline);
            d.setHours(0, 0, 0, 0);
            return d >= weekStart && d <= weekEnd;
        }
        return false;
    }).length;

    const assignmentsCompleted = (plannerTasks || []).filter(task => {
        if (!task.done) return false;
        if (task.completedAt) {
            const completed = new Date(task.completedAt);
            completed.setHours(0, 0, 0, 0);
            return completed >= weekStart && completed <= weekEnd;
        }
        if (task.deadline) {
            const d = new Date(task.deadline);
            d.setHours(0, 0, 0, 0);
            return d >= weekStart && d <= weekEnd;
        }
        return false;
    }).length;

    const overdueThisWeek = (plannerTasks || []).filter(task => {
        if (task.done || !task.deadline) return false;
        const deadline = new Date(task.deadline);
        deadline.setHours(0, 0, 0, 0);
        return deadline < weekStart || deadline <= weekEnd;
    }).length;

    return {
        studyMinutes,
        studyHours,
        daysStudied,
        coursesStudied: coursesStudied.length,
        mostStudiedCourse,
        mostStudiedHours,
        assignmentsAdded,
        assignmentsCompleted,
        overdueThisWeek
    };
}

function formatWeeklyDelta(current, previous) {
    if (previous === null || previous === undefined) return 'N/A';
    const diff = current - previous;
    const prefix = diff > 0 ? '+' : diff < 0 ? '' : '';
    return `${prefix}${diff}`;
}

function renderGoalsProgressList() {
    if (!semesterGoals.length) {
        return '<p class="empty-state">No active goals yet.</p>';
    }

    return semesterGoals.map(goal => {
        const progress = computeGoalProgress(goal);
        return `
            <div class="weekly-goal-row">
                <div>
                    <strong>${goal.title || (goal.type === 'course_goal' ? `${goal.course || 'Course Goal'}` : goal.type.replace('_', ' '))}</strong>
                    <div class="notes-line">Target ${progress.target}${goal.type === 'study_hours' ? ' hrs' : goal.type === 'assignment_completion' ? '%' : goal.type === 'study_streak' ? ' days' : goal.type === 'course_goal' ? '%' : ''}</div>
                </div>
                <div style="text-align:right; min-width:90px;">
                    <strong>${progress.current}${goal.type === 'study_hours' ? ' hrs' : goal.type === 'assignment_completion' ? '%' : goal.type === 'study_streak' ? ' days' : goal.type === 'course_goal' ? '%' : ''}</strong>
                    <div>${progress.percent}%</div>
                </div>
            </div>
            <div class="progress-bar" style="margin-top:8px;"><div class="progress-fill" style="width:${progress.percent}%"></div></div>
        `;
    }).join('');
}

function copyWeeklySummary() {
    const weekStart = getWeekStart(new Date());
    const summaryText = buildWeeklySummaryText(weekStart);
    if (!summaryText) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summaryText).then(() => {
            showToast('Weekly summary copied to clipboard.', 'success');
        }).catch(() => {
            if (typeof fallbackCopy === 'function') fallbackCopy(summaryText);
        });
    } else {
        if (typeof fallbackCopy === 'function') fallbackCopy(summaryText);
    }
}

function buildWeeklySummaryText(weekStart) {
    const currentWeek = getWeekStats(weekStart);
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeek = getWeekStats(previousWeekStart);
    const weekKey = getWeekKey(weekStart);
    const prevWeekKey = getWeekKey(previousWeekStart);
    const currentGpa = computeAcademicHealth().overallGpa || 0;
    const lastSnapshot = getWeeklySnapshot(prevWeekKey);
    const gpaChange = lastSnapshot !== null ? currentGpa - lastSnapshot.gpa : null;

    const deltaStudy = previousWeek ? formatWeeklyDelta(currentWeek.studyHours, previousWeek.studyHours) : 'N/A';
    const deltaCompleted = previousWeek ? formatWeeklyDelta(currentWeek.assignmentsCompleted, previousWeek.assignmentsCompleted) : 'N/A';
    const deltaOverdue = previousWeek ? formatWeeklyDelta((plannerTasks || []).filter(task => !task.done && task.deadline && new Date(task.deadline) < new Date()).length, previousWeek.overdueThisWeek) : 'N/A';
    const score = getWeeklyReviewScore(currentWeek);
    const level = getWeeklyReviewLevel(score);

    const attention = [];
    const neglected = Object.keys(courses).filter(name => {
        const days = daysSinceLastStudy(name);
        return days === null || days >= 7;
    });
    if (neglected.length) attention.push(`Courses not studied in 7+ days: ${neglected.join(', ')}`);
    const dueSoon = (plannerTasks || []).filter(task => {
        if (!task.deadline || task.done) return false;
        const date = new Date(task.deadline);
        const today = new Date(); today.setHours(0,0,0,0);
        const diff = Math.ceil((date - today)/(1000*60*60*24));
        return diff >=0 && diff <=3;
    }).map(task => `${task.title} (${task.course || 'General'}) due ${task.deadline}`);
    if (dueSoon.length) attention.push(`Due soon: ${dueSoon.join('; ')}`);
    const belowTargetCourses = Object.keys(courses).filter(name => {
        const avg = computeCourseAverage(courses[name]);
        return avg < (courses[name].target || 0);
    });
    if (belowTargetCourses.length) attention.push(`Courses below target: ${belowTargetCourses.join(', ')}`);
    if (!attention.length) attention.push('No immediate action needed.');

    const goalsProgress = computeOverallGoalsProgress();

    const summary = [];
    const nextSunday = new Date(weekStart);
    nextSunday.setDate(nextSunday.getDate()+6);
    summary.push(`Week of ${weekStart.toDateString()} - ${nextSunday.toDateString()}`);
    summary.push(`Study Hours: ${currentWeek.studyHours}`);
    summary.push(`Study Change: ${deltaStudy}`);
    summary.push(`Assignments Completed: ${currentWeek.assignmentsCompleted}`);
    summary.push(`Assignments Added: ${currentWeek.assignmentsAdded}`);
    summary.push(`Courses Studied: ${currentWeek.coursesStudied}`);
    summary.push(`Current Streak: ${getCurrentStreak()} days`);
    summary.push(`Most Studied Course: ${currentWeek.mostStudiedCourse || 'None'} (${currentWeek.mostStudiedHours} hrs)`);
    summary.push(`GPA Change: ${gpaChange !== null ? (gpaChange > 0 ? '+' : '') + gpaChange.toFixed(2) : 'N/A'}`);
    summary.push(`Goals Progress: ${goalsProgress}%`);
    summary.push('');
    summary.push('Attention Needed:');
    attention.forEach(item => summary.push(`- ${item}`));
    summary.push('');
    summary.push(`Weekly Report Card: ${score} (${level})`);
    return summary.join('\n');
}

function getWeeklyReviewScore(stats) {
    const studyScore = Math.min((stats.studyHours / 6) * 100, 100);
    const consistencyScore = Math.min((stats.daysStudied / 7) * 100, 100);
    const completionScore = stats.assignmentsAdded > 0 ? Math.min((stats.assignmentsCompleted / stats.assignmentsAdded) * 100, 100) : 100;
    const goalsScore = computeOverallGoalsProgress();
    const overdueCount = (plannerTasks || []).filter(task => !task.done && task.deadline && new Date(task.deadline) < new Date()).length;
    let score = 0.28 * studyScore + 0.28 * consistencyScore + 0.22 * completionScore + 0.22 * goalsScore;
    score -= Math.min(overdueCount * 8, 40);
    return Math.max(0, Math.min(100, Math.round(score)));
}

function getWeeklyReviewLevel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Needs Improvement';
    return 'At Risk';
}

function renderGoalsDashboard() {
    const panel = document.getElementById('goalsContainer');
    if (!panel) return;

    const totalHours = getSemesterTotalHours();
    const longest = getLongestStreak();
    const streak = getCurrentStreak();
    const overallProgress = computeOverallGoalsProgress();

    // Goal list
    const listHtml = semesterGoals.map(g=>{
        const p = computeGoalProgress(g);
        const milestones = [];
        [25,50,75,100].forEach(m=>{ if (p.percent >= m) milestones.push(`<span class="milestone">${m}%</span>`); });
        // status for course goals
        let status = '';
        if (g.type === 'course_goal') {
            const diff = (p.current - p.target);
            status = diff >= 0 ? '✅ On Track' : (p.target - p.current <=5 ? '⚠ Slightly Behind' : '🚨 At Risk');
        }
        return `
            <div class="goal-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${g.title || g.type}</strong>
                        <div style="color:var(--muted); font-size:0.9rem;">${g.type === 'course_goal' ? (g.course || '') : ''}</div>
                    </div>
                    <div style="text-align:right; min-width:150px;">
                        <div>Current: <strong>${p.current || 0}${g.type==='study_hours'?' hrs':''}${g.type==='assignment_completion'?'%':''}</strong></div>
                        <div>Target: <strong>${p.target}${g.type==='study_hours'?' hrs':''}${g.type==='assignment_completion'?'%':''}</strong></div>
                    </div>
                </div>
                <div style="margin-top:8px;">
                    <div class="progress-bar"><div class="progress-fill" style="width:${p.percent}%"></div></div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;"><div>${p.percent}%</div><div>${status}</div></div>
                    <div style="margin-top:6px;">${milestones.join(' ')}</div>
                </div>
                <div style="display:flex; gap:8px; margin-top:8px;">
                    <button class="panel-btn" onclick="updateGoal(${g.id}, { achieved: ${p.percent >= 100} })">Mark</button>
                    <button class="secondary-btn" onclick="deleteGoal(${g.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    // Predictions & insights
    const predictions = [];
    semesterGoals.forEach(g => {
        const p = computeGoalProgress(g);
        if (g.type === 'study_hours') {
            predictions.push(`At your current pace you will reach ${p.projected || 0}/${g.target} study hours.`);
        } else if (g.type === 'gpa') {
            predictions.push(`You are projected to finish with a GPA of ${(p.projected||0).toFixed(2)}.`);
        } else if (g.type === 'course_goal') {
            const msg = p.current >= g.target ? `${g.course} is currently on track to achieve its target.` : `${g.course} is projected at ${p.current.toFixed(1)}%, target ${g.target}%`;
            predictions.push(msg);
        }
    });

    const insights = [];
    // quick insight example
    semesterGoals.forEach(g=>{
        const p = computeGoalProgress(g);
        if (g.type === 'study_hours') {
            const need = Math.max(0, Math.round((g.target - (p.current||0))));
            insights.push(`You need ${need} more study hours to reach your study goal.`);
        }
        if (g.type === 'gpa') {
            if ((p.current||0) >= g.target) insights.push('You are ahead of your GPA target.');
        }
    });

    panel.innerHTML = `
        <div class="settings-layout goals-layout">
            <div class="settings-column settings-left">
                <div class="panel-card">
                    <h4>Create Goal</h4>
                    <div class="panel-form">
                        <select id="newGoalType">
                            <option value="gpa">Semester GPA Goal</option>
                            <option value="study_hours">Study Hours Goal</option>
                            <option value="assignment_completion">Assignment Completion Goal (%)</option>
                            <option value="study_streak">Study Streak Goal (days)</option>
                            <option value="course_goal">Course Grade Goal</option>
                        </select>
                        <input id="newGoalTitle" placeholder="Title (optional)" />
                        <input id="newGoalTarget" placeholder="Target (number)" />
                        <input id="newGoalCourse" placeholder="Course code (only for Course Goal)" />
                        <button class="panel-btn" onclick="(function(){
                            const type=document.getElementById('newGoalType').value;
                            const title=document.getElementById('newGoalTitle').value.trim();
                            const target=parseFloat(document.getElementById('newGoalTarget').value);
                            const course=document.getElementById('newGoalCourse').value.trim().toUpperCase();
                            if (!isNaN(target) && target>0) {
                                addGoal({type, title: title|| (type==='course_goal' ? 'Course ' + course : type), target, course: course||null});
                                document.getElementById('newGoalTitle').value=''; document.getElementById('newGoalTarget').value=''; document.getElementById('newGoalCourse').value='';
                            } else showToast('Enter a numeric target.', 'error');
                        })()">Add Goal</button>
                    </div>

                    <h4 style="margin-top:12px;">Study Summary</h4>
                    <div class="card">
                        <div>Total hours: <strong>${totalHours} hrs</strong></div>
                        <div>Hours this week: <strong>${Math.round(getMinutesThisWeek()/60)} hrs</strong></div>
                        <div>Current streak: <strong>${streak} days</strong></div>
                        <div>Longest streak: <strong>${longest} days</strong></div>
                    </div>

                    <h4 style="margin-top:12px;">Predictions</h4>
                    <div class="card">${predictions.map(p=>`<div style="padding:6px 0;">${p}</div>`).join('') || '<div class="notes-line">No predictions available</div>'}</div>

                    <h4 style="margin-top:12px;">Insights</h4>
                    <div class="card">${insights.map(i=>`<div style="padding:6px 0;">${i}</div>`).join('') || '<div class="notes-line">No insights</div>'}</div>
                </div>
            </div>

            <div class="settings-column settings-right">
                <div class="panel-card">
                    <h4>Active Goals</h4>
                    <div class="goals-grid">${listHtml || '<p class="empty-state">No goals yet</p>'}</div>
                </div>

                <div class="panel-card">
                    <h4>Overall Progress</h4>
                    <div class="progress-bar" style="height:14px;"><div class="progress-fill" style="width:${overallProgress}%"></div></div>
                    <div style="margin-top:8px;">${overallProgress}% complete across ${semesterGoals.length} goal(s)</div>
                </div>
            </div>
        </div>
    `;
}

function renderWeeklyReviewDashboard() {
    const panel = document.getElementById('weeklyContainer');
    if (!panel) return;

    const weekStart = getWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);

    const currentWeek = getWeekStats(weekStart);
    const previousWeek = getWeekStats(previousWeekStart);
    const currentGpa = computeAcademicHealth().overallGpa || 0;
    const previousSnapshot = getWeeklySnapshot(getWeekKey(previousWeekStart));
    const gpaChange = previousSnapshot !== null ? currentGpa - previousSnapshot.gpa : null;
    recordWeeklyReviewSnapshot();

    const studyDelta = previousWeek ? formatWeeklyDelta(currentWeek.studyHours, previousWeek.studyHours) : 'N/A';
    const completedDelta = previousWeek ? formatWeeklyDelta(currentWeek.assignmentsCompleted, previousWeek.assignmentsCompleted) : 'N/A';
    const overdueCurrent = currentWeek.overdueThisWeek;
    const overduePrevious = previousWeek ? previousWeek.overdueThisWeek : null;
    const overdueDelta = overduePrevious !== null ? formatWeeklyDelta(overdueCurrent, overduePrevious) : 'N/A';

    const coursesNotStudied = Object.keys(courses).filter(name => {
        const days = daysSinceLastStudy(name);
        return days === null || days >= 7;
    });

    const dueSoonTasks = (plannerTasks || []).filter(task => {
        if (!task.deadline || task.done) return false;
        const due = new Date(task.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 3;
    });

    const coursesBelowTarget = Object.keys(courses).filter(name => computeCourseAverage(courses[name]) < (courses[name].target || 0));
    const overallGoalsProgressValue = computeOverallGoalsProgress();
    const weeklyScore = getWeeklyReviewScore(currentWeek);
    const weeklyLevel = getWeeklyReviewLevel(weeklyScore);

    const attentionItems = [];
    if (coursesNotStudied.length) attentionItems.push(`Courses not studied in 7+ days: ${coursesNotStudied.join(', ')}`);
    if (dueSoonTasks.length) attentionItems.push(`Due in next 3 days: ${dueSoonTasks.map(task => `${task.title} (${task.course || 'General'})`).join('; ')}`);
    if (coursesBelowTarget.length) attentionItems.push(`Courses below target: ${coursesBelowTarget.join(', ')}`);
    if (!attentionItems.length) attentionItems.push('No immediate attention needed this week.');

    const achievements = [];
    if (currentWeek.daysStudied >= 5) achievements.push('🔥 Studied 5 days this week');
    if (currentWeek.assignmentsCompleted >= 10) achievements.push('📚 10 assignments completed');
    if (overdueCurrent === 0) achievements.push('✅ No overdue tasks');
    if (overallGoalsProgressValue >= 100) achievements.push('🎯 Goal reached');

    panel.innerHTML = `
        <div class="panel-card">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Weekly Review</p>
                    <h3>Week of ${weekStart.toDateString()}</h3>
                </div>
                <div class="weekly-actions">
                    <button class="panel-btn" onclick="copyWeeklySummary()">Copy Weekly Summary</button>
                    <button class="secondary-btn" onclick="copySemesterReport()">Generate Semester Report</button>
                </div>
            </div>

            <div class="weekly-summary-grid">
                <div class="weekly-stat-card">
                    <span class="eyebrow">Study Hours</span>
                    <strong>${currentWeek.studyHours}</strong>
                    <div class="notes-line">Change: ${studyDelta}</div>
                </div>
                <div class="weekly-stat-card">
                    <span class="eyebrow">Assignments Completed</span>
                    <strong>${currentWeek.assignmentsCompleted}</strong>
                    <div class="notes-line">Change: ${completedDelta}</div>
                </div>
                <div class="weekly-stat-card">
                    <span class="eyebrow">Assignments Added</span>
                    <strong>${currentWeek.assignmentsAdded}</strong>
                    <div class="notes-line">Added this week</div>
                </div>
                <div class="weekly-stat-card">
                    <span class="eyebrow">Courses Studied</span>
                    <strong>${currentWeek.coursesStudied}</strong>
                    <div class="notes-line">Most studied: ${currentWeek.mostStudiedCourse || 'None'}</div>
                </div>
                <div class="weekly-stat-card">
                    <span class="eyebrow">Current Streak</span>
                    <strong>${getCurrentStreak()} days</strong>
                    <div class="notes-line">Ongoing study streak</div>
                </div>
                <div class="weekly-stat-card">
                    <span class="eyebrow">GPA Change</span>
                    <strong>${gpaChange !== null ? (gpaChange > 0 ? '+' : '') + gpaChange.toFixed(2) : 'N/A'}</strong>
                    <div class="notes-line">From last week</div>
                </div>
            </div>

            <div class="weekly-section">
                <h4>Week Comparison</h4>
                <div class="comparison-grid">
                    <div class="comparison-card">${studyDelta} study time</div>
                    <div class="comparison-card">${completedDelta} completed assignments</div>
                    <div class="comparison-card">${overdueDelta} overdue assignments</div>
                </div>
            </div>

            <div class="weekly-section">
                <h4>Top Course</h4>
                <div class="weekly-card">
                    <strong>${currentWeek.mostStudiedCourse || 'No course yet'}</strong>
                    <div>Hours: ${currentWeek.mostStudiedHours}</div>
                </div>
            </div>

            <div class="weekly-section">
                <h4>Attention Needed</h4>
                <div class="notes-line">${attentionItems.join('<br>')}</div>
            </div>

            <div class="weekly-section">
                <h4>Goals Progress</h4>
                <div class="weekly-goals-list">${renderGoalsProgressList()}</div>
            </div>

            <div class="weekly-section">
                <h4>Weekly Achievements</h4>
                ${achievements.length ? achievements.map(item => `<div class="achievement">${item}</div>`).join('') : '<p class="notes-line">No milestones reached yet.</p>'}
            </div>

            <div class="weekly-section">
                <h4>Weekly Report Card</h4>
                <div class="weekly-report-card">
                    <div class="report-score">${weeklyScore}</div>
                    <div>
                        <strong>${weeklyLevel}</strong>
                        <div class="notes-line">Score based on study consistency, deadlines, goals and overdue tasks.</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function computeAcademicHealth() {
    // Compute overall GPA and related health metrics
    const courseNames = Object.keys(courses);
    let gradeSum = 0, gradeCount = 0;
    courseNames.forEach(name => {
        const course = courses[name];
        let totalWeighted = 0, totalWeight = 0;
        (course.grades || []).forEach(g => { totalWeighted += g.score * (g.weight/100); totalWeight += g.weight; });
        if (totalWeight > 0) {
            gradeSum += totalWeighted / (totalWeight/100);
            gradeCount += 1;
        }
    });
    const overallGpa = gradeCount > 0 ? (gradeSum / gradeCount) : null;

    const avgAcrossCourses = overallGpa;

    const coursesAtRisk = courseNames.filter(name => {
        const avg = computeCourseAverage(courses[name]);
        const target = (courses[name].target || 80);
        return (target - avg) > 5;
    }).length;

    const overdueTasks = (plannerTasks || []).filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) < 0).length;
    const dueThisWeek = (plannerTasks || []).filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) !== null && daysBetweenFromToday(t.deadline) <=7 && daysBetweenFromToday(t.deadline) >=0).length;

    const insights = [];
    if (coursesAtRisk > 0) insights.push(`${coursesAtRisk} courses are below target.`);
    if (dueThisWeek > 0) insights.push(`You have ${dueThisWeek} deadlines in the next 7 days.`);
    if (overdueTasks > 0) insights.push(`You have ${overdueTasks} overdue task${overdueTasks>1?'s':''}.`);

    return {
        overallGpa: overallGpa,
        avgAcrossCourses: avgAcrossCourses,
        coursesAtRisk: coursesAtRisk,
        overdueTasks: overdueTasks,
        dueThisWeek: dueThisWeek,
        insights
    };
}

function letterFromPercent(percent) {
    const entries = Object.entries(letterToPercent).sort((a, b) => b[1] - a[1]);
    for (const [letter, threshold] of entries) {
        if (percent >= threshold) return letter;
    }
    return 'F';
}

function getUserGradeScale() {
    const schoolKey = getProfileSchoolKey();
    const schoolConfig = ALL_SCHOOLS[schoolKey] || ALL_SCHOOLS.mcmaster;
    return GRADING_SCALES[schoolConfig.scale] || GRADING_SCALES.mcmaster;
}

function gradePointForPercent(percent, scaleConfig) {
    const letter = letterFromPercent(percent);
    return scaleConfig.map[letter] !== undefined ? scaleConfig.map[letter] : 0;
}

function getCourseGoalTarget(courseName) {
    const goal = (semesterGoals || []).find(g => g.type === 'course_goal' && (g.course || '').toUpperCase() === courseName.toUpperCase());
    return goal ? goal.target : null;
}

function computeCourseProjection(name, course, scaleConfig) {
    const code = name.toUpperCase();
    const totalWeight = (course.grades || []).reduce((sum, g) => sum + (g.weight || 0), 0);
    const weightedSum = (course.grades || []).reduce((sum, g) => sum + ((g.score || 0) * ((g.weight || 0) / 100)), 0);
    const currentAvg = totalWeight > 0 ? (weightedSum / (totalWeight / 100)) : 0;
    const remainingWeight = Math.max(0, 100 - totalWeight);
    const currentContribution = currentAvg * (totalWeight / 100);
    const projected = remainingWeight > 0 ? currentContribution + currentAvg * (remainingWeight / 100) : currentAvg;
    const bestCase = currentContribution + 95 * (remainingWeight / 100);
    const worstCase = currentContribution + 65 * (remainingWeight / 100);
    const goalTarget = getCourseGoalTarget(code) || course.target || 0;

    let requiredAverage = null;
    let targetAchievable = true;
    if (goalTarget > 0) {
        if (remainingWeight > 0) {
            requiredAverage = ((goalTarget - currentContribution) / (remainingWeight / 100));
            if (requiredAverage > 100) targetAchievable = false;
            if (requiredAverage < 0) requiredAverage = 0;
        } else {
            requiredAverage = currentAvg;
            if (currentAvg < goalTarget) targetAchievable = false;
        }
    }

    let status = 'No target';
    if (goalTarget > 0) {
        if (projected >= goalTarget) status = '✅ On Track';
        else if (goalTarget - projected <= 5) status = '⚠ Slight Risk';
        else status = '🚨 At Risk';
    }

    let requiredText = goalTarget > 0 ? `${requiredAverage !== null ? Math.round(requiredAverage * 10) / 10 : 0}%` : 'N/A';
    if (goalTarget > 0 && requiredAverage !== null && requiredAverage > 100) {
        requiredText = `>100% (target may no longer be achievable)`;
    }

    return {
        name: code,
        currentAvg: Math.round(currentAvg * 10) / 10,
        currentWeight: Math.round(totalWeight * 10) / 10,
        remainingWeight: Math.round(remainingWeight * 10) / 10,
        projected: Math.round(projected * 10) / 10,
        bestCase: Math.round(bestCase * 10) / 10,
        worstCase: Math.round(worstCase * 10) / 10,
        goalTarget: goalTarget,
        status: status,
        requiredAverage: requiredAverage,
        targetAchievable: targetAchievable,
        requiredText: requiredText,
        units: course.units || 3,
        currentPoint: gradePointForPercent(currentAvg, scaleConfig),
        projectedPoint: gradePointForPercent(projected, scaleConfig),
        bestPoint: gradePointForPercent(bestCase, scaleConfig),
        worstPoint: gradePointForPercent(worstCase, scaleConfig)
    };
}

function getSemesterGpa(courseEntries, field) {
    const gradedCourses = courseEntries || [];
    let totalUnits = 0;
    let totalPoints = 0;
    gradedCourses.forEach(course => {
        const units = course.units || 3;
        totalUnits += units;
        totalPoints += (course[field] || 0) * units;
    });
    return totalUnits > 0 ? Math.round((totalPoints / totalUnits) * 100) / 100 : 0;
}

function computeSemesterPredictorData() {
    const scaleConfig = getUserGradeScale();
    const projections = Object.keys(courses).sort().map(name => computeCourseProjection(name, courses[name], scaleConfig));
    const currentGpa = getSemesterGpa(projections, 'currentPoint');
    const projectedGpa = getSemesterGpa(projections, 'projectedPoint');
    const bestCaseGpa = getSemesterGpa(projections, 'bestPoint');
    const worstCaseGpa = getSemesterGpa(projections, 'worstPoint');

    const gpaGoal = (semesterGoals || []).find(g => g.type === 'gpa');
    const goalForecast = gpaGoal ? {
        target: gpaGoal.target,
        projected: projectedGpa,
        difference: Math.round((projectedGpa - gpaGoal.target) * 100) / 100
    } : null;

    const insights = [];
    projections.forEach(course => {
        if (course.goalTarget > 0) {
            if (course.projected < course.goalTarget) {
                insights.push(`${course.name} is projected to miss its goal.`);
            } else {
                insights.push(`${course.name} is currently on track.`);
            }
            if (course.requiredAverage !== null && course.requiredAverage > 100) {
                insights.push(`You need ${Math.round(course.requiredAverage)}% average on remaining ${course.name} assessments.`);
            }
            if (course.currentAvg >= course.goalTarget) {
                insights.push(`${course.name} is currently above target.`);
            }
        }
    });

    const uniqueInsights = [...new Set(insights)].slice(0, 6);

    return {
        scaleLabel: scaleConfig.label,
        currentGpa: Math.round(currentGpa * 100) / 100,
        projectedGpa: Math.round(projectedGpa * 100) / 100,
        bestCaseGpa: Math.round(bestCaseGpa * 100) / 100,
        worstCaseGpa: Math.round(worstCaseGpa * 100) / 100,
        projections: projections,
        goalForecast: goalForecast,
        insights: uniqueInsights.length ? uniqueInsights : ['No strong course insights available yet.']
    };
}

function renderAcademicHealthDashboard() {
    const panel = document.getElementById('healthContainer');
    if (!panel) return;

    const health = computeAcademicHealth();

    // Section 1: Overall Performance
    const overallGpa = health.overallGpa !== null ? health.overallGpa.toFixed(2) : 'N/A';
    const totalCourses = Object.keys(courses).length;
    const avgAcross = health.avgAcrossCourses !== null ? health.avgAcrossCourses.toFixed(1) : '—';
    const studyThisWeek = getMinutesThisWeek();
    const streak = getCurrentStreak();

    // Section 2: Course Health list
    const courseHealthRows = Object.keys(courses).sort().map(name => {
        const c = courses[name];
        const avg = computeCourseAverage(c);
        const target = c.target || 80;
        const diff = (avg - target).toFixed(1);
        let status = 'Low';
        if (avg >= target) status = 'Low';
        else if ((target - avg) <= 5) status = 'Medium';
        else status = 'High';
        return `<div class="health-row"><div><strong>${name}</strong><div style="color:var(--muted);">${avg.toFixed(1)}% • Target ${target}%</div></div><div style="text-align:right;"><div style="font-weight:800">${diff}%</div><div class="risk ${status.toLowerCase()}">${status}</div></div></div>`;
    }).join('');

    // Section 3: Risk detection messages
    const atRiskCourses = Object.keys(courses).filter(name => {
        const avg = computeCourseAverage(courses[name]);
        const target = (courses[name].target || 80);
        return (target - avg) > 5;
    });
    const notStudied = Object.keys(courses).filter(name => {
        const days = daysSinceLastStudy(name);
        return days === null || days >= 7;
    });
    const approachingDeadlines = (plannerTasks || []).filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) !== null && daysBetweenFromToday(t.deadline) <= 7 && daysBetweenFromToday(t.deadline) >= 0);
    const overdue = (plannerTasks || []).filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) < 0);

    const riskMessages = [];
    atRiskCourses.forEach(cn => riskMessages.push(`⚠ ${cn} is ${(Math.abs((computeCourseAverage(courses[cn]) - (courses[cn].target || 80))).toFixed(1))}% below target`));
    notStudied.forEach(cn => riskMessages.push(`⚠ ${cn} has not been studied in ${daysSinceLastStudy(cn) || 'many'} days`));
    approachingDeadlines.forEach(t => riskMessages.push(`⚠ ${t.title} due ${t.deadline}`));
    overdue.forEach(t => riskMessages.push(`⚠ Overdue: ${t.title} (${t.course})`));

    // Section 4: Deadline overview
    const dueToday = (plannerTasks || []).filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) === 0);
    const dueThisWeek = (plannerTasks || []).filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) > 0 && daysBetweenFromToday(t.deadline) <=7);
    const dueNextWeek = (plannerTasks || []).filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) >7 && daysBetweenFromToday(t.deadline) <=14);

    // Section 5: Trends - simple bars
    // Study trend last 4 weeks
    const weeks = [];
    const now = new Date();
    for (let i=3;i>=0;i--) {
        const start = new Date(now); start.setDate(start.getDate() - (i*7)); start.setHours(0,0,0,0);
        const end = new Date(start); end.setDate(end.getDate()+6); end.setHours(23,59,59,999);
        const mins = (studySessions || []).reduce((acc,s)=>{ const sd=new Date(s.date); if (sd>=start && sd<=end) return acc + (s.durationMinutes||0); return acc; },0);
        weeks.push(mins);
    }
    const maxWeek = Math.max(...weeks, 1);
    const studyBars = weeks.map(w => `<div class="trend-bar"><div class="bar" style="height:${Math.round((w/maxWeek)*80)}px"></div><div class="bar-label">${w}m</div></div>`).join('');

    // Assignment completion trend: completed tasks per week based on deadline week
    const completedPerWeek = [];
    for (let i=3;i>=0;i--) {
        const start = new Date(now); start.setDate(start.getDate() - (i*7)); start.setHours(0,0,0,0);
        const end = new Date(start); end.setDate(end.getDate()+6); end.setHours(23,59,59,999);
        const count = (plannerTasks || []).filter(t=> t.done && t.deadline).reduce((acc,t)=>{ const sd=new Date(t.deadline); if (sd>=start && sd<=end) return acc+1; return acc; },0);
        completedPerWeek.push(count);
    }
    const maxComp = Math.max(...completedPerWeek,1);
    const compBars = completedPerWeek.map(c => `<div class="trend-bar"><div class="bar" style="height:${Math.round((c/maxComp)*80)}px"></div><div class="bar-label">${c}</div></div>`).join('');

    // Achievements
    const achievements = [];
    if (getCurrentStreak() >= 7) achievements.push('🔥 7 Day Study Streak');
    const totalSessions = (studySessions || []).length;
    if (totalSessions >= 25) achievements.push('📚 25 Study Sessions');
    if (overdue.length === 0) achievements.push('✅ No Overdue Tasks');
    if (Object.keys(courses).some(n => computeCourseAverage(courses[n]) >= (courses[n].target || 80))) achievements.push('🎯 Course At Target');

    // Section 7: Health score
    const totalTasks = (plannerTasks || []).length;
    const completedTasks = (plannerTasks || []).filter(t=>t.done).length;
    const assignmentCompletionRate = totalTasks ? (completedTasks/totalTasks) : 1;
    const studyConsistency = Math.min(getCurrentStreak(),14)/14;
    const gpaFactor = (health.overallGpa || 0)/100;
    const riskFactor = totalCourses ? (atRiskCourses.length/totalCourses) : 0;
    const overduePenalty = Math.min(overdue.length, 10);

    let rawScore = (0.28*assignmentCompletionRate + 0.25*studyConsistency + 0.32*gpaFactor + 0.15*(1 - riskFactor)) * 100;
    rawScore -= overduePenalty * 4;
    const healthScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    const healthLevel = healthScore >= 90 ? 'Excellent' : (healthScore >= 75 ? 'Good' : (healthScore >= 60 ? 'Needs Attention' : 'At Risk'));

    panel.innerHTML = `
        <div class="panel-card">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Academic Health</p>
                    <h3>Your overall academic standing</h3>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 320px; gap:16px;">
                <div>
                    <h4>Overall Performance</h4>
                    <div class="stats-grid">
                        <div class="stat">
                            <label>GPA</label>
                            <div class="val">${overallGpa}</div>
                        </div>
                        <div class="stat">
                            <label>Total Courses</label>
                            <div class="val">${totalCourses}</div>
                        </div>
                        <div class="stat">
                            <label>Average Across Courses</label>
                            <div class="val">${avgAcross}%</div>
                        </div>
                        <div class="stat">
                            <label>Study Hours This Week</label>
                            <div class="val">${Math.round(studyThisWeek/60)}h ${studyThisWeek%60}m</div>
                        </div>
                        <div class="stat">
                            <label>Study Streak</label>
                            <div class="val">${streak} days</div>
                        </div>
                    </div>

                    <h4>Course Health</h4>
                    <div>${courseHealthRows || '<p class="empty-state">No courses available</p>'}</div>

                    <h4 style="margin-top:14px;">Risk Detection</h4>
                    <div>${riskMessages.length ? `<ul>${riskMessages.map(m=>`<li>${m}</li>`).join('')}</ul>` : '<p class="notes-line">No immediate risks detected</p>'}</div>

                    <h4 style="margin-top:14px;">Deadline Overview</h4>
                    <div>
                        <div>Overdue: ${overdue.length}</div>
                        <div>Due today: ${dueToday.length}</div>
                        <div>Due this week: ${dueThisWeek.length}</div>
                        <div>Due next week: ${dueNextWeek.length}</div>
                    </div>

                </div>

                <div>
                    <div class="panel-card" style="padding:12px; margin-bottom:12px;">
                        <h4>Performance Trends</h4>
                        <div style="display:flex; gap:10px; align-items:end;">${studyBars}</div>
                        <div style="margin-top:12px; font-size:0.9rem; color:var(--muted);">Weekly study minutes (last 4 weeks)</div>
                        <div style="height:18px"></div>
                        <div style="margin-top:12px;">Assignment completion (last 4 weeks)</div>
                        <div style="display:flex; gap:10px; align-items:end; margin-top:8px;">${compBars}</div>
                    </div>

                    <div class="panel-card" style="padding:12px; margin-bottom:12px;">
                        <h4>Achievements</h4>
                        <div>${achievements.length ? achievements.map(a=>`<div class="achievement">${a}</div>`).join('') : '<div class="notes-line">No achievements yet</div>'}</div>
                    </div>

                    <div class="panel-card" style="padding:12px;">
                        <h4>Health Score</h4>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="font-size:2.2rem; font-weight:900; color:var(--primary);">${healthScore}</div>
                            <div>
                                <div style="font-weight:800">${healthLevel}</div>
                                <div style="color:var(--muted); font-size:0.9rem;">Based on GPA, assignments, study, and deadlines</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-top:16px;">
                <h4>Insights</h4>
                <div style="color:var(--muted);">${health.insights.length ? `<ul>${health.insights.map(i=>`<li>${i}</li>`).join('')}</ul>` : '<div class="notes-line">No new insights</div>'}</div>
            </div>
        </div>
    `;
    renderGoalsDashboard();
}

function renderSemesterPredictor() {
    const panel = document.getElementById('predictorContainer');
    if (!panel) return;

    const data = computeSemesterPredictorData();
    const coursesHtml = data.projections.length ? data.projections.map(course => {
        const statusClass = course.status === '✅ On Track' ? 'on-track' : course.status === '⚠ Slight Risk' ? 'slight-risk' : course.status === '🚨 At Risk' ? 'at-risk' : 'no-target';
        return `
            <div class="course-prediction-card">
                <div class="course-prediction-row">
                    <div>
                        <strong>${course.name}</strong>
                        <div class="notes-line">Current: ${course.currentAvg}% • Remaining: ${course.remainingWeight}%</div>
                    </div>
                    <div style="text-align:right; min-width:130px;">
                        <div><strong>Projected:</strong> ${course.projected}%</div>
                        <div class="status-tag ${statusClass}">${course.status}</div>
                    </div>
                </div>
                <div class="range-projection">
                    <div><strong>Target:</strong> ${course.goalTarget > 0 ? course.goalTarget + '%' : 'None set'}</div>
                    <div><strong>Required average:</strong> ${course.goalTarget > 0 ? course.requiredText : 'N/A'}</div>
                    <div><strong>Best / Worst:</strong> ${course.bestCase}% / ${course.worstCase}%</div>
                </div>
            </div>
        `;
    }).join('') : '<p class="empty-state">No courses available for prediction. Add classes to see your forecast.</p>';

    const goalForecastHtml = data.goalForecast ? `
        <div class="range-projection">
            <div><strong>Goal:</strong> ${data.goalForecast.target} ${data.scaleLabel === 'Average (%)' ? '%' : ''}</div>
            <div><strong>Projected:</strong> ${data.goalForecast.projected}</div>
            <div><strong>Need:</strong> ${(data.goalForecast.difference >= 0 ? '+' : '') + data.goalForecast.difference}</div>
        </div>
    ` : '<p class="notes-line">No semester GPA goal set yet.</p>';

    panel.innerHTML = `
        <div class="stats-grid">
            <div class="stat">
                <label>Current GPA</label>
                <div class="val">${data.currentGpa.toFixed(2)}</div>
            </div>
            <div class="stat">
                <label>Projected GPA</label>
                <div class="val">${data.projectedGpa.toFixed(2)}</div>
            </div>
            <div class="stat">
                <label>Best Case GPA</label>
                <div class="val">${data.bestCaseGpa.toFixed(2)}</div>
            </div>
            <div class="stat">
                <label>Worst Case GPA</label>
                <div class="val">${data.worstCaseGpa.toFixed(2)}</div>
            </div>
        </div>

        <div class="weekly-section">
            <h4>Goals Forecast</h4>
            ${goalForecastHtml}
        </div>

        <div class="weekly-section">
            <h4>Course Predictions</h4>
            <div class="predictor-grid">${coursesHtml}</div>
        </div>

        <div class="weekly-section">
            <h4>Insights</h4>
            <div class="insight-list">${data.insights.map(item => `<div class="achievement">${item}</div>`).join('')}</div>
        </div>
    `;
}

function updateHeroStats() {
    const courseCount = Object.keys(courses).length;
    const fileCount = studyFiles.length;
    const taskCount = plannerTasks.length;
    const courseEl = document.getElementById('heroCourses');
    const fileEl = document.getElementById('heroFiles');
    const taskEl = document.getElementById('heroTasks');

    if (courseEl) courseEl.textContent = courseCount;
    if (fileEl) fileEl.textContent = fileCount;
    if (taskEl) taskEl.textContent = taskCount;
}

async function resetProfile() {
    const confirmed = await showConfirmDialog({
        title: 'Reset profile?',
        message: 'This clears your name, school, and all local course data.',
        confirmLabel: 'Reset profile',
        danger: true
    });
    if (confirmed) {
        const activeUid = GradeQuestStorage.getActiveUser();
        if (activeUid) GradeQuestStorage.clearUser(activeUid);
        location.reload();
    }
}

function getYearFromName(name) {
    const match = name.match(/_(\d)/);
    return match ? match[1] : null;
}

function addClass() {
    const nameInput = document.getElementById('className');
    const unitInput = document.getElementById('classUnits');
    const name = nameInput.value.trim().toUpperCase();
    const units = parseFloat(unitInput.value);

    if (name && !courses[name]) {
        courses[name] = { grades: [], target: 80, units: units };
        nameInput.value = '';
        save();
    }
}

function addGrade(courseName) {
    const score = parseFloat(document.getElementById(`score-${courseName}`).value);
    const manualWeight = parseFloat(document.getElementById(`weight-${courseName}`).value);
    const assessmentSelect = document.getElementById(`assessment-${courseName}`);
    const selectedAssessment = assessmentSelect ? assessmentSelect.value : '';
    const outlineItems = getCourseOutline(courseName);
    let weight = manualWeight;

    if (selectedAssessment) {
        const matchedItem = outlineItems.find(item => item.name === selectedAssessment);
        if (matchedItem) {
            weight = matchedItem.weight;
        }
    }

    if (!isNaN(score) && !isNaN(weight)) {
        courses[courseName].grades.push({ score, weight, assessment: selectedAssessment || null });
        save();
    }
}

function deleteGrade(courseName, idx) {
    courses[courseName].grades.splice(idx, 1);
    save();
}

async function deleteClass(name) {
    const confirmed = await showConfirmDialog({
        title: `Delete ${name}?`,
        message: 'This removes the course and its grades from this device.',
        confirmLabel: 'Delete course',
        danger: true
    });
    if (confirmed) {
        delete courses[name];
        save();
    }
}

function updateTarget(name, val) {
    courses[name].target = parseFloat(val) || 0;
    save();
}

function updateDropdown() {
    const selector = document.getElementById('classSelector');
    const selectedYear = document.getElementById('yearSelector').value;
    const currentVal = selector.value;
    selector.innerHTML = '<option value="all">All Classes</option>';

    Object.keys(courses).sort().forEach(name => {
        if (selectedYear === 'all' || selectedYear === getYearFromName(name)) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            selector.appendChild(opt);
        }
    });
    if (courses[currentVal]) selector.value = currentVal;
}

function showFinalizeUI(name) {
    const el = document.getElementById(`finalize-ui-${name}`);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function confirmFinalGrade(name) {
    const letter = document.getElementById(`letter-select-${name}`).value;
    if (letter) {
        courses[name].finalLetter = letter;
        save();
    }
}

function unfinalizeCourse(name) {
    delete courses[name].finalLetter;
    save();
}

function readUploadedFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read the selected file.'));
        reader.readAsDataURL(file);
    });
}

async function addStudyFile() {
    const titleInput = document.getElementById('fileTitle').value.trim();
    const course = document.getElementById('fileCourse').value.trim();
    const category = document.getElementById('fileCategory').value;
    const notes = document.getElementById('fileNotes').value.trim();
    const outlineText = document.getElementById('outlineInput').value.trim();
    const selectedFile = document.getElementById('resourceUpload').files[0];
    let attachment = null;

    if (selectedFile) {
        try {
            attachment = {
                name: selectedFile.name,
                type: selectedFile.type,
                data: await readUploadedFileAsDataURL(selectedFile)
            };
        } catch (error) {
            showToast(error.message, 'error');
            return;
        }
    }

    const title = titleInput || (attachment ? attachment.name.replace(/\.[^/.]+$/, '') : '');

    if (title || attachment) {
        const courseCode = (course || 'General').toUpperCase();
        const parsedOutline = parseOutlineText(outlineText || notes, courseCode);

        if (parsedOutline.length) {
            saveOutlineForCourse(courseCode, parsedOutline);
            ensureCourseEntry(courseCode);
        }

        studyFiles.unshift({
            id: Date.now(),
            title,
            course: course || 'General',
            category,
            notes,
            outlineItems: parsedOutline,
            attachment
        });

        document.getElementById('fileTitle').value = '';
        document.getElementById('fileCourse').value = '';
        document.getElementById('fileNotes').value = '';
        document.getElementById('outlineInput').value = '';
        document.getElementById('resourceUpload').value = '';
        saveStudyData();
        render();
    }
}

function deleteStudyFile(id) {
    studyFiles = studyFiles.filter(file => file.id !== id);
    saveStudyData();
    render();
}

function addPlannerTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const course = document.getElementById('taskCourse').value.trim();
    const deadline = document.getElementById('taskDeadline').value;
    const priority = document.getElementById('taskPriority').value;

    if (title) {
        const courseCode = (course || 'General').toUpperCase();
        const linkedAssessment = findLinkedAssessment(courseCode, title);

        if (linkedAssessment && deadline) {
            const outlineItems = getCourseOutline(courseCode);
            const target = outlineItems.find(item => normalizeText(item.name) === normalizeText(linkedAssessment.name));
            if (target) target.dueDate = deadline;
            saveStudyData();
        }

        plannerTasks.unshift({
            id: Date.now(),
            title,
            course: course || 'General',
            deadline,
            priority,
            done: false,
            createdAt: new Date().toISOString(),
            linkedAssessment: linkedAssessment ? { name: linkedAssessment.name, weight: linkedAssessment.weight } : null
        });
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskCourse').value = '';
        document.getElementById('taskDeadline').value = '';
        saveStudyData();
        render();
    }
}

function saveImportedCourseLegacy(data) {

    const code =
        (data.course.courseCode || 'GENERAL')
        .toUpperCase();

    ensureCourseEntry(code);

    if (!courses[code].metadata) {

        courses[code].metadata = {};

    }

    courses[code].metadata.courseName =
        data.course.courseName || '';

    courses[code].metadata.instructor =
        data.course.instructor || '';

    courses[code].metadata.semester =
        data.course.semester || '';

    courses[code].metadata.year =
        data.course.year || '';

    if (!courseOutlines[code]) {

        courseOutlines[code] = [];

    }

    data.assignments.forEach(
        (assessment, index) => {

            const dueDate =
                data.dates[index]
                    ? data.dates[index].isoDate
                    : '';

            courseOutlines[code].push({

                name: assessment.name,

                weight: assessment.weight,

                dueDate

            });

            plannerTasks.unshift({

                id: Date.now() + index,

                title: assessment.name,

                course: code,

                deadline: dueDate,

                priority:
                    assessment.weight >= 25
                        ? 'High'
                        : assessment.weight >= 10
                            ? 'Medium'
                            : 'Low',

                done: false,

                createdAt:
                    new Date().toISOString(),

                linkedAssessment: {

                    name: assessment.name,

                    weight: assessment.weight

                }

            });

        });

    save();
    saveStudyData();

    showToast(`${code} imported successfully.`, 'success');

    render();
}

function togglePlannerTask(id) {
    plannerTasks = plannerTasks.map(task => {
        if (task.id !== id) return task;
        const done = !task.done;
        return {
            ...task,
            done,
            completedAt: done ? new Date().toISOString() : undefined
        };
    });
    saveStudyData();
    render();
}

function deletePlannerTask(id) {
    plannerTasks = plannerTasks.filter(task => task.id !== id);
    saveStudyData();
    render();
}

function saveNotes() {
    notes = document.getElementById('notesInput').value;
    saveStudyData();
    render();
}

function renderFiles() {
    const list = document.getElementById('fileList');
    if (!list) return;

    if (studyFiles.length === 0) {
        list.innerHTML = '<p class="empty-state">No resources saved yet. Add a lecture, assignment, or reference card.</p>';
        return;
    }

    list.innerHTML = studyFiles.map(file => `
        <div class="resource-item">
            <div>
                <strong>${file.title}</strong>
                <p>${file.course} • ${file.category}</p>
                ${file.notes ? `<p>${file.notes}</p>` : ''}
                ${file.attachment ? `
                    <div class="resource-attachment">
                        ${file.attachment.type.startsWith('image/') ? `<img src="${file.attachment.data}" alt="${file.attachment.name}">` : `<a class="resource-link" href="${file.attachment.data}" target="_blank" rel="noopener">Open ${file.attachment.name}</a>`}
                    </div>
                ` : ''}
                ${file.outlineItems && file.outlineItems.length ? `<p>Outline weights: ${file.outlineItems.map(item => `${item.name} (${item.weight}%)`).join(', ')}</p>` : ''}
            </div>
            <button class="resource-action" onclick="deleteStudyFile(${file.id})">×</button>
        </div>
    `).join('');
}

function renderOutlinePreview() {
    const preview = document.getElementById('outlinePreview');
    if (!preview) return;

    const entries = Object.entries(courseOutlines).sort((a, b) => a[0].localeCompare(b[0]));
    if (!entries.length) {
        preview.innerHTML = '<p class="empty-state">No course outlines imported yet.</p>';
        return;
    }

    preview.innerHTML = entries.map(([course, items]) => `
        <div class="outline-card">
            <strong>${course}</strong>
            ${items.map(item => `<span class="outline-chip">${item.name} — ${item.weight}%${item.dueDate ? ` • due ${item.dueDate}` : ''}</span>`).join('')}
        </div>
    `).join('');
}

function renderPlanner() {
    const list = document.getElementById('plannerList');
    const timeline = document.getElementById('plannerTimeline');
    if (!list || !timeline) return;

    const upcomingTasks = [...plannerTasks].sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
    const upcoming = upcomingTasks.filter(task => task.deadline && !task.done).slice(0, 3);

    if (plannerTasks.length === 0) {
        list.innerHTML = '<p class="empty-state">No tasks yet. Add deadlines to keep your semester organized.</p>';
        timeline.innerHTML = '';
        return;
    }

    timeline.innerHTML = upcoming.length ? upcoming.map(task => `
        <div class="timeline-card">
            <strong>${task.title}</strong>
            <p>${task.course} • ${task.deadline} • ${task.priority}</p>
        </div>
    `).join('') : '<p class="empty-state">No upcoming deadlines yet.</p>';

    list.innerHTML = plannerTasks.map(task => `
        <div class="task-item ${task.done ? 'done' : ''}">
            <div>
                <strong>${task.title}</strong>
                <p>${task.course} • ${task.deadline || 'No deadline'} • ${task.priority}${task.linkedAssessment ? ` • ${task.linkedAssessment.name} (${task.linkedAssessment.weight}%)` : ''}</p>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="task-action" onclick="togglePlannerTask(${task.id})">✓</button>
                <button class="task-action" onclick="deletePlannerTask(${task.id})">×</button>
            </div>
        </div>
    `).join('');
}

function renderNotes() {
    const textarea = document.getElementById('notesInput');
    if (textarea) {
        textarea.value = notes;
    }
}

let courseOutlineImportListenersBound = false;

function bindCourseOutlineImportControls() {
    if (courseOutlineImportListenersBound) return;

    const importButton = document.getElementById('importCourseOutlineBtn');
    const fileInput = document.getElementById('courseOutlineFile');

    if (!importButton || !fileInput) return;

    courseOutlineImportListenersBound = true;

    importButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        const importModeSelect = document.getElementById('importModeSelect');
        const importMode = importModeSelect ? importModeSelect.value : 'stable';
        const importer = importMode === 'learning'
            ? window.LearningCourseOutlineImporter
            : window.CourseOutlineImporter;

        if (!file || !importer || typeof importer.import !== 'function') {
            fileInput.value = '';
            return;
        }

        try {
            await importer.import(file);
        } catch (error) {
            console.error(error);
            showToast('Unable to import course outline.', 'error');
        } finally {
            fileInput.value = '';
        }
    });
}

function initApp() {
    applyTheme(currentTheme);
    bindCourseOutlineImportControls();
    let storedTab = localStorage.getItem('activeDashboardTab') || 'home';
    if (storedTab === 'productivity') storedTab = 'assignments';
    setActiveTab(storedTab);
    render();
}

function render() {
    evaluateAchievements();

    // =====================
    // CORE DASHBOARDS
    // =====================
    renderHomeHub();
    applyDashboardCustomization();
    renderCountdownWidget();
    renderCalendar();
    updateDropdown();
    updateHeroStats();
    renderFiles();
    renderOutlinePreview();
    renderPlanner();
    renderNotes();

    // =====================
    // ACADEMIC DASHBOARDS
    // =====================
    renderCoursesDashboard();
    renderStudyCenter();
    renderAssignmentsDashboard();
    renderFlashcardsDashboard();
    renderFocusDashboard();
    renderAcademicHealthDashboard();
    renderSemesterPredictor();
    renderWeeklyReviewDashboard();
    renderProfileDashboard();

    // =====================
    // SETTINGS
    // =====================
    renderSettingsDashboard();

    const container = document.getElementById('classesContainer');
    const classFilter = document.getElementById('classSelector').value;
    const yearFilter = document.getElementById('yearSelector').value;
    const schoolKey = getProfileSchoolKey();
    const schoolConfig = ALL_SCHOOLS[schoolKey] || ALL_SCHOOLS.mcmaster;
    const gradingConfig = GRADING_SCALES[schoolConfig.scale];

    if (!container) return;
    container.innerHTML = '';

    let totalWeightedPoints = 0;
    let totalUnits = 0;
    let staggerIndex = 0;

    Object.keys(courses).sort().forEach(name => {
        const outlineItems = getCourseOutline(name);
        const course = courses[name];
        const courseYear = getYearFromName(name);

        if (yearFilter !== 'all' && yearFilter !== courseYear) return;
        if (classFilter !== 'all' && classFilter !== name) return;

        let currentWeight = 0;
        let weightedSum = 0;
        course.grades.forEach(g => {
            weightedSum += (g.score * (g.weight / 100));
            currentWeight += g.weight;
        });

        const currentAvg = currentWeight > 0 ? (weightedSum / (currentWeight / 100)) : 0;
        const remainingWeight = 100 - currentWeight;
        const target = course.target ?? 80;
        const needed = remainingWeight > 0 ? ((target - weightedSum) / (remainingWeight / 100)) : 0;
        const bestCase = weightedSum + (1.0 * remainingWeight);
        const worstCase = weightedSum + (0.5 * remainingWeight);

        const units = course.units || 3;
        if (course.finalLetter) {
            totalWeightedPoints += (gradingConfig.map[course.finalLetter] * units);
            totalUnits += units;
        } else if (currentAvg > 0) {
            const approxLetter = Object.keys(letterToPercent).find(l => currentAvg >= letterToPercent[l]) || 'F';
            totalWeightedPoints += (gradingConfig.map[approxLetter] * units);
            totalUnits += units;
        }

        const isFinal = course.finalLetter;
        const delay = (staggerIndex * 0.1).toFixed(2);
        staggerIndex++;

        container.innerHTML += `
            <div class="card ${isFinal ? 'finalized' : ''}" style="animation-delay: ${delay}s">
                <div class="card-header">
                    <h2>
                        ${name}
                        <span class="unit-badge">${units} Units</span>
                        ${isFinal ? `<span class="badge">${isFinal}</span>` : ''}
                    </h2>
                    <button class="delete-btn" onclick="deleteClass('${name}')">Delete</button>
                </div>

                ${!isFinal ? `
                    <div class="stats-grid">
                        <div class="stat">
                            <label>Current Average</label>
                            <div class="val">${currentAvg.toFixed(1)}%</div>
                        </div>
                        <div class="stat">
                            <label>Target %</label>
                            <input type="number" class="inline-input" value="${target || ''}" onchange="updateTarget('${name}', this.value)">
                        </div>
                    </div>

                    <div class="needed-box ${needed > 100 ? 'danger' : ''}">
                        ${remainingWeight > 0
                    ? `Need an average of <strong>${needed.toFixed(1)}%</strong> on the remaining ${remainingWeight}% weight.`
                    : `All weights accounted for.`}
                    </div>

                    <div class="range-projection">
                        <label>Projection Range</label>
                        <div class="range-bar">
                            <span>Worst Case: <strong>${worstCase.toFixed(1)}%</strong></span>
                            <span>Best Case: <strong>${bestCase.toFixed(1)}%</strong></span>
                        </div>
                    </div>

                    <div class="grade-list">
                        ${course.grades.map((g, idx) => `
                            <div class="grade-row">
                                <span><strong>${g.score}%</strong> <small>(${g.weight}% weight)</small></span>
                                <button class="mini-del" onclick="deleteGrade('${name}', ${idx})">×</button>
                            </div>
                        `).join('') || '<p style="font-size:0.8rem; color:#94a3b8">No grades added yet.</p>'}
                    </div>

                    <div class="outline-breakdown">
                        <label>Course Outline Weights</label>
                        ${outlineItems.length ? outlineItems.map(item => `<div class="outline-chip">${item.name} — ${item.weight}%</div>`).join('') : '<span class="empty-state">No outline imported for this course yet.</span>'}
                    </div>

                    <div class="add-grade-zone">
                        <input type="number" id="score-${name}" placeholder="Grade %">
                        <input type="number" id="weight-${name}" placeholder="Weight %">
                        ${outlineItems.length ? `
                            <select id="assessment-${name}">
                                <option value="">Manual weight</option>
                                ${outlineItems.map(item => `<option value="${item.name}">${item.name} (${item.weight}%)</option>`).join('')}
                            </select>
                        ` : ''}
                        <button onclick="addGrade('${name}')">Add</button>
                    </div>

                    <div id="finalize-ui-${name}" class="finalize-confirm-zone" style="display: none;">
                        <label>Pick Official Letter Grade:</label>
                        <div style="display:flex; gap:10px;">
                            <select id="letter-select-${name}" style="flex:2; padding:8px; border-radius:8px;">
                                ${Object.keys(gradingConfig.map).map(l => `<option value="${l}">${l}</option>`).join('')}
                            </select>
                            <button class="confirm-btn" onclick="confirmFinalGrade('${name}')" style="flex:1; background:var(--accent); color:white;">Confirm</button>
                        </div>
                    </div>

                    <button class="finalize-toggle-btn" onclick="showFinalizeUI('${name}')">Finalize Course</button>
                ` : `
                    <div class="final-display">
                        <p style="margin:0; color:#64748b;">Completed Grade</p>
                        <strong>${isFinal}</strong>
                        <button onclick="unfinalizeCourse('${name}')" class="secondary-btn" style="border-radius:6px; margin-top:10px;">Edit / Re-open</button>
                    </div>
                `}
            </div>
        `;
    });

    const finalGpa = totalUnits > 0 ? (totalWeightedPoints / totalUnits) : 0;
    const totalGpaEl = document.getElementById('totalGpa');
    const gpaLabelEl = document.getElementById('gpaLabel');
    if (totalGpaEl) totalGpaEl.textContent = finalGpa.toFixed(2);
    if (gpaLabelEl) gpaLabelEl.textContent = `Overall ${schoolConfig.label}`;
}

function renderCoursesDashboard() {
    const container = document.getElementById('coursesContainer');
    if (!container) return;

    const courseKeys = Object.keys(courses).sort();
    if (courseKeys.length === 0) {
        container.innerHTML = '<p class="empty-state">No courses yet. Add a class in the Grades tab.</p>';
        return;
    }

    container.innerHTML = courseKeys.map(name => {
        const course = courses[name];
        // compute current average and counts
        let totalWeighted = 0, totalWeight = 0;
        (course.grades || []).forEach(g => { totalWeighted += g.score * (g.weight/100); totalWeight += g.weight; });
        const currentAvg = totalWeight > 0 ? (totalWeighted / (totalWeight/100)).toFixed(1) : '—';
        const gradeCount = (course.grades || []).length;
        const linkedFiles = (studyFiles || []).filter(f => (f.course || '').toUpperCase() === name.toUpperCase()).length;
        const upcomingTasks = (plannerTasks || []).filter(t => (t.course || 'General').toUpperCase() === name.toUpperCase() && !t.done && t.deadline).length;
        const target = course.target || 0;

        return `
            <button class="course-card panel-card" data-course="${name}" onclick="openCourseDashboard('${name.replace(/'/g, "\\'")}')">
                <div style="display:flex; justify-content: space-between; align-items:center; gap:12px;">
                    <div>
                        <strong>${name}</strong>
                        <div style="color:var(--muted); font-size:0.9rem;">${gradeCount} assessments • ${linkedFiles} files • ${upcomingTasks} upcoming</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.25rem; font-weight:800; color:var(--primary);">${currentAvg}%</div>
                        <div style="color:var(--muted); font-weight:700;">Target: ${target}%</div>
                    </div>
                </div>
            </button>
        `;
    }).join('');
}

function renderFocusDashboard() {
    const panel = document.getElementById('focusContainer');
    if (!panel) return;
    const focusPlan = computeFocusPlan();
    const topItems = focusPlan.slice(0, 5);

    panel.innerHTML = `
        <div class="panel-card">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Focus Today</p>
                    <h3>Priority tasks and quick actions</h3>
                </div>
            </div>
            <div class="notes-line">Your most important deadlines and study reminders are sorted by urgency, risk, and course needs.</div>
            <div style="margin-top:16px; display:flex; flex-direction:column; gap:12px;">
                ${topItems.length ? topItems.map(item => `
                    <div class="task-item ${item.task.done ? 'done' : ''}">
                        <div>
                            <strong>${item.task.title}</strong>
                            <p>${item.task.course || 'General'} • ${item.task.deadline || 'No date'} • ${item.task.priority}</p>
                            <p>${item.reasons.join(' • ')}</p>
                        </div>
                        <button class="task-action" onclick="setActiveTab('planner')">Open</button>
                    </div>
                `).join('') : '<p class="empty-state">No focus tasks available. Add a planner item to create your first priority list.</p>'}
            </div>
            <div style="margin-top:16px; display:flex; gap:12px; flex-wrap:wrap;">
                <button class="panel-btn" onclick="setActiveTab('planner')">Open Planner</button>
                <button class="panel-btn" onclick="setActiveTab('courses')">Open Course</button>
                <button class="panel-btn" onclick="setActiveTab('study')">Start Study Session</button>
            </div>
        </div>
    `;
}

function openCourseDashboard(name) {
    const panel = document.getElementById('coursesPanel');
    if (!panel) return;

    const course = courses[name];
    if (!course) return;

    // compute stats
    let totalWeighted = 0, totalWeight = 0;
    (course.grades || []).forEach(g => { totalWeighted += g.score * (g.weight/100); totalWeight += g.weight; });
    const currentAvg = totalWeight > 0 ? (totalWeighted / (totalWeight/100)) : 0;
    const remainingWeight = Math.max(0, 100 - totalWeight);
    const upcomingAssignments = (course.grades || []).filter(g => !g.done && g.weight && g.weight>0).length;
    const linkedFiles = (studyFiles || []).filter(f => (f.course || '').toUpperCase() === name.toUpperCase());
    const relatedTasks = (plannerTasks || []).filter(t => (t.course || 'General').toUpperCase() === name.toUpperCase());
    const outlineItems = getCourseOutline(name);
    const totalAssessments = (course.grades || []).length;
    const assessmentsRemaining = outlineItems.length - totalAssessments;
    const estimatedFinal = totalWeight > 0 ? ((totalWeighted + (currentAvg * remainingWeight/100)).toFixed(1)) : '—';

    panel.querySelector('.panel-card').innerHTML = `
        <div class="panel-heading">
            <div>
                <p class="eyebrow">Course Dashboard</p>
                <h3>${name}</h3>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
                <button class="secondary-btn" onclick="closeCourseDashboard()">← Back</button>
            </div>
        </div>
        <div class="course-detail-grid">
            <div class="panel-card">
                <h3>Overview</h3>
                <p><strong>Current average:</strong> ${currentAvg ? currentAvg.toFixed(1) + '%' : '—'}</p>
                <p><strong>Target:</strong> ${course.target || '—'}%</p>
                <p><strong>Remaining weight:</strong> ${remainingWeight}%</p>
                <p><strong>Upcoming assignments:</strong> ${relatedTasks.filter(t=>t.deadline && !t.done).length}</p>
            </div>

            <div class="panel-card">
                <h3>Grades</h3>
                <div>
                    ${(course.grades || []).length === 0 ? '<p class="empty-state">No grades recorded.</p>' : `
                        <div class="grade-list">
                            ${(course.grades || []).map(g => `
                                <div class="grade-row">
                                    <div><strong>${g.score}%</strong> <small>${g.assessment ? g.assessment : ''}</small></div>
                                    <div><small>${g.weight}%</small></div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>

            <div class="panel-card">
                <h3>Course Files</h3>
                ${linkedFiles.length === 0 ? '<p class="empty-state">No files attached to this course.</p>' : `
                    <div class="resource-list">
                        ${linkedFiles.map(f => `
                            <div class="resource-item">
                                <div>
                                    <strong>${f.title}</strong>
                                    <p>${f.category}</p>
                                    ${f.attachment ? (f.attachment.type.startsWith('image/') ? `<img src="${f.attachment.data}" style="max-width:100%; border-radius:8px;" />` : `<a class="resource-link" href="${f.attachment.data}" target="_blank">Open</a>`) : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <div class="panel-card">
                <h3>Planner</h3>
                ${relatedTasks.length === 0 ? '<p class="empty-state">No planner items for this course.</p>' : `
                    <div class="task-list">
                        ${relatedTasks.map(t => `
                            <div class="task-item ${t.done ? 'done' : ''}">
                                <div><strong>${t.title}</strong><p>${t.deadline || 'No deadline'} • ${t.priority}</p></div>
                                <div style="display:flex; gap:6px;"><button class="task-action" onclick="togglePlannerTask(${t.id})">✓</button></div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>

            <div class="panel-card">
                <h3>Course Outline</h3>
                ${outlineItems.length === 0 ? '<p class="empty-state">No outline imported.</p>' : `
                    ${outlineItems.map(it => `<div class="outline-chip">${it.name} — ${it.weight}%${it.dueDate ? ` • due ${it.dueDate}` : ''}</div>`).join('')}
                `}
            </div>

            <div class="panel-card">
                <h3>Quick Stats</h3>
                <p><strong>Total assessments completed:</strong> ${totalAssessments}</p>
                <p><strong>Total assessments remaining:</strong> ${assessmentsRemaining > 0 ? assessmentsRemaining : 0}</p>
                <p><strong>Estimated final grade:</strong> ${estimatedFinal}</p>
            </div>
        </div>
    `;
}

function closeCourseDashboard() {
    // re-render everything to restore original courses panel content
    render();
}

// --- Study Center implementation ---
let timerInterval = null;
let timerRemaining = 0; // seconds
let timerElapsed = 0; // seconds
let timerRunning = false;
let timerModeSeconds = 0;

function renderStudyCenter() {
    const container = document.getElementById('studyContainer');
    if (!container) return;

    const courseOptions = Object.keys(courses).sort();

    container.innerHTML = `
        <div class="panel-card study-timer-card">
            <h3>Study Timer</h3>
            <div class="panel-form">
                <label>Course</label>
                <select id="timerCourse">
                    <option value="">Select course</option>
                    ${courseOptions.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
                <label>Mode</label>
                <div class="study-mode-row">
                    <button class="view-toggle-btn" onclick="setTimerMode(25)">25 min</button>
                    <button class="view-toggle-btn" onclick="setTimerMode(50)">50 min</button>
                    <input id="timerCustom" class="study-custom-input" type="number" placeholder="Custom min" />
                    <button class="view-toggle-btn" onclick="applyCustomMode()">Set</button>
                </div>
                <label>Study type (optional)</label>
                <select id="timerType">
                    <option value="">General</option>
                    <option>Reading</option>
                    <option>Flashcards</option>
                    <option>Assignment</option>
                    <option>Review</option>
                    <option>Practice Problems</option>
                </select>
                <div class="study-timer-row">
                    <div class="study-timer-display"><span id="timerDisplay">00:00</span></div>
                    <div class="study-timer-actions">
                        <button class="panel-btn" onclick="startTimer()">Start</button>
                        <button class="panel-btn" onclick="pauseTimer()">Pause</button>
                        <button class="panel-btn" onclick="resumeTimer()">Resume</button>
                        <button class="secondary-btn" onclick="resetTimer()">Reset</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="panel-card study-analytics-card">
            <h3>Study Analytics</h3>
            <div id="studySummary" class="study-summary-grid"></div>
            <div id="studyCharts" class="study-charts"></div>
            <div id="studyInsights" class="study-insights"></div>
        </div>
    `;

    updateTimerDisplay();
    renderStudyAnalytics();
}

function setTimerMode(minutes) {
    timerModeSeconds = minutes * 60;
    timerRemaining = timerModeSeconds;
    timerElapsed = 0;
    updateTimerDisplay();
}

function applyCustomMode() {
    const v = parseInt(document.getElementById('timerCustom').value, 10);
    if (v && v > 0) setTimerMode(v);
}

function updateTimerDisplay() {
    const el = document.getElementById('timerDisplay');
    if (!el) return;
    const s = timerRemaining;
    const mm = String(Math.floor(s/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    el.textContent = `${mm}:${ss}`;
}

function startTimer() {
    const course = document.getElementById('timerCourse').value;
    if (!course) { showToast('Please select a course before starting.', 'error'); return; }
    if (!timerModeSeconds) { showToast('Please pick a mode (25/50) or set a custom duration.', 'error'); return; }
    if (timerRunning) return;
    timerRemaining = timerModeSeconds;
    timerElapsed = 0;
    timerRunning = true;
    timerInterval = setInterval(() => {
        timerRemaining -= 1; timerElapsed += 1; updateTimerDisplay();
        if (timerRemaining <= 0) { clearInterval(timerInterval); timerRunning = false; onTimerComplete(); }
    }, 1000);
}

function pauseTimer() {
    if (!timerRunning) return;
    clearInterval(timerInterval); timerRunning = false;
}

function resumeTimer() {
    if (timerRunning || !timerModeSeconds) return;
    timerRunning = true;
    timerInterval = setInterval(() => {
        timerRemaining -= 1; timerElapsed += 1; updateTimerDisplay();
        if (timerRemaining <= 0) { clearInterval(timerInterval); timerRunning = false; onTimerComplete(); }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval); timerRunning = false; timerRemaining = timerModeSeconds; timerElapsed = 0; updateTimerDisplay();
}

function onTimerComplete() {
    const course = document.getElementById('timerCourse').value || 'General';
    const type = document.getElementById('timerType').value || 'General';
    const durationMinutes = Math.max(1, Math.round(timerElapsed/60));
    const date = new Date(); date.setHours(0,0,0,0);
    const session = {
        id: Date.now(),
        date: date.toISOString().split('T')[0],
        durationMinutes,
        course,
        type
    };
    studySessions.unshift(session);
    saveStudySessions();
    render();
    showToast('Study session saved: ' + durationMinutes + ' min', 'success');
}

// --- Study Analytics ---
function renderStudyAnalytics() {
    const summaryEl = document.getElementById('studySummary');
    const chartsEl = document.getElementById('studyCharts');
    const insightsEl = document.getElementById('studyInsights');
    if (!summaryEl || !chartsEl || !insightsEl) return;

    // Daily stats
    const todayStr = getTodayDateStr();
    const todayMinutes = (studySessions.filter(s=>s.date===todayStr).reduce((a,b)=>a+(b.durationMinutes||0),0));
    const todaySessionsCount = studySessions.filter(s=>s.date===todayStr).length;
    const todayMost = (()=>{ const map={}; studySessions.filter(s=>s.date===todayStr).forEach(s=>map[s.course]=(map[s.course]||0)+(s.durationMinutes||0)); const ks=Object.keys(map); return ks.length?ks.sort((a,b)=>map[b]-map[a])[0]:null; })();
    const streak = getCurrentStreak();

    summaryEl.innerHTML = `
        <div class="stat card study-stat-card"><label>Minutes today</label><div class="study-stat-value">${todayMinutes}</div></div>
        <div class="stat card study-stat-card"><label>Sessions today</label><div class="study-stat-value">${todaySessionsCount}</div></div>
        <div class="stat card study-stat-card"><label>Most studied today</label><div class="study-stat-copy">${todayMost||'—'}</div></div>
        <div class="stat card study-stat-card"><label>Current streak</label><div class="study-stat-value">${streak}d</div></div>
    `;

    // Weekly charts and numbers
    const monday = getWeekStart(new Date()); const end = new Date(monday); end.setDate(end.getDate()+6);
    const weekSessions = studySessions.filter(s=>{ const sd=new Date(s.date); return sd>=monday && sd<=end; });
    const weekMinutes = weekSessions.reduce((a,b)=>a+(b.durationMinutes||0),0);
    const weekSessionsCount = weekSessions.length;
    const weekAvg = weekSessionsCount?Math.round(weekMinutes/weekSessionsCount):0;
    const weekMost = (()=>{ const map={}; weekSessions.forEach(s=>map[s.course]=(map[s.course]||0)+(s.durationMinutes||0)); const ks=Object.keys(map); if(!ks.length) return null; return ks.sort((a,b)=>map[b]-map[a])[0]; })();

    // Weekly bar chart (simple HTML bars)
    const days = [];
    for (let i=0;i<7;i++){ const d=new Date(monday); d.setDate(d.getDate()+i); const ds=d.toISOString().split('T')[0]; const mins=studySessions.filter(s=>s.date===ds).reduce((a,b)=>a+(b.durationMinutes||0),0); days.push({day:d.toLocaleDateString('en-US',{weekday:'short'}),mins}); }

    const maxDay = Math.max(1, ...days.map(d=>d.mins));
    const bars = days.map(d=>`<div style="display:flex; align-items:flex-end; gap:6px;">
            <div style="width:28px; height:80px; display:flex; align-items:flex-end;">
                <div style="width:100%; background:linear-gradient(135deg,var(--primary),var(--accent)); height:${Math.round((d.mins/maxDay)*100)}%; border-radius:6px;" title="${d.mins} min"></div>
            </div>
            <div style="font-size:0.75rem; color:var(--muted);">${d.day}</div>
        </div>`).join('');

    chartsEl.innerHTML = `
        <div class="study-chart-grid">
            <div class="study-chart-card">
                <h4>Weekly</h4>
                <div class="study-bar-chart">${bars}</div>
                <p>Total hours: ${(weekMinutes/60).toFixed(1)}</p>
                <p>Sessions: ${weekSessionsCount} • Avg: ${weekAvg} min</p>
            </div>
            <div class="study-chart-card">
                <h4>By course (this week)</h4>
                ${weekMost?`<div class="study-top-course">${weekMost}</div>`:'<p class="empty-state">No data</p>'}
                <div class="study-course-breakdown">${Object.keys(courses).map(c=>{ const mins=weekSessions.filter(s=>s.course===c).reduce((a,b)=>a+(b.durationMinutes||0),0); if(mins===0) return ''; const pct=Math.round((mins/weekMinutes||0)*100); return `<div><strong>${c}</strong> • ${mins} min • ${pct}%</div>` }).join('')}</div>
            </div>
        </div>
    `;

    // Smart insights
    const insights = [];
    if (weekMost) insights.push(`You studied ${weekMost} the most this week.`);
    // compare to last week
    const lastWeekStart = new Date(monday); lastWeekStart.setDate(lastWeekStart.getDate()-7); const lastWeekEnd = new Date(lastWeekStart); lastWeekEnd.setDate(lastWeekStart.getDate()+6);
    const lastWeekMins = studySessions.filter(s=>{ const sd=new Date(s.date); return sd>=lastWeekStart && sd<=lastWeekEnd; }).reduce((a,b)=>a+(b.durationMinutes||0),0);
    if (lastWeekMins>0) {
        const diff = weekMinutes - lastWeekMins; const pct = Math.round((diff/lastWeekMins)*100);
        if (pct>0) insights.push(`You studied ${pct}% more this week than last week.`);
        else if (pct<0) insights.push(`You studied ${Math.abs(pct)}% less this week than last week.`);
    }

    // per-course last studied
    Object.keys(courses).forEach(c=>{
        const sessions = studySessions.filter(s=>s.course===c).sort((a,b)=>b.id-a.id);
        if (sessions.length) {
            const last = sessions[0]; const lastDiffDays = Math.floor((new Date()-new Date(last.date))/ (1000*60*60*24));
            if (lastDiffDays>7) insights.push(`${c} has not been studied in ${lastDiffDays} days.`);
        }
    });

    // longest streak
    // compute longest streak
    let longest = 0; let current = 0; const dates = Array.from(new Set(studySessions.map(s=>s.date))).sort();
    let prev = null;
    dates.forEach(d=>{ if (!prev) { current=1; } else { const pd=new Date(prev); pd.setHours(0,0,0,0); const cd=new Date(d); cd.setHours(0,0,0,0); const diff=(cd-pd)/(1000*60*60*24); if (diff===1) { current++; } else current=1; } prev=d; if (current>longest) longest=current; });
    if (longest>0) insights.push(`Your longest streak is ${longest} days.`);

    insightsEl.innerHTML = insights.map(s=>`<div>• ${s}</div>`).join('') || '<div>No insights yet — start a session.</div>';
}

// --- end Study Center implementation ---

function initGradeCoachChat() {
    const chatInput = document.getElementById('gradeChatInput');
    if (chatInput) {
        chatInput.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleGradeChat();
            }
        });
    }
}

function handleGradeChat() {
    const input = document.getElementById('gradeChatInput');
    if (!input) return;

    const message = input.value.trim();
    if (!message) return;

    appendGradeCoachMessage(message, 'user');
    input.value = '';

    setTimeout(() => {
        appendGradeCoachMessage(generateGradeCoachReply(message), 'bot');
    }, 200);
}

function appendGradeCoachMessage(text, sender) {
    const chatWindow = document.getElementById('gradeChatWindow');
    if (!chatWindow) return;

    const bubble = document.createElement('div');
    bubble.className = `chat-message ${sender === 'user' ? 'user' : 'bot'}`;
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    chatWindow.appendChild(bubble);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function generateGradeCoachReply(message) {
    const normalized = message.toLowerCase();
    const course = detectCourseReference(message);
    const assignment = extractAssignmentName(message);
    const targetGrade = extractTargetGrade(message);
    const futureGrade = extractFutureGrade(message);
    const currentGrade = extractCurrentGrade(message, course);
    const explicitWeight = extractWeight(message, course, assignment);

    if (course && !isCourseKnown(course)) {
        return `I couldn't find "${course}" in your course list. Make sure you've created that course in the Grades tab and use the same course code when asking.`;
    }

    if (/need|what do i need|how much.*need|need.*on/i.test(message) && targetGrade !== null) {
        if (!assignment && !/rest of the course|remaining.*course|remaining.*work/i.test(normalized)) {
            return `Tell me the assessment name (final, midterm, project, etc.) and the weight or current average so I can compute it accurately.`;
        }

        const weight = explicitWeight !== null ? explicitWeight : getAssignedWeight(course, assignment, normalized);
        if (weight === null) {
            return `I can calculate this once you tell me how much that assessment is worth, for example "final is 35%" or "midterm worth 30%".`;
        }

        if (currentGrade === null) {
            return `I also need your current grade in the course to calculate what you need on that assessment.`;
        }

        const needed = computeNeededScore(currentGrade, targetGrade, weight);
        if (needed > 100) {
            return `To finish at ${targetGrade}%, you'd need about ${needed.toFixed(1)}% on the ${assignment || 'remaining work'}, which is higher than 100%. That means the target is likely too high for the remaining weight.`;
        }
        return `If your current average is ${currentGrade}% and the ${assignment || 'assessment'} is worth ${weight}%, you need about ${needed.toFixed(1)}% on it to finish at ${targetGrade}%.`;
    }

    if (/if.*get|what.*overall|overall.*grade|course.*overall/i.test(message) && futureGrade !== null) {
        const weight = explicitWeight !== null ? explicitWeight : getAssignedWeight(course, assignment, normalized);
        if (weight === null) {
            return `I need to know the weight of the assessment or remaining course work before I can project your overall grade.`;
        }
        if (currentGrade === null) {
            return `Please tell me your current course average so I can compute your projected overall grade.`;
        }
        const projected = computeProjectedOverall(currentGrade, futureGrade, weight);
        return `If your current average is ${currentGrade}% and you score ${futureGrade}% on the ${assignment || 'remaining work'} worth ${weight}%, your projected overall grade would be ${projected.toFixed(1)}%.`;
    }

    if (/rest of the course|remaining.*course|remaining.*work/i.test(normalized) && futureGrade !== null) {
        const weight = explicitWeight !== null ? explicitWeight : getAssignedWeight(course, assignment, normalized);
        if (weight === null) {
            return `I can estimate this once you tell me how much of the course is still left or the weight of the remaining work.`;
        }
        if (currentGrade === null) {
            return `I need your current average to calculate the final projected grade.`;
        }
        const projected = computeProjectedOverall(currentGrade, futureGrade, weight);
        return `If the rest of your course is averaged at ${futureGrade}% and that remaining portion counts for ${weight}%, your overall grade would become about ${projected.toFixed(1)}%.`;
    }

    if (course && targetGrade === null && futureGrade === null) {
        return `I see you're asking about ${course}. If you tell me a target grade and the assessment weight, I can help figure out what you need.`;
    }

    return `I can help answer questions like:
- "What do I need on the final to get 85%?"
- "If I get 90% on the final, what will my overall be?"
- "If I get 80% on the rest of the course?"

Include the course code, the assessment, and any percent weights you already know.`;
}

function detectCourseReference(text) {
    const normalized = text.toLowerCase();
    const options = Array.from(document.querySelectorAll('#classSelector option'))
        .map(opt => opt.value.trim())
        .filter(value => value && value.toLowerCase() !== 'all');

    for (const option of options) {
        if (normalized.includes(option.toLowerCase())) {
            return option;
        }
    }

    const selected = document.getElementById('classSelector');
    if (selected && selected.value && selected.value !== 'all') {
        return selected.value;
    }

    const codeMatch = text.match(/\b([A-Za-z]{2,5}\d{1,4}[A-Za-z]*)\b/);
    return codeMatch ? codeMatch[1].toUpperCase() : null;
}

function isCourseKnown(course) {
    if (!course) return false;
    return Boolean(courses[course.toUpperCase()]);
}

function getCourseCurrentAverage(courseCode) {
    const normalizedCode = (courseCode || '').toUpperCase();
    const course = courses[normalizedCode];
    if (!course) return null;

    let total = 0;
    let weight = 0;
    course.grades.forEach(g => {
        total += g.score * (g.weight / 100);
        weight += g.weight;
    });

    return weight > 0 ? parseFloat((total / (weight / 100)).toFixed(1)) : null;
}

function getCourseCurrentWeight(courseCode) {
    const normalizedCode = (courseCode || '').toUpperCase();
    const course = courses[normalizedCode];
    if (!course) return 0;
    return course.grades.reduce((sum, g) => sum + (g.weight || 0), 0);
}

function extractTargetGrade(text) {
    const match = text.match(/(?:to|get|need|want|goal|finish at)\s+([0-9]{1,3}(?:\.[0-9]+)?)\s*%/i);
    return match ? Number(match[1]) : null;
}

function extractFutureGrade(text) {
    const match = text.match(/(?:if i get|if i score|if i receive|i get|score|will get)\s+([0-9]{1,3}(?:\.[0-9]+)?)\s*%/i);
    return match ? Number(match[1]) : null;
}

function extractCurrentGrade(text, course) {
    const explicit = text.match(/(?:current|so far|right now|already)\s+(?:grade\s+)?([0-9]{1,3}(?:\.[0-9]+)?)\s*%/i);
    if (explicit) return Number(explicit[1]);

    if (course) {
        return getCourseCurrentAverage(course);
    }
    return null;
}

function extractAssignmentName(text) {
    const match = text.match(/\b(final|midterm|exam|assignment\s*\d*|project|quiz|test)\b/i);
    return match ? match[1] : null;
}

function extractWeight(text, courseCode, assignmentName) {
    const explicit = text.match(/(?:worth|weight|counts for|is worth|is)\s*([0-9]{1,3}(?:\.[0-9]+)?)\s*%/i);
    if (explicit) {
        return Number(explicit[1]);
    }

    if (courseCode && assignmentName) {
        const outline = getCourseOutline(courseCode);
        const normalizedAssignment = normalizeText(assignmentName);
        const match = outline.find(item => {
            const normalizedItem = normalizeText(item.name);
            return normalizedItem === normalizedAssignment ||
                normalizedItem.includes(normalizedAssignment) ||
                normalizedAssignment.includes(normalizedItem);
        });
        if (match) return match.weight;
    }

    if (/rest of the course|remaining.*course|remaining.*work|rest.*course/i.test(text.toLowerCase())) {
        const totalWeight = getCourseCurrentWeight(courseCode);
        if (totalWeight >= 0 && totalWeight < 100) {
            return 100 - totalWeight;
        }
    }

    return null;
}

function getAssignedWeight(courseCode, assignment, normalizedText) {
    if (assignment && courseCode) {
        const weight = extractWeight(normalizedText, courseCode, assignment);
        if (weight !== null) return weight;
    }

    if (courseCode && /rest of the course|remaining.*course|remaining.*work|rest.*course/i.test(normalizedText)) {
        const totalWeight = getCourseCurrentWeight(courseCode);
        if (totalWeight >= 0 && totalWeight < 100) return 100 - totalWeight;
    }

    return null;
}

function computeNeededScore(current, target, weight) {
    const remainingWeight = weight / 100;
    return (target - current * (1 - remainingWeight)) / remainingWeight;
}

function computeProjectedOverall(current, future, weight) {
    const remainingWeight = weight / 100;
    return current * (1 - remainingWeight) + future * remainingWeight;
}

let countdownItems = [];
let currentCountdownIndex = 0;
let countdownCycleTimer = null;

function buildCountdownItems() {
    countdownItems = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const finalDates = [];
    const examDates = [];
    const midtermDates = [];

    plannerTasks.forEach(task => {
        if (task.deadline) {
            const taskDate = new Date(task.deadline);
            taskDate.setHours(0, 0, 0, 0);

            const daysUntil = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));

            if (daysUntil >= 0) {
                const titleLower = task.title.toLowerCase();
                const courseLower = (task.course || '').toLowerCase();

                if (/final/i.test(titleLower) || /final exam/i.test(titleLower)) {
                    finalDates.push({ date: taskDate, days: daysUntil, title: task.title });
                } else if (/midterm/i.test(titleLower) || /midterm exam/i.test(titleLower)) {
                    midtermDates.push({ date: taskDate, days: daysUntil, title: task.title });
                } else if (/exam/i.test(titleLower) || /start.*exam/i.test(titleLower)) {
                    examDates.push({ date: taskDate, days: daysUntil, title: task.title });
                }
            }
        }
    });

    if (finalDates.length > 0) {
        const latest = finalDates.sort((a, b) => a.days - b.days)[finalDates.length - 1];
        countdownItems.push({
            label: 'Days Until End of Semester',
            days: latest.days,
            title: latest.title
        });
    }

    if (examDates.length > 0) {
        const earliest = examDates.sort((a, b) => a.days - b.days)[0];
        countdownItems.push({
            label: 'Days Until Start of Exams',
            days: earliest.days,
            title: earliest.title
        });
    }

    if (midtermDates.length > 0) {
        const nextMidterm = midtermDates.filter(m => m.days >= 0).sort((a, b) => a.days - b.days)[0];
        if (nextMidterm) {
            countdownItems.push({
                label: 'Days Until Next Midterm',
                days: nextMidterm.days,
                title: nextMidterm.title
            });
        }
    }

    countdownItems.sort((a, b) => a.days - b.days);

    if (countdownItems.length === 0) {
        countdownItems.push({
            label: 'No Deadlines Set',
            days: null,
            title: 'Add tasks to see countdowns'
        });
    }

    currentCountdownIndex = 0;
}

function renderCountdownWidget() {
    buildCountdownItems();

    const display = document.getElementById('countdownDisplay');
    const dotsContainer = document.getElementById('countdownDots');

    if (!display || countdownItems.length === 0) return;

    const current = countdownItems[currentCountdownIndex];
    display.innerHTML = `
        <div class="countdown-item">
            <p class="countdown-label">${current.label}</p>
            <div class="countdown-days">${current.days !== null ? current.days : '—'}</div>
            <p style="margin: 8px 0 0; font-size: 0.9rem; color: var(--muted);">${current.title}</p>
        </div>
    `;

    dotsContainer.innerHTML = countdownItems
        .map((_, idx) => `<div class="dot ${idx === currentCountdownIndex ? 'active' : ''}" onclick="jumpToCountdownIndex(${idx})"></div>`)
        .join('');

    startCountdownCycle();
}

function cycleCountdownNext() {
    currentCountdownIndex = (currentCountdownIndex + 1) % countdownItems.length;
    renderCountdownWidget();
}

function cycleCountdownPrev() {
    currentCountdownIndex = (currentCountdownIndex - 1 + countdownItems.length) % countdownItems.length;
    renderCountdownWidget();
}

function jumpToCountdownIndex(idx) {
    currentCountdownIndex = idx;
    renderCountdownWidget();
}

function startCountdownCycle() {
    if (countdownCycleTimer) {
        clearInterval(countdownCycleTimer);
    }

    if (countdownItems.length > 1) {
        countdownCycleTimer = setInterval(() => {
            currentCountdownIndex = (currentCountdownIndex + 1) % countdownItems.length;
            renderCountdownWidget();
        }, 5000);
    }
}

let currentCalendarDate = new Date();
let calendarViewMode = 'month';

function getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getFirstDayOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

function formatMonthYear(date) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatWeekRange(startDate, endDate) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const start = `${months[startDate.getMonth()]} ${startDate.getDate()}`;
    const end = `${months[endDate.getMonth()]} ${endDate.getDate()}`;
    return `${start} - ${end}, ${endDate.getFullYear()}`;
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function getSunday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

function openCalendarDayView(dateStr) {
    const parts = (dateStr || '').split('-').map(Number);
    if (parts.length === 3 && parts.every(Number.isFinite)) {
        currentCalendarDate = new Date(parts[0], parts[1] - 1, parts[2]);
    }
    setCalendarView('day');
}

function getEventsForDate(date) {
    const dateStr = date.toISOString().split('T')[0];
    const events = [];

    plannerTasks.forEach(task => {
        if (task.deadline === dateStr) {
            const titleLower = task.title.toLowerCase();
            let type = 'task';
            if (/final/i.test(titleLower)) type = 'final';
            else if (/midterm/i.test(titleLower)) type = 'midterm';
            else if (/exam/i.test(titleLower)) type = 'exam';

            events.push({
                title: task.title,
                course: task.course,
                type: type,
                priority: task.priority,
                done: task.done
            });
        }
    });

    return events;
}

function setCalendarView(view) {
    calendarViewMode = view;
    const monthBtn = document.getElementById('monthViewBtn');
    const weekBtn = document.getElementById('weekViewBtn');
    const timelineBtn = document.getElementById('timelineViewBtn');
    if (monthBtn) monthBtn.classList.toggle('active', view === 'month');
    if (weekBtn) weekBtn.classList.toggle('active', view === 'week');
    if (timelineBtn) timelineBtn.classList.toggle('active', view === 'timeline');
    renderCalendar();
}

function renderCalendarMonth() {
    const container = document.getElementById('calendarContainer');
    const title = document.getElementById('calendarTitle');

    if (!container) return;

    title.textContent = formatMonthYear(currentCalendarDate);

    const daysInMonth = getDaysInMonth(currentCalendarDate);
    const firstDay = getFirstDayOfMonth(currentCalendarDate);
    const previousMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 0);
    const daysInPreviousMonth = getDaysInMonth(previousMonth);

    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let calendarHTML = dayHeaders.map(day => `<div class="calendar-day-header">${day}</div>`).join('');

    for (let i = firstDay - 1; i >= 0; i--) {
        const dayNum = daysInPreviousMonth - i;
        calendarHTML += `<div class="calendar-day other-month"><div class="calendar-day-number">${dayNum}</div></div>`;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
        const isToday = currentDate.getTime() === today.getTime();
        const events = getEventsForDate(currentDate);

        const visibleEvents = events.slice(0, 3).map(e => `<span class="calendar-event-label ${e.type}" title="${escapeAttr(e.title)}">${escapeHtml(e.title)}</span>`).join('');
        const moreCount = events.length > 3 ? `<span class="calendar-event-label more">+${events.length - 3} more</span>` : '';

        calendarHTML += `
            <div class="calendar-day ${isToday ? 'today-highlight' : ''}">
                <div class="calendar-day-number">${day}</div>
                <div class="calendar-events">${visibleEvents}${moreCount}</div>
            </div>
        `;
    }

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - firstDay - daysInMonth;
    for (let day = 1; day <= remainingCells; day++) {
        calendarHTML += `<div class="calendar-day other-month"><div class="calendar-day-number">${day}</div></div>`;
    }

    // Make #calendarContainer itself the grid container (remove extra wrapper)
    container.className = 'calendar-month-view';
    container.innerHTML = calendarHTML;

    renderCalendarEventsList();

    // Attach click handlers to each visible day so users can add tasks directly from month view.
    container.querySelectorAll('.calendar-day').forEach(el => {
        // remove previously attached handlers (safe to call repeatedly)
        el.replaceWith(el.cloneNode(true));
    });
    // re-select after cloning
    container.querySelectorAll('.calendar-day').forEach(el => {
        el.addEventListener('click', (ev) => {
            const numEl = el.querySelector('.calendar-day-number');
            if (!numEl) return;
            const dayNum = parseInt(numEl.textContent, 10);
            const date = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), dayNum);
            const dateStr = formatLocalDateStr(date);
            openCalendarDayView(dateStr);
        });
    });
}


function renderCalendarWeek() {
    const container = document.getElementById('calendarContainer');
    const title = document.getElementById('calendarTitle');

    if (!container) return;

    const sunday = getSunday(currentCalendarDate);
    const saturday = new Date(sunday);
    saturday.setDate(saturday.getDate() + 6);

    title.textContent = formatWeekRange(sunday, saturday);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let weekHTML = '<div class="calendar-week-view">';
    for (let i = 0; i < 7; i++) {
        const date = new Date(sunday);
        date.setDate(date.getDate() + i);
        const isToday = date.getTime() === today.getTime();
        const events = getEventsForDate(date);
        const dayName = dayNames[date.getDay()];

        const eventHTML = events.map(e => `
            <div class="calendar-week-event ${e.type}" title="${e.title}">
                ${e.title}
            </div>
        `).join('');

        weekHTML += `
            <div class="calendar-week-day ${isToday ? 'today-highlight' : ''}" data-date="${date.toISOString().split('T')[0]}">
                <div class="calendar-week-day-label">${dayName}</div>
                <div class="calendar-week-day-number">${date.getDate()}</div>
                <div class="calendar-week-events">
                    ${eventHTML || '<p style="color: var(--muted); font-size: 0.8rem;">No events</p>'}
                </div>
            </div>
        `;
    }
    weekHTML += '</div>';

    // Make #calendarContainer the week grid directly (remove extra wrapper)
    container.className = 'calendar-week-view';
    // weekHTML currently includes the inner day columns; strip the outer wrapper tags if present
    const innerWeekHTML = weekHTML.replace(/^<div class="calendar-week-view">/,'').replace(/<\/div>$/,'');
    container.innerHTML = innerWeekHTML;
    renderCalendarEventsList();

    // Remove previous handlers by cloning nodes, then attach fresh handlers
    container.querySelectorAll('.calendar-week-day').forEach(el => el.replaceWith(el.cloneNode(true)));
    container.querySelectorAll('.calendar-week-day').forEach(el => {
        el.addEventListener('click', (e) => {
            const date = el.dataset.date;
            openCalendarDayView(date);
        });

        let selecting = false;
        let startTime = null;

        el.addEventListener('mousedown', (e) => {
            selecting = true;
            startTime = posToTime(el, e.clientY);
        });

        el.addEventListener('mouseup', (e) => {
            if (!selecting) return;
            selecting = false;
            const endTime = posToTime(el, e.clientY);
            let s = startTime, en = endTime;
            if (s > en) [s, en] = [en, s];
            const date = el.dataset.date;
            openCalendarDayView(date);
        });

        el.addEventListener('mouseleave', () => { selecting = false; });
    });
}

function renderCalendar() {
    if (calendarViewMode === 'month') {
        renderCalendarMonth();
    } else if (calendarViewMode === 'day') {
        renderCalendarDay();
    } else if (calendarViewMode === 'timeline') {
        renderCalendarTimeline();
    } else {
        renderCalendarWeek();
    }
}

function renderCalendarDay() {
    const container = document.getElementById('calendarContainer');
    const title = document.getElementById('calendarTitle');

    if (!container) return;

    const selectedDate = new Date(currentCalendarDate);
    selectedDate.setHours(0, 0, 0, 0);
    const dateStr = formatLocalDateStr(selectedDate);
    const displayDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    title.textContent = displayDate;

    const dayTasks = (plannerTasks || []).filter(task => task.deadline === dateStr);
    const outlineItems = Object.entries(courseOutlines || {}).flatMap(([course, items]) =>
        items.filter(item => item.dueDate === dateStr).map(item => ({
            title: item.name,
            course,
            time: item.dueTime || 'Deadline',
            note: `${item.weight}% assessment`,
            type: 'outline'
        }))
    );
    const goalItems = (semesterGoals || []).filter(goal => (goal.created || '').split('T')[0] === dateStr).map(goal => ({
        title: `Goal: ${goal.title || goal.type}`,
        course: goal.course || 'Goals',
        time: 'Recorded',
        note: `${computeGoalProgress(goal).percent}% complete`,
        type: 'goal'
    }));

    const events = [
        ...dayTasks.map(task => ({
            title: task.title,
            course: task.course || 'General',
            time: task.deadline || 'All day',
            note: `${task.priority}${task.done ? ' • Completed' : ''}`,
            type: 'task'
        })),
        ...outlineItems,
        ...goalItems
    ];

    container.className = 'calendar-day-view';
    container.innerHTML = `
        <div class="calendar-day-hero panel-card">
            <div>
                <p class="eyebrow">Day View</p>
                <h3>${displayDate}</h3>
            </div>
            <div class="calendar-day-hero-actions">
                <button class="secondary-btn" onclick="setCalendarView('month')">Month</button>
                <button class="secondary-btn" onclick="setCalendarView('week')">Week</button>
                <button class="panel-btn" onclick="openCalendarPopup({ date: '${dateStr}', type: 'task' })">Add Item</button>
            </div>
        </div>
        <div class="calendar-day-list">
            ${events.length ? events.map(event => `
                <div class="calendar-event-item ${event.type}">
                    <strong>${escapeHtml(event.title)}</strong>
                    <small>${escapeHtml(event.time)} • ${escapeHtml(event.course)}${event.note ? ' • ' + escapeHtml(event.note) : ''}</small>
                </div>
            `).join('') : '<p class="empty-state">No events for this day.</p>'}
        </div>
    `;

    renderCalendarEventsList();
}

function renderCalendarTimeline() {
    const container = document.getElementById('calendarContainer');
    const title = document.getElementById('calendarTitle');

    if (!container) return;

    title.textContent = 'Semester Timeline';

    const events = typeof buildTimelineEvents === 'function' ? buildTimelineEvents() : [];
    const upcoming = events.filter(event => event.days !== null && event.days >= 0 && !event.done).slice(0, 20);
    const past = events.filter(event => event.days !== null && event.days < 0).slice(-10);

    container.className = 'calendar-timeline-view';
    container.innerHTML = `
        <div class="calendar-timeline-grid">
            <div class="timeline-column">
                <h4>Upcoming</h4>
                ${upcoming.length ? upcoming.map(event => `
                    <div class="calendar-event-item ${event.category}">
                        <strong>${escapeHtml(event.title)}</strong>
                        <small>${escapeHtml(event.date)}${event.days === 0 ? ' • Today' : event.days === 1 ? ' • Tomorrow' : ` • In ${event.days} days`} • ${escapeHtml(event.course || 'General')}</small>
                    </div>
                `).join('') : '<p class="empty-state">No upcoming events.</p>'}
            </div>
            <div class="timeline-column">
                <h4>Recent</h4>
                ${past.length ? past.map(event => `
                    <div class="calendar-event-item ${event.category} done">
                        <strong>${escapeHtml(event.title)}</strong>
                        <small>${escapeHtml(event.date)} • ${escapeHtml(event.course || 'General')}</small>
                    </div>
                `).join('') : '<p class="empty-state">No recent events.</p>'}
            </div>
        </div>
    `;

    renderCalendarEventsList();
}

function renderCalendarEventsList() {
    const eventsList = document.getElementById('calendarEventsList');
    if (!eventsList) return;

    let startDate, endDate;
    
    if (calendarViewMode === 'month') {
        startDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1);
        endDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0);
    } else if (calendarViewMode === 'week') {
        startDate = getSunday(currentCalendarDate);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
    } else if (calendarViewMode === 'day') {
        startDate = new Date(currentCalendarDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
    } else {
        const events = typeof buildTimelineEvents === 'function' ? buildTimelineEvents() : [];
        if (!events.length) {
            eventsList.innerHTML = '<p class="empty-state">No deadlines on your timeline.</p>';
            return;
        }

        const listHTML = events.map(event => `
            <div class="calendar-event-item ${event.category} ${event.done ? 'done' : ''}">
                <strong>${escapeHtml(event.title)}</strong>
                <small>${escapeHtml(event.date)} • ${escapeHtml(event.course || 'General')}</small>
            </div>
        `).join('');

        eventsList.innerHTML = `<h4>Timeline</h4>${listHTML}`;
        return;
    }

    const allEvents = [];
    const daysInRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < daysInRange; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const events = getEventsForDate(currentDate);
        
        events.forEach(event => {
            allEvents.push({
                ...event,
                date: currentDate,
                dateStr: currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            });
        });
    }

    allEvents.sort((a, b) => a.date - b.date);

    const periodName = calendarViewMode === 'month' ? 'This Month' : calendarViewMode === 'week' ? 'This Week' : 'This Day';

    if (allEvents.length === 0) {
        eventsList.innerHTML = `<p class="empty-state">No deadlines ${periodName.toLowerCase()}.</p>`;
        return;
    }

    const listHTML = allEvents.map(event => `
        <div class="calendar-event-item ${event.type}">
            <strong>${event.title}</strong>
            <small>${event.dateStr} • ${event.course} • ${event.priority}</small>
        </div>
    `).join('');

    eventsList.innerHTML = `<h4>Deadlines ${periodName}</h4>${listHTML}`;
}

function nextPeriod() {
    if (calendarViewMode === 'month') {
        currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1);
    } else {
        currentCalendarDate.setDate(currentCalendarDate.getDate() + 7);
    }
    renderCalendar();
}

function previousPeriod() {
    if (calendarViewMode === 'month') {
        currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1);
    } else {
        currentCalendarDate.setDate(currentCalendarDate.getDate() - 7);
    }
    renderCalendar();
}

function todayPeriod() {
    currentCalendarDate = new Date();
    renderCalendar();
}

// Convert a mouse Y position within a day column element to a time string (HH:MM). Maps element height to 24-hour range and snaps to 15-minute increments.
function posToTime(el, clientY) {
    const rect = el.getBoundingClientRect();
    const rel = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const totalMinutes = Math.round(rel * 24 * 60 / 15) * 15; // snap to 15-minute increments
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const mm = String(totalMinutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
}

function openCalendarPopup({ date = '', startTime = '', endTime = '', type = 'task' } = {}) {
    const popup = document.getElementById('calendarPopup');
    if (!popup) return;

    const d = document.getElementById('popupDate');
    const t = document.getElementById('popupTitle');
    const c = document.getElementById('popupCourse');
    const p = document.getElementById('popupPriority');
    const st = document.getElementById('popupStartTime');
    const et = document.getElementById('popupEndTime');
    const ty = document.getElementById('popupItemType');
    const desc = document.getElementById('popupDescription');

    if (d) d.value = date;
    if (t) t.value = '';
    if (c) c.value = '';
    if (p) p.value = 'Medium';
    if (st) st.value = startTime || '08:00';
    if (et) et.value = endTime || '09:00';
    if (ty) ty.value = type;
    if (desc) desc.value = '';

    toggleCalendarPopupFields();
    popup.classList.remove('hidden');
}

function closeCalendarPopup() {
    const popup = document.getElementById('calendarPopup');
    if (!popup) return;
    popup.classList.add('hidden');
}

function toggleCalendarPopupFields() {
    const typeSelect = document.getElementById('popupItemType');
    const show = typeSelect && typeSelect.value === 'event';
    document.querySelectorAll('.popup-time-fields').forEach(el => {
        el.style.display = show ? 'flex' : 'none';
    });
}

function saveCalendarPopupItem() {
    const type = document.getElementById('popupItemType').value;
    const title = document.getElementById('popupTitle').value.trim();
    const course = document.getElementById('popupCourse').value.trim();
    const date = document.getElementById('popupDate').value;
    const start = document.getElementById('popupStartTime').value;
    const end = document.getElementById('popupEndTime').value;
    const priority = document.getElementById('popupPriority').value;
    const description = document.getElementById('popupDescription').value.trim();

    if (!title) { showToast('Please provide a title.', 'error'); return; }
    if (!date) { showToast('Please select a date.', 'error'); return; }

    const item = {
        id: Date.now(),
        title,
        course: course || 'General',
        deadline: date,
        priority: priority || 'Medium',
        done: false,
        createdAt: new Date().toISOString()
    };

    if (type === 'event') {
        item.startTime = start || '';
        item.endTime = end || '';
        item.type = 'event';
    } else {
        item.type = 'task';
    }

    plannerTasks.unshift(item);
    saveStudyData();
    closeCalendarPopup();
    render();
}

function saveImportedCourse(data) {

    const code =
        data.course.courseCode || 'GENERAL';

    ensureCourseEntry(code);

    courses[code].metadata = {
        courseName: data.course.courseName,
        instructor: data.course.instructor,
        semester: data.course.semester,
        year: data.course.year
    };

    if (!courseOutlines[code]) {
        courseOutlines[code] = [];
    }

    const assessments = Array.isArray(data.assessments)
        ? data.assessments
        : Array.isArray(data.assignments)
            ? data.assignments
            : [];

    assessments.forEach((assignment, index) => {

        const dueDate =
            assignment.dueDate || '';

        courseOutlines[code].push({
            name: assignment.name,
            weight: assignment.weight,
            dueDate
        });

        plannerTasks.unshift({

            id: Date.now() + index,

            title: assignment.name,

            course: code,

            deadline: dueDate,

            priority:
                assignment.weight >= 25
                    ? 'High'
                    : assignment.weight >= 10
                    ? 'Medium'
                    : 'Low',

            done: false,

            createdAt:
                new Date().toISOString(),

            linkedAssessment: {
                name: assignment.name,
                weight: assignment.weight
            }

        });

    });

    save();
    saveStudyData();
    render();

    showToast('Course imported successfully.', 'success');
}