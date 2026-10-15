const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const idx = content.indexOf('const SyncManager =');
console.log('SyncManager index:', idx);
console.log(content.slice(idx, idx + 4000));
