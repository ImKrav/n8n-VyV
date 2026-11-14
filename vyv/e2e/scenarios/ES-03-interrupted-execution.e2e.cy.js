/// <reference types="cypress" />
/**
 * ES-03 · Ejecución larga interrumpida (escenario extremo a extremo del plan).
 * Una ejecución de producción queda en un nodo Wait, se detiene y se verifica su estado final y el
 * detalle por nodo que muestra el panel de logs. Cubre EX-04, EX-01 y EX-05.
 * Se ejecuta en las dos resoluciones del plan.
 */
import { n8nApi } from '../support/api.js';

const RESOLUCIONES = [[1366, 768], [1920, 1080]];

describe('ES-03 · Ejecución larga interrumpida', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() =>
    workflows.forEach((id) => {
      n8nApi.req('POST', '/rest/executions/stopMany', { filter: { workflowId: id, status: ['waiting', 'running'] } });
      n8nApi.desactivarWorkflow(id);
    }),
  );

  RESOLUCIONES.forEach(([ancho, alto]) => {
    it(`ES-03 · Wait de 5 minutos, detener, estado final y detalle por nodo (${ancho} × ${alto})`, () => {
      cy.viewport(ancho, alto);
      const ruta = n8nApi.rutaUnica('vyv-es03');
      const nodos = [n8nApi.nodoWebhook('GET', ruta, 'onReceived'), n8nApi.nodoEspera(5, 'minutes', 'Wait'), n8nApi.nodoCampos({ fin: true }, 'Edit Fields', [440, 0])];
      n8nApi.crearWorkflowActivo(`VyV ES-03 ${ancho}`, nodos, n8nApi.cadena('Webhook', 'Wait', 'Edit Fields')).then((wf) => {
        workflows.push(wf.id);

        // 1 · La ejecución queda en espera en el nodo Wait.
        n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
        n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'waiting').then(([e]) => {
          expect(e.status).to.eq('waiting');

          // 2 · Detenerla: pasa a «canceled» y no se reanuda.
          n8nApi.req('POST', `/rest/executions/${e.id}/stop`, {}).then(n8nApi.ok).its('status').should('eq', 'canceled');
          cy.wait(1500);
          n8nApi.req('GET', `/rest/executions/${e.id}`).then(n8nApi.ok).its('status').should('eq', 'canceled');

          // 3 · Detalle por nodo: el Webhook terminó, el Wait quedó detenido y Edit Fields no se ejecutó.
          n8nApi.detalleEjecucion(e.id).then((d) => {
            const runData = d.data.resultData.runData;
            cy.evidencia(`${ancho}×${alto}: ejecución ${e.id} waiting → canceled · nodos con datos: ${Object.keys(runData).join(', ')}`);
            expect(runData).to.have.property('Webhook');
            expect(runData, 'el nodo siguiente no se ejecuta').not.to.have.property('Edit Fields');
          });

          // 4 · La lista de ejecuciones muestra el estado final.
          cy.visitarN8n(`/workflow/${wf.id}/executions/${e.id}`);
          cy.get('div.execution-card', { timeout: 30000 }).should('have.length', 1).and('contain.text', 'Cancel');
          cy.screenshot(`ES-03_${ancho}x${alto}_cancelada`);
        });
      });
    });
  });
});
