const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');
const lines = content.split('\n');

console.log('=== FOR LOOPS WITH WEIRD CONDITIONS ===');
lines.forEach((line, i) => {
  if (/\bfor\s*\(/.test(line)) {
    // Check if it's not a standard for (let i = 0; i < len; i++) or for (const x of y) or for (const k in obj)
    const trimmed = line.trim();
    if (!trimmed.includes('of ') && !trimmed.includes('in ') && !trimmed.includes('++') && !trimmed.includes('--') && !trimmed.includes('+=') && !trimmed.includes('-=')) {
      console.log(`Line ${i + 1}: ${trimmed}`);
    }
  }
});
