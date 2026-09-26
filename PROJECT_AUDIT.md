# GradeQuest Project Audit

**Audit basis:** Source, configuration, deployment, and documentation files present in this repository as of 2026-09-26.

## 1. Executive Summary

GradeQuest is a browser-based academic workspace for students. It combines weighted grade tracking, GPA calculation, assessment planning, course and task organization, study activity tracking, resource storage, progress reporting, and syllabus PDF importing in a single client-rendered application.

The intended audience is post-secondary students who need to monitor courses, forecast grades, organize academic work, and record study activity. The application is also suitable for users who want optional account-based synchronization across sessions and devices through Firebase.

The current maturity level is a functional early-product/prototype. The application has a broad implemented feature set and production-oriented pieces such as authentication, Firestore rules, deployment validation, security headers, and PWA support. Its maintainability and operational maturity are lower: core behavior is concentrated in large global scripts, the README is minimal, package metadata does not declare the browser libraries used by the app, and there is no conventional automated unit, integration, or end-to-end test suite.

## 2. Feature Inventory

| Feature | Description | Files involved | Status |
| --- | --- | --- | --- |
| Authentication | Email/password sign-in, account creation, email verification handling, password reset, password change, logout, and auth-gated application startup. | `index.html`; `js/firebase/authService.js`; `js/firebase/authGate.js`; `js/firebase/firebaseClient.js` | Implemented |
| User profile | Stores and edits name, university, program, start year, and theme preference. | `index.html`; `js/script.js`; `js/firebase/userProfileService.js`; `js/firebase/authGate.js` | Implemented |
| Today dashboard | Shows deadlines, dashboard widgets, course/file/task counts, academic prompts, and configurable widget ordering/visibility. | `index.html`; `js/script.js`; `js/productivity.js`; `css/style.css` | Implemented |
| Course management | Creates, edits, deletes, filters, and displays courses with units, target grades, year, and course details. | `index.html`; `js/script.js`; `js/schools.js` | Implemented |
| Assessment tracking | Records assessment names, grades, weights, due dates, status, and final-letter outcomes. | `js/script.js`; `classes/`; `index.html` | Implemented |
| Grade calculations | Calculates weighted current averages, remaining-grade requirements, best/worst projections, course health states, and selected-period GPA. | `js/script.js`; `js/schools.js` | Implemented |
| Grade Coach | Parses natural-language grade questions and returns deterministic arithmetic responses for target, final, remaining-work, and overall-grade questions. | `index.html`; `js/script.js` | Implemented, rule-based rather than AI |
| Planner | Creates and manages tasks with deadlines, priorities, notes, completion state, status, and course links. | `index.html`; `js/script.js`; `js/productivity.js` | Implemented |
| Calendar views | Provides month, week, day, and timeline views for planner work. | `js/productivity.js`; `css/style.css`; `index.html` | Implemented |
| Resources | Stores notes and course-associated files, including image/PDF data URLs and outline text. | `js/script.js`; `js/productivity.js`; `index.html` | Implemented |
| Course outlines | Imports outline text and extracts assessment weights for course use. | `js/script.js`; `js/pdfImport/parsers/weightParser.js` | Implemented |
| Course workspace | Provides course-centered views for assessments, tasks, resources, outlines, notes, study activity, and recent activity. | `js/script.js`; `js/productivity.js`; `css/style.css` | Implemented; rendered by replacing the Courses panel contextually |
| Study sessions | Runs count-up/countdown study sessions with pause, resume, finish, save, and discard states. | `js/script.js`; `js/productivity.js`; `index.html` | Implemented |
| Focus Mode | Runs a focus timer associated with planner tasks and courses. | `js/productivity.js`; `index.html` | Implemented |
| Study analytics | Shows study totals, streaks, course breakdowns, weekly comparisons, and generated insights. | `js/productivity.js`; `js/script.js` | Implemented |
| Flashcards | Stores flashcards and applies review ratings with spaced-repetition intervals. | `js/productivity.js`; `index.html` | Implemented |
| Semester goals | Stores goals and tracks goal progress. | `js/productivity.js`; `index.html` | Implemented |
| Progress reporting | Provides academic health, semester GPA prediction, weekly review, and progress views. | `js/productivity.js`; `js/script.js`; `index.html` | Implemented |
| Global search | Searches courses, tasks, files, notes, flashcards, and course outlines. | `js/productivity.js`; `index.html` | Implemented |
| Backup and reset | Exports application state as JSON, imports JSON state, and supports local profile/data reset. | `js/script.js`; `js/userStorage.js`; `index.html` | Implemented; imported JSON has no explicit schema version |
| PDF text import | Extracts text from text-based PDFs with PDF.js. | `js/pdfImport/pdfReader.js`; `js/pdfImport/importer.js` | Implemented |
| PDF OCR import | Renders textless PDF pages to canvas and uses Tesseract.js English OCR. | `js/pdfImport/ocrProcessor.js`; `js/pdfImport/pdfReader.js`; `js/pdfImport/importer.js` | Implemented |
| Assessment extraction | Parses course codes, terms, weights, dates, titles, sections, duplicates, confidence, and weight totals. | `js/pdfImport/parsers/assignmentParser.js`; `courseParser.js`; `dateParser.js`; `weightParser.js`; `validator.js` | Implemented |
| Import preview | Displays extracted assessments for review and validation before import. | `js/pdfImport/previewModal.js`; `js/pdfImport/validator.js`; `js/pdfImport/importer.js` | Implemented |
| Learning harness | Stores corrections, approved records, extraction patterns, parser evaluations, regression baselines, and training exports. | `pdfImportLearningTest/`; `js/pdfImport/tests/batchRunner.js` | Implemented browser tooling |
| PWA/offline shell | Registers a service worker, caches the app shell and CDN assets, reports offline state, and supports an install prompt. | `manifest.json`; `sw.js`; `js/pwa.js`; `index.html` | Implemented |

