# Contributing to Grade Quest

Thank you for contributing to Grade Quest. This document describes the current repository workflow and verification expectations. There is no existing automated contribution service or formal maintainer policy in the repository, so contributors should keep changes focused and document verification clearly.

## Development Workflow

1. Review the relevant documentation and existing implementation before changing behavior.
2. Keep changes scoped to the requested feature, defect, documentation, or deployment concern.
3. Preserve the existing browser-first architecture and local conventions unless a change explicitly requires otherwise.
4. Run the available validation commands after making changes.
5. For browser behavior, manually exercise the affected flow through a local web origin, including authenticated behavior when relevant.
6. Update documentation when behavior, configuration, or user-facing workflow changes.

The repository currently provides these package scripts:

```text
npm run build
npm run validate:deployment
```

`build` generates Firebase configuration from environment variables. `validate:deployment` checks required deployment assets and manifest metadata. There is no package test, lint, or type-check script at present.

## Pull Request Process

Before opening a pull request:

- Describe the user-visible or engineering change in plain language.
- Identify the files and behavioral areas affected.
- State the commands run and their outcomes.
- Record any manual browser flows checked.
- Include documentation changes when the public workflow or project structure changes.
- Call out known limitations or verification gaps.

Pull requests should be small enough to review by behavior and should avoid unrelated formatting or architectural changes. The repository does not currently define required reviewers, branch naming rules, merge automation, or CI gates.

## Coding Standards

- Follow the existing JavaScript, HTML, CSS, and Markdown style in the surrounding files.
- Preserve public names and browser-facing behavior unless the change requires an intentional update.
- Keep user data scoped through the existing storage abstraction when working with persisted application data.
- Keep Firebase access within the existing Firebase module boundaries when working with authentication or cloud synchronization.
- Prefer existing helpers and conventions over introducing parallel behavior.
- Keep comments brief and explain non-obvious reasoning rather than restating code.
- Avoid adding credentials, private keys, service-account files, or other secrets to the repository.
- Keep documentation factual and distinguish implemented behavior from planned or exploratory work.

The current application uses browser-global scripts in several areas and ES modules in the Firebase area. Contributors should follow the conventions of the file being changed and avoid widening that inconsistency without a specific reason.

## Testing Expectations

The project does not currently have conventional automated unit, integration, or end-to-end coverage. The following checks are therefore expected for changes that affect the relevant areas:

- Run `npm run validate:deployment` for repository or deployment-facing changes.
- Run `npm run build` when Firebase configuration generation is affected and the required environment variables are available.
- Exercise affected authentication, course, calculation, planner, study, resource, import, or backup flows manually in a browser as applicable.
- For PDF import changes, review representative text-based and OCR-based import behavior when those paths are affected.
- Review browser console output for errors during the changed flow.
- Confirm that user-scoped data remains associated with the authenticated account.

The repository includes browser-oriented PDF import batch and learning/regression helpers, but they are not exposed as standard package test commands. Results from those helpers should be included in a pull request when they are used.

## Documentation Expectations

Update the relevant Markdown document when a change affects:

- Public setup or usage: `README.md`.
- Current system boundaries or data flow: `ARCHITECTURE.md`.
- Completed release behavior: `CHANGELOG.md`.
- Documented direction or known product-pass work: `ROADMAP.md`.
- Contribution or verification practice: this document.