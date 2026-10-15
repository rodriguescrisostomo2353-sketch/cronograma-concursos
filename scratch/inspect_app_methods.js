const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const appMatch = html.indexOf('const App = {');
const appEnd = html.indexOf('\n    window.App = App;', appMatch);
const appCode = html.substring(appMatch, appEnd !== -1 ? appEnd : appMatch + 80000);

// Find all methods inside App
const methodMatches = [...appCode.matchAll(/\n\s{4,8}([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/g)];
console.log('App methods:', methodMatches.map(m => m[1]));

// Specifically look for switchTab inside App
const switchTabIdx = appCode.indexOf('switchTab(');
if (switchTabIdx !== -1) {
  console.log('\n--- switchTab definition ---');
  console.log(appCode.substring(switchTabIdx, switchTabIdx + 2000));
}
