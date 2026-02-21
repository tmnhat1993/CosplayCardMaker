/**
 * Build dist/ để deploy – copy HTML, CSS, JS, assets.
 * Chạy: npm run build
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function mkdirp(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  mkdirp(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log('  ', path.relative(ROOT, dest));
}

function copyRecursive(srcDir, destDir, ext) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(srcDir, e.name);
    const d = path.join(destDir, e.name);
    if (e.isDirectory()) copyRecursive(s, d, ext);
    else if (!ext || e.name.endsWith(ext)) copyFile(s, d);
  }
}

console.log('Build dist/...\n');

mkdirp(DIST);

// index.html (từ cosplay-card-editor.html)
const htmlSrc = path.join(ROOT, 'cosplay-card-editor.html');
const htmlDest = path.join(DIST, 'index.html');
let html = fs.readFileSync(htmlSrc, 'utf8');
fs.writeFileSync(htmlDest, html);
console.log('  index.html');

// css
copyFile(path.join(ROOT, 'css', 'main.css'), path.join(DIST, 'css', 'main.css'));

// js
copyFile(path.join(ROOT, 'js', 'app.js'), path.join(DIST, 'js', 'app.js'));
copyFile(path.join(ROOT, 'js', 'debug-panel.js'), path.join(DIST, 'js', 'debug-panel.js'));

// assets
const assetsSrc = path.join(ROOT, 'assets');
const assetsDest = path.join(DIST, 'assets');
if (fs.existsSync(assetsSrc)) {
  copyRecursive(assetsSrc, assetsDest);
}

console.log('\n✓ dist/ sẵn sàng deploy.');
console.log('  Deploy thư mục dist/ lên Netlify, Vercel, GitHub Pages, hoặc bất kỳ static host nào.');
console.log('  Xem thử: npm run preview:dist');
