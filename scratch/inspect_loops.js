const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

function printRange(start, end) {
  console.log(`\n=== LINES ${start} to ${end} ===`);
  for (let i = start - 1; i < end && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}

printRange(15160, 15260);
printRange(19550, 19720);
printRange(20020, 20050);
