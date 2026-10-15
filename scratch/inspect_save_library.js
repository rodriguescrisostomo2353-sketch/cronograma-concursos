const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const idx = content.indexOf('saveLibraryFile(');
console.log('saveLibraryFile index:', idx);
if (idx !== -1) {
  console.log(content.slice(idx - 100, idx + 3500));
}
