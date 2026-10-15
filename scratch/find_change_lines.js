const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

function findLine(snippet) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(snippet)) {
      return i + 1;
    }
  }
  return -1;
}

console.log('PdfStorage.getDb line:', findLine('async getDb() {'));
console.log('Migração de Tópicos line:', findLine("safeRun('Migração de Tópicos'"));
console.log('initPdfReader PdfStorage.getFile line:', findLine("PdfStorage.getFile('active').then"));
console.log('LibraryManager.render grid.innerHTML line:', findLine("grid.appendChild(fragment)"));
console.log('SyncManager.init line:', findLine("async init() {", findLine("const SyncManager =")));
console.log('saveToStorage line:', findLine("saveToStorage(immediate = false)"));
