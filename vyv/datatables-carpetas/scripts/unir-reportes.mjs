/** Une los JSON de mochawesome y genera evidencias/reporte/index.html (punto 4: evidencias de ejecución). */
import { merge } from 'mochawesome-merge';
import generator from 'mochawesome-report-generator';
import { writeFileSync, mkdirSync } from 'node:fs';

const reporte = await merge({ files: ['evidencias/mochawesome/*.json'] });
mkdirSync('evidencias/reporte', { recursive: true });
writeFileSync('evidencias/reporte/consolidado.json', JSON.stringify(reporte, null, 2));
await generator.create(reporte, { reportDir: 'evidencias/reporte', reportFilename: 'index', reportTitle: 'VyV n8n – Data tables y carpetas', charts: true });
const s = reporte.stats;
console.log(`Pruebas: ${s.tests} · Pasaron: ${s.passes} · Fallaron: ${s.failures} · Pendientes: ${s.pending} · Duración: ${(s.duration / 1000).toFixed(1)} s`);
console.log('Reporte: evidencias/reporte/index.html');