## 3. Application Structure

### Pages, views, and screens

The application is a single-page shell in `index.html`. Its primary workspace navigation contains:

- Today
- Courses
- Planner
- Study
- Resources
- Progress
- Settings

Additional panels and contextual views cover Grades, Assignments, Grade Outlook, Course Risk, Goals, Focus, Flashcards, Notes, Profile, and Course Detail. Course Detail is opened from the Courses area and changes the current panel context rather than navigating to a separate document.

### Navigation flow

The auth overlay gates access to the workspace. After authentication, `authGate.js` activates user-scoped storage and loads the cloud snapshot when available. `setActiveTab()` controls the primary dashboard panels. Global search opens from the header, and course actions open contextual course dashboards. Settings contains profile, theme, backup, data, and account-related controls. The service worker operates beneath the application shell and can serve cached assets while offline; authentication and cloud synchronization remain Firebase-dependent.

### Project structure

```text
index.html                 Application shell, panels, forms, and navigation
css/style.css              Global, responsive, theme, modal, and workspace styles
js/script.js               Main state, rendering, grade logic, courses, planner, and timers
js/productivity.js         Assignments, analytics, search, focus, flashcards, and progress
js/userStorage.js          User-scoped localStorage abstraction
js/schools.js              University metadata and grading scales
js/ui/feedback.js          Toasts, confirmations, and dialog helpers
js/pwa.js                  Service-worker and install behavior
js/firebase/               Firebase auth, profile, Firestore, and sync modules
js/pdfImport/              PDF extraction, OCR, parsing, validation, and import UI
pdfImportLearningTest/     Learning, correction, evaluation, and regression tooling
firebase/                  Firestore rules and index configuration
scripts/                   Build-time Firebase config and deployment validation
docs/                      Cloudflare deployment and product-pass notes
icons/                     PWA icons
sw.js                      Service worker
manifest.json              Web app manifest
```

### Key modules

`script.js` is the primary application module and owns most domain state and rendering. `productivity.js` adds a second large global module that relies on shared state and functions. The Firebase directory provides ES modules for authentication and cloud access. The PDF import directory is comparatively separated into reader, OCR, parser, validation, preview, and orchestration responsibilities.

## 4. Technology Inventory

