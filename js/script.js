let courses = JSON.parse(localStorage.getItem('courses')) || {};

const letterToPercent = {
    'A+': 95, 'A': 87, 'A-': 82,
    'B+': 78, 'B': 75, 'B-': 72,
    'C+': 68, 'C': 65, 'C-': 62,
    'D+': 58, 'D': 55, 'D-': 52,
    'F': 35
};

function save() {
    localStorage.setItem('courses', JSON.stringify(courses));
    render();
}

function getYearFromName(name) {
    const match = name.match(/_(\d)/);
    return match ? match[1] : null;
}

function addClass() {
    const nameInput = document.getElementById('className');
    const unitInput = document.getElementById('classUnits'); // Get the new dropdown
    const name = nameInput.value.trim().toUpperCase();
    const units = parseFloat(unitInput.value);

    if (name && !courses[name]) {
        // Save units along with the course data
        courses[name] = { grades: [], target: 80, units: units };
        nameInput.value = '';
        save();
    }
}

function addGrade(courseName) {
    const score = parseFloat(document.getElementById(`score-${courseName}`).value);
    const weight = parseFloat(document.getElementById(`weight-${courseName}`).value);
    if (!isNaN(score) && !isNaN(weight)) {
        courses[courseName].grades.push({ score, weight });
        save();
    }
}

function deleteGrade(courseName, idx) {
    courses[courseName].grades.splice(idx, 1);
    save();
}

function deleteClass(name) {
    if (confirm(`Delete ${name}?`)) { delete courses[name]; save(); }
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
            opt.value = name; opt.textContent = name;
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

function render() {
    updateDropdown(); // Refresh the course filter list

    const container = document.getElementById('classesContainer');
    const classFilter = document.getElementById('classSelector').value;
    const yearFilter = document.getElementById('yearSelector').value;
    container.innerHTML = '';

    // McMaster Calculation Variables
    let totalWeightedPoints = 0;
    let totalUnits = 0;
    let staggerIndex = 0;

    const sortedCourseNames = Object.keys(courses).sort();

    sortedCourseNames.forEach(name => {
        const courseYear = getYearFromName(name);

        // 1. Filtering Logic
        if (yearFilter !== 'all' && yearFilter !== courseYear) return;
        if (classFilter !== 'all' && classFilter !== name) return;

        // 2. Course-Specific Calculations
        let currentWeight = 0;
        let weightedSum = 0;
        courses[name].grades.forEach(g => {
            weightedSum += (g.score * (g.weight / 100));
            currentWeight += g.weight;
        });

        const currentAvg = currentWeight > 0 ? (weightedSum / (currentWeight / 100)) : 0;
        const remainingWeight = 100 - currentWeight;
        const target = courses[name].target;
        const needed = remainingWeight > 0 ? ((target - weightedSum) / (remainingWeight / 100)) : 0;

        // Projection Logic (Best/Worst case for the remaining weight)
        const bestCase = weightedSum + (1.0 * remainingWeight);
        const worstCase = weightedSum + (0.5 * remainingWeight);

        // 3. McMaster Unit Weighting Logic
        // Use the final letter grade if it exists, otherwise use the running average
        let displayAvg = courses[name].finalLetter ? letterToPercent[courses[name].finalLetter] : currentAvg;

        // McMaster courses are usually 3 or 6 units. We default to 3 if not specified.
        const units = courses[name].units || 3;

        if (displayAvg > 0 || courses[name].finalLetter) {
            totalWeightedPoints += (displayAvg * units);
            totalUnits += units;
        }

        // 4. UI Preparation
        const isFinal = courses[name].finalLetter;
        const delay = (staggerIndex * 0.1).toFixed(2);
        staggerIndex++;

        // 5. Build the Card HTML
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
                            <input type="number" class="inline-input" value="${target}" onchange="updateTarget('${name}', this.value)">
                        </div>
                    </div>

                    <div class="needed-box ${needed > 100 ? 'danger' : ''}">
                        ${remainingWeight > 0
                    ? `Need an average of <strong>${needed.toFixed(1)}%</strong> on the remaining ${remainingWeight}% weight.`
                    : `All weights accounted for.`}
                    </div>

                    <div class="range-projection">
                        <label>McMaster Projection Range</label>
                        <div class="range-bar" style="display:flex; justify-content:space-between; font-size:0.9rem;">
                            <span>Worst Case: <strong>${worstCase.toFixed(1)}%</strong></span>
                            <span>Best Case: <strong>${bestCase.toFixed(1)}%</strong></span>
                        </div>
                    </div>

                    <div class="grade-list">
                        ${courses[name].grades.map((g, idx) => `
                            <div class="grade-row">
                                <span><strong>${g.score}%</strong> <small>(${g.weight}% weight)</small></span>
                                <button class="mini-del" onclick="deleteGrade('${name}', ${idx})">×</button>
                            </div>
                        `).join('') || '<p style="font-size:0.8rem; color:#94a3b8">No grades added yet.</p>'}
                    </div>

                    <div class="add-grade-zone">
                        <input type="number" id="score-${name}" placeholder="Grade %">
                        <input type="number" id="weight-${name}" placeholder="Weight %">
                        <button onclick="addGrade('${name}')">Add</button>
                    </div>

                    <div id="finalize-ui-${name}" class="finalize-confirm-zone" style="display: none;">
                        <label>Pick Official Letter Grade:</label>
                        <div style="display:flex; gap:10px;">
                            <select id="letter-select-${name}" style="flex:2; padding:8px; border-radius:8px;">
                                ${Object.keys(letterToPercent).map(l => `<option value="${l}">${l}</option>`).join('')}
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

    // 6. Final Weighted GPA Calculation
    // Total Points / Total Units = McMaster Weighted Average
    const finalGpa = totalUnits > 0 ? (totalWeightedPoints / totalUnits) : 0;
    const gpaEl = document.getElementById('totalGpa');
    if (gpaEl) {
        gpaEl.textContent = finalGpa.toFixed(2) + '%';
    }
}

render();