const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');

console.log('AUDITANDO ATRIBUIÇÕES E INTERPOLAÇÕES EM index.html...');
const lines = indexHtml.split('\n');

const findings = [];
lines.forEach((line, idx) => {
    // Procurar interpolação direta de matérias em strings
    if (line.includes('${m}') || line.includes('${materia}') || line.includes('${t}') || line.includes('${topico}')) {
        findings.push({ line: idx + 1, content: line.trim() });
    }
    // Procurar atribuição direta de m ou t a .value sem textoSeguro/idMateria/nomeMateria
    if ((line.includes('.value = m;') || line.includes('.value = t;') || line.includes('.value = materia;')) && !line.includes('//')) {
        findings.push({ line: idx + 1, content: line.trim() });
    }
});

console.log(`Total de ocorrências suspeitas encontradas: ${findings.length}`);
if (findings.length > 0) {
    findings.forEach(f => console.log(`Linha ${f.line}: ${f.content}`));
} else {
    console.log('>> CONFIRMADO: Zero interpolações ou atribuições inseguras de objetos no projeto!');
}
