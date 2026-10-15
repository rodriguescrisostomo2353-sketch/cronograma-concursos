const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Major objects/classes
const matches = [...html.matchAll(/(?:const|var|let|class)\s+([A-Z][A-Za-z0-9_]+)\s*=\s*(?:\{|class)/g)];
const uniqueObjs = matches.map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i);
console.log('Major objects/classes:', uniqueObjs);

// Find tabs in HTML
const tabs = [...html.matchAll(/class=[\"'][^\"']*tab-content[^\"']*[\"'][^>]*id=[\"']([^\"']+)[\"']/g)];
console.log('Tabs in DOM:', tabs.map(t => t[1]));

// Check for nav buttons
const navs = [...html.matchAll(/data-tab=[\"']([^\"']+)[\"']/g)];
console.log('Nav data-tabs:', [...new Set(navs.map(n => n[1]))]);

// Find all setInterval and setTimeout in the script
const intervals = [...html.matchAll(/setInterval\s*\(\s*([^,]+),\s*([0-9]+)\)/g)];
console.log('SetIntervals:', intervals.map(i => ({ fn: i[1].trim().substring(0, 30), ms: i[2] })));

// Check what happens on input/scroll/change
const listeners = [...html.matchAll(/addEventListener\s*\(\s*['"]([^'"]+)['"]/g)];
const listenerCounts = {};
listeners.forEach(l => {
  listenerCounts[l[1]] = (listenerCounts[l[1]] || 0) + 1;
});
console.log('Event listener types:', listenerCounts);
