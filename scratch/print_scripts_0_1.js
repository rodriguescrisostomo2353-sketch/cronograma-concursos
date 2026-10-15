const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const scripts = content.match(/<script[\s\S]*?<\/script>/gi) || [];
console.log('Script 0:');
console.log(scripts[0]);
console.log('\nScript 1:');
console.log(scripts[1]);
