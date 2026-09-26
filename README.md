# Grade Quest

Grade Quest is a browser-based academic workspace for post-secondary students. It combines course and assessment tracking with planning, study activity, resources, progress reporting, PDF syllabus importing, and optional Firebase account synchronization.

This repository contains a static HTML, CSS, and JavaScript application. The current package version is `1.0.0`. The application is functional, but it remains an early product with limited automated testing and a minimal existing release history.

## Key Features

- Firebase email/password authentication, profile data, password reset, and password change.
- Course creation and management with units, target grades, course health, and course details.
- Assessment grades, weights, due dates, weighted averages, projections, and GPA calculations.
- Grade Coach responses for deterministic final-grade and remaining-work calculations.
- Planner tasks with deadlines, priorities, notes, completion state, and course links.
- Month, week, day, and timeline planner views.
- Study sessions, Focus Mode, study analytics, streaks, course breakdowns, and weekly comparisons.
- Flashcards with review intervals and semester goals.
- Resources, notes, course outlines, and image/PDF attachments stored as application data.
- Global search across courses, tasks, resources, notes, flashcards, and outlines.
- PDF text extraction, OCR fallback, assessment parsing, validation, and review before import.
- Optional local Ollama fallback for low-confidence assessment extraction.
- JSON backup export/import, installable PWA behavior, and cached app-shell support.

## Technology Stack

- HTML, CSS, and browser JavaScript with no frontend framework.
- Firebase JavaScript SDK `11.10.0` for Authentication and Cloud Firestore.
- PDF.js `3.11.174` for PDF text extraction.
- Tesseract.js `5` for browser-based OCR fallback.
- Optional Ollama local HTTP API using the `qwen3-coder:latest` model.
- Node.js scripts for Firebase configuration generation and deployment validation.
- Cloudflare Pages deployment configuration.

The browser libraries are loaded through CDN references in the application shell. They are not declared as runtime dependencies in `package.json`.

## Installation

### Prerequisites

- Node.js 20 or newer for the documented Cloudflare Pages setup.
- A Firebase web application configuration for authenticated and cloud-synchronized use.

### Local setup

1. Install the repository's available Node.js dependencies if a local environment requires them.
2. Create or provide `firebase-config.js` using the values represented by `firebase-config.example.js`, or set the Firebase environment variables used by the build script.
3. Run the build command when generating deployment configuration:

	```text
	npm run build
	```

4. Serve the repository root through a local static web server. The application uses browser modules, service workers, and Firebase, so opening the HTML file directly is not equivalent to a hosted origin.

5. Validate the deployment assets:

	```text
	npm run validate:deployment
	```

The project does not currently define a development server, bundler, test script, lint script, or type-check script.

## Usage

1. Open the application through a local or hosted web origin.
2. Create an account or sign in.
3. Complete profile information when prompted.
4. Add courses and assessments, or import assessment information from a course PDF.
5. Use Today, Courses, Planner, Study, Resources, Progress, and Settings to manage academic work.
6. Review calculated grades, GPA information, deadlines, study sessions, flashcards, and progress reports.
7. Use the backup controls in the application settings to export or import application data.

PDF importing first attempts text extraction and uses browser OCR when extracted text is empty. A local Ollama service is optional and is used only as a fallback when deterministic parser confidence thresholds are not met.

## Project Structure

```text
index.html                 Application shell, panels, forms, and navigation
css/style.css              Global, responsive, theme, modal, and workspace styles
js/script.js               Main application state, rendering, grades, courses, and planner
js/productivity.js         Assignments, analytics, search, focus, flashcards, and progress
js/userStorage.js          UID-scoped localStorage abstraction
js/schools.js              University metadata and grading scales
js/ui/feedback.js          Toasts, confirmations, and dialog helpers
js/pwa.js                  Service-worker registration and install behavior
js/firebase/               Firebase authentication, profile, Firestore, and sync modules
js/pdfImport/              PDF extraction, OCR, parsing, validation, and import modules
pdfImportLearningTest/     Browser learning, correction, evaluation, and regression tooling
firebase/                  Firestore rules and index configuration
scripts/                   Build-time configuration and deployment validation scripts
docs/                      Deployment and product-pass documentation
sw.js                      Service worker
manifest.json              Web app manifest
```

## Documentation

- [Architecture](ARCHITECTURE.md) describes the current application boundaries and data flow.
- [Contributing](CONTRIBUTING.md) describes the current development and verification expectations.
- [Changelog](CHANGELOG.md) records the documented baseline and future release placeholders.
- [Roadmap](ROADMAP.md) records current direction from the existing product-pass documentation and known engineering gaps.
- [Project audit](PROJECT_AUDIT.md) provides a detailed assessment of the current implementation.
- [Adaptive learning design](DESIGN_DOCUMENT.md) specifies deterministic learning behavior after questions have been created.

## Future Vision

The documented product vision is a course-centered workspace that tells students what matters next and gives them the shortest path to doing it. The existing product-pass notes identify continued work around a durable course workspace, preserving course context across Planner, Study, Resources, and Progress, reducing competing reporting and study modes, and improving the priority of course-specific actions.

This section describes documented direction, not committed release scope. The current repository does not contain a dated release plan or a formal product roadmap.
