/// <reference types="cypress" />
/**
 * ES-02 · Diagnóstico de un fallo (escenario extremo a extremo del plan).
 * Un workflow falla, se dispara el workflow de error, se filtran las ejecuciones fallidas, se revisa
 * la vista previa, se corrige el workflow y se reintenta con la versión actual.
 * Cubre WF-02, EX-02, EX-03 y WF-04. Se ejecuta en las dos resoluciones del plan.
 */
import { n8nApi } from '../support/api.js';

const RESOLUCIONES = [[1366, 768], [1920, 1080]];

describe('ES-02 · Diagnóstico de un fallo', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() => workflows.forEach((id) => n8nApi.desactivarWorkflow(id)));

  const filtrar = (filter) =>
    n8nApi.req('GET', `/rest/executions?filter=${encodeURIComponent(JSON.stringify(filter))}&limit=20`).then(n8nApi.ok).its('results');

  RESOLUCIONES.forEach(([ancho, alto]) => {
    it(`ES-02 · fallo, workflow de error, filtro, vista previa, corrección y reintento (${ancho} × ${alto})`, () => {
      cy.viewport(ancho, alto);
      const ruta = n8nApi.rutaUnica('vyv-es02');
      let manejador;
      let wf;

      // Workflow de error publicado.
      const nodosError = [
        { id: 'et', name: 'Error Trigger', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
        n8nApi.nodoCampos({ manejado: true }),
      ];
      n8nApi.crearWorkflowActivo(`VyV ES-02 manejador ${ancho}`, nodosError, n8nApi.cadena('Error Trigger', 'Edit Fields')).then((w) => {
        manejador = w;
        workflows.push(w.id);
      });

      // 1 · El workflow principal falla en producción.
      cy.then(() =>
        n8nApi.req('POST', '/rest/workflows', {
          name: `VyV ES-02 principal ${ancho}`, nodes: [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoFalla('fallo ES-02')],
          connections: n8nApi.cadena('Webhook', 'Falla'), settings: { errorWorkflow: manejador.id }, active: false,
        }).then(n8nApi.ok),
      ).then((w) => {
        wf = w;
        workflows.push(w.id);
        return n8nApi.req('POST', `/rest/workflows/${w.id}/activate`, { versionId: w.versionId });
      }).its('status').should('eq', 200);
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 500);

      // 2 · Se dispara el workflow de error.
      cy.then(() => n8nApi.esperarEjecuciones(manejador.id, 1, (e) => e.status === 'success')).then(([e]) => {
        expect(e.mode).to.eq('error');
      });

      // 3 · Filtrar las ejecuciones fallidas del workflow.
      cy.then(() => n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'error'));
      cy.then(() => filtrar({ workflowId: wf.id, status: ['error'] })).then((fallidas) => {
        expect(fallidas).to.have.length(1);
        const fallida = fallidas[0];

        // 4 · Vista previa: nodo con error y mensaje (API y UI).
        n8nApi.detalleEjecucion(fallida.id).then((d) => {
          expect(d.data.resultData.lastNodeExecuted).to.eq('Falla');
          expect(d.data.resultData.error.message).to.eq('fallo ES-02');
        });
        cy.visitarN8n(`/workflow/${wf.id}/executions/${fallida.id}`);
        cy.get('div.execution-card', { timeout: 30000 }).should('have.length', 1).and('contain.text', 'Error');
        cy.screenshot(`ES-02_${ancho}x${alto}_ejecucion-fallida`);

        // 5 · Corregir el workflow: el historial registra la versión nueva.
        n8nApi.obtenerWorkflow(wf.id).then((actual) => {
          const nodos = actual.nodes.map((n) => (n.name === 'Falla' ? n8nApi.nodoCampos({ corregido: true }, 'Falla') : n));
          n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, { versionId: actual.versionId, nodes: nodos, connections: actual.connections }).its('status').should('eq', 200);
        });
        n8nApi.req('GET', `/rest/workflow-history/workflow/${wf.id}?take=10`).then(n8nApi.ok).its('length').should('be.at.least', 2);

        // 6 · Reintentar con la versión actual: termina con éxito.
        n8nApi.req('POST', `/rest/executions/${fallida.id}/retry`, { loadWorkflow: true }).then(n8nApi.ok).then((reintento) => {
          cy.evidencia(`${ancho}×${alto}: ejecución ${fallida.id} con error en «Falla» · workflow de error ejecutado · corrección guardada · reintento ${reintento.id} ${reintento.status}`);
          expect(reintento).to.include({ retryOf: fallida.id, mode: 'retry', status: 'success' });
        });
      });
    });
  });
});
