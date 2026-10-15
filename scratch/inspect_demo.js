const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const idx = content.indexOf('const DEMO_DATA =');
console.log('DEMO_DATA index:', idx);
if (idx !== -1) {
  console.log(content.slice(idx, idx + 1000));
}
