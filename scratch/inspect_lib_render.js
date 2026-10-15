const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const idx = content.indexOf('render() {', content.indexOf('const LibraryManager ='));
console.log('LibraryManager.render index:', idx);
if (idx !== -1) {
  console.log(content.slice(idx, idx + 1500));
}
