const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /<script([\s\S]*?)<\/script>/gi;
let m;
let count = 0;
while ((m = regex.exec(html)) !== null) {
  count++;
  if (m[0].length > 10000) {
    console.log(`Script #${count} has length ${m[0].length}`);
    const content = m[1].replace(/^>/, '').trim();
    // Search for top-level declarations
    const fnMatches = [...content.matchAll(/(?:function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=|let\s+([a-zA-Z0-9_$]+)\s*=|var\s+([a-zA-Z0-9_$]+)\s*=|([a-zA-Z0-9_$]+)\s*:\s*function|([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)/g)];
    const names = new Set();
    for (const f of fnMatches) {
      const name = f[1] || f[2] || f[3] || f[4] || f[5] || f[6];
      if (name && name.length > 2) names.add(name);
    }
    console.log(`Found ${names.size} identifier candidates.`);
    console.log('Sample identifiers:', Array.from(names).slice(0, 40).join(', '));
  }
}