| Area | Current implementation |
| --- | --- |
| Languages | HTML, CSS, JavaScript, JSON, and Node.js JavaScript modules for build scripts |
| Application framework | No frontend framework; static HTML with browser JavaScript |
| JavaScript module styles | Global browser scripts plus ES modules for Firebase modules |
| Firebase SDK | Firebase JavaScript SDK `11.10.0`, imported from `www.gstatic.com` |
| Authentication | Firebase Authentication with browser-local persistence and email/password providers |
| Database | Cloud Firestore |
| PDF processing | PDF.js `3.11.174` |
| OCR | Tesseract.js `5` |
| Optional AI service | Local Ollama HTTP API at `http://localhost:11434/api/generate`, model `qwen3-coder:latest` |
| Browser APIs | `localStorage`, Service Worker API, Web App Manifest, File APIs, Canvas, online/offline events, and install prompt events |
| Hosting/deployment | Cloudflare Pages artifacts and headers/redirect configuration are present |
| Build tooling | Node.js scripts using built-in `fs/promises`; no bundler is declared |
| Package metadata | `package.json` has `build` and `validate:deployment` scripts but no declared dependencies |

## 5. Data Management

### Local storage

`js/userStorage.js` scopes application keys by authenticated Firebase UID. User-scoped keys include courses, files, planner tasks, notes, course outlines, study sessions, timer state, goals, review history, achievements, flashcards, dashboard configuration, PDF assessment memory, training datasets, and hybrid training records. Device-level keys include theme, active dashboard tab, and last backup date.

Legacy unscoped keys are quarantined under the `gradequest.legacy.` prefix. Storage writes emit a `gradequest:data-changed` event used by the synchronization layer.

### Database and synchronization

The main cloud persistence path stores a complete application snapshot in `users/{uid}` under `appData`, with an `appDataUpdatedAt` server timestamp. `authGate.js` listens for data changes and saves the snapshot using a 250 ms debounce. Firestore rules restrict the user document and its `courses`, `grades`, `imports`, and `trainingRecords` subcollections to the owning authenticated UID. The application snapshot path does not use those subcollections for its primary data model.

### User data handling

Academic records, notes, uploaded attachments, imported syllabus text, and learning/training records can exist in browser local storage and in the cloud snapshot. Resource images and PDFs are converted to data URLs and stored in application data. Firebase web configuration identifiers are present in the client configuration; no Admin SDK credential or private key is present.

### State management

State is held in global variables and browser storage rather than a state-management library. Rendering is performed through functions in the global scripts, with many UI updates using generated HTML and inline event handlers. Firebase auth state and local storage events coordinate user activation and persistence.

## 6. File Analysis

