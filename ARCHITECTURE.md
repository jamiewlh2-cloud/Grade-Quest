# Grade Quest Architecture

## High-Level System Overview

Grade Quest is a static, client-rendered web application. The browser loads the HTML application shell, CSS, browser JavaScript modules, third-party CDN libraries, and optional Firebase services. There is no frontend framework, custom application server, or server-side inference layer in the repository.

The application has four major concerns:

1. Academic workspace behavior: courses, assessments, calculations, planning, study, resources, and progress.
2. Browser persistence: user-scoped local storage and device-level preferences.
3. Account and cloud synchronization: Firebase Authentication and a Firestore user snapshot.
4. Document import: PDF extraction, OCR fallback, assessment parsing, validation, and optional local Ollama assistance.

## Major Components

### Application shell

`index.html` defines the authentication overlay, header, primary navigation, workspace panels, forms, dialogs, and script loading order. The application behaves as a single page with panel switching and contextual course views.

### Core workspace logic

`js/script.js` owns the main application state and a broad set of responsibilities including rendering, course management, assessment calculations, planner behavior, calendar behavior, course workspace behavior, timers, settings, backup/reset, and Grade Coach behavior.

`js/productivity.js` provides assignments, study analytics, advisor insights, global search, dashboard customization, Focus Mode, flashcards, goals, and progress reporting. It shares browser-global state and functions with the core script.

### Storage and persistence

`js/userStorage.js` exposes user-scoped local-storage access keyed by Firebase UID. It also handles legacy-key quarantine and emits data-change events. Device-level values such as theme and active tab are separate from user-scoped application data.

### Firebase services

The `js/firebase/` modules initialize Firebase, manage authentication, read and write user profile information, build Firestore references, load application snapshots, and save changes. The primary application data path is one user document with an `appData` field.

### PDF import subsystem

The `js/pdfImport/` modules separate PDF reading, OCR, course parsing, assignment parsing, date parsing, weight parsing, validation, preview, and orchestration. The import process uses deterministic parsing first and can call a local Ollama endpoint when parser confidence thresholds are not met.

### Learning and correction tools

The `pdfImportLearningTest/` directory contains browser-based correction memory, assessment learning, parser evaluation, regression, training-data export, and review-preview behavior. This is focused on improving assessment import decisions, not on a hosted student learning engine.

### PWA and deployment support

`manifest.json`, `sw.js`, and `js/pwa.js` provide installable-app metadata, service-worker caching, update handling, install prompts, and offline status reporting. `_headers`, `_redirects`, and the `scripts/` directory provide Cloudflare Pages headers, redirect configuration, Firebase configuration generation, and deployment validation.

## Data Flow

### Application data flow

1. The authenticated user opens the browser application.
2. Firebase authentication establishes the current user identity.
3. User-scoped storage is activated using the Firebase UID.
4. Local application data is loaded into the browser's working state.
5. If available, the Firestore `appData` snapshot is loaded for the authenticated user.
6. User actions update working state and write changes through the storage abstraction.
7. Storage change events trigger debounced cloud snapshot synchronization.
8. Rendering functions update the active workspace panels.

### PDF import flow

1. A student selects a PDF course document.
2. PDF.js attempts to extract document text.
3. Tesseract.js performs OCR when extracted text is empty.
4. Deterministic parsers identify course and assessment information.
5. Parser confidence and assessment totals are evaluated.
6. Ollama may be queried locally when configured confidence thresholds are not met.
7. Results are normalized, merged, validated, and presented for review.
8. Approved data is made available to the academic workspace and learning/correction tools.

### Backup flow

Application state is serialized to JSON for export. An imported JSON object is read back into application state. The current backup format does not have an explicit schema version or documented migration mechanism.

## User Flow

1. The user reaches the authentication overlay.
2. The user signs in or creates an account.
3. The profile and user-scoped application state are loaded.
4. The Today workspace presents deadlines, counts, and configurable widgets.
5. The user navigates to Courses to add or review courses and assessments.
6. The user uses Planner for tasks and calendar views, Study for sessions and focus work, Resources for notes/files/outlines, and Progress for academic reporting.
7. Course actions can open a contextual course workspace containing related assessments, tasks, resources, notes, and study activity.
8. Settings provides profile, theme, account, backup, and data controls.
9. The service worker can provide cached application assets when the browser is offline; authentication and cloud synchronization remain dependent on Firebase availability.

## Dependency Overview

| Dependency or service | Role | Relationship |
| --- | --- | --- |
| Browser runtime | Executes the client-rendered application and browser APIs. | Required |
| Firebase Authentication | Account identity and email/password auth flows. | Required for authenticated use |
| Cloud Firestore | User profile and application snapshot synchronization. | Optional persistence service, required for cloud sync |
| Firebase JavaScript SDK `11.10.0` | Firebase client APIs. | Loaded from `www.gstatic.com` |
| PDF.js `3.11.174` | PDF text extraction. | Loaded from CDN |
| Tesseract.js `5` | OCR fallback for textless PDFs. | Loaded from CDN |
| Ollama `qwen3-coder:latest` | Optional local assessment-extraction fallback. | Available only when a compatible local service is running |
| Node.js | Runs configuration-generation and deployment-validation scripts. | Development/deployment tooling |
| Cloudflare Pages | Hosts the static application artifacts. | Deployment platform configuration |

The repository does not declare frontend runtime dependencies in `package.json`, and it does not define a bundler or application server.