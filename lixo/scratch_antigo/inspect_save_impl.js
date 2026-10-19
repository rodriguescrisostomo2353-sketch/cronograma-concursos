const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

console.log(content.slice(536100, 536100 + 3000));
