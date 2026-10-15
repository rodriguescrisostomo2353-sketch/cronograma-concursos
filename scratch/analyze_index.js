const fs = require('fs');

const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);

const scripts = content.match(/<script[\s\S]*?<\/script>/gi) || [];
console.log('Total scripts:', scripts.length);

scripts.forEach((s, i) => {
  const srcMatch = s.match(/src=["']([^"']+)["']/i);
  const src = srcMatch ? srcMatch[1] : 'inline';
  console.log(`Script ${i}: ${src} (length: ${s.length})`);
});
