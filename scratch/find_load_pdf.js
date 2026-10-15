const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

let idx = 0;
while ((idx = content.indexOf('loadPdfFromBuffer', idx)) !== -1) {
  console.log('loadPdfFromBuffer at:', idx);
  console.log(content.slice(Math.max(0, idx - 40), idx + 100));
  idx += 'loadPdfFromBuffer'.length;
}
