/**
 * Accesibilidad · auditoría Lighthouse (categoría Accessibility, escritorio 1440 × 900) de las interfaces con
 * URL de accessibility/interfaces.js. Usa las URL que escribe la spec automática en results/a11y/datos.json.
 * Las vistas exigen sesión: Puppeteer inicia sesión en un Chromium y Lighthouse audita cada URL en ese mismo
 * navegador sin borrar su almacenamiento (receta de Lighthouse para páginas autenticadas).
 *   CHROME_PATH=/ruta/a/chrome CYPRESS_ownerEmail=… CYPRESS_ownerPassword=… npm run test:lighthouse
 * Resultado: results/a11y/lighthouse/<interfaz>.json (puntuación y reglas fallidas con sus nodos) y
 * results/a11y/resumen-lighthouse.json.
 */
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.env.N8N_URL ?? 'http://localhost:5678';
const { urls } = JSON.parse(readFileSync('results/a11y/datos.json', 'utf8'));
const puerto = 9333;
const navegador = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
  userDataDir: mkdtempSync(join(tmpdir(), 'vyv-lighthouse-')),
  args: ['--no-sandbox', `--remote-debugging-port=${puerto}`],
});

const opciones = {
  port: puerto, output: 'json', logLevel: 'error', onlyCategories: ['accessibility'], disableStorageReset: true,
  formFactor: 'desktop', screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false },
};

const auditar = async (id, ruta) => {
  const { lhr } = await lighthouse(`${base}${ruta}`, opciones);
  const fallidas = Object.values(lhr.audits)
    .filter((a) => a.score === 0 && a.scoreDisplayMode === 'binary')
    .map((a) => ({
      regla: a.id, titulo: a.title,
      nodos: (a.details?.items ?? []).map((i) => i.node?.selector ?? i.node?.snippet).filter(Boolean).slice(0, 5),
      total: a.details?.items?.length ?? 0,
    }));
  const resultado = { interfaz: id, url: lhr.finalDisplayedUrl.replace(base, ''), puntuacion: Math.round(lhr.categories.accessibility.score * 100), fallidas };
  writeFileSync(`results/a11y/lighthouse/${id}.json`, JSON.stringify(resultado, null, 2));
  console.log(`${id} ${resultado.url}: ${resultado.puntuacion} · ${fallidas.map((f) => f.regla).join(', ') || 'sin reglas fallidas'}`);
  return resultado;
};

mkdirSync('results/a11y/lighthouse', { recursive: true });
const resumen = {};
try {
  // El inicio de sesión se audita antes de entrar: con sesión, /signin redirige a la página de inicio.
  resumen['I-00'] = await auditar('I-00', urls['I-00']);
  const pagina = await navegador.newPage();
  await pagina.goto(`${base}/signin`);
  await pagina.waitForSelector('[data-test-id="emailOrLdapLoginId"] input');
  await pagina.type('[data-test-id="emailOrLdapLoginId"] input', process.env.CYPRESS_ownerEmail ?? '');
  await pagina.type('[data-test-id="password"] input', process.env.CYPRESS_ownerPassword ?? '');
  await pagina.click('[data-test-id="form-submit-button"]');
  // El editor es una SPA: el inicio de sesión termina cuando la ruta deja de ser /signin.
  await pagina.waitForFunction(() => !location.pathname.startsWith('/signin'), { timeout: 30000 })
    .catch(() => { throw new Error('No se pudo iniciar sesión: revise CYPRESS_ownerEmail y CYPRESS_ownerPassword'); });
  await pagina.close();
  for (const [id, ruta] of Object.entries(urls).filter(([id]) => id !== 'I-00')) resumen[id] = await auditar(id, ruta);
} finally {
  writeFileSync('results/a11y/resumen-lighthouse.json', JSON.stringify(resumen, null, 2));
  await navegador.close();
}
