const fs = require('fs');
const path = require('path');

const root = __dirname ? path.resolve(__dirname, '..') : process.cwd();
const lixoDir = path.join(root, 'lixo');
const lixoScratch = path.join(lixoDir, 'scratch_antigo');

if (!fs.existsSync(lixoDir)) fs.mkdirSync(lixoDir, { recursive: true });
if (!fs.existsSync(lixoScratch)) fs.mkdirSync(lixoScratch, { recursive: true });

const unneededFiles = [
  'index.html.bak',
  'index.html.before_library.bak',
  'study-hours-modals.html',
  'study-hours-settings.html',
  'study-hours-tab.html',
  'study-hours-manager.js',
  'supabase.js',
  'divisor-topicos.js',
  'test-divisor.mjs',
  'test-study-hours.js',
  'test-browser-simulation.js',
  'test-performance-suite.cjs',
  'measure-baseline.cjs',
  'publication.bat',
  'Área de Trabalho.lnk'
];

unneededFiles.forEach(file => {
  const srcPath = path.join(root, file);
  if (fs.existsSync(srcPath)) {
    const destPath = path.join(lixoDir, file);
    fs.renameSync(srcPath, destPath);
    console.log(`[LIXO] Movido: ${file} -> lixo/${file}`);
  }
});

const scratchDir = path.join(root, 'scratch');
if (fs.existsSync(scratchDir)) {
  const files = fs.readdirSync(scratchDir);
  files.forEach(file => {
    if (file.startsWith('inspect_') || file.startsWith('patch_') || file.startsWith('print_') || file.startsWith('search_')) {
      const srcPath = path.join(scratchDir, file);
      const destPath = path.join(lixoScratch, file);
      fs.renameSync(srcPath, destPath);
      console.log(`[LIXO] Movido: scratch/${file} -> lixo/scratch_antigo/${file}`);
    }
  });
}

console.log('Organização na pasta lixo concluída!');
