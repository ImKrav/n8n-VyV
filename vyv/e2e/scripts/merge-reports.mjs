/** Une los JSON de mochawesome y genera results/report/index.html (punto 4: evidencias de ejecución). */
import { merge } from 'mochawesome-merge';
import generator from 'mochawesome-report-generator';
import { writeFileSync, mkdirSync } from 'node:fs';

const reporte = await merge({ files: ['results/mochawesome/*.json'] });
mkdirSync('results/report', { recursive: true });
writeFileSync('results/report/consolidado.json', JSON.stringify(reporte, null, 2));
await generator.create(reporte, { reportDir: 'results/report', reportFilename: 'index', reportTitle: 'VyV n8n – Data tables y carpetas', charts: true });
const s = reporte.stats;
console.log(`Pruebas: ${s.tests} · Pasaron: ${s.passes} · Fallaron: ${s.failures} · Pendientes: ${s.pending} · Duración: ${(s.duration / 1000).toFixed(1)} s`);
console.log('Reporte: results/report/index.html');
