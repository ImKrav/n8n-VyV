/**
 * Punto 10 · Compara dos ejecuciones de la suite de regresión (antes y después de corregir y refactorizar).
 *   node scripts/compare-regression.mjs <antes> <después> [salida.md]
 * <antes> y <después> son un JSON de mochawesome (Cypress) o de Vitest (--reporter=json), o una carpeta con
 * los JSON de una ejecución (p. ej. results/regression). Escribe la comparación por funcionalidad del plan y termina con
 * código 1 si hay regresiones (una prueba que pasaba y ahora falla).
 */
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MODULOS = { WF: '1 · Workflows', EX: '2 · Ejecuciones', CR: '3 · Credenciales', CO: '4 · Core' };
// Los casos de Core del primer plan (CP-016 … CP-020) corresponden a CO-01 … CO-05.
const ANTIGUOS = { '016': 'CO-01', '017': 'CO-02', '018': 'CO-03', '019': 'CO-04', '020': 'CO-05' };

// Pruebas unitarias del backend (packages/…/*.vyv.test.ts): su título no lleva la funcionalidad.
const ARCHIVOS = [
  [/csv-(escape|parser)|data-table-csv-import/, 'CO-03'], [/folder-name\.schema/, 'CO-04'], [/folder\.service/, 'CO-05'],
  [/^Seguridad ·/, 'Seguridad'], // OWASP de data tables y carpetas sin un caso del plan
];

/** Funcionalidad del plan a la que pertenece una prueba, por su título completo. */
export const funcionalidad = (titulo) => {
  // CP-SEG-WF-01 … son casos de seguridad, no de la funcionalidad WF-01.
  if (/\bCP-SEG-/.test(titulo)) return 'Seguridad';
  const directa = titulo.match(/\b(WF|EX|CR|CO)-0[1-5]\b/);
  if (directa) return directa[0];
  const antigua = titulo.match(/\b(?:CP|BUG)-(01[6-9]|020)-/);
  if (antigua) return ANTIGUOS[antigua[1]];
  return ARCHIVOS.find(([re]) => re.test(titulo))?.[1] ?? 'Otras';
};
// Orden del plan: módulo 1 (WF) a 4 (CO); «Otras» al final.
const orden = (f) => `${Object.keys(MODULOS).indexOf(f.slice(0, 2)) + 1 || 9}${f}`;

/** Estado de cada prueba (passed / failed / pending) por título completo. */
export const estados = (reportes) => {
  const out = new Map();
  // Vitest: el título lleva la ruta del archivo, que incluye la funcionalidad (units/workflows/WF-01/…).
  reportes.filter((r) => r.testResults).forEach((r) =>
    r.testResults.forEach((archivo) => {
      const ruta = archivo.name.replace(/^.*?\/(vyv|packages)\//, '$1/');
      archivo.assertionResults.forEach((t) =>
        out.set(`${ruta} › ${t.fullName}`, ['passed', 'failed'].includes(t.status) ? t.status : 'pending'));
      // Un archivo que no carga (p. ej. importa un módulo que no existe) no tiene pruebas: se cuenta como fallido.
      if (!archivo.assertionResults.length && archivo.status === 'failed') out.set(`${ruta} › (el archivo no carga)`, 'failed');
    }));
  const recorrer = (suite) => {
    suite.tests?.forEach((t) => out.set(t.fullTitle, t.pending ? 'pending' : t.state ?? (t.pass ? 'passed' : t.fail ? 'failed' : 'pending')));
    suite.suites?.forEach(recorrer);
  };
  reportes.filter((r) => r.results).flatMap((r) => r.results).forEach(recorrer);
  return out;
};

const leer = (ruta) =>
  statSync(ruta).isDirectory()
    ? readdirSync(ruta).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(ruta, f), 'utf8')))
    : [JSON.parse(readFileSync(ruta, 'utf8'))];

