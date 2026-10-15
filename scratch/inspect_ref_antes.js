const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

for (let i = 11760; i <= 11810 && i < lines.length; i++) {
  console.log(`${i}: ${lines[i - 1]}`);
}
