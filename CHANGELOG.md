# Changelog

All notable documented changes to Grade Quest are recorded here. The project does not currently contain a historical release log, so the first entry describes the present repository baseline rather than a reconstructed release history.

## [Unreleased]

### Added

- Placeholder for future completed changes.

### Changed

- Placeholder for future completed changes.

### Fixed

- Placeholder for future completed changes.

## [1.0.0] - Current Repository Baseline

### Added

- Single-page academic workspace with Today, Courses, Planner, Study, Resources, Progress, and Settings areas.
- Course and assessment management with weighted grade calculations, projections, course health, and GPA calculations.
- Grade Coach for deterministic grade-planning questions.
- Planner tasks and month, week, day, and timeline calendar views.
- Study sessions, Focus Mode, study analytics, flashcards, semester goals, and progress reporting.
- Notes, course outlines, resources, image/PDF attachments, global search, and dashboard customization.
- JSON backup export/import and local profile/data reset controls.
- PDF text extraction, browser OCR fallback, assessment parsing, validation, preview, and import workflows.
- Browser-based PDF import correction, learning, evaluation, and regression tooling.
- Firebase email/password authentication, profile storage, and user-scoped Firestore application snapshots.
- PWA manifest, service-worker caching, install prompt handling, and offline status reporting.
- Cloudflare Pages deployment configuration, security headers, Firebase configuration generation, and deployment validation.

### Technical Notes

- Firebase web SDK modules are loaded from `www.gstatic.com`.
- PDF.js and Tesseract.js are loaded from CDN assets.
- Optional local Ollama support is used as an assessment-extraction fallback when deterministic parser confidence is insufficient.
- No formal historical release dates are recorded in the repository.

## Release Notes Template

Future completed releases may use the following categories:

### Added

- New completed capabilities.

### Changed

- Completed behavior or documentation changes.

### Fixed

- Confirmed defect corrections.

### Security

- Confirmed security-related changes.