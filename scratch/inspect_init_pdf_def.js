const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const idx = content.indexOf('initPdfReader() {');
console.log('initPdfReader definition index:', idx);
if (idx !== -1) {
  console.log(content.slice(idx, idx + 3500));
}
