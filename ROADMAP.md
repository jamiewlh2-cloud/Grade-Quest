# Grade Quest Roadmap

This roadmap records the current state and documented direction of the project. It is not a commitment to delivery dates. The repository contains no dated release plan.

## Current Release

### Version 1.0.0

The current package version is `1.0.0`. The present baseline includes:

- Course, assessment, grade, GPA, and projection workflows.
- Planner, calendar views, study sessions, Focus Mode, flashcards, goals, and progress reporting.
- Course resources, notes, outlines, search, backup export/import, and profile settings.
- PDF extraction, OCR fallback, assessment parsing, validation, and optional local Ollama fallback.
- Firebase Authentication and user-scoped Firestore snapshot synchronization.
- PWA manifest, service-worker caching, deployment headers, and deployment validation.

No formal release notes or tagged release history are present in the repository.

## Near-Term Goals

The following items are recorded in the existing product-pass documentation as the next implementation direction:

- Convert contextual course detail from panel replacement into a stable course workspace shell.
- Preserve active course context across Planner, Study, Resources, and Progress.
- Make Progress actions course-specific and reduce duplicated report-card summaries.
- Reduce competition between the Study timer, stopwatch, flashcards, and analytics modes.
- Continue validating the primary navigation and course-to-action flow on desktop and mobile viewports.

These are documented product-pass items, not completed capabilities.

## Medium-Term Goals

The current repository identifies these areas as engineering and product maturity gaps:

- Establish conventional unit, integration, and browser end-to-end test coverage.
- Add CI checks for build validation, deployment validation, and regression protection.
- Improve project documentation beyond the existing minimal README and focused deployment notes.
- Clarify the application architecture and data model as the global script surface continues to grow.
- Address the maintainability risks created by large global modules, inline handlers, and overlapping styling layers.
- Add documented privacy, retention, threat-model, and Firebase security review materials.

These goals describe missing professional components and known technical debt; no implementation for them is currently present.

## Long-Term Goals

The existing product vision describes a course-centered workspace in which every destination answers one of two questions:

1. Which course needs the student's attention?
2. What is the next useful action for that course?

Longer-term direction therefore remains centered on durable course context, focused next actions, and reducing information that does not lead to an academic action. The repository does not define additional long-term features, delivery dates, or committed scope beyond this product vision.