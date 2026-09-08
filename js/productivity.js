/* GradeQuest dashboard feature helpers — vanilla JS, localStorage only */

let flashcards = [];
let dashboardConfig = null;
let assignmentFilter = 'all';
let assignmentSort = 'deadline';

function hydrateProductivityData(uid) {
    flashcards = GradeQuestStorage.getJson('flashcards', [], uid);
    dashboardConfig = GradeQuestStorage.getJson('dashboardConfig', null, uid);
}

function clearProductivityDataState() {
    flashcards = [];
    dashboardConfig = null;
}

window.hydrateProductivityData = hydrateProductivityData;
window.clearProductivityDataState = clearProductivityDataState;

let focusModeInterval = null;
let focusModeRemaining = 0;
let focusModeRunning = false;
let focusModeTotal = 25 * 60;
let focusModeTaskId = null;

const DEFAULT_WIDGET_ORDER = [
    'advisor', 'planner', 'grader', 'assignments', 'files', 'notes', 'study',
    'goals', 'notification', 'weekly', 'health', 'focus', 'timeline', 'flashcards'
];

const WIDGET_LABELS = {
    advisor: 'Academic Advisor',
    planner: 'Planner',
    grader: 'Grader',
    assignments: 'Assignments',
    files: 'Resources',
    notes: 'Notes',
    study: 'Study',
    goals: 'Goals',
    notification: 'Notifications',
    weekly: 'Weekly Review',
    health: 'Academic Health',
    focus: 'Focus Today',
    timeline: 'Timeline',
    flashcards: 'Flashcards'
};

function getDashboardConfig() {
    if (!dashboardConfig) {
        dashboardConfig = { order: [...DEFAULT_WIDGET_ORDER], hidden: [] };
    }
    if (!dashboardConfig.order) dashboardConfig.order = [...DEFAULT_WIDGET_ORDER];
    if (!dashboardConfig.hidden) dashboardConfig.hidden = [];
    return dashboardConfig;
}

function saveFlashcards() {
    if (!GradeQuestStorage.getActiveUser()) return;
    GradeQuestStorage.setJson('flashcards', flashcards);
}

function saveDashboardConfig() {
    if (!GradeQuestStorage.getActiveUser()) return;
    GradeQuestStorage.setJson('dashboardConfig', dashboardConfig);
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
}

// =====================
// ASSIGNMENTS
// =====================

function getAssignmentStatus(task) {
    if (task.status) return task.status;
    if (task.done) return 'completed';
    return 'not_started';
}

function setAssignmentStatus(id, status) {
    plannerTasks = plannerTasks.map(task => {
        if (task.id !== id) return task;
        const done = status === 'completed' || status === 'submitted';
        return {
            ...task,
            status,
            done,
            completedAt: done ? (task.completedAt || new Date().toISOString()) : undefined
        };
    });
    saveStudyData();
    render();
}

function updateAssignmentField(id, field, value) {
    plannerTasks = plannerTasks.map(task =>
        task.id === id ? { ...task, [field]: value } : task
    );
    saveStudyData();
    render();
}

function getFilteredAssignments() {
    let list = [...(plannerTasks || [])];
    if (assignmentFilter === 'pending') list = list.filter(t => !t.done);
    else if (assignmentFilter === 'completed') list = list.filter(t => t.done);
    else if (assignmentFilter === 'overdue') {
        list = list.filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) < 0);
    } else if (assignmentFilter === 'high') {
        list = list.filter(t => t.priority === 'High');
    }

    if (assignmentSort === 'deadline') {
        list.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
    } else if (assignmentSort === 'priority') {
        const rank = { High: 0, Medium: 1, Low: 2 };
        list.sort((a, b) => (rank[a.priority] || 1) - (rank[b.priority] || 1));
    } else if (assignmentSort === 'course') {
        list.sort((a, b) => (a.course || '').localeCompare(b.course || ''));
    }
    return list;
}

