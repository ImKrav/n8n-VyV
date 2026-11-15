/** Prueba del comparador de regresión: node --test scripts/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { funcionalidad, estados, comparar, informe } from './compare-regression.mjs';

const reporte = (tests) => ({ results: [{ suites: [{ tests, suites: [] }] }] });

test('asigna cada prueba a su funcionalidad del plan', () => {
  assert.equal(funcionalidad('WF-03 · Webhook de producción (API) CP-WF-03-02 · …'), 'WF-03');
  assert.equal(funcionalidad('CO-01 / CO-02 · Data tables (UI) CP-016-02 · …'), 'CO-01');
  assert.equal(funcionalidad('Seguridad · Data tables CP-018-08 · fórmulas'), 'CO-03');
  assert.equal(funcionalidad('packages/cli/src/services/__tests__/folder.service.vyv.test.ts › borra'), 'CO-05');
  assert.equal(funcionalidad('Seguridad · Data tables y carpetas (OWASP Top 10) A05 · cabeceras'), 'Seguridad');
  assert.equal(funcionalidad('Prueba sin funcionalidad'), 'Otras');
});

test('detecta regresiones, correcciones y pruebas pendientes', () => {
  const antes = estados([reporte([
    { fullTitle: 'CO-03 · CSV a', state: 'passed' },
    { fullTitle: 'CO-03 · CSV b', state: 'failed' },
    { fullTitle: 'WF-01 · c', pending: true },
  ])]);
  const despues = estados([reporte([
    { fullTitle: 'CO-03 · CSV a', state: 'failed' },
    { fullTitle: 'CO-03 · CSV b', state: 'passed' },
    { fullTitle: 'WF-01 · c', pending: true },
  ])]);
  const filas = comparar(antes, despues);
  // Orden del plan: el módulo 1 (WF) va antes que el 4 (CO).
  assert.deepEqual(filas.map((f) => f.cambio), ['igual', '🔴 regresión', '🟢 corregido']);
  const md = informe(filas, { antes: 'a', despues: 'd' });
  assert.match(md, /Regresiones: 1 · Corregidas: 1/);
  assert.match(md, /\| 4 · Core \| CO-03 \| 2 \| 1 \/ 1 \/ 0 \| 1 \/ 1 \/ 0 \| 1 \| 1 \| 🔴 regresión \|/);
});

test('lee el JSON de Vitest y cuenta como fallido un archivo que no carga', () => {
  const vitest = (estado, archivoCarga = true) => ({ testResults: [
    { name: '/repo/vyv/units/executions/EX-02/filtros.test.ts', status: estado, assertionResults: [{ fullName: 'rango invertido', status: estado }] },
    { name: '/repo/packages/modules/data-table/src/__tests__/csv-escape.vyv.test.ts', status: archivoCarga ? 'passed' : 'failed',
      assertionResults: archivoCarga ? [{ fullName: 'CP-018-08 · neutraliza fórmulas', status: 'passed' }] : [] },
  ] });
  const filas = comparar(estados([vitest('failed', false)]), estados([vitest('passed')]));
  assert.deepEqual(filas.map((f) => [f.f, f.a, f.d]), [
    ['EX-02', 'failed', 'passed'],
    ['CO-03', 'failed', '—'], // el archivo del backend se asigna por su nombre
    ['CO-03', '—', 'passed'],
  ]);
});
