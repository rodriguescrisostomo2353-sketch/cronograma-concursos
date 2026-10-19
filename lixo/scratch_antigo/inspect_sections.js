const fs = require('fs');

const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

function printRange(start, end) {
  console.log(`=== LINES ${start} to ${end} ===`);
  for (let i = start - 1; i < end && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}

printRange(13440, 13560);
printRange(16390, 16530);
printRange(22410, 22444);