function renderAssignmentsDashboard() {
    const container = document.getElementById('assignmentsContainer');
    if (!container) return;

    const list = getFilteredAssignments();
    const courseOptions = Object.keys(courses).sort();
    const pending = (plannerTasks || []).filter(t => !t.done).length;
    const overdue = (plannerTasks || []).filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) < 0).length;

    container.innerHTML = `
        <div class="stats-grid productivity-stats">
            <div class="stat"><label>Total</label><div class="val">${plannerTasks.length}</div></div>
            <div class="stat"><label>Pending</label><div class="val">${pending}</div></div>
            <div class="stat"><label>Overdue</label><div class="val ${overdue ? 'text-danger' : ''}">${overdue}</div></div>
            <div class="stat"><label>Completed</label><div class="val">${plannerTasks.filter(t => t.done).length}</div></div>
        </div>

        <div class="productivity-toolbar">
            <select onchange="assignmentFilter=this.value; renderAssignmentsDashboard();">
                <option value="all" ${assignmentFilter === 'all' ? 'selected' : ''}>All assignments</option>
                <option value="pending" ${assignmentFilter === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="overdue" ${assignmentFilter === 'overdue' ? 'selected' : ''}>Overdue</option>
                <option value="high" ${assignmentFilter === 'high' ? 'selected' : ''}>High priority</option>
                <option value="completed" ${assignmentFilter === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
            <select onchange="assignmentSort=this.value; renderAssignmentsDashboard();">
                <option value="deadline" ${assignmentSort === 'deadline' ? 'selected' : ''}>Sort by deadline</option>
                <option value="priority" ${assignmentSort === 'priority' ? 'selected' : ''}>Sort by priority</option>
                <option value="course" ${assignmentSort === 'course' ? 'selected' : ''}>Sort by course</option>
            </select>
            <button class="button-primary" onclick="setActiveTab('planner')">+ Add in Planner</button>
        </div>

        ${list.length === 0 ? `
            <div class="empty-state-card">
                <div class="empty-icon">📋</div>
                <h4>No assignments match this filter</h4>
                <p>Add tasks in the Planner tab or adjust your filter to see more.</p>
                <button class="button-primary" onclick="setActiveTab('planner')">Open Planner</button>
            </div>
        ` : `
            <div class="assignment-list">
                ${list.map(task => {
                    const status = getAssignmentStatus(task);
                    const days = task.deadline ? daysBetweenFromToday(task.deadline) : null;
                    const overdueClass = days !== null && days < 0 && !task.done ? 'assignment-overdue' : '';
                    const linked = task.linkedAssessment ? `${task.linkedAssessment.name} (${task.linkedAssessment.weight}%)` : '';
                    return `
                        <div class="assignment-card panel-card ${overdueClass} ${task.done ? 'done' : ''}">
                            <div class="assignment-header">
                                <div>
                                    <strong>${escapeHtml(task.title)}</strong>
                                    <p class="assignment-meta">${escapeHtml(task.course || 'General')} • ${task.deadline || 'No deadline'} • ${task.priority}${linked ? ' • ' + escapeHtml(linked) : ''}</p>
                                </div>
                                <select class="assignment-status-select" onchange="setAssignmentStatus(${task.id}, this.value)">
                                    <option value="not_started" ${status === 'not_started' ? 'selected' : ''}>Not started</option>
                                    <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>In progress</option>
                                    <option value="submitted" ${status === 'submitted' ? 'selected' : ''}>Submitted</option>
                                    <option value="completed" ${status === 'completed' ? 'selected' : ''}>Completed</option>
                                </select>
                            </div>
                            <div class="assignment-actions">
                                <input type="text" placeholder="Notes..." value="${escapeAttr(task.assignmentNotes || '')}" onchange="updateAssignmentField(${task.id}, 'assignmentNotes', this.value)">
                                <button class="button-tertiary" onclick="togglePlannerTask(${task.id})">${task.done ? 'Undo' : 'Complete'}</button>
                                <button class="button-destructive" onclick="deletePlannerTask(${task.id})">Delete</button>
                                ${task.course && courses[(task.course || '').toUpperCase()] ? `<button class="button-tertiary" onclick="openCourseDashboard('${escapeAttr((task.course || '').toUpperCase())}')">Course</button>` : ''}
                            </div>
                            ${days !== null && !task.done ? `<p class="assignment-due-hint">${days <= 0 ? 'Overdue' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`}</p>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `}
    `;
}

// ─── 2. Advanced Study Analytics ──────────────────────────────────────────

function renderAdvancedStudyAnalytics() {
    const container = document.getElementById('advancedStudyAnalytics');
    if (!container) return;

    const today = getTodayDateStr();
    const monday = getWeekStart(new Date());
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const sessions30 = (studySessions || []).filter(s => new Date(s.date) >= monthAgo);
    const totalMins30 = sessions30.reduce((a, s) => a + (s.durationMinutes || 0), 0);
    const avgDaily = sessions30.length ? Math.round(totalMins30 / 30) : 0;

    const byCourse = {};
    const byType = {};
    const byHour = Array(24).fill(0);
    sessions30.forEach(s => {
        const c = (s.course || 'General').toUpperCase();
        byCourse[c] = (byCourse[c] || 0) + (s.durationMinutes || 0);
        const t = s.type || 'General';
        byType[t] = (byType[t] || 0) + (s.durationMinutes || 0);
    });

    const courseKeys = Object.keys(byCourse).sort((a, b) => byCourse[b] - byCourse[a]);
    const maxCourseMins = Math.max(1, ...Object.values(byCourse));
    const typeKeys = Object.keys(byType).sort((a, b) => byType[b] - byType[a]);

    const weekDays = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const mins = studySessions.filter(s => s.date === ds).reduce((a, b) => a + (b.durationMinutes || 0), 0);
        weekDays.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), mins });
    }
    const maxDayMins = Math.max(1, ...weekDays.map(d => d.mins));

    const health = computeAcademicHealth();
    const goalProgress = computeOverallGoalsProgress();

    container.innerHTML = `
        <div class="panel-heading">
            <div>
                <p class="eyebrow">Advanced Analytics</p>
                <h3>Study patterns & productivity insights</h3>
            </div>
        </div>
        ${studySessions.length === 0 ? `
            <div class="empty-state-card">
                <div class="empty-icon">📊</div>
                <h4>No study data yet</h4>
                <p>Start a study session or use Focus Mode to build your analytics profile.</p>
                <button class="button-primary" onclick="setActiveTab('study')">Open Study Center</button>
            </div>
        ` : `
            <div class="stats-grid productivity-stats">
                <div class="stat"><label>30-day hours</label><div class="val">${(totalMins30 / 60).toFixed(1)}h</div></div>
                <div class="stat"><label>Daily avg</label><div class="val">${avgDaily}m</div></div>
                <div class="stat"><label>Streak</label><div class="val">${getCurrentStreak()}d</div></div>
                <div class="stat"><label>Health score</label><div class="val">${health.score || 0}</div></div>
                <div class="stat"><label>Goals progress</label><div class="val">${goalProgress || 0}%</div></div>
                <div class="stat"><label>Sessions (30d)</label><div class="val">${sessions30.length}</div></div>
            </div>

            <div class="analytics-grid">
                <div class="panel-card">
                    <h4>30-day activity</h4>
                    <div class="sparkline-chart">${weekDays.map(d => `
                        <div class="spark-bar-wrap" title="${d.label}: ${d.mins} min">
                            <div class="spark-bar" style="height:${Math.round((d.mins / maxDayMins) * 100)}%"></div>
                            <span class="spark-label">${d.label.split(' ')[1] || ''}</span>
                        </div>
                    `).join('')}</div>
                </div>
                <div class="panel-card">
                    <h4>By course (30 days)</h4>
                    ${courseKeys.length ? courseKeys.slice(0, 6).map(c => `
                        <div class="analytics-bar-row">
                            <span>${escapeHtml(c)}</span>
                            <div class="analytics-bar-track"><div class="analytics-bar-fill" style="width:${Math.round((byCourse[c] / maxCourseMins) * 100)}%"></div></div>
                            <span>${byCourse[c]}m</span>
                        </div>
                    `).join('') : '<p class="empty-state">No course breakdown yet.</p>'}
                </div>
                <div class="panel-card">
                    <h4>By study type</h4>
                    ${typeKeys.length ? typeKeys.map(t => `
                        <div class="analytics-bar-row">
                            <span>${escapeHtml(t)}</span>
                            <div class="analytics-bar-track"><div class="analytics-bar-fill accent" style="width:${Math.round((byType[t] / Math.max(...Object.values(byType))) * 100)}%"></div></div>
                            <span>${byType[t]}m</span>
                        </div>
                    `).join('') : '<p class="empty-state">No type data yet.</p>'}
                </div>
                <div class="panel-card">
                    <h4>Cross-feature insights</h4>
                    <ul class="advisor-list">
                        ${buildStudyInsights().map(i => `<li>${escapeHtml(i)}</li>`).join('') || '<li>Keep studying to unlock more insights.</li>'}
                    </ul>
                </div>
            </div>
        `}
    `;
}

function buildStudyInsights() {
    const insights = [];
    const weekMins = getMinutesThisWeek();
    const health = computeAcademicHealth();

    if (weekMins < 120 && Object.keys(courses).length > 0) {
        insights.push(`You've logged ${weekMins} minutes this week — aim for at least 2 hours across your ${Object.keys(courses).length} courses.`);
    }
    if (health.overdueTasks > 0) {
        insights.push(`${health.overdueTasks} overdue assignment(s) may be affecting your academic health score.`);
    }
    Object.keys(courses).forEach(name => {
        const days = daysSinceLastStudy(name);
        if (days !== null && days >= 7) {
            insights.push(`${name} hasn't been studied in ${days} days — schedule a review session.`);
        }
    });
    const dueSoon = (plannerTasks || []).filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) <= 3 && daysBetweenFromToday(t.deadline) >= 0);
    if (dueSoon.length) {
        insights.push(`${dueSoon.length} assignment(s) due within 3 days — prioritize these in Focus Mode.`);
    }
    return insights.slice(0, 5);
}

