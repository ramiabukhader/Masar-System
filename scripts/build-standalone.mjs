/**
 * Bundles the built app into ONE self-contained HTML file.
 *
 * Why: the people who will look at this demo should not need Node, a terminal, or a local
 * server. A single file opens by double-clicking it. (A normal Vite build cannot be opened
 * from file:// at all — browsers refuse to load ES modules over that protocol.)
 *
 * Run `npm run build:standalone`; the result is masar-demo.html in the project root.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
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

// The typeface is self-hosted, so it has to come along: every woff2 becomes a data URI
// inside the font stylesheet, which is then inlined like any other. Without this the
// single file falls back to a system Arabic face and stops looking like the real app.
let fontStyle = '';
const fontsCssPath = join(dist, 'fonts.css');
if (existsSync(fontsCssPath)) {
  let fontsCss = readFileSync(fontsCssPath, 'utf8');
  const missing = [];
  fontsCss = fontsCss.replace(/url\((['"]?)\.\/fonts\/([^)'"]+)\1\)/g, (whole, _q, file) => {
    const abs = join(dist, 'fonts', file);
    if (!existsSync(abs)) {
      missing.push(file);
      return whole;
    }
    return `url(data:font/woff2;base64,${readFileSync(abs).toString('base64')})`;
  });
  if (missing.length) {
    console.error(`Font files missing from dist: ${missing.join(', ')}. Not writing the file.`);
    process.exit(1);
  }
  fontStyle = `<style>\n${fontsCss}\n</style>`;
}

// Every replacement passes a FUNCTION rather than a string. A string replacement would
// interpret `$&`, `$1` and friends inside the bundle as backreferences — and React's
// minified source genuinely contains `"$&/"`, which silently injects the matched
// <script> tag back into the middle of the code and breaks the whole file.
//
// The font stylesheet is matched FIRST and by name. Matching stylesheets generically
// would hit whichever link comes first in the document, which is this one — the app's
// CSS would land in its place and the real asset link would survive untouched.
html = html.replace(
  /<link rel="stylesheet"[^>]*href="[^"]*fonts\.css"[^>]*>/,
  () => fontStyle,
);

html = html.replace(
  /<link rel="stylesheet"[^>]*href="[^"]*assets\/[^"]*\.css"[^>]*>/,
  () => `<style>\n${css}\n</style>`,
);

html = html.replace(
  /<script[^>]*src="[^"]*\.js"[^>]*><\/script>/,
  () => `<script type="module">\n${safeJs}\n</script>`,
);

for (const stray of ['assets/', './fonts/', 'fonts.css']) {
  if (html.includes(stray)) {
    console.error(`Inlining failed — "${stray}" survived. Not writing the file.`);
    process.exit(1);
  }
}

const out = join(root, 'masar-demo.html');
writeFileSync(out, html, 'utf8');

const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0);
console.log(`masar-demo.html written (${kb} KB) — open it directly in a browser.`);