| Major file or directory | Purpose and responsibilities | Main dependencies |
| --- | --- | --- |
| `index.html` | Defines the application shell, auth overlay, header, navigation, all major panels, forms, CDN script references, and script ordering. | `css/style.css`, browser scripts, Firebase/PDF CDN assets |
| `css/style.css` | Provides global styling, responsive layouts, themes, panels, modals, calendars, timers, animations, and workspace presentation. | HTML class/id conventions |
| `js/script.js` | Owns primary state, initialization, rendering, courses, assessments, grade calculations, planner/calendar behavior, course workspace, timers, settings, backup/reset, outline wiring, and Grade Coach. | `userStorage.js`, `schools.js`, feedback helpers, PDF import and Firebase globals |
| `js/productivity.js` | Owns assignments, study analytics, advisor insights, search, dashboard customization, focus mode, flashcards, goals, semester reporting, and related rendering. | Globals and DOM state from `script.js`, `userStorage.js` |
| `js/userStorage.js` | Provides UID validation, scoped key access, JSON serialization, legacy-key quarantine, removal, clearing, and data-change events. | Browser `localStorage`, `CustomEvent` |
| `js/schools.js` | Supplies university metadata and grading-scale data used by profile and GPA logic. | None beyond browser globals |
| `js/ui/feedback.js` | Supplies toast, confirmation, text-input, and form-dialog behavior. | DOM APIs |
| `js/pwa.js` | Registers and updates the service worker, handles install prompts, and reports connection status. | `sw.js`, browser Service Worker and install APIs |
| `js/firebase/firebaseClient.js` | Initializes Firebase app, Auth, and Firestore instances from client configuration. | Firebase ES modules and `firebaseConfig.js` |
| `js/firebase/authService.js` | Wraps Firebase email/password auth, persistence, verification, password reset, password change, and logout. | Firebase Auth SDK |
| `js/firebase/authGate.js` | Coordinates auth state, user-scoped storage activation, snapshot loading/saving, and UI auth state. | Auth service, cloud data service, profile service, `userStorage.js` |
| `js/firebase/cloudDataService.js` | Reads and writes the single user application snapshot. | Firebase Firestore SDK, `firestoreService.js` |
| `js/firebase/firestoreService.js` | Builds user document and subcollection references. | Firebase Firestore SDK |
| `js/firebase/userProfileService.js` | Reads and writes profile data in the user document. | Firebase Firestore SDK |
| `js/pdfImport/pdfReader.js` | Extracts text and document metadata from PDFs using PDF.js. | PDF.js CDN library |
| `js/pdfImport/ocrProcessor.js` | Renders PDF pages and performs English OCR when text extraction is empty. | PDF.js output, Canvas, Tesseract.js |
| `js/pdfImport/parsers/*` | Parses course, assignment, date, and assessment-weight data. | JavaScript regex/string processing |
| `js/pdfImport/validator.js` | Validates extracted assessment data and reports confidence/weight issues. | Parser outputs |
| `js/pdfImport/previewModal.js` | Displays editable import results for user review. | DOM APIs and validator |
| `js/pdfImport/importer.js` | Orchestrates extraction, OCR fallback, deterministic parsing, optional Ollama fallback, merging, and import. | PDF reader, OCR, parsers, Ollama HTTP endpoint |
| `pdfImportLearningTest/*` | Implements correction memory, learning records, training datasets, parser evaluation, regression runs, and approval flows. | Browser local storage, parser/import modules |
| `sw.js` | Installs and activates caches, caches shell/CDN assets, serves cached resources, and invalidates old caches. | Service Worker API |
| `firebase/firestore.rules` | Restricts user documents and configured subcollections to matching authenticated UIDs; denies all other paths. | Cloud Firestore rules engine |
| `firebase/firestore.indexes.json` | Declares Firestore indexes. It currently contains no indexes or field overrides. | Firebase deployment tooling |
| `scripts/generate-firebase-config.mjs` | Generates deployment Firebase configuration from environment variables. | Node.js `fs/promises` |
| `scripts/validate-deployment.mjs` | Checks required deployment files and manifest metadata. | Node.js filesystem APIs |
| `manifest.json` | Declares PWA name, icons, display mode, theme, and application metadata. | Browser installability support |
| `_headers` | Defines security headers, CSP, caching policy, and permissions policy for deployment. | Cloudflare Pages behavior |
| `_redirects` | Provides Cloudflare Pages redirect configuration. | Cloudflare Pages |
| `world_universities_and_domains.json` | Supplies a large university/domain reference dataset. | `schools.js` or consuming browser code |
| `docs/cloudflare-pages.md` | Contains Cloudflare Pages deployment notes. | None |
| `docs/EPIC-038-product-pass.md` | Records product-pass observations and unfinished architectural/product areas. | None |
| `README.md` | Contains only the project title; it does not document setup or usage. | None |

## 7. Existing AI Functionality

### Current integrations

The only model-backed integration is an optional local Ollama request from the PDF assessment importer. It sends syllabus assessment text and deterministic parser output to `http://localhost:11434/api/generate`, requests the `qwen3-coder:latest` model, requests JSON output, and normalizes the returned assessments.

### Current workflow

1. PDF.js attempts text extraction.
2. Tesseract.js OCR runs when extracted text is empty.
3. The deterministic assignment parser extracts assessments and calculates confidence.
4. Ollama is called only when parser count or weight thresholds are not met.
5. AI results are normalized and merged with parser results.
6. The importer presents results for validation and user review.

The Grade Coach is not model-backed. It is a deterministic parser and calculator implemented in `script.js`. The learning harness records approved corrections and parser evaluations locally; it is not a hosted model-training system.

### Limitations

