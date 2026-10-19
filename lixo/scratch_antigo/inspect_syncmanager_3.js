const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const idx = 364346 + 7000;
console.log(content.slice(idx, idx + 4000));
