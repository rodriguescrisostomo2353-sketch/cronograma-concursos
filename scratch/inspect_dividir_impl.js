const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

console.log(content.slice(628550, 628550 + 3500));
