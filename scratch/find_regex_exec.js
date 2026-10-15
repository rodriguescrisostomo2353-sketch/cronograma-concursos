const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

console.log('=== REGEX EXEC OCCURRENCES ===');
lines.forEach((line, i) => {
  if (/\.exec\s*\(/.test(line)) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
