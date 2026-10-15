const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find infinite CSS animations
const infiniteAnims = [...html.matchAll(/animation:[^;]+infinite[^;]*;/g)];
console.log('Infinite CSS animations in index.html:', infiniteAnims.length);
infiniteAnims.forEach(a => console.log('  ', a[0]));

// Find requestAnimationFrame in JS
const rafs = [...html.matchAll(/requestAnimationFrame/g)];
console.log('requestAnimationFrame calls in JS:', rafs.length);

// Find setInterval in JS
const intervals = [...html.matchAll(/setInterval\s*\([^;]+;/g)];
console.log('setInterval calls in JS:', intervals.length);
intervals.forEach(i => console.log('  ', i[0].substring(0, 80)));

// Check study-hours.css for infinite animations
if (fs.existsSync('study-hours.css')) {
  const css = fs.readFileSync('study-hours.css', 'utf8');
  const cssAnims = [...css.matchAll(/animation:[^;]+infinite[^;]*;/g)];
  console.log('Infinite animations in study-hours.css:', cssAnims.length);
  cssAnims.forEach(a => console.log('  ', a[0]));
}
