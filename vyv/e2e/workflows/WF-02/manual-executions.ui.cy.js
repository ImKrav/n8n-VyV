/// <reference types="cypress" />
/**
 * WF-02 · Ajustes del workflow · no guardar ejecuciones manuales (caja negra, UI).
 * Trazabilidad: CP-WF-02-02. Éxito: con el ajuste en «no guardar», la ejecución desde el editor
 * no queda en la lista · alternativo: con el valor por defecto sí queda (control).
 */
import { n8nApi } from '../../support/api.js';

const disparador = { id: 'mt', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} };

describe('WF-02 · Ejecuciones manuales sin guardar (UI)', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() => workflows.forEach((id) => n8nApi.req('DELETE', `/rest/workflows/${id}`)));

  /** Crea el workflow, lo ejecuta desde el editor y devuelve sus ejecuciones registradas. */
  const ejecutarDesdeEditor = (nombre, settings) =>
    n8nApi
      .req('POST', '/rest/workflows', { name: nombre, nodes: [disparador, n8nApi.nodoCampos({ ok: true })], connections: n8nApi.cadena('Manual Trigger', 'Edit Fields'), settings, active: false })
      .then(n8nApi.ok)
      .then((wf) => {
        workflows.push(wf.id);
        cy.visitarN8n(`/workflow/${wf.id}`);
        cy.get('[data-test-id="execute-workflow-button"]', { timeout: 30000 }).click();
        // El editor muestra el resultado: el último nodo termina con éxito.
        cy.get('[data-test-id="canvas-node"][data-node-name="Edit Fields"] [data-test-id="canvas-node-status-success"]', { timeout: 30000 }).should('exist');
        cy.wait(1500);
        return n8nApi.ejecuciones(wf.id);
      });

  it('CP-WF-02-02 · con «no guardar ejecuciones manuales» la ejecución desde el editor no queda registrada', () => {
    ejecutarDesdeEditor('VyV manual sin guardar', { saveManualExecutions: false }).then((lista) => {
      cy.screenshot('CP-WF-02-02_editor');
      cy.evidencia(`Ejecuciones registradas con saveManualExecutions=false: ${lista.length}`);
      expect(lista, 'no se registra la ejecución manual').to.have.length(0);
    });
  });

  it('CP-WF-02-02 · (alternativo) con el ajuste por defecto la ejecución manual sí queda registrada', () => {
    ejecutarDesdeEditor('VyV manual guardada', {}).then((lista) => {
      cy.evidencia(`Ejecuciones registradas con el ajuste por defecto: ${lista.map((e) => `${e.mode}/${e.status}`).join(', ')}`);
      expect(lista).to.have.length(1);
      expect(lista[0]).to.include({ mode: 'manual', status: 'success' });
    });
  });
});
