// No bundler, no transpilation -- this just copies the same static files the
// browser/PWA build already serves into www/, which is the one thing
// Capacitor's native shell expects to find. Run via `npm run build`.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');

const FILES = [
  'index.html',
  'sw.js',
  'manifest.json',
  'shema-icon-192.png',
  'shema-icon-512.png',
  'shema-mark-color.png',
  'shema-mark-inverse.png',
];
const DIRS = ['data', 'icons', 'vendor'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const f of FILES) {
  fs.copyFileSync(path.join(root, f), path.join(out, f));
}
for (const d of DIRS) {
  fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
}

console.log(`Copied ${FILES.length} files and ${DIRS.length} directories into www/`);
