const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /<script([\s\S]*?)<\/script>/gi;
let m;
let count = 0;
while ((m = regex.exec(html)) !== null) {
  count++;
  if (m[0].length > 10000) {
    const content = m[1].replace(/^>/, '').trim();
    const lines = content.split('\n');
    console.log(`Script has ${lines.length} lines.`);
    
    // Find comment headers or main section blocks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('// =') || line.startsWith('/* =') || line.startsWith('/**') || line.includes('const App =') || line.includes('var App =') || line.includes('window.App =') || line.includes('class ') || line.includes('function init')) {
        console.log(`L${i + 1}: ${line.slice(0, 80)}`);
      }
    }
  }
}
