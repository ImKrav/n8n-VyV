/// <reference types="cypress" />
/**
 * CO-02 · Edición de filas · rendimiento de la vista con una data table de 10 000 filas (UI).
 * Requisito no funcional del plan (numeral 8.2, rendimiento: «data table de 10 000 filas»).
 * Criterio: la vista carga en menos de 3 s (mediana de tres recargas, el mismo límite que el lienzo)
 * y pasar a la última página responde en menos de 3 s.
 */
import { n8nApi } from '../../support/api.js';

const FILAS = 10000;
const GRID = '[data-test-id="data-table-grid"] .ag-center-cols-container .ag-row';
const TOTAL = '[data-test-id="data-table-content-pagination"] [data-test-id="pagination-total"]';
const mediana = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

describe('CO-02 · Data table de 10 000 filas (UI)', () => {
  let p;
  let tabla;
  before(() => {
    cy.proyectoPersonal().then((id) => { p = id; });
    const csv = ['nombre,edad', ...Array.from({ length: FILAS }, (_, i) => `fila-${i + 1},${i % 90}`)].join('\n');
    n8nApi.subirBytes(csv, 'vyv-10000.csv').then((up) => {
      expect(up.status).to.eq(200);
      const meta = up.body.data ?? up.body;
      cy.nombreUnico('vyv_10000').then((nombre) =>
        n8nApi.req('POST', n8nApi.dt(p), {
          name: nombre, fileId: meta.id, hasHeaders: true,
          columns: meta.columns.map((c) => ({ name: c.name, type: c.type, csvColumnName: c.name })),
        }, { timeout: 120000 }).then(n8nApi.ok).then((t) => { tabla = t; }),
      );
    });
  });
  beforeEach(() => cy.loginApi());
  after(() => tabla && n8nApi.borrarTabla(p, tabla.id));

  it('CO-02 · RNF · la vista de una tabla de 10 000 filas carga en menos de 3 s y pagina hasta el final', () => {
    n8nApi.filas(p, tabla.id, { take: '1' }).then((r) => {
      expect((r.body.data ?? r.body).count, 'filas en la tabla').to.eq(FILAS);
    });
    cy.visitarN8n(`/projects/${p}/datatables/${tabla.id}`);
    cy.get(GRID, { timeout: 30000 }).should('have.length.greaterThan', 0);

    // Carga: mediana de tres recargas hasta ver filas y el total de 10 000.
    const cargas = [];
    for (let i = 0; i < 3; i++) {
      let t0;
      cy.then(() => { t0 = performance.now(); });
      cy.reload();
      cy.get(GRID, { timeout: 30000 }).should('have.length.greaterThan', 0);
      cy.get(TOTAL, { timeout: 30000 }).invoke('text').should('match', /10[.,\s]?000/).then(() => cargas.push(Math.round(performance.now() - t0)));
    }

    // Ir a la última página: aparece la fila 10 000.
    let ultima;
    cy.then(() => { ultima = performance.now(); });
    cy.get('[data-test-id="data-table-content-pagination"] [data-test-id="pagination-item"]').last().click();
    cy.contains(`${GRID}`, 'fila-10000', { timeout: 30000 }).should('exist').then(() => { ultima = Math.round(performance.now() - ultima); });
    cy.screenshot('CO-02_10000-filas_ultima-pagina');

    cy.then(() => {
      cy.evidencia(`Tabla de ${FILAS} filas · carga: ${cargas.join(' / ')} ms (mediana ${mediana(cargas)} ms) · última página: ${ultima} ms`);
      expect(mediana(cargas), 'mediana de carga de la vista (ms)').to.be.lessThan(3000);
      expect(ultima, 'pasar a la última página (ms)').to.be.lessThan(3000);
    });
  });
});
