const fs = require('fs');
let patch = fs.readFileSync('scratch/diff_index.patch');
let text = (patch[0] === 0xFF && patch[1] === 0xFE) ? patch.toString('utf16le') : patch.toString('utf8');

const lines = text.split('\n');
let print = false;
let printedHunks = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('@@ -12139') || line.includes('@@ -12312') || line.includes('@@ -13084') || line.includes('@@ -13111') || line.includes('@@ -8512') || line.includes('@@ -8700')) {
    print = true;
    console.log('\n--- HUNK START ---');
  }
  if (print) {
    console.log(line);
    if (line.startsWith('@@') && !line.includes('12139') && !line.includes('12312') && !line.includes('13084') && !line.includes('13111') && !line.includes('8512') && !line.includes('8700')) {
      print = false;
    }
  }
}