export const cambio = (a, d) =>
  a === d ? 'igual'
    : a === 'passed' && d !== 'passed' ? (d === 'failed' ? '🔴 regresión' : '🟠 dejó de ejecutarse')
      : d === 'passed' && a === 'failed' ? '🟢 corregido'
        : a === '—' ? 'nueva' : d === '—' ? 'quitada' : 'cambió';

/** Filas de la comparación, ordenadas por funcionalidad y título. */
export const comparar = (antes, despues) =>
  [...new Set([...antes.keys(), ...despues.keys()])]
    .map((t) => {
      const a = antes.get(t) ?? '—';
      const d = despues.get(t) ?? '—';
      return { t, f: funcionalidad(t), a, d, cambio: cambio(a, d) };
    })
    .sort((x, y) => orden(x.f).localeCompare(orden(y.f)) || x.t.localeCompare(y.t));

const cuenta = (filas, campo) => {
  const n = (e) => filas.filter((f) => f[campo] === e).length;
  return `${n('passed')} / ${n('failed')} / ${n('pending')}`;
};

export const informe = (filas, etiquetas) => {
  const funcs = [...new Set(filas.map((f) => f.f))];
  const regresiones = filas.filter((f) => f.cambio.includes('regresión'));
  const corregidos = filas.filter((f) => f.cambio.includes('corregido'));
  const resumen = funcs.map((fn) => {
    const fs = filas.filter((f) => f.f === fn);
    const r = fs.filter((f) => f.cambio.includes('regresión')).length;
    const c = fs.filter((f) => f.cambio.includes('corregido')).length;
    const falla = fs.some((f) => f.d === 'failed');
    const modulo = MODULOS[fn.slice(0, 2)] ?? '—';
    return `| ${modulo} | ${fn} | ${fs.length} | ${cuenta(fs, 'a')} | ${cuenta(fs, 'd')} | ${r} | ${c} | ${r ? '🔴 regresión' : falla ? '⚠️ falla conocida' : '✅'} |`;
  });
  const lista = (fs) => (fs.length ? fs.map((f) => `- ${f.f} · ${f.t} (${f.a} → ${f.d})`).join('\n') : '- Ninguna');
  return [
    '# Comparación de regresión',
    '',
    `Antes: ${etiquetas.antes} · Después: ${etiquetas.despues}`,
    '',
    `**Pruebas: ${filas.length} · Regresiones: ${regresiones.length} · Corregidas: ${corregidos.length}**`,
    '',
    '## Resumen por funcionalidad',
    '',
    'Columnas «Antes» y «Después»: aprobadas / fallidas / pendientes.',
    '',
    '| Módulo | Funcionalidad | Pruebas | Antes | Después | Regresiones | Corregidas | Resultado |',
    '|---|---|---|---|---|---|---|---|',
    ...resumen,
    '',
    '## Regresiones',
    '',
    lista(regresiones),
    '',
    '## Corregidas',
    '',
    lista(corregidos),
    '',
    '## Detalle',
    '',
    '| Funcionalidad | Prueba | Antes | Después | Cambio |',
    '|---|---|---|---|---|',
    ...filas.map((f) => `| ${f.f} | ${f.t.replace(/\|/g, '\\|')} | ${f.a} | ${f.d} | ${f.cambio} |`),
    '',
  ].join('\n');
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [rutaAntes = '../evidence/e2e/regression/antes', rutaDespues = 'results/regression', salida = 'results/regression-comparison.md'] = process.argv.slice(2);
  const filas = comparar(estados(leer(rutaAntes)), estados(leer(rutaDespues)));
  writeFileSync(salida, informe(filas, { antes: rutaAntes, despues: rutaDespues }));
  const regresiones = filas.filter((f) => f.cambio.includes('regresión')).length;
  console.log(`Pruebas: ${filas.length} · Regresiones: ${regresiones} · Corregidas: ${filas.filter((f) => f.cambio.includes('corregido')).length}. Ver ${salida}`);
  process.exit(regresiones ? 1 : 0);
}