// =====================
// ACADEMIC ADVISOR
// =====================

function computeAdvisorInsights() {
    const tips = [];
    const health = computeAcademicHealth();
    const focusPlan = computeFocusPlan();
    const predictor = typeof computeSemesterPredictorData === 'function' ? computeSemesterPredictorData() : null;

    if (health.overdueTasks > 0) {
        tips.push({ type: 'urgent', icon: '⚠️', text: `Clear ${health.overdueTasks} overdue task(s) to improve your health score.`, action: 'planner', label: 'Open Planner' });
    }
    if (focusPlan.length > 0) {
        const top = focusPlan[0];
        tips.push({ type: 'focus', icon: '🎯', text: `Focus on "${top.task.title}" (${top.task.course}) — ${top.reasons.slice(0, 2).join(', ')}.`, action: 'focus', label: 'Focus Today' });
    }
    if (health.coursesAtRisk > 0) {
        tips.push({ type: 'risk', icon: '📉', text: `${health.coursesAtRisk} course(s) below target — review grades and adjust study time.`, action: 'health', label: 'Academic Health' });
    }
    (semesterGoals || []).forEach(g => {
        const p = computeGoalProgress(g);
        if (p.percent >= 75 && p.percent < 100) {
            tips.push({ type: 'goal', icon: '🏁', text: `You're ${p.percent}% toward "${g.title || g.type}" — almost there!`, action: 'goals', label: 'View Goals' });
        } else if (p.percent < 30 && p.percent > 0) {
            tips.push({ type: 'goal', icon: '📌', text: `"${g.title || g.type}" is at ${p.percent}% — consider a weekly study block.`, action: 'goals', label: 'View Goals' });
        }
    });
    if (predictor && predictor.projectedGpa && predictor.currentGpa) {
        const diff = predictor.projectedGpa - predictor.currentGpa;
        if (diff < -0.2) {
            tips.push({ type: 'predict', icon: '🔮', text: `Semester predictor shows GPA may drop to ${predictor.projectedGpa.toFixed(2)} — review upcoming assessments.`, action: 'predictor', label: 'Predictor' });
        }
    }
    const flashcardsDue = flashcards.filter(c => !c.nextReview || new Date(c.nextReview) <= new Date()).length;
    if (flashcardsDue > 0) {
        tips.push({ type: 'study', icon: '🃏', text: `${flashcardsDue} flashcard(s) due for review today.`, action: 'flashcards', label: 'Review Cards' });
    }
    const weekStats = getWeekStats(getWeekStart(new Date()));
    if (weekStats.studyHours === 0 && getCurrentStreak() === 0) {
        tips.push({ type: 'study', icon: '⏱️', text: 'No study logged this week — start a 25-minute Focus Mode session.', action: 'focus', label: 'Start Focus' });
    }
    if (!tips.length) {
        tips.push({ type: 'positive', icon: '✨', text: "You're on track! Keep maintaining your planner and study habits.", action: 'weekly', label: 'Weekly Review' });
    }
    return tips.slice(0, 4);
}

