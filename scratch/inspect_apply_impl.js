const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

console.log(content.slice(397112, 397112 + 3500));
