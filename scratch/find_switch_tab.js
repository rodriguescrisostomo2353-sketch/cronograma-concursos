const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /switchTab\s*\(\s*([^)]*)\)\s*\{/g;
let m;
while ((m = regex.exec(html)) !== null) {
  console.log('Found switchTab definition at index:', m.index);
  console.log(html.substring(m.index, m.index + 1200));
}
