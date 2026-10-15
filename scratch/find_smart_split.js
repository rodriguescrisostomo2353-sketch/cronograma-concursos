const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

let idx = 0;
while ((idx = content.indexOf('smartSplitTopics', idx)) !== -1) {
  console.log('smartSplitTopics at:', idx);
  console.log(content.slice(Math.max(0, idx - 40), idx + 100));
  idx += 'smartSplitTopics'.length;
}
