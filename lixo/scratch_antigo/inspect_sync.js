const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const syncStart = html.indexOf('const SyncManager = {');
const syncEnd = html.indexOf('\n    const BackupManager = {', syncStart);
const syncCode = html.substring(syncStart, syncEnd !== -1 ? syncEnd : syncStart + 20000);

console.log('SyncManager code length:', syncCode.length);

// Find methods
const methods = [...syncCode.matchAll(/\n\s{6,8}([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/g)];
console.log('SyncManager methods:', methods.map(m => m[1]));

// Look for intervals or loops in SyncManager
const intervals = [...syncCode.matchAll(/setInterval|setTimeout/g)];
console.log('Timer usages in SyncManager:', intervals.length);

// Look for render calls inside SyncManager
const renders = [...syncCode.matchAll(/render[A-Za-z0-9_]*\s*\(/g)];
console.log('Render calls inside SyncManager:', renders.map(r => r[0]));
