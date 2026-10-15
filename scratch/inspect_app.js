const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find where App is defined
const appMatch = html.indexOf('const App = {');
console.log('App definition index:', appMatch);

if (appMatch !== -1) {
  const appSnippet = html.substring(appMatch, appMatch + 3000);
  console.log('App snippet:');
  console.log(appSnippet.substring(0, 1500));
}

// Find tab navigation handling
const tabMatch = html.indexOf('switchTab');
console.log('switchTab index:', tabMatch);
if (tabMatch !== -1) {
  console.log('switchTab snippet:');
  console.log(html.substring(tabMatch - 100, tabMatch + 1500));
}
