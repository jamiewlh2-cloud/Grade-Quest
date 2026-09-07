// pdfImport/parsers/assignmentParser.js

window.AssignmentParser = {

    parse(text) {

        const items = [];

        // Known course assessment titles for targeted syllabus matching
        const knownTitles = [
            'Team Formation',
            'Initial Client Report',
            'Web Layout Assignment',
            'Client-Side Test',
            'JS Pair Assignment',
            'JS Individual Assignment',
            'Development Plan',
            'Server-Side Assignment',
            'Project Increment',
            'Server-Side Test',
            'Final Portfolio Review',
            'Project Final Deliverable'
        ];

        const genericAssessmentNames = new Set([
            'lab',
            'labs',
            'assignment',
            'assignments',
            'project',
            'projects',
            'test',
            'tests',
            'quiz',
            'quizzes',
            'quizz',
            'exam',
            'exams',
            'midterm',
            'midterms',
            'portfolio',
            'participation',
            'deliverable',
            'report',
            'review'
        ]);

        const weakAssessmentWords = new Set([
            'due',
            'begins',
            'plan',
            'review'
        ]);

        const invalidTitleWords = new Set([
            'due',
            'begins',
            'asynchronous',
            'march',
            'april',
            'january',
            'february',
            'week',
            'exam week',
            'page',
            'http',
            'https',
            'mcmaster',
            'university',
            'syllabus',
            'simple',
            'doc',
            'total',
            'penalty',
            'penalties',
            'accounting'
        ]);

        // Restricts day matching with word boundaries to eliminate table artifacts
        const dateRegex =
            /\b(?:Jan(?:uary)?\.?|Feb(?:ruary)?\.?|Mar(?:ch)?\.?|Apr(?:il)?\.?|May|Jun(?:e)?\.?|Jul(?:y)?\.?|Aug(?:ust)?\.?|Sep(?:t(?:ember)?)?\.?|Oct(?:ober)?\.?|Nov(?:ember)?\.?|Dec(?:ember)?)\.?\s+(?:3[01]|[12][0-9]|[1-9])\b(?!\d)(?:,\s*\d{4})?\b/gi;

        //
        // HELPER UTILITIES
        //

        function escapeRegex(value) {
            return String(value).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        }

        function normalizeTitle(value) {
            return String(value || '')
                .toLowerCase()
                .replace(/[-_]/g, ' ')           
                .replace(/[^a-z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function getWordCount(value) {
            return normalizeTitle(value)
                .split(' ')
                .filter(Boolean)
                .length;
        }

        function findKnownTitle(title) {
            const normalizedTitle = normalizeTitle(title);

            for (const knownTitle of knownTitles) {
                if (normalizedTitle.includes(normalizeTitle(knownTitle))) {
                    return knownTitle;
                }
            }

            return null;
        }

        //
        // CANDIDATE MATCHING & TOKEN WINDOW ANALYSIS
        //

        function findBestKnownTitleInWindow(windowText, percentIndex, existingNames) {
            const tokens = [];
            const tokenRegex = /[a-z0-9]+/gi;
            let tokenMatch;

            while ((tokenMatch = tokenRegex.exec(windowText))) {
                tokens.push({
                    text: normalizeTitle(tokenMatch[0]),
                    start: tokenMatch.index,
                    end: tokenMatch.index + tokenMatch[0].length
                });
            }

            const candidates = [];

            for (const knownTitle of knownTitles) {
                if (existingNames && existingNames.has(normalizeTitle(knownTitle))) {
                    continue;
                }

                const titleWords = normalizeTitle(knownTitle)
                    .split(' ')
                    .filter(Boolean);

                if (!titleWords.length) {
                    continue;
                }

                const matchedOccurrences = [];

                for (const searchWord of titleWords) {
                    let bestOccurrence = null;

                    for (const token of tokens) {
                        if (token.text !== searchWord) {
                            continue;
                        }

                        if (token.start > percentIndex + 40) {
                            continue;
                        }

                        const tokenDistance = Math.abs(percentIndex - token.end);

                        if (!bestOccurrence || tokenDistance < bestOccurrence.distance) {
                            bestOccurrence = {
                                token,
                                distance: tokenDistance
                            };
                        }
                    }

                    if (bestOccurrence) {
                        matchedOccurrences.push(bestOccurrence);
                    }
                }

                if (!matchedOccurrences.length) {
                    continue;
                }

                const anchor = matchedOccurrences.reduce((best, current) => (
                    current.distance < best.distance ? current : best
                ));

                const coverage = matchedOccurrences.length / titleWords.length;

                candidates.push({
                    title: knownTitle,
                    anchorIndex: anchor.token.start,
                    matchedWordCount: matchedOccurrences.length,
                    totalWordCount: titleWords.length,
                    distance: anchor.distance,
                    coverage: coverage
                });
            }

            if (!candidates.length) {
                return null;
            }

            candidates.sort((left, right) => {
                if (Math.abs(left.coverage - right.coverage) > 0.01) {
                    return right.coverage - left.coverage;
                }

                if (left.distance !== right.distance) {
                    return left.distance - right.distance;
                }

                if (left.matchedWordCount !== right.matchedWordCount) {
                    return right.matchedWordCount - left.matchedWordCount;
                }

                return left.anchorIndex - right.anchorIndex;
            });

            return candidates[0];
        }

        function isConcreteAssessmentTitle(title) {
            const normalizedTitle = normalizeTitle(title);

            if (!normalizedTitle) {
                return false;
            }

            if (invalidTitleWords.has(normalizedTitle)) {
                return false;
            }

            // Exclude policy, penalty, and academic integrity boilerplate phrases
            if (
                /\b(penalty|penalties|accounting|subject|turnitin|policy|academic|integrity|student|students|course|courses)\b/i.test(
                    normalizedTitle
                )
            ) {
                return false;
            }

            const words = normalizedTitle.split(' ').filter(Boolean);

            if (words.length === 1 && !genericAssessmentNames.has(words[0])) {
                return false;
            }

            if (
                /\b(lecture|lectures|topic|topics|reading|readings|session|overview|outline|grading breakdown|breakdown|category|categories|component|components)\b/i.test(normalizedTitle)
            ) {
                return false;
            }

            return true;
        }

        function findClosestDueDate(sourceText, anchorIndex, anchorLength) {
            const windowStart = Math.max(0, anchorIndex - 250);
            const windowEnd = Math.min(sourceText.length, anchorIndex + anchorLength + 60);
            const windowText = sourceText.slice(windowStart, windowEnd);
            
            let bestMatch = null;

            dateRegex.lastIndex = 0;
            let dateMatch;

            while ((dateMatch = dateRegex.exec(windowText))) {
                const absoluteIndex = windowStart + dateMatch.index;
                let distance = absoluteIndex - anchorIndex;
                let adjustedDistance = distance < 0 ? Math.abs(distance) : distance * 2.5;

                if (!bestMatch || adjustedDistance < bestMatch.distance) {
                    bestMatch = {
                        value: dateMatch[0].replace(/\s+/g, ' ').trim(),
                        distance: adjustedDistance
                    };
                }
            }

            return bestMatch ? bestMatch.value : '';
        }

        //
        // ITEM STATE MANAGEMENT
        //

        function addAssessment(
            name,
            weight,
            confidence = 'high',
            dueDate = ''
        ) {
            name = name.replace(/\s+/g, ' ').trim();

            if (!name || !Number.isFinite(Number(weight)) || Number(weight) <= 0) {
                return;
            }

            if (!isConcreteAssessmentTitle(name)) {
                return;
            }

            const normalizedName = normalizeTitle(name);

            const existingIndex = items.findIndex(
                item => normalizeTitle(item.name) === normalizedName
            );

            if (existingIndex !== -1) {
                const existing = items[existingIndex];

                if (dueDate && (!existing.dueDate || existing.dueDate.length === 0)) {
                    existing.dueDate = dueDate;
                }
                return;
            }

            items.push({
                name,
                weight: Number(weight),
                dueDate,
                confidence
            });
        }

        //
        // STRICT PROXIMITY PERCENTAGE SCANNER
        // Scans each percentage tag and looks at its immediate local window to map the correct title & weight.
        //
        const percentRegex = /\((\d{1,2})%\)/g;
        let match;

        while ((match = percentRegex.exec(text))) {
            const weight = Number(match[1]);
            const percentIndex = match.index;

            const windowStart = Math.max(0, percentIndex - 90);
            const windowEnd = Math.min(text.length, percentIndex + 20);
            const windowText = text.slice(windowStart, windowEnd);
            const localPercentIndex = percentIndex - windowStart;

            const existingNames = new Set(items.map(item => normalizeTitle(item.name)));

            const matchedTitle = findBestKnownTitleInWindow(
                windowText,
                localPercentIndex,
                existingNames
            );

            if (!matchedTitle) {
                continue;
            }

            const absoluteTitleIndex = windowStart + matchedTitle.anchorIndex;
            const dueDate = findClosestDueDate(
                text,
                absoluteTitleIndex,
                matchedTitle.title.length
            );

            addAssessment(
                matchedTitle.title,
                weight,
                'high',
                dueDate
            );
        }

        //
        // GENERIC PATTERN FALLBACK FOR UNLISTED ITEMS
        //
        const hasKnownMatches = items.some(item => 
            knownTitles.some(kt => normalizeTitle(kt) === normalizeTitle(item.name))
        );

        if (!hasKnownMatches) {
            const genericRegex = /([A-Z][A-Za-z0-9\s\-]{2,35}?)\s*(?:Due|Begins|Review)?\s*\((100|\d{1,2})%\)/g;
            let genericMatch;

            while ((genericMatch = genericRegex.exec(text))) {
                const rawName = genericMatch[1].trim();
                const weight = Number(genericMatch[2]);

                if (isConcreteAssessmentTitle(rawName)) {
                    const dueDate = findClosestDueDate(text, genericMatch.index, genericMatch[0].length);
                    addAssessment(rawName, weight, 'medium', dueDate);
                }
            }
        }

        //
        // OUTLINE SUMMARY FALLBACK (For course outlines with grouped item counts like "Quizzes (5) | 10%")
        //
        if (items.length === 0) {
            const cleanedOutlineText = text.replace(/[|\r]/g, ' ');
            const outlineLineRegex = /([A-Za-z\s]+?)\s*(?:\((\d+)\))?\s*(\d{1,3})%/g;
            let outlineMatch;

            while ((outlineMatch = outlineLineRegex.exec(cleanedOutlineText))) {
                const rawName = outlineMatch[1].trim();
                const count = outlineMatch[2] ? parseInt(outlineMatch[2], 10) : 1;
                const totalWeight = parseFloat(outlineMatch[3]);

                const nameParts = rawName.split(/\s+/);
                const candidateName = nameParts.slice(-3).join(' ');

                if (isConcreteAssessmentTitle(candidateName) && totalWeight > 0 && totalWeight <= 100) {
                    if (count > 1) {
                        const individualWeight = totalWeight / count;
                        let baseName = candidateName.toLowerCase().includes('quizz') || candidateName.toLowerCase().includes('quiz') 
                            ? 'Quiz' 
                            : (candidateName.endsWith('zes') ? candidateName.slice(0, -2) : candidateName.replace(/s$/, ''));
                        
                        for (let i = 1; i <= count; i++) {
                            addAssessment(`${baseName} ${i}`, individualWeight, 'high', '');
                        }
                    } else {
                        addAssessment(candidateName, totalWeight, 'high', '');
                    }
                }
            }
        }

        console.log('ASSESSMENTS FOUND:', items);
        return items;

    }

};