const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

console.log('=== WHILE LOOPS ===');
lines.forEach((line, i) => {
  if (/\bwhile\s*\(/.test(line)) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});

console.log('\n=== RECURSIVE PATTERNS / RAF ===');
lines.forEach((line, i) => {
  if (/requestAnimationFrame/.test(line)) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
