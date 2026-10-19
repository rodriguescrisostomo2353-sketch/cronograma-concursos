const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

let idx = 0;
while ((idx = content.indexOf('migrateFromLocalStorage', idx)) !== -1) {
  console.log('Found migrateFromLocalStorage at:', idx);
  console.log(content.slice(Math.max(0, idx - 200), idx + 400));
  idx += 'migrateFromLocalStorage'.length;
}
