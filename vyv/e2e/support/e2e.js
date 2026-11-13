// Soporte global de Cypress: comandos propios, API de n8n y accesibilidad (axe-core).
import 'cypress-axe';
import './commands.js';

// n8n emite errores no controlados de telemetría/websocket que no pertenecen al alcance de estas pruebas.
Cypress.on('uncaught:exception', (err) => {
  if (/ResizeObserver|Push connection|fetch failed|NetworkError|getModifierState/i.test(err.message)) return false;
  return true;
});

/**
 * Evidencia por caso: al terminar cada prueba de API o de seguridad que tenga un ID de caso (CP-xxx-yy),
 * se toma una captura del panel de Cypress (peticiones, respuestas y aserciones en verde/rojo).
 * Archivo: results/screenshots/<spec>/<CP-xxx-yy>_evidencia.png
 */
afterEach(function () {
  const spec = Cypress.spec.relative.replace(/\\/g, '/');
  if (!/\.api\.cy\.js$|\/security\//.test(spec)) return;
  const m = /CP-\d{3}-\d{2}/.exec(this.currentTest.title);
  if (!m) return;
  cy.screenshot(`${m[0]}_evidencia`, { capture: 'runner', overwrite: true });
});
