const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

console.log(content.slice(564200, 564200 + 3500));
