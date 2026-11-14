/// <reference types="cypress" />
/**
 * EX-01 · Lista de ejecuciones · paginación de 60 ejecuciones y actualización en vivo (API + UI).
 * Trazabilidad: CP-EX-01-05 (éxito: 60 ejecuciones sin omisiones ni repetidas, por API y al
 * desplazar la lista) y CP-EX-01-06 (alternativo: las nuevas aparecen sin recargar la página).
 */
import { n8nApi } from '../../support/api.js';

const tarjetas = 'div.execution-card';

describe('EX-01 · Paginación y actualización de la lista (API y UI)', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() => workflows.forEach((id) => n8nApi.desactivarWorkflow(id)));

  const publicar = (nombre) => {
    const ruta = n8nApi.rutaUnica('vyv-ex01');
    return n8nApi
      .crearWorkflowActivo(nombre, [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoCampos({ ok: true })], n8nApi.cadena('Webhook', 'Edit Fields'))
      .then((wf) => {
        workflows.push(wf.id);
        return { wf, ruta };
      });
  };
  /** Recorre todas las páginas de 20 con el cursor de la API y devuelve los IDs. */
  const todasLasPaginas = (workflowId, cursor, ids = []) => {
    const qs = new URLSearchParams({ filter: JSON.stringify({ workflowId }), limit: '20', ...(cursor ? { cursor } : {}) });
    return n8nApi.req('GET', `/rest/executions?${qs}`).then(n8nApi.ok).then((d) => {
      const todos = [...ids, ...d.results.map((e) => e.id)];
      return d.nextCursor && d.results.length ? todasLasPaginas(workflowId, d.nextCursor, todos) : todos;
    });
  };

  it('CP-EX-01-05 · las 60 ejecuciones se recorren completas, sin omisiones ni repetidas', () => {
    publicar('VyV 60 ejecuciones').then(({ wf, ruta }) => {
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
      Cypress._.times(59, () => cy.request({ url: `/webhook/${ruta}`, log: false }));
      n8nApi.esperarEjecuciones(wf.id, 60).should('have.length', 60);

      todasLasPaginas(wf.id).then((ids) => {
        cy.evidencia(`API en páginas de 20: ${ids.length} IDs, ${new Set(ids).size} distintos`);
        expect(ids).to.have.length(60);
        expect(new Set(ids).size, 'sin repetidos').to.eq(60);
      });

      // La lista del workflow carga más al desplazarse hasta el final.
      cy.visitarN8n(`/workflow/${wf.id}/executions`);
      cy.get(tarjetas, { timeout: 30000 }).should('have.length.at.least', 10);
      const desplazar = (restantes = 15) =>
        cy.get(tarjetas).then(($t) => {
          if ($t.length >= 60 || restantes <= 0) return;
          cy.get('[data-test-id="current-executions-list"]').scrollTo('bottom', { ensureScrollable: false });
          cy.wait(700).then(() => desplazar(restantes - 1));
        });
      desplazar();
      cy.get(tarjetas).should('have.length', 60).then(($t) => {
        const enPantalla = [...$t].map((el) => el.querySelector('a')?.getAttribute('href') ?? el.textContent);
        cy.evidencia(`Lista del workflow tras desplazarse: ${$t.length} tarjetas, ${new Set(enPantalla).size} distintas`);
        expect(new Set(enPantalla).size).to.eq(60);
      });
      cy.screenshot('CP-EX-01-05_lista-completa');
    });
  });

  it('CP-EX-01-06 · (alternativo) con la lista abierta, las ejecuciones nuevas aparecen sin recargar', () => {
    publicar('VyV lista en vivo').then(({ wf, ruta }) => {
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
      cy.visitarN8n(`/workflow/${wf.id}/executions`);
      cy.get(tarjetas, { timeout: 30000 }).should('have.length', 1);
      cy.window().then((win) => { win.__vyvSinRecarga = true; });
      Cypress._.times(3, () => cy.request(`/webhook/${ruta}`));
      cy.get(tarjetas, { timeout: 30000 }).should('have.length', 4);
      cy.window().its('__vyvSinRecarga').should('eq', true);
      cy.screenshot('CP-EX-01-06_lista-en-vivo');
      cy.evidencia('Las 3 ejecuciones nuevas aparecen en la lista abierta y la página no se recargó');
    });
  });
});
