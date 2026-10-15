const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

function showAround(str, len = 2000) {
  const idx = content.indexOf(str);
  console.log(`\n--- SHOWING AROUND: ${str} (idx: ${idx}) ---`);
  if (idx !== -1) {
    console.log(content.slice(idx, idx + len));
  } else {
    console.log('NOT FOUND');
  }
}

showAround('checkUpdates(');
showAround('const BackupManager =');
