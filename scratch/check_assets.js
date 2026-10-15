const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
const styleRegex = /<link[^>]*href=["']([^"']+)["'][^>]*>/gi;

let m;
console.log('--- EXTERNAL SCRIPTS ---');
while ((m = scriptRegex.exec(html)) !== null) {
  console.log(m[1]);
}

console.log('--- EXTERNAL STYLES/LINKS ---');
while ((m = styleRegex.exec(html)) !== null) {
  console.log(m[1]);
}