function renderAdvisorWidgetHtml() {
    const tips = computeAdvisorInsights();
    return `
        <button class="panel-card overview-card widget-advisor widget-span-2" data-widget-id="advisor" onclick="setActiveTab('home')">
            <div class="widget-top">
                <span class="widget-icon">🧑‍🏫</span>
                <span class="widget-badge">Advisor</span>
            </div>
            <div class="widget-preview advisor-preview">
                ${tips.slice(0, 2).map(t => `<span class="mini-chip">${t.icon} ${escapeHtml(t.text.slice(0, 60))}${t.text.length > 60 ? '…' : ''}</span>`).join('')}
            </div>
            <div class="widget-footer">
                <span>${tips.length} insight${tips.length !== 1 ? 's' : ''}</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>
    `;
}

// ─── 4. Global Search ───────────────────────────────────────────────────────

function buildSearchIndex() {
    const results = [];

    Object.keys(courses).forEach(name => {
        results.push({ type: 'Course', title: name, subtitle: `Target: ${courses[name].target || 80}%`, tab: 'courses', action: () => openCourseDashboard(name) });
    });

    (plannerTasks || []).forEach(task => {
        results.push({
            type: 'Task',
            title: task.title,
            subtitle: `${task.course || 'General'} • ${task.deadline || 'No date'}`,
            tab: 'planner',
            query: `${task.title} ${task.course}`
        });
    });

    (studyFiles || []).forEach(file => {
        results.push({
            type: 'File',
            title: file.title,
            subtitle: `${file.course} • ${file.category}`,
            tab: 'files',
            query: `${file.title} ${file.course} ${file.notes || ''}`
        });
    });

    if (notes) {
        results.push({ type: 'Notes', title: 'Study Notes', subtitle: notes.slice(0, 80), tab: 'notes', query: notes });
    }

    flashcards.forEach(card => {
        results.push({
            type: 'Flashcard',
            title: card.front,
            subtitle: `${card.course || 'General'} • ${card.back.slice(0, 40)}`,
            tab: 'flashcards',
            query: `${card.front} ${card.back} ${card.course}`
        });
    });

    Object.entries(courseOutlines || {}).forEach(([course, items]) => {
        items.forEach(item => {
            results.push({
                type: 'Outline',
                title: item.name,
                subtitle: `${course} • ${item.weight}%`,
                tab: 'grades',
                query: `${item.name} ${course}`
            });
        });
    });

    return results;
}

function performGlobalSearch(query) {
    const q = normalizeText(query);
    if (!q) return [];

    return buildSearchIndex().filter(item => {
        const haystack = normalizeText(`${item.title} ${item.subtitle} ${item.query || ''}`);
        return haystack.includes(q) || q.split(' ').every(word => haystack.includes(word));
    }).slice(0, 12);
}

function openGlobalSearch() {
    const overlay = document.getElementById('globalSearchOverlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    const input = document.getElementById('globalSearchInput');
    if (input) { input.value = ''; input.focus(); renderSearchResults(''); }
}

function closeGlobalSearch() {
    const overlay = document.getElementById('globalSearchOverlay');
    if (overlay) overlay.classList.add('hidden');
}

function renderSearchResults(query) {
    const container = document.getElementById('globalSearchResults');
    if (!container) return;

    const results = performGlobalSearch(query);
    if (!query.trim()) {
        container.innerHTML = '<p class="empty-state">Type to search courses, tasks, files, notes, flashcards, and outlines.</p>';
        return;
    }
    if (!results.length) {
        container.innerHTML = '<div class="empty-state-card compact"><p>No results for "' + escapeHtml(query) + '"</p></div>';
        return;
    }

    container.innerHTML = results.map((r, i) => `
        <button class="search-result-item" onclick="navigateSearchResult(${i}, '${escapeAttr(query)}')">
            <span class="search-result-type">${escapeHtml(r.type)}</span>
            <strong>${escapeHtml(r.title)}</strong>
            <small>${escapeHtml(r.subtitle)}</small>
        </button>
    `).join('');

    window._lastSearchResults = results;
}

function navigateSearchResult(index, query) {
    const results = window._lastSearchResults || performGlobalSearch(query);
    const item = results[index];
    if (!item) return;
    closeGlobalSearch();
    if (item.action) {
        setActiveTab(item.tab || 'home');
        item.action();
        return;
    }
    setActiveTab(item.tab || 'home');
}

function initGlobalSearch() {
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openGlobalSearch();
        }
        if (e.key === 'Escape') closeGlobalSearch();
    });
}

