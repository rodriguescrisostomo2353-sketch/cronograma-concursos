const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

function findCalls(fnName) {
  const lines = html.split('\n');
  const results = [];
  lines.forEach((line, i) => {
    if (line.includes(fnName + '(') || line.includes('.' + fnName + '(')) {
      results.push({ line: i + 1, content: line.trim() });
    }
  });
  return results;
}

['renderAll', 'renderSubjectList', 'renderSubjects', 'renderSchedule', 'renderTab'].forEach(fn => {
  console.log(`\n=== Calls to ${fn} ===`);
  const calls = findCalls(fn);
  calls.slice(0, 15).forEach(c => console.log(`L${c.line}: ${c.content}`));
  console.log(`Total: ${calls.length}`);
});
