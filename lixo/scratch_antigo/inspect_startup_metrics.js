const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

const idx = content.indexOf('renderStartupPerformanceMetrics(');
console.log('renderStartupPerformanceMetrics index:', idx);
if (idx !== -1) {
  console.log(content.slice(idx, idx + 2500));
}
