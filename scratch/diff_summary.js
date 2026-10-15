const fs = require('fs');

const cur = fs.readFileSync('index.html', 'utf8');
const bak = fs.readFileSync('index.html.before_library.bak', 'utf8');

// Check sections where they differ
const curLines = cur.split('\n');
const bakLines = bak.split('\n');
console.log('Cur lines:', curLines.length, 'Bak lines:', bakLines.length);

// Let's find blocks of lines present in cur but not bak
const bakSet = new Set(bakLines.map(l => l.trim()));
let diffRanges = [];
let currentRange = null;

curLines.forEach((l, idx) => {
  const trimmed = l.trim();
  if (trimmed && !bakSet.has(trimmed)) {
    if (!currentRange) currentRange = { start: idx + 1, end: idx + 1, sample: trimmed };
    else currentRange.end = idx + 1;
  } else {
    if (currentRange) {
      diffRanges.push(currentRange);
      currentRange = null;
    }
  }
});
if (currentRange) diffRanges.push(currentRange);

console.log('Found', diffRanges.length, 'diff ranges:');
diffRanges.forEach(r => {
  console.log(`Lines ${r.start}-${r.end} (${r.end - r.start + 1} lines): ${r.sample.substring(0, 80)}`);
});