// =====================
// DASHBOARD CUSTOMIZATION
// =====================

function applyDashboardCustomization() {
    const hub = document.getElementById('hubWidgets');
    if (!hub) return;

    const config = getDashboardConfig();
    const children = Array.from(hub.children);

    config.order.forEach(id => {
        const el = hub.querySelector(`[data-widget-id="${id}"]`);
        if (el) hub.appendChild(el);
    });

    children.forEach(el => {
        const id = el.dataset.widgetId;
        if (id && config.hidden.includes(id)) {
            el.style.display = 'none';
        } else if (id) {
            el.style.display = '';
        }
    });
}

function toggleWidgetVisibility(widgetId) {
    const config = getDashboardConfig();
    const idx = config.hidden.indexOf(widgetId);
    if (idx >= 0) config.hidden.splice(idx, 1);
    else config.hidden.push(widgetId);
    saveDashboardConfig();
    render();
}

function moveWidget(widgetId, direction) {
    const config = getDashboardConfig();
    const idx = config.order.indexOf(widgetId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= config.order.length) return;
    [config.order[idx], config.order[newIdx]] = [config.order[newIdx], config.order[idx]];
    saveDashboardConfig();
    render();
}

function renderDashboardCustomization() {
    const container = document.getElementById('dashboardCustomizationContainer');
    if (!container) return;

    const config = getDashboardConfig();
    const allIds = [...new Set([...config.order, ...DEFAULT_WIDGET_ORDER])];

    container.innerHTML = `
        <div class="panel-heading">
            <div>
                <p class="eyebrow">Dashboard Customization</p>
                <h3>Choose which home widgets appear and in what order</h3>
            </div>
        </div>
        <p class="notes-line">Toggle visibility and reorder widgets on your Home Hub. Changes save automatically.</p>
        <div class="customize-list">
            ${allIds.map(id => {
                const hidden = config.hidden.includes(id);
                const label = WIDGET_LABELS[id] || id;
                return `
                    <div class="customize-row panel-card ${hidden ? 'widget-hidden' : ''}">
                        <span>${escapeHtml(label)}</span>
                        <div class="customize-actions">
                            <button class="button-secondary" onclick="moveWidget('${id}', 'up')" title="Move up">↑</button>
                            <button class="button-secondary" onclick="moveWidget('${id}', 'down')" title="Move down">↓</button>
                            <button class="button-tertiary" onclick="toggleWidgetVisibility('${id}')">${hidden ? 'Show' : 'Hide'}</button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <button class="button-secondary" onclick="resetDashboardConfig()">Reset to default layout</button>
    `;
}

function resetDashboardConfig() {
    dashboardConfig = { order: [...DEFAULT_WIDGET_ORDER], hidden: [] };
    saveDashboardConfig();
    render();
}

// =====================
// TIMELINE
// =====================

function buildTimelineEvents() {
    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    (plannerTasks || []).forEach(task => {
        if (!task.deadline) return;
        const days = daysBetweenFromToday(task.deadline);
        let category = 'task';
        if (/final/i.test(task.title)) category = 'final';
        else if (/midterm/i.test(task.title)) category = 'midterm';
        else if (/exam/i.test(task.title)) category = 'exam';
        events.push({
            date: task.deadline,
            title: task.title,
            course: task.course || 'General',
            category,
            done: task.done,
            days,
            priority: task.priority
        });
    });

    Object.entries(courseOutlines || {}).forEach(([course, items]) => {
        items.forEach(item => {
            if (item.dueDate) {
                events.push({
                    date: item.dueDate,
                    title: item.name,
                    course,
                    category: 'outline',
                    done: false,
                    days: daysBetweenFromToday(item.dueDate),
                    weight: item.weight
                });
            }
        });
    });

    (semesterGoals || []).forEach(g => {
        events.push({
            date: (g.created || '').split('T')[0],
            title: `Goal: ${g.title || g.type}`,
            course: g.course || '',
            category: 'goal',
            done: computeGoalProgress(g).percent >= 100,
            days: daysBetweenFromToday((g.created || '').split('T')[0]),
            isGoal: true
        });
    });

    return events.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

function renderTimelineWidgetHtml() {
    const upcoming = buildTimelineEvents().filter(e => e.days !== null && e.days >= 0 && !e.done).slice(0, 1)[0];
    return `
        <button class="panel-card overview-card widget-timeline" data-widget-id="timeline" onclick="setActiveTab('planner'); setCalendarView('timeline')">
            <div class="widget-top">
                <span class="widget-icon">🗓️</span>
                <span class="widget-badge">Timeline</span>
            </div>
            <div class="widget-preview">
                ${upcoming
                    ? `<span class="mini-task">${escapeHtml(upcoming.title)}</span><span class="notes-line">${escapeHtml(upcoming.date)} • ${upcoming.days === 0 ? 'Today' : upcoming.days + ' days'}</span>`
                    : '<span class="notes-line">No upcoming milestones</span>'}
            </div>
            <div class="widget-footer">
                <span>Semester view</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>
    `;
}

// =====================
// SEMESTER REPORT
// =====================

function generateSemesterReport() {
    const profile = window.GradeQuestProfile || {};
    const userName = profile.displayName || 'Student';
    const schoolKey = Object.keys(ALL_SCHOOLS).find(key => key.toLowerCase() === String(profile.university || '').toLowerCase() || ALL_SCHOOLS[key].name.toLowerCase() === String(profile.university || '').toLowerCase()) || 'mcmaster';
    const school = ALL_SCHOOLS[schoolKey] || ALL_SCHOOLS.mcmaster;
    const health = computeAcademicHealth();
    const weekStats = getWeekStats(getWeekStart(new Date()));
    const predictor = typeof computeSemesterPredictorData === 'function' ? computeSemesterPredictorData() : null;
    const goalsProgress = computeOverallGoalsProgress();
    const reportDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    let report = `GRADEQUEST SEMESTER REPORT\n`;
    report += `Generated: ${reportDate}\n`;
    report += `Student: ${userName}\n`;
    report += `School: ${school.name}\n`;
    report += `${'='.repeat(50)}\n\n`;

    report += `ACADEMIC OVERVIEW\n`;
    report += `  Courses tracked: ${Object.keys(courses).length}\n`;
    report += `  Overall GPA: ${health.overallGpa !== null ? health.overallGpa.toFixed(2) : 'N/A'}\n`;
    report += `  Academic health score: ${health.score}/100\n`;
    report += `  Courses at risk: ${health.coursesAtRisk}\n`;
    report += `  Overdue tasks: ${health.overdueTasks}\n`;
    report += `  Due this week: ${health.dueThisWeek}\n\n`;

    if (predictor) {
        report += `SEMESTER PREDICTOR\n`;
        report += `  Current GPA: ${predictor.currentGpa ? predictor.currentGpa.toFixed(2) : 'N/A'}\n`;
        report += `  Projected GPA: ${predictor.projectedGpa ? predictor.projectedGpa.toFixed(2) : 'N/A'}\n`;
        report += `  Best case: ${predictor.bestCaseGpa ? predictor.bestCaseGpa.toFixed(2) : 'N/A'}\n`;
        report += `  Worst case: ${predictor.worstCaseGpa ? predictor.worstCaseGpa.toFixed(2) : 'N/A'}\n\n`;
    }

    report += `STUDY ACTIVITY\n`;
    report += `  Total study hours: ${getSemesterTotalHours()}h\n`;
    report += `  Current streak: ${getCurrentStreak()} days\n`;
    report += `  This week: ${weekStats.studyHours}h across ${weekStats.coursesStudied} course(s)\n`;
    report += `  Assignments completed this week: ${weekStats.assignmentsCompleted}\n\n`;

    report += `ASSIGNMENTS\n`;
    report += `  Total tasks: ${plannerTasks.length}\n`;
    report += `  Completed: ${plannerTasks.filter(t => t.done).length}\n`;
    report += `  Pending: ${plannerTasks.filter(t => !t.done).length}\n\n`;

    report += `GOALS\n`;
    report += `  Active goals: ${semesterGoals.length}\n`;
    report += `  Overall progress: ${goalsProgress}%\n`;
    (semesterGoals || []).forEach(g => {
        const p = computeGoalProgress(g);
        report += `  • ${g.title || g.type}: ${p.percent}% (${p.current}/${p.target})\n`;
    });
    report += `\n`;

    report += `COURSES\n`;
    Object.keys(courses).sort().forEach(name => {
        const c = courses[name];
        const avg = computeCourseAverage(c);
        report += `  • ${name}: ${avg.toFixed(1)}% avg, target ${c.target || 80}%, ${(c.grades || []).length} assessments\n`;
    });
    report += `\n`;

    report += `ADVISOR INSIGHTS\n`;
    computeAdvisorInsights().forEach(t => {
        report += `  • ${t.text}\n`;
    });

    report += `\n${'='.repeat(50)}\n`;
    report += `Report generated by GradeQuest\n`;

    return report;
}

function copySemesterReport() {
    const report = generateSemesterReport();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(report).then(() => showToast('Semester report copied to clipboard.', 'success')).catch(() => fallbackCopy(report));
    } else {
        fallbackCopy(report);
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Semester report copied to clipboard.', 'success');
}

// =====================
// FOCUS MODE
// =====================

function renderFocusModeTimer() {
    const container = document.getElementById('focusModeContainer');
    if (!container) return;

    const pendingTasks = (plannerTasks || []).filter(t => !t.done);
    const focusPlan = computeFocusPlan();
    const topTask = focusPlan[0]?.task || null;

    container.innerHTML = `
        <div class="panel-card focus-mode-card">
            <div class="panel-heading">
                <div>
                    <p class="eyebrow">Focus Mode</p>
                    <h3>Distraction-free study timer</h3>
                </div>
            </div>
            <div class="focus-mode-display">
                <div class="focus-timer-ring">
                    <span id="focusModeDisplay">${formatFocusTime(focusModeRemaining || focusModeTotal)}</span>
                </div>
            </div>
            <div class="panel-form focus-mode-form">
                <label>Duration</label>
                <div class="focus-duration-btns">
                    <button class="view-toggle-btn" onclick="setFocusModeDuration(25)">25 min</button>
                    <button class="view-toggle-btn" onclick="setFocusModeDuration(45)">45 min</button>
                    <button class="view-toggle-btn" onclick="setFocusModeDuration(50)">50 min</button>
                    <input type="number" id="focusCustomMin" placeholder="Custom" min="1" max="180" style="width:80px;padding:8px;border-radius:8px;">
                    <button class="view-toggle-btn" onclick="setFocusModeDuration(parseInt(document.getElementById('focusCustomMin').value)||25)">Set</button>
                </div>
                <label>Link to task (optional)</label>
                <select id="focusModeTask">
                    <option value="">No linked task</option>
                    ${pendingTasks.map(t => `<option value="${t.id}" ${focusModeTaskId === t.id ? 'selected' : ''}>${escapeHtml(t.title)} (${escapeHtml(t.course || 'General')})</option>`).join('')}
                </select>
                <label>Course</label>
                <select id="focusModeCourse">
                    <option value="">Select course</option>
                    ${Object.keys(courses).sort().map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
                ${topTask ? `<p class="notes-line">Suggested focus: <strong>${escapeHtml(topTask.title)}</strong></p>` : ''}
                <div class="focus-mode-controls">
                    ${!focusModeRunning ? `<button class="button-primary" onclick="startFocusMode()">Start Focus</button>` : `
                        <button class="button-primary" onclick="pauseFocusMode()">Pause</button>
                        <button class="button-secondary" onclick="stopFocusMode()">Stop</button>
                    `}
                </div>
            </div>
        </div>
    `;
}

function formatFocusTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function setFocusModeDuration(minutes) {
    if (focusModeRunning) return;
    focusModeTotal = minutes * 60;
    focusModeRemaining = focusModeTotal;
    updateFocusModeDisplay();
}

function updateFocusModeDisplay() {
    const el = document.getElementById('focusModeDisplay');
    if (el) el.textContent = formatFocusTime(focusModeRemaining);
}

function startFocusMode() {
    if (focusModeRunning) return;
    if (!focusModeRemaining) focusModeRemaining = focusModeTotal;
    const taskSelect = document.getElementById('focusModeTask');
    focusModeTaskId = taskSelect ? parseInt(taskSelect.value, 10) || null : null;
    focusModeRunning = true;
    document.body.classList.add('focus-mode-active');
    focusModeInterval = setInterval(() => {
        focusModeRemaining -= 1;
        updateFocusModeDisplay();
        if (focusModeRemaining <= 0) completeFocusMode();
    }, 1000);
    renderFocusModeTimer();
}

function pauseFocusMode() {
    clearInterval(focusModeInterval);
    focusModeRunning = false;
    document.body.classList.remove('focus-mode-active');
    renderFocusModeTimer();
}

function stopFocusMode() {
    clearInterval(focusModeInterval);
    focusModeRunning = false;
    focusModeRemaining = focusModeTotal;
    document.body.classList.remove('focus-mode-active');
    renderFocusModeTimer();
}

function stopGradeQuestFocusTimer() {
    clearInterval(focusModeInterval);
    focusModeRunning = false;
    document.body.classList.remove('focus-mode-active');
}

window.stopGradeQuestFocusTimer = stopGradeQuestFocusTimer;

function completeFocusMode() {
    clearInterval(focusModeInterval);
    focusModeRunning = false;
    document.body.classList.remove('focus-mode-active');

    const elapsed = focusModeTotal;
    const courseEl = document.getElementById('focusModeCourse');
    const course = courseEl?.value || 'General';
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));

    studySessions.unshift({
        id: Date.now(),
        date: getTodayDateStr(),
        durationMinutes,
        course,
        type: 'Focus Mode'
    });
    saveStudySessions();

    if (focusModeTaskId) {
        setAssignmentStatus(focusModeTaskId, 'in_progress');
    }

    focusModeRemaining = focusModeTotal;
    showToast(`Focus session complete! ${durationMinutes} minutes logged.`, 'success');
    render();
}

// =====================
// FLASHCARDS
// =====================

function addFlashcard(front, back, course) {
    if (!front || !back) return;
    flashcards.unshift({
        id: Date.now(),
        front: front.trim(),
        back: back.trim(),
        course: (course || 'General').toUpperCase(),
        nextReview: getTodayDateStr(),
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        createdAt: new Date().toISOString()
    });
    saveFlashcards();
    render();
}

function deleteFlashcard(id) {
    flashcards = flashcards.filter(c => c.id !== id);
    saveFlashcards();
    render();
}

function getDueFlashcards() {
    const today = getTodayDateStr();
    return flashcards.filter(c => !c.nextReview || c.nextReview <= today);
}

function reviewFlashcard(id, quality) {
    const card = flashcards.find(c => c.id === id);
    if (!card) return;

    if (quality < 3) {
        card.repetitions = 0;
        card.interval = 1;
    } else {
        if (card.repetitions === 0) card.interval = 1;
        else if (card.repetitions === 1) card.interval = 3;
        else card.interval = Math.round(card.interval * card.easeFactor);
        card.repetitions += 1;
    }

    card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    const next = new Date();
    next.setDate(next.getDate() + card.interval);
    card.nextReview = next.toISOString().split('T')[0];
    card.lastReviewed = new Date().toISOString();

    saveFlashcards();
    renderFlashcardsDashboard();
}

let flashcardReviewIndex = 0;
let flashcardShowingBack = false;

function renderFlashcardsDashboard() {
    const container = document.getElementById('flashcardsContainer');
    if (!container) return;

    const due = getDueFlashcards();
    const courseOptions = Object.keys(courses).sort();

    container.innerHTML = `
        <div class="panel-form flashcard-form panel-card">
            <input type="text" id="flashcardFront" placeholder="Front (question/term)">
            <input type="text" id="flashcardBack" placeholder="Back (answer/definition)">
            <select id="flashcardCourse">
                <option value="General">General</option>
                ${courseOptions.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
            <button class="button-primary" onclick="addFlashcard(document.getElementById('flashcardFront').value, document.getElementById('flashcardBack').value, document.getElementById('flashcardCourse').value)">Add Flashcard</button>
        </div>

        <div class="stats-grid productivity-stats">
            <div class="stat"><label>Total cards</label><div class="val">${flashcards.length}</div></div>
            <div class="stat"><label>Due today</label><div class="val">${due.length}</div></div>
            <div class="stat"><label>Mastered (7d+)</label><div class="val">${flashcards.filter(c => c.interval >= 7).length}</div></div>
        </div>

        ${flashcards.length === 0 ? `
            <div class="empty-state-card">
                <div class="empty-icon">🃏</div>
                <h4>No flashcards yet</h4>
                <p>Create flashcards for your courses and GradeQuest will schedule reviews using spaced repetition.</p>
            </div>
        ` : due.length > 0 ? renderFlashcardReviewSession(due) : `
            <div class="empty-state-card success">
                <div class="empty-icon">✅</div>
                <h4>All caught up!</h4>
                <p>No cards due today. Come back tomorrow or add more flashcards.</p>
            </div>
        `}

        <div class="flashcard-deck panel-card">
            <h4>Your deck (${flashcards.length})</h4>
            ${flashcards.length ? flashcards.map(c => `
                <div class="flashcard-item">
                    <div>
                        <strong>${escapeHtml(c.front)}</strong>
                        <p>${escapeHtml(c.back)} • ${escapeHtml(c.course)} • Next: ${c.nextReview || 'today'}</p>
                    </div>
                    <button class="button-destructive" onclick="deleteFlashcard(${c.id})">×</button>
                </div>
            `).join('') : ''}
        </div>
    `;
}

function renderFlashcardReviewSession(due) {
    flashcardReviewIndex = Math.min(flashcardReviewIndex, due.length - 1);
    const card = due[flashcardReviewIndex];
    if (!card) return '';

    return `
        <div class="flashcard-review panel-card">
            <p class="eyebrow">Review ${flashcardReviewIndex + 1} of ${due.length}</p>
            <div class="flashcard-face" onclick="this.classList.toggle('flipped')">
                <div class="flashcard-front">${escapeHtml(card.front)}</div>
                <div class="flashcard-back">${escapeHtml(card.back)}</div>
            </div>
            <p class="notes-line">Tap card to flip • Rate your recall:</p>
            <div class="flashcard-rating">
                <button class="button-secondary" onclick="reviewFlashcard(${card.id}, 1); flashcardReviewIndex=0;">Again</button>
                <button class="button-secondary" onclick="reviewFlashcard(${card.id}, 3); flashcardReviewIndex=0;">Hard</button>
                <button class="button-primary" onclick="reviewFlashcard(${card.id}, 4); flashcardReviewIndex=0;">Good</button>
                <button class="button-primary" onclick="reviewFlashcard(${card.id}, 5); flashcardReviewIndex=0;">Easy</button>
            </div>
        </div>
    `;
}

function renderFlashcardsWidgetHtml() {
    const due = getDueFlashcards().length;
    return `
        <button class="panel-card overview-card widget-flashcards widget-span-2" data-widget-id="flashcards" onclick="setActiveTab('flashcards')">
            <div class="widget-top">
                <span class="widget-icon">🃏</span>
                <span class="widget-badge">Flashcards</span>
            </div>
            <div class="widget-preview">
                <div class="mini-chip">${flashcards.length} cards • ${due} due</div>
                <div class="notes-line">${due ? 'Review due today' : 'All caught up'}</div>
            </div>
            <div class="widget-footer">
                <span>Spaced repetition</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>
    `;
}

function renderAssignmentsWidgetHtml() {
    const pending = (plannerTasks || []).filter(t => !t.done).length;
    const overdue = (plannerTasks || []).filter(t => !t.done && t.deadline && daysBetweenFromToday(t.deadline) < 0).length;
    return `
        <button class="panel-card overview-card widget-assignments widget-span-2" data-widget-id="assignments" onclick="setActiveTab('assignments')">
            <div class="widget-top">
                <span class="widget-icon">📋</span>
                <span class="widget-badge">Assignments</span>
            </div>
            <div class="widget-preview">
                <div class="mini-chip">${pending} pending${overdue ? ` • ${overdue} overdue` : ''}</div>
            </div>
            <div class="widget-footer">
                <span>Manage all tasks</span>
                <span class="widget-pill">Open</span>
            </div>
        </button>
    `;
}

function patchSetActiveTabForCalendar() {
    const original = window.setActiveTab;
    window.setActiveTab = function (tab) {
        if (tab === 'calendar') tab = 'planner';
        original(tab);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    patchSetActiveTabForCalendar();
    if (window.GradeQuestAuthGate) {
        window.GradeQuestAuthGate.start();
        return;
    }
    getDashboardConfig();
    initGlobalSearch();
    initApp();
});
