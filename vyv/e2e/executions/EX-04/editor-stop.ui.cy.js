/// <reference types="cypress" />
/**
 * EX-04 · Detener ejecuciones desde el editor (caja negra, UI + API).
 * Trazabilidad: CP-EX-04-01 (éxito: detener una ejecución manual larga; el nodo siguiente no se
 * ejecuta) y CP-EX-04-06 (alternativo: dejar de escuchar el webhook de prueba; su URL responde 404).
 */
import { n8nApi } from '../../support/api.js';

const disparador = { id: 'mt', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} };

describe('EX-04 · Detener desde el editor (UI)', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() => workflows.forEach((id) => n8nApi.req('DELETE', `/rest/workflows/${id}`)));

  const crear = (name, nodes, connections) =>
    n8nApi.req('POST', '/rest/workflows', { name, nodes, connections, settings: {}, active: false }).then(n8nApi.ok).then((wf) => {
      workflows.push(wf.id);
      return wf;
    });

  it('CP-EX-04-01 · detener una ejecución manual larga la deja «canceled» y el nodo siguiente no se ejecuta', () => {
    const nodos = [disparador, n8nApi.nodoEspera(20, 'seconds', 'Wait', [220, 0]), n8nApi.nodoCampos({ fin: true }, 'Edit Fields', [440, 0])];
    crear('VyV detener manual', nodos, n8nApi.cadena('Manual Trigger', 'Wait', 'Edit Fields')).then((wf) => {
      cy.visitarN8n(`/workflow/${wf.id}`);
      cy.get('[data-test-id="execute-workflow-button"]', { timeout: 30000 }).click();
      cy.get('[data-test-id="stop-execution-button"]', { timeout: 30000 }).should('be.visible');
      cy.wait(3000);
      cy.get('[data-test-id="stop-execution-button"]').click();
      cy.get('[data-test-id="stop-execution-button"]', { timeout: 30000 }).should('not.exist');
      cy.screenshot('CP-EX-04-01_detenida');
      n8nApi.esperarEjecuciones(wf.id, 1, (e) => !['new', 'running', 'waiting'].includes(e.status)).then(([e]) =>
        n8nApi.detalleEjecucion(e.id).then((d) => {
          const nodos = Object.keys(d.data.resultData.runData);
          cy.evidencia(`Ejecución ${e.id}: ${e.mode}/${e.status} · nodos ejecutados: ${nodos.join(', ')}`);
          expect(e).to.include({ mode: 'manual', status: 'canceled' });
          expect(nodos, 'Edit Fields no se ejecuta').not.to.include('Edit Fields');
        }),
      );
    });
  });

  it('CP-EX-04-06 · (alternativo) al dejar de escuchar el webhook de prueba, su URL ya no dispara la ejecución', () => {
    const ruta = n8nApi.rutaUnica('vyv-test');
    crear('VyV escucha de prueba', [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoCampos({ ok: true })], n8nApi.cadena('Webhook', 'Edit Fields')).then((wf) => {
      cy.visitarN8n(`/workflow/${wf.id}`);
      cy.get('[data-test-id="execute-workflow-button"]', { timeout: 30000 }).click();
      cy.contains('Waiting for trigger event', { timeout: 30000 }).should('be.visible');
      cy.get('[data-test-id="stop-execution-waiting-for-webhook-button"]').should('be.visible').click();
      cy.get('[data-test-id="stop-execution-waiting-for-webhook-button"]', { timeout: 30000 }).should('not.exist');
      cy.contains('Waiting for trigger event').should('not.exist');
      cy.screenshot('CP-EX-04-06_escucha-detenida');
      cy.request({ url: `/webhook-test/${ruta}`, failOnStatusCode: false }).then((r) => {
        cy.evidencia(`GET /webhook-test/${ruta} tras detener la escucha → HTTP ${r.status}`);
        expect(r.status).to.eq(404);
      });
      cy.wait(1000);
      n8nApi.ejecuciones(wf.id).should('have.length', 0);
    });
  });
});
