# Cloudflare Pages Deployment

## Project settings

- Framework preset: `None`
- Root directory: repository root (`grade_calculator`)
- Build command: `npm run build`
- Build output directory: `.`
- Node version: `20` or newer
- Production branch: explicitly selected release branch

## Pages environment variables

Configure these separately for Preview and Production:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

These are Firebase web configuration identifiers. Never place Firebase Admin credentials, private keys, or service-account JSON in Pages variables or this repository.

## Security headers

The `_headers` file contains the active Pages directives. HSTS must only be enabled after the production hostname and every subdomain are confirmed HTTPS-only. The CSP currently permits `unsafe-inline` because the existing application uses inline handlers and generated inline styles; removing it requires a separate UI refactor.

## Cache and performance policy

- `index.html`, `firebase-config.js`, and `sw.js`: `no-cache`
- CSS, JavaScript, icons, and manifest: one day with revalidation
- The service worker owns offline caching and version invalidation
- Do not use immutable caching for un-hashed filenames
- Keep Cloudflare Brotli compression enabled, with gzip fallback