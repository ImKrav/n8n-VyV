/**
 * Punto 14 · Stagehand: automatización y validación de flujos web con IA.
 *
 * Stagehand controla un Chrome local (Playwright) y usa un LLM para:
 *   act()     → ejecutar acciones descritas en lenguaje natural (sin selectores CSS)
 *   extract() → leer información de la página validada con un esquema Zod
 *   observe() → descubrir qué elementos accionables hay en la página
 *
 * Flujos automatizados (trazabilidad):
 *   F1 CO-01 Crear data table y columna         (CP-016-01, CP-016-04)
 *   F2 CO-02 Añadir fila y validarla             (CP-017-01)
 *   F3 CO-04 Crear carpeta y validar la tarjeta  (CP-019-01)
 * Resultado: ia/stagehand/resultados.json (+ capturas) para el informe.
 */
import 'dotenv/config';
import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';
import { writeFileSync, mkdirSync } from 'node:fs';

const URL = process.env.N8N_URL ?? 'http://localhost:5678';
const sufijo = Date.now().toString(36);
const TABLA = `vyv_stagehand_${sufijo}`;
const CARPETA = `VyV Stagehand ${sufijo}`;
const resultados = [];
mkdirSync('capturas', { recursive: true });

const registrar = async (page, flujo, paso, ok, detalle) => {
  const captura = `capturas/${flujo}-${resultados.length + 1}.png`;
  await page.screenshot({ path: captura });
  resultados.push({ flujo, paso, ok, detalle, captura, fecha: new Date().toISOString() });
  console.log(`${ok ? '✅' : '❌'} [${flujo}] ${paso} – ${detalle}`);
};

const stagehand = new Stagehand({
  env: 'LOCAL',
  modelName: process.env.STAGEHAND_MODEL ?? 'gpt-4.1-mini',
  modelClientOptions: { apiKey: process.env.OPENAI_API_KEY ?? process.env.GOOGLE_API_KEY },
  localBrowserLaunchOptions: { headless: false, viewport: { width: 1440, height: 900 } },
  verbose: 1,
});

try {
  await stagehand.init();
  const page = stagehand.page;

  // ---------------------------------------------------------------- Login (determinista, sin IA)
  await page.goto(`${URL}/signin`);
  await page.fill('input[type="email"], input[name="emailOrLdapLoginId"]', process.env.N8N_EMAIL);
  await page.fill('input[type="password"]', process.env.N8N_PASSWORD);
  await page.keyboard.press('Enter');
  await page.waitForURL(/home|workflows/, { timeout: 30_000 });

  // ---------------------------------------------------------------- F1 · CO-01
  await page.goto(`${URL}/home/datatables`);
  const acciones = await page.observe('botones para crear una nueva data table');
  await registrar(page, 'F1-CO01', 'observe', acciones.length > 0, `${acciones.length} elementos accionables encontrados`);

  await page.act('Haz clic en el botón para crear una nueva data table (Create data table o el botón +)');
  await page.act(`Escribe "${TABLA}" en el campo del nombre de la data table`);
  await page.act('Selecciona la opción "From scratch" o "Desde cero"');
  await page.act('Haz clic en el botón para continuar o crear la data table');
  await page.waitForTimeout(1500);
  await page.act('Haz clic en el botón para añadir una columna nueva (+) en la cabecera de la tabla');
  await page.act('Escribe "edad" en el campo del nombre de la nueva columna');
  await page.act('Elige el tipo "Number" para la columna');
  await page.act('Confirma para añadir la columna');
  await page.waitForTimeout(1000);

  const detalle = await page.extract({
    instruction: 'Extrae el nombre de la data table que se está viendo y los nombres de sus columnas',
    schema: z.object({ nombreTabla: z.string(), columnas: z.array(z.string()) }),
  });
  await registrar(page, 'F1-CO01', 'extract', detalle.nombreTabla.includes(TABLA) && detalle.columnas.some((c) => /edad/i.test(c)),
    JSON.stringify(detalle));

  // ---------------------------------------------------------------- F2 · CO-02
  await page.act('Haz clic en el botón para añadir una fila (Add row)');
  await page.act('Haz doble clic en la celda de la columna "edad" de la primera fila, escribe 25 y presiona Enter');
  await page.waitForTimeout(1500);
  await page.reload();
  const fila = await page.extract({
    instruction: 'Extrae los valores de la columna edad de todas las filas visibles',
    schema: z.object({ edades: z.array(z.string()) }),
  });
  await registrar(page, 'F2-CO02', 'extract', fila.edades.some((e) => e.trim() === '25'), JSON.stringify(fila));

  // ---------------------------------------------------------------- F3 · CO-04
  await page.goto(`${URL}/home/workflows`);
  await page.act('Abre el menú para crear un recurso nuevo y elige crear una carpeta (Folder)');
  await page.act(`Escribe "${CARPETA}" como nombre de la carpeta y confírmala`);
  await page.waitForTimeout(1500);
  const carpetas = await page.extract({
    instruction: 'Extrae los nombres de todas las tarjetas de carpetas visibles',
    schema: z.object({ carpetas: z.array(z.string()) }),
  });
  await registrar(page, 'F3-CO04', 'extract', carpetas.carpetas.some((c) => c.includes(CARPETA)), JSON.stringify(carpetas));
} catch (e) {
  resultados.push({ flujo: 'ERROR', ok: false, detalle: String(e) });
  console.error(e);
} finally {
  writeFileSync('resultados.json', JSON.stringify({ modelo: process.env.STAGEHAND_MODEL, resultados }, null, 2));
  const fallos = resultados.filter((r) => !r.ok).length;
  console.log(`\nResumen Stagehand: ${resultados.length - fallos}/${resultados.length} validaciones OK`);
  await stagehand.close();
  process.exit(fallos ? 1 : 0);
}
