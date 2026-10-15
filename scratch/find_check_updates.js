const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

let idx = 0;
while ((idx = content.indexOf('checkUpdates', idx)) !== -1) {
  console.log('checkUpdates at:', idx);
  console.log(content.slice(Math.max(0, idx - 30), idx + 150));
  idx += 'checkUpdates'.length;
}
