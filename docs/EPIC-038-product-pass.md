# EPIC-038: Product Pass

## Section 1: Course-Centered Problems

The live product has course-aware data, but the experience still begins from separate destinations. Today recommends work, Planner owns tasks, Study owns sessions, Resources owns files, and Progress owns reporting. The links between them are mostly actions that send the student elsewhere.

The biggest break is the shell: the workspace header used to keep the Today title while the active panel changed. That made every destination feel like a tab inside Today instead of one coherent academic workspace. Course detail was stronger than the surrounding index, but its useful context was hidden behind a second navigation step.

The product should make the course the stable object and let tasks, assessments, resources, study, and progress attach to it.

## Section 2: Courses Screen Review

### Live observations

- The previous card was compact and mostly a list row: course name, three counts, average, target, and edit/delete actions.
- The first action was visually ambiguous because the course name was a tertiary button.
- A student could not immediately tell what mattered next for the course.
- Course health existed in course detail but was not visible in the course index.
- The mobile screenshot showed large unused vertical space in the shell while the course card still felt like a utility row.

### Product pass

Course cards now act as launch surfaces. Each card exposes:

- course health: Healthy, Watch, or At Risk
- units
- current average, target, and upcoming count
- the next task when one exists
- a primary Open course action

The card is now the bridge into the course workspace rather than a summary of unrelated counters.

## Section 3: Today Review

Today is the strongest existing concept: it has one recommended action first. Its three areas answer different questions:

- Recommended study: What should I do now?
- Next up signals: What is due, and what is risky?
- Recent activity: What changed?

The remaining risk is duplication as more widgets are added. Today should stay a command center, not become another dashboard. Course names should remain present in every actionable signal, and secondary metrics should stay subordinate to the recommended action.

## Section 4: Study Review

The live Study tool had the right core interaction, but analytics and mode controls competed with the start action. The product pass keeps the timer as the first tool and adds a plain instruction directly beside the Study heading: choose a course, optionally set a time, then press Start Session.

The active course is preserved when Study is opened from a course workspace. This supports the desired flow: Course card -> Expand -> Workspace -> Start study.

Study analytics should remain below the working tool and should become useful only after sessions exist.

## Section 5: Progress Review

Progress currently reports study hours, assignment completion, streak, GPA change, comparisons, top course, goals, and attention. That is useful data, but stressed students need a decision.

The existing `Next step` logic is the correct foundation: it prioritizes overdue work, near deadlines, below-target courses, and finally a study session. The next improvement is to make that action course-specific whenever possible, for example `Review EPIC018A` or `Clear overdue work in EPIC018A`, rather than a generic Open button.

Progress is finished only when the report resolves into a next move.

## Section 6: Header Review

The previous header read more like account management: profile title, institution, install, search, password, logout, and reset actions occupied the top of the workspace. The active workspace itself was visually weaker.

The shell now updates its eyebrow, title, and description with the active destination:

- Courses: Your academic workspace.
- Study: Start with one focused session.
- Progress: Know what to do next.

This reduces the feeling that the student is navigating unrelated pages. Account actions should remain available but visually quiet and secondary.

## Section 7: Interaction Model Proposal

The long-term model is a course workspace with contextual views:

```text
Today recommendation
  -> course + task
      -> open course workspace
          -> assessments | tasks | resources | notes | study activity
              -> start the next action
          <- back collapses to Courses
```

Primary navigation should answer only broad workspace questions: Today, Courses, Planner, Study, Resources, Progress. Within every destination, course filters and links should preserve the course context instead of resetting to a global state.

The existing `activeCourseName` state and `openCourseDashboard` path are the right foundation. The next structural step is to make the course workspace a reusable shell rather than replacing the entire Courses panel markup.

## Section 8: Space Audit

The browser screenshots show three space problems:

- Header/navigation: too much vertical attention is spent on shell chrome before the working content begins.
- Courses: the old card used space as a list row without creating a clear focal point. The new card uses the same footprint for hierarchy and an obvious action.
- Progress: the first viewport is dominated by stacked reporting blocks. The next action needs stronger visual priority than comparisons and report-card details.
- Study: the working timer should occupy the first meaningful content region; analytics belong after the action surface.
- Course detail: the information is comprehensive but long. The next assessment block correctly deserves the top position; lower sections should remain collapsible and course-scoped.

The current mobile viewport is narrow enough that horizontal navigation remains a constraint. The fixed navigation is functional, but the active workspace title and first action must stay visible above the fold.

## Section 9: What Still Feels Primitive

After the pass, the remaining primitive qualities are:

- global navigation still exposes several page-like destinations instead of feeling fully contextual
- course detail is still rendered by replacing a panel's inner HTML rather than using a durable workspace layout
- Progress contains many report blocks and can still feel like a weekly report card
- Study has timer, stopwatch, flashcards, and analytics competing as sibling modes
- card actions still include low-value Edit/Delete controls beside the primary action
- some legacy text and controls use inconsistent visual language and spacing

These are product architecture issues, not missing polish. The next gains come from reducing mode switching and preserving course context through every action.

## Section 10: GradeQuest Product Vision

**GradeQuest is the course-centered workspace that tells students what matters next and gives them the shortest path to doing it.**

Every screen should answer one of two questions:

1. Which course needs me?
2. What is the next useful action for that course?

Anything that only reports information without helping answer one of those questions should be reduced, moved lower, or turned into an action.

## Section 11: Implementation Plan

### Completed in this pass

1. Made the workspace header dynamic so it reflects the active destination.
2. Reworked course cards around health, next task, grade context, and Open course.
3. Added an explicit Study start instruction without competing with the Start Session control.
4. Validated the course-card-to-course-workspace-to-Study flow in the live browser.
5. Ran JavaScript syntax checks, deployment validation, and `git diff --check`.

### Next implementation slice

1. Convert the course detail replacement into a stable course workspace shell.
2. Add a persistent active-course rail or selector to Planner, Study, Resources, and Progress.
3. Make Progress actions course-specific and remove duplicate report-card summaries.
4. Collapse Study analytics and secondary modes behind deliberate context controls.
5. Run desktop and mobile screenshot checks for the full primary navigation and the course-to-action flow.