The Ollama integration requires a compatible local service and is not available by default in a hosted deployment. It uses plain HTTP to localhost, has no server-side inference layer, and falls back when the request fails. The application does not include an API-key-based hosted AI provider, model training service, or AI monitoring/evaluation service.

## 8. Technical Debt

### Code smells and maintainability concerns

- `js/script.js` is a very large module containing multiple unrelated domains.
- `js/productivity.js` is another large global module and depends on globals from `script.js`.
- State and behavior are exposed through global variables and `window` properties rather than consistent module boundaries.
- UI generation relies heavily on `innerHTML` and inline `onclick` handlers.
- The stylesheet contains legacy and newer workspace styling layers, including repeated broad layout/body definitions.
- Import modules contain extensive diagnostic `console.log()` output.
- There is no substantive README, architecture document, or data-model documentation.

### Duplicate or overlapping logic

- Primary application state is represented in local storage while cloud persistence stores a second complete snapshot representation.
- Firestore helper support exists for `courses`, `grades`, `imports`, and `trainingRecords` subcollections, while the primary application path uses one `appData` snapshot.
- PDF assessment extraction has deterministic parser logic, AI fallback logic, and learning/regression logic operating across separate directories.
- Browser-global modules share responsibilities and dependencies that are not expressed through imports.

### Scalability concerns

- A single Firestore `appData` document grows with attachments, notes, imported text, and training records.
- Browser local storage is used for both operational data and potentially large learning/training records.
- Attachments are embedded as data URLs rather than represented as separate stored files.
- Backup import accepts arbitrary object fields without a schema version or migration mechanism.
- OCR renders PDF pages in the browser without an evident file-size, page-count, or processing-time limit.
- The checked-in `node_modules` directory is not represented by declared package dependencies or a lockfile in the project metadata.

## 9. Missing Professional Components

The repository does not contain the following professional components:

- Conventional unit tests for core calculations, storage, authentication, or parsers.
- Browser integration or end-to-end test coverage.
- CI configuration for build, deployment validation, tests, or security checks.
- Linting configuration and a lint script.
- Type checking configuration.
- Automated coverage reporting.
- Dependency declarations and a dependency lockfile for the browser libraries used directly by the application.
- Database schema migration/versioning files.
- Schema validation and migration handling for imported backups.
- Automated accessibility testing.
- Automated performance testing.
- Structured application logging, centralized error reporting, or operational monitoring.
- A documented privacy/retention policy, threat model, or Firebase security review record.
- A complete setup, usage, architecture, and data-model guide.

Existing test-like code is browser-oriented: `js/pdfImport/tests/batchRunner.js` and the learning regression runner. These are not exposed as conventional package test scripts. The package scripts currently cover only Firebase configuration generation and deployment validation.

## 10. Known Risks

- Authentication and cloud synchronization depend on Firebase availability. The service worker can cache the application shell but does not provide an offline authentication mechanism.
- Browser local storage may contain academic records, notes, uploaded file data URLs, imported syllabus text, and learning records.
- The single Firestore snapshot can grow substantially as attachments, full document text, and training records accumulate.
- User-provided values are inserted into generated HTML in multiple locations. Escaping is not consistent across resource titles, notes, categories, outline values, and Grade Coach responses.
- The deployed Content Security Policy permits `unsafe-inline` scripts and styles to support inline handlers and generated styles.
- PDF.js and Tesseract.js are loaded from third-party CDNs and are included in service-worker caching behavior.
- The Ollama request uses plain HTTP to localhost and is unavailable in ordinary hosted environments without a compatible local service.
- OCR processing occurs in the browser and has no evident visible file-size, page-count, or processing-time limit.
- Service-worker installation uses a required asset list and can fail if any listed shell asset cannot be fetched.
- Deployment validation checks asset presence and manifest structure but does not validate Firebase rules, JavaScript behavior, CSP effectiveness, or cloud connectivity.
- `firebase/firestore.indexes.json` is empty, so any future query patterns that require composite indexes would not be represented in deployment configuration.
- The client contains Firebase project identifiers. These are normal web-client configuration values, but access control therefore relies on Firebase rules and authentication rather than secrecy of the configuration file.
- The application has broad functionality but limited automated regression protection, increasing the risk of unnoticed behavior changes in shared global rendering and state code.