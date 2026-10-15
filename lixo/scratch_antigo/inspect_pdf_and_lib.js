const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

function printRange(start, end, label) {
  console.log(`\n================== ${label} (Lines ${start} to ${end}) ==================`);
  for (let i = start - 1; i < end && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}

printRange(8815, 8865, '1. PdfStorage.getDb');
printRange(9310, 9385, '2. LibraryManager.render');
