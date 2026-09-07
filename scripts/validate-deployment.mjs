import { access, readFile } from 'node:fs/promises';

const requiredFiles = ['index.html', 'manifest.json', 'sw.js', '_headers', '_redirects', 'firebase-config.js'];
for (const file of requiredFiles) await access(new URL(`../${file}`, import.meta.url));
const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
if (!manifest.name || !manifest.start_url || !Array.isArray(manifest.icons) || !manifest.icons.length) {
    throw new Error('Manifest is missing required install metadata.');
}
console.log(`Deployment assets valid: ${requiredFiles.length} files checked.`);