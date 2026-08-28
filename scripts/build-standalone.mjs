/**
 * Bundles the built app into ONE self-contained HTML file.
 *
 * Why: the people who will look at this demo should not need Node, a terminal, or a local
 * server. A single file opens by double-clicking it. (A normal Vite build cannot be opened
 * from file:// at all — browsers refuse to load ES modules over that protocol.)
 *
 * Run `npm run build:standalone`; the result is masar-demo.html in the project root.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const assets = join(dist, 'assets');

const files = readdirSync(assets);
const jsFile = files.find((f) => f.endsWith('.js'));
const cssFile = files.find((f) => f.endsWith('.css'));

if (!jsFile || !cssFile) {
  console.error('No build output found. Run `npm run build` first.');
  process.exit(1);
}

const js = readFileSync(join(assets, jsFile), 'utf8');
const css = readFileSync(join(assets, cssFile), 'utf8');

let html = readFileSync(join(dist, 'index.html'), 'utf8');

// A `</script>` sequence inside the bundle would close the tag early.
const safeJs = js.replace(/<\/script/gi, '<\\/script');

// Both replacements pass a FUNCTION rather than a string. A string replacement would
// interpret `$&`, `$1` and friends inside the bundle as backreferences — and React's
// minified source genuinely contains `"$&/"`, which silently injects the matched
// <script> tag back into the middle of the code and breaks the whole file.
html = html.replace(
  /<link rel="stylesheet"[^>]*href="[^"]*\.css"[^>]*>/,
  () => `<style>\n${css}\n</style>`,
);

html = html.replace(
  /<script[^>]*src="[^"]*\.js"[^>]*><\/script>/,
  () => `<script type="module">\n${safeJs}\n</script>`,
);

if (html.includes('assets/')) {
  console.error('Inlining failed — an asset reference survived. Not writing the file.');
  process.exit(1);
}

// Fonts come from the network; note the offline fallback rather than failing silently.
html = html.replace(
  '</head>',
  '  <!-- Fonts load from Google Fonts when online; the app falls back to system fonts offline. -->\n  </head>',
);

const out = join(root, 'masar-demo.html');
writeFileSync(out, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log(`masar-demo.html written (${kb} KB) — open it directly in a browser.`);
