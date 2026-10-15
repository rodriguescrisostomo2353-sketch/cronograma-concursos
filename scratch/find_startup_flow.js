const fs = require('fs');

const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

function findOccurrences(query) {
  const results = [];
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes(query.toLowerCase())) {
      results.push({ line: idx + 1, content: line.trim() });
    }
  });
  return results;
}

console.log('--- setInterval occurrences ---');
findOccurrences('setInterval').forEach(r => console.log(`L${r.line}: ${r.content}`));

console.log('\n--- LibraryManager occurrences ---');
findOccurrences('LibraryManager').slice(0, 10).forEach(r => console.log(`L${r.line}: ${r.content}`));

console.log('\n--- SyncManager occurrences ---');
findOccurrences('SyncManager').slice(0, 10).forEach(r => console.log(`L${r.line}: ${r.content}`));

console.log('\n--- app.init or init() occurrences ---');
findOccurrences('.init(').forEach(r => console.log(`L${r.line}: ${r.content}`));
