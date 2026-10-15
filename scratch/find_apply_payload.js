const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

let idx = 0;
while ((idx = content.indexOf('applyCloudPayload', idx)) !== -1) {
  console.log('applyCloudPayload at:', idx);
  console.log(content.slice(Math.max(0, idx - 50), idx + 200));
  idx += 'applyCloudPayload'.length;
}
