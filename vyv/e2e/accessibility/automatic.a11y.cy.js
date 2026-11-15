/// <reference types="cypress" />
/**
 * Accesibilidad · auditoría automática con axe-core (WCAG 2.0, 2.1 y 2.2, niveles A y AA) de las 12
 * interfaces seleccionadas (accessibility/interfaces.js), en tema claro y en tema oscuro.
 * Modo auditoría: las violaciones son barreras de n8n que se registran en results/a11y/ (regla, criterio
 * WCAG, impacto, nodos y ejemplos) para el informe; la prueba solo exige que axe evalúe la vista.
 * Lighthouse (npm run test:lighthouse) repite la auditoría automática de las vistas con URL.
 */
import { INTERFACES, prepararDatos, abrir } from './interfaces.js';

const ETIQUETAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const resumen = {};

const auditar = (interfaz, tema) => {
  cy.injectAxe();
  cy.window()
    .then((win) => win.axe.run(win.document, { runOnly: { type: 'tag', values: ETIQUETAS }, resultTypes: ['violations', 'passes'] }))
    .then((r) => {
      const hallazgos = r.violations.map((v) => ({
        regla: v.id,
        impacto: v.impact,
        wcag: v.tags.filter((t) => /^wcag\d{3,4}$/.test(t)).map((t) => t.replace(/^wcag(\d)(\d)(\d+)$/, '$1.$2.$3')),
        descripcion: v.help,
        nodos: v.nodes.length,
        ejemplos: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
        ayuda: v.helpUrl,
      }));
      const clave = `${interfaz.id}-${tema}`;
      resumen[clave] = {
        interfaz: interfaz.id, nombre: interfaz.nombre, modulo: interfaz.modulo, tema,
        reglasEvaluadas: r.passes.length + r.violations.length, aprobadas: r.passes.length,
        violaciones: hallazgos.length, nodos: hallazgos.reduce((s, h) => s + h.nodos, 0), hallazgos,
      };
      cy.writeFile(`results/a11y/axe-${clave}.json`, resumen[clave]);
      cy.writeFile('results/a11y/resumen-axe.json', resumen);
      cy.evidencia(`${clave}: ${r.passes.length} reglas cumplidas, ${hallazgos.length} violaciones (${hallazgos.map((h) => h.regla).join(', ') || 'ninguna'})`);
      expect(r.passes.length + r.violations.length, 'reglas WCAG evaluadas').to.be.greaterThan(0);
    });
};

describe('Accesibilidad · auditoría automática (axe-core, WCAG 2.2 A/AA)', () => {
  let d;
  before(() => {
    cy.loginApi();
    prepararDatos().then((datos) => { d = datos; });
  });
  beforeEach(() => cy.loginApi());

  ['light', 'dark'].forEach((tema) => {
    INTERFACES.forEach((interfaz) => {
      it(`${interfaz.id} · ${interfaz.nombre} · tema ${tema === 'light' ? 'claro' : 'oscuro'}`, () => {
        abrir(interfaz, d, { tema });
        auditar(interfaz, tema);
      });
    });
  });
});
