/**
 * Ejecutor de los flujos Stagehand de los 4 módulos del plan.
 *
 *   node run.mjs                 → todos los módulos
 *   node run.mjs workflows       → un módulo (workflows | executions | credentials | core)
 *   node run.mjs core CO-03      → un solo flujo por su id
 *
 * Cada flujo es independiente: si uno falla se registra (con captura) y se continúa con el siguiente.
 * Resultado: results/stagehand-<fecha>.json y results/stagehand-<fecha>.md (+ screenshots/).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Api, Fallo, abrirNavegador, iniciarSesion } from './lib.mjs';

const MODULOS = ['workflows', 'executions', 'credentials', 'core'];
const [, , modArg = 'all', idArg] = process.argv;
const modulos = modArg === 'all' ? MODULOS : [modArg];
if (modulos.some((m) => !MODULOS.includes(m))) { console.error(`Módulo desconocido. Usa: ${MODULOS.join(' | ')} | all`); process.exit(2); }
if (!(process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY)) { console.error('Falta OPENAI_API_KEY o GOOGLE_API_KEY (ver .env.example)'); process.exit(2); }

mkdirSync('results/screenshots', { recursive: true });
const api = await new Api().iniciar().catch((e) => { console.error(`n8n no responde o el login falló: ${e.message}`); process.exit(2); });
const stagehand = await abrirNavegador();
const page = stagehand.page;
await iniciarSesion(page);

const resultados = [];
for (const m of modulos) {
  const { flujos } = await import(`./flujos/${m}.mjs`);
  for (const f of flujos.filter((x) => !idArg || x.id === idArg)) {
    const limpieza = [];
    const t0 = Date.now();
    let ok = true, detalle = 'OK';
    try {
      await f.run({ page, api, limpiar: (fn) => limpieza.push(fn) });
    } catch (e) {
      ok = false;
      detalle = e instanceof Fallo ? e.message : `Error de ejecución: ${String(e.message ?? e).slice(0, 300)}`;
    }
    const captura = `results/screenshots/${f.id}.png`;
    await page.screenshot({ path: captura }).catch(() => {});
    for (const fn of limpieza.reverse()) await Promise.resolve(fn()).catch(() => {});
    resultados.push({ modulo: m, id: f.id, flujo: f.nombre, ok, detalle, segundos: +((Date.now() - t0) / 1000).toFixed(1), captura });
    console.log(`${ok ? '✅' : '❌'} ${f.id} · ${f.nombre}${ok ? '' : ` — ${detalle}`}`);
  }
}
await stagehand.close();

const sello = new Date().toISOString().replace(/[:.]/g, '-');
const fallos = resultados.filter((r) => !r.ok);
writeFileSync(`results/stagehand-${sello}.json`, JSON.stringify({ modelo: process.env.STAGEHAND_MODEL ?? 'gpt-4.1-mini', resultados }, null, 2));
writeFileSync(`results/stagehand-${sello}.md`, [
  `# Stagehand · ${new Date().toLocaleString('es-CO')} · modelo ${process.env.STAGEHAND_MODEL ?? 'gpt-4.1-mini'}`, '',
  '| Flujo | Módulo | Resultado | s | Detalle |', '|---|---|---|---|---|',
  ...resultados.map((r) => `| ${r.id} · ${r.flujo} | ${r.modulo} | ${r.ok ? '✅' : '❌'} | ${r.segundos} | ${r.ok ? '' : r.detalle.replace(/\|/g, '/')} |`),
  '', `**${resultados.length - fallos.length}/${resultados.length} flujos OK**`,
].join('\n'));
console.log(`\nResumen Stagehand: ${resultados.length - fallos.length}/${resultados.length} flujos OK`);
process.exit(fallos.length ? 1 : 0);
