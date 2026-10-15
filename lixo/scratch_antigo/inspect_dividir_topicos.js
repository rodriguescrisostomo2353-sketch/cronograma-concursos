const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const idx = content.indexOf('dividirTopicos(');
console.log('dividirTopicos index:', idx);
if (idx !== -1) {
  console.log(content.slice(idx, idx + 2500));
}
