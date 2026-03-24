let courses = JSON.parse(localStorage.getItem('courses')) || {};
let schoolHistory = JSON.parse(localStorage.getItem('schoolHistory')) || {};
let userName = localStorage.getItem('userName') || "";
let globalSchools = [];
let schoolScales = JSON.parse(localStorage.getItem('schoolScales')) || {};

const letterToPercent = {
    'A+': 95, 'A': 87, 'A-': 82, 'B+': 78, 'B': 75, 'B-': 72,
    'C+': 68, 'C': 65, 'C-': 62, 'D+': 58, 'D': 55, 'D-': 52, 'F': 35
};

async function loadUniversityData() {
    try {
        const response = await fetch('world_universities_and_domains.json');
        globalSchools = await response.json();
        console.log("University database loaded.");
    } catch (error) {
        console.error("Could not load university data:", error);
    }
}

window.onload = function () {
    loadUniversityData();
    if (localStorage.getItem('userName') && localStorage.getItem('schoolHistory')) {
        document.getElementById('onboardingOverlay').style.display = 'none';
        userName = localStorage.getItem('userName');
        applyUserConfig(); // Apply branding immediately on load
    }
};

// --- DROPDOWN & SEARCH LOGIC ---

function toggleDropdown(id) {
    const el = document.getElementById(id);
    const isVisible = el.style.display === 'block';
    closeAllDropdowns();
    if (!isVisible) el.style.display = 'block';
}

function closeAllDropdowns() {
    document.querySelectorAll('.results-list').forEach(list => {
        list.style.display = 'none';
    });
}

function selectYear(year) {
    document.getElementById('yearSelectorValue').value = year;
    document.getElementById('yearSearch').value = year === 'all' ? "Full History" : `Year ${year}`;
    closeAllDropdowns();
    applyUserConfig(); // Re-apply colors when year changes
}

