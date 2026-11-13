/// <reference types="cypress" />
/**
 * Accesibilidad (RNF-016) – WCAG 2.1 A/AA con axe-core + comprobaciones de teclado y foco.
 * Las violaciones se registran en evidencias/a11y-<vista>.json para el informe (criterio WCAG,
 * impacto, nodos afectados). Las comprobaciones manuales (contraste percibido, lector de pantalla,
 * zoom 200 %) se documentan en el informe (lista de comprobación manual WCAG).
 */
import { n8nApi } from '../../support/api.js';

const ETIQUETAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Auditoría WCAG 2.1 A/AA con axe-core (modo auditoría).
 * La prueba verifica que la auditoría se ejecute y REGISTRA todas las violaciones encontradas
 * (criterio WCAG, impacto, nodos afectados y ayuda) en evidencias/a11y-<vista>.json y en
 * evidencias/a11y-resumen.json. Las violaciones son hallazgos de n8n que se reportan en el informe
 * (punto 11: criterios evaluados, barreras encontradas y recomendaciones); no hacen fallar la prueba.
 */
const resumen = {};
const auditar = (vista) => {
  cy.injectAxe();
  cy.window()
    .then((win) => win.axe.run(win.document, { runOnly: { type: 'tag', values: ETIQUETAS } }))
    .then((r) => {
      const hallazgos = r.violations.map((v) => ({
        id: v.id,
        impacto: v.impact,
        wcag: v.tags.filter((tg) => /^wcag\d/.test(tg)).join(' '),
        descripcion: v.help,
        nodos: v.nodes.length,
        ayuda: v.helpUrl,
      }));
      const graves = hallazgos.filter((h) => ['critical', 'serious'].includes(h.impacto));
      resumen[vista] = { reglasEvaluadas: r.passes.length + r.violations.length, aprobadas: r.passes.length,
        violaciones: hallazgos.length, criticasOSerias: graves.length, hallazgos };
      cy.task('table', hallazgos);
      cy.writeFile(`evidencias/a11y-${vista}.json`, resumen[vista]);
      cy.writeFile('evidencias/a11y-resumen.json', resumen);
      cy.evidencia(`${vista}: ${r.passes.length} reglas WCAG cumplidas, ${hallazgos.length} violaciones (${graves.length} críticas/serias) registradas como hallazgos`);
      // La auditoría debe haberse ejecutado y evaluado reglas WCAG sobre la página
      expect(r.passes.length + r.violations.length, 'reglas WCAG evaluadas').to.be.greaterThan(0);
    });
};

describe('Accesibilidad · Data tables y carpetas', () => {
  let p; let t; let f;
  before(() => {
    cy.proyectoPersonal().then((id) => {
      p = id;
      cy.nombreUnico('vyv_a11y').then((n) => n8nApi.crearTablaOk(p, n, [{ name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' }])
        .then((tabla) => { t = tabla.id; n8nApi.insertar(p, t, [{ nombre: 'Ana', edad: 30 }]); }));
      cy.nombreUnico('VyV A11y').then((n) => n8nApi.crearCarpeta(p, n).then((r) => { f = r.body?.data; }));
    });
  });

  it('Auditoría WCAG · Listado /home/datatables (WCAG 1.1.1, 1.3.1, 1.4.3, 2.4.x, 4.1.2)', () => {
    cy.visitarN8n('/home/datatables');
    cy.tid('data-table-card').should('exist');
    auditar('listado-datatables');
  });

  it('Auditoría WCAG · Detalle de una data table (grid)', () => {
    cy.visitarN8n(`/projects/${p}/datatables/${t}`);
    cy.tid('data-table-details-view').should('be.visible');
    auditar('detalle-datatable');
  });

  it('Auditoría WCAG · Modal de nueva data table: etiquetas y foco (WCAG 1.3.1, 2.4.3, 3.3.2)', () => {
    cy.visitarN8n('/home/datatables');
    cy.abrirModalDataTable();
    cy.campo('data-table-name-input-select').focus();
    cy.focused().should('have.prop', 'tagName', 'INPUT');
    auditar('modal-nueva-datatable');
    cy.get('body').type('{esc}');
  });

  it('Auditoría WCAG · Vista de carpetas y breadcrumbs', function () {
    if (!f) this.skip(); // Requiere licencia Folders
    cy.visitarN8n(`/projects/${p}/folders/${f.id}/workflows`);
    cy.tid('breadcrumbs-item-current').should('be.visible');
    auditar('carpeta-breadcrumbs');
  });

  it('Teclado: se llega con Tab a las acciones principales y el foco es visible (WCAG 2.1.1, 2.4.7)', () => {
    cy.visitarN8n('/home/datatables');
    cy.tid('data-table-card').should('exist');
    const visitados = [];
    const sinFocoVisible = [];
    Cypress._.times(25, () => {
      cy.press(Cypress.Keyboard.Keys.TAB);
      cy.document().then((doc) => {
        const el = doc.activeElement;
        if (!el || el === doc.body) return;
        const nombre = (el.getAttribute('data-test-id') || el.getAttribute('aria-label') || el.innerText || el.tagName)
          .trim().slice(0, 40);
        visitados.push(nombre);
        const st = doc.defaultView.getComputedStyle(el);
        if (st.outlineStyle === 'none' && st.boxShadow === 'none') sinFocoVisible.push(nombre);
      });
    });
    cy.then(() => {
      cy.writeFile('evidencias/a11y-orden-tab.json', { visitados, sinFocoVisible });
      cy.evidencia(`Tab recorrió ${visitados.length} elementos; ${sinFocoVisible.length} sin foco visible (WCAG 2.4.7)`);
      expect(visitados.length, 'elementos alcanzables con Tab (WCAG 2.1.1)').to.be.greaterThan(5);
    });
  });
});
