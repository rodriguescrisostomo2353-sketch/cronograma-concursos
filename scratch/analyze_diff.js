const fs = require('fs');
let patch = fs.readFileSync('scratch/diff_index.patch');
// Check if UTF-16 LE (BOM 0xFF 0xFE)
let text;
if (patch[0] === 0xFF && patch[1] === 0xFE) {
  text = patch.toString('utf16le');
} else {
  text = patch.toString('utf8');
}

const lines = text.split('\n');
console.log('Total diff lines:', lines.length);

let currentHunk = '';
lines.forEach(line => {
  if (line.startsWith('@@')) {
    currentHunk = line;
    console.log('\n' + line.trim());
  } else if (line.startsWith('+') && !line.startsWith('+++')) {
    if (line.includes('function') || line.includes('const ') || line.includes('let ') || line.includes('var ') || line.includes('class ') || line.includes(': function') || line.includes('async ') || line.includes('addEventListener') || line.includes('setInterval') || line.includes('setTimeout') || line.includes('while') || line.includes('for (')) {
      console.log('  ' + line.substring(0, 100).trim());
    }
  }
});
