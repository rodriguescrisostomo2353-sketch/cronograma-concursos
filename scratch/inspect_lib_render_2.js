const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const idx = 345735 + 800;
console.log(content.slice(idx, idx + 1500));
