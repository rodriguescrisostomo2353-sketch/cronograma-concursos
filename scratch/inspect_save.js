const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find all occurrences of renderAll
const renderAllCalls = [...html.matchAll(/renderAll\s*\(/g)];
console.log('renderAll calls:', renderAllCalls.length);

// Find all occurrences of saveToStorage
const saveCalls = [...html.matchAll(/saveToStorage\s*\(/g)];
console.log('saveToStorage calls:', saveCalls.length);

// Let's inspect saveToStorage implementation
const saveIdx = html.indexOf('saveToStorage(');
console.log('\n--- saveToStorage ---');
console.log(html.substring(saveIdx, saveIdx + 1500));
