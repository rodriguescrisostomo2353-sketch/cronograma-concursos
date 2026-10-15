const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

let idx = 0;
while ((idx = content.indexOf('dividirTopicos', idx)) !== -1) {
  console.log('dividirTopicos at:', idx);
  console.log(content.slice(Math.max(0, idx - 40), idx + 100));
  idx += 'dividirTopicos'.length;
}
