/**
 * Punto 10 · Compara dos ejecuciones de la suite de regresión.
 *  1) Línea base:   npm run test:regression && npm run report && cp results/report/consolidado.json ../evidence/e2e/regression-before.json
 *  2) Tras corregir/refactorizar: repetir y copiar a results/regression-after.json
 *  3) npm run regression:compare  → results/regression-comparison.md
 */
import { readFileSync, writeFileSync } from 'node:fs';

const leer = (f) => JSON.parse(readFileSync(f, 'utf8'));
const pruebas = (rep) => {
  const out = new Map();
  const recorrer = (suite) => {
    suite.tests?.forEach((t) => out.set(t.fullTitle, t.state ?? (t.pass ? 'passed' : t.fail ? 'failed' : 'pending')));
    suite.suites?.forEach(recorrer);
  };
  rep.results.forEach(recorrer);
  return out;
};

const antes = pruebas(leer(process.argv[2] ?? '../evidence/e2e/regression-before.json'));
const despues = pruebas(leer(process.argv[3] ?? 'results/regression-after.json'));
const filas = [...new Set([...antes.keys(), ...despues.keys()])].map((t) => {
  const a = antes.get(t) ?? '—'; const d = despues.get(t) ?? '—';
  const cambio = a === d ? 'igual' : a === 'passed' && d === 'failed' ? '🔴 REGRESIÓN' : a === 'failed' && d === 'passed' ? '🟢 corregido' : 'cambió';
  return { t, a, d, cambio };
});
const md = ['| Prueba | Antes | Después | Cambio |', '|---|---|---|---|', ...filas.map((f) => `| ${f.t} | ${f.a} | ${f.d} | ${f.cambio} |`)].join('\n');
const regresiones = filas.filter((f) => f.cambio.includes('REGRESIÓN')).length;
writeFileSync('results/regression-comparison.md', `# Comparación de regresión\n\nRegresiones: ${regresiones} · Corregidos: ${filas.filter((f) => f.cambio.includes('corregido')).length}\n\n${md}\n`);
console.log(`Regresiones: ${regresiones}. Ver results/regression-comparison.md`);
process.exit(regresiones ? 1 : 0);