function searchGlobalSchools(query, resultsId, hiddenInputId) {
    const resultsDiv = document.getElementById(resultsId);
    resultsDiv.innerHTML = '';

    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    const filtered = globalSchools.filter(school =>
        school.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);

    if (filtered.length > 0) {
        resultsDiv.style.display = 'block';
        filtered.forEach(school => {
            const div = document.createElement('div');
            div.className = 'option';
            div.textContent = `${school.name} (${school.country})`;

            div.onclick = (e) => {
                e.stopPropagation();
                const inputId = resultsId === 'schoolResultsOnboarding' ? 'schoolSearchOnboarding' : 'schoolSearchDashboard';
                document.getElementById(inputId).value = school.name;

                // CRUCIAL: Store the name in the hidden input as the key
                document.getElementById(hiddenInputId).value = school.name;
                resultsDiv.style.display = 'none';

                if (resultsId === 'schoolResultsDashboard') {
                    updateYearSchool(school.name);
                } else {
                    // Force onboarding colors to update *before* finishing
                    updateSchoolBranding(school.name);
                }
            };
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.style.display = 'none';
    }
}

function filterCourses(query) {
    const resultsDiv = document.getElementById('classResults');
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'block';

    const options = ['all', ...Object.keys(courses)];
    options.filter(name => name.toLowerCase().includes(query.toLowerCase())).forEach(name => {
        const div = document.createElement('div');
        div.className = 'option';
        div.textContent = name === 'all' ? "All Classes" : name;
        div.onclick = (e) => {
            e.stopPropagation();
            document.getElementById('classSelectorValue').value = name;
            document.getElementById('classSearch').value = name === 'all' ? "All Classes" : name;
            resultsDiv.style.display = 'none';
            render();
        };
        resultsDiv.appendChild(div);
    });
}

window.onclick = function (event) {
    if (!event.target.matches('.search-input') && !event.target.matches('#yearSearch')) {
        closeAllDropdowns();
    }
};

// --- BRANDING LOGIC ---

// NEW: Helper function to apply colors
function updateSchoolBranding(schoolName) {
    // 1. Check if we have BRANDED colors in ALL_SCHOOLS from schools.js
    // We search the ALL_SCHOOLS values to match the selected school NAME
    const brandedEntry = typeof ALL_SCHOOLS !== 'undefined'
        ? Object.values(ALL_SCHOOLS).find(s => s.name === schoolName)
        : null;

    // 2. Apply Colors
    if (brandedEntry) {
        // Use the official colors from your database
        document.documentElement.style.setProperty('--primary', brandedEntry.primary);
        document.documentElement.style.setProperty('--accent', brandedEntry.accent);
        console.log(`Applying branded colors for: ${schoolName}`);
    } else {
        // FALLBACK: Use default professional colors for all other global schools
        document.documentElement.style.setProperty('--primary', '#6366f1'); // Original default primary
        document.documentElement.style.setProperty('--accent', '#10b981');  // Original default accent
        console.log(`Using fallback colors for: ${schoolName}`);
    }
}

function applyUserConfig() {
    const year = document.getElementById('yearSelectorValue').value;
    const activeYear = year === 'all' ? "1" : year;
    const schoolName = schoolHistory[activeYear] || 'Generic University';

    updateSchoolBranding(schoolName);

    document.getElementById('mainTitle').textContent = `${userName}'s GradeQuest`;

    if (year !== 'all') {
        document.getElementById('schoolSearchDashboard').value = schoolName;
    }
    render();
}

function updateYearSchool(schoolName) {
    const year = document.getElementById('yearSelectorValue').value;
    if (year !== 'all') {
        schoolHistory[year] = schoolName;
        localStorage.setItem('schoolHistory', JSON.stringify(schoolHistory));
        applyUserConfig(); // This triggers the color update
    }
}

// ... (Rest of the script remains the same: render, addClass, deleteGrade, etc.)

function getYearFromName(name) {
    const match = name.match(/_(\d)/);
    return match ? match[1] : "1";
}

function render() {
    const container = document.getElementById('classesContainer');
    const yearFilter = document.getElementById('yearSelectorValue').value;
    container.innerHTML = '';

    let totalGpaPoints = 0;
    let totalUnits = 0;

    Object.keys(courses).sort().forEach(name => {
        const course = courses[name];
        const courseYear = name.includes('_') ? name.split('_')[1] : "1";
        if (yearFilter !== 'all' && yearFilter !== courseYear) return;

        // FETCH SCALE FOR THE SPECIFIC YEAR
        const scaleKey = schoolScales[courseYear] || 'us_40';
        const grading = GRADING_SCALES[scaleKey];

        // 1. Calculate Weighted Avg
        let wSum = 0, wTotal = 0;
        course.grades.forEach(g => { wSum += (g.score * (g.weight / 100)); wTotal += g.weight; });
        const rawAvg = wTotal > 0 ? (wSum / (wTotal / 100)) : 0;

        // 2. Determine Label (Label = 'A+', '1st', 'Tres Bien', etc.)
        let displayLabel = 'F';
        if (grading.boundaries) {
            const match = grading.boundaries.find(b => rawAvg >= b.v);
            displayLabel = match ? match.l : 'Fail';
        } else {
            // Standard 10-point spread logic
            if (rawAvg >= 90) displayLabel = 'A+';
            else if (rawAvg >= 80) displayLabel = 'A';
            else if (rawAvg >= 70) displayLabel = 'B';
            else if (rawAvg >= 60) displayLabel = 'C';
            else if (rawAvg >= 50) displayLabel = 'D';
            else displayLabel = 'F';
        }

        // 3. Map Label to GPA points
        const gpaPoints = grading.map[course.finalLetter || displayLabel] || 0;
        totalGpaPoints += (gpaPoints * (course.units || 3));
        totalUnits += (course.units || 3);

        const isFinal = !!course.finalLetter;

        container.innerHTML += `
            <div class="card ${isFinal ? 'finalized' : ''}">
                <div class="card-header">
                    <h2>${name} <span class="badge">${course.units || 3} Units</span></h2>
                    <small style="color:var(--primary); font-weight:bold">${schoolName}</small>
                </div>
                <div class="grade-list">
                    ${course.grades.map((g, i) => `
                        <div class="grade-row">
                            <span>${g.label} (${g.weight}%)</span>
                            <strong>${g.score}%</strong>
                            ${!isFinal ? `<button onclick="deleteGrade('${name}', ${i})" class="mini-del">×</button>` : ''}
                        </div>
                    `).join('')}
                </div>
                ${!isFinal ? `
                    <div class="add-grade-zone">
                        <input type="text" id="l-${name}" placeholder="Item">
                        <input type="number" id="s-${name}" placeholder="Grade %">
                        <input type="number" id="w-${name}" placeholder="Weight %">
                        <button onclick="addGrade('${name}')">Add</button>
                    </div>
                    <button class="finalize-toggle-btn" onclick="finalizeCourse('${name}', '${letter}')">Finalize as ${letter}</button>
                ` : `
                    <div class="final-display">
                        <p style="margin:0; color:#64748b;">Completed Grade</p>
                        <strong style="color:var(--primary)">${course.finalLetter}</strong>
                        <button onclick="unfinalizeCourse('${name}')" class="secondary-btn">Edit Course</button>
                    </div>
                `}
                <div class="stat" style="margin-top:15px; display:flex; justify-content:space-between;">
                    <span>Average: <strong>${avg.toFixed(1)}%</strong></span>
                    <span>${grading.label}: <strong>${grading.map[letter]}</strong></span>
                </div>
                <button onclick="deleteClass('${name}')" class="delete-btn" style="width:100%; margin-top:10px;">Delete Course</button>
            </div>
        `;

        const finalGPA = totalUnits > 0 ? (totalGpaPoints / totalUnits) : 0;
        document.getElementById('totalGpa').textContent = finalGPA.toFixed(2);
    });

    const gpa = totalUnits > 0 ? (totalWeightedPoints / totalUnits) : 0;
    document.getElementById('totalGpa').textContent = gpa.toFixed(2);

    const displayYear = yearFilter === 'all' ? "1" : yearFilter;
    const currentSchoolName = schoolHistory[displayYear] || 'University';
    document.getElementById('gpaLabel').textContent = yearFilter === 'all' ? "Cumulative History" : `${currentSchoolName} GPA`;
}

function addGrade(n) {
    const l = document.getElementById(`l-${n}`).value,
        s = parseFloat(document.getElementById(`s-${n}`).value),
        w = parseFloat(document.getElementById(`w-${n}`).value);
    if (l && !isNaN(s) && !isNaN(w)) {
        courses[n].grades.push({ label: l, score: s, weight: w });
        save();
    }
}
function deleteGrade(n, i) { courses[n].grades.splice(i, 1); save(); }
function finalizeCourse(n, l) { courses[n].finalLetter = l; save(); }
function unfinalizeCourse(n) { delete courses[n].finalLetter; save(); }
function addClass() {
    const n = document.getElementById('className').value.trim().toUpperCase();
    const u = parseFloat(document.getElementById('classUnits').value);
    if (n && !courses[n]) { courses[n] = { grades: [], units: u }; save(); }
}
function deleteClass(name) { if (confirm(`Delete ${name}?`)) { delete courses[name]; save(); } }
function save() { localStorage.setItem('courses', JSON.stringify(courses)); render(); }
function resetProfile() { if (confirm("Reset everything?")) { localStorage.clear(); location.reload(); } }

// NEW: Missing onboarding function
function finishOnboarding() {
    userName = document.getElementById('userNameInput').value.trim() || "Student";
    const schoolName = document.getElementById('selectedSchoolKey').value;

    if (!schoolName) {
        alert("Please select a school first.");
        return;
    }

    schoolHistory = { "1": schoolName, "2": schoolName, "3": schoolName, "4": schoolName };

    localStorage.setItem('userName', userName);
    localStorage.setItem('schoolHistory', JSON.stringify(schoolHistory));

    document.getElementById('onboardingOverlay').style.display = 'none';
    applyUserConfig(); // This triggers the final render and color application
}