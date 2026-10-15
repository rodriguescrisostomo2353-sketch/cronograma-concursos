const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const idx = content.indexOf('const PdfStorage =');
console.log('PdfStorage start:', idx);
console.log(content.slice(idx, idx + 4000));
