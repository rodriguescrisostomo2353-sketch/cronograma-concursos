const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf8');

function extractFunction(name) {
  const idx = content.indexOf(name);
  if (idx === -1) {
    console.log(`Not found: ${name}`);
    return;
  }
  console.log(`\n================== FOUND ${name} at index ${idx} ==================`);
  console.log(content.slice(idx, idx + 2000));
}

extractFunction('const LibraryManager =');
extractFunction('const BackupManager =');
extractFunction('dividirMateriasSalvasPorNumeracao(');
extractFunction('migrateFromLocalStorage(');
extractFunction('checkUpdates(silent');
extractFunction('preloadIdle()');
