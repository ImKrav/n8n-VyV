/// <reference types="cypress" />
/**
 * EX-04 · Ejecuciones activas y límite de concurrencia · la cola se vacía en orden de llegada (caja negra).
 * Trazabilidad: CP-EX-04-08. Necesita n8n con N8N_CONCURRENCY_PRODUCTION_LIMIT=2 (ver vyv/README.md);
 * sin límite de concurrencia el caso se omite. Cada ejecución espera 4 s en un nodo Wait.
 */
import { n8nApi } from '../../support/api.js';

const ESPERA_S = 4;

describe('EX-04 · Cola de ejecuciones con límite de concurrencia (API)', () => {
  let wf;
  let limite;
  before(() => {
    cy.loginApi();
    n8nApi.req('GET', '/rest/settings').then((r) => { limite = r.body.data.concurrency; });
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    if (!wf) return;
    n8nApi.req('POST', '/rest/executions/delete', { deleteBefore: new Date().toISOString(), filters: { workflowId: wf.id } });
    n8nApi.desactivarWorkflow(wf.id);
    n8nApi.req('POST', `/rest/workflows/${wf.id}/archive`);
  });

  /** Lee las ejecuciones del workflow en orden de llegada (id ascendente). */
  const enOrden = () => n8nApi.ejecuciones(wf.id).then((lista) => [...lista].sort((a, b) => Number(a.id) - Number(b.id)));

  it('CP-EX-04-08 · las ejecuciones en cola pasan a ejecución y terminan con éxito en orden de llegada', function () {
    if (!(limite > 0)) this.skip();
    const total = limite + 3;
    const ruta = n8nApi.rutaUnica('vyv-cola');
    const nodes = [
      n8nApi.nodoWebhook('POST', ruta, 'onReceived'),
      {
        id: 'wait', name: 'Wait', type: 'n8n-nodes-base.wait', typeVersion: 1.1, position: [220, 0],
        webhookId: crypto.randomUUID(), parameters: { amount: ESPERA_S, unit: 'seconds' },
      },
    ];
    const connections = { Webhook: { main: [[{ node: 'Wait', type: 'main', index: 0 }]] } };

    n8nApi.crearWorkflowActivo('VyV cola de concurrencia', nodes, connections).then((w) => {
      wf = w;
      n8nApi.llamarWebhook('POST', ruta, { orden: 1 }).its('status').should('eq', 200);
    });
    // Con la cola llena, n8n responde al webhook solo cuando la ejecución empieza: las demás
    // llamadas se disparan a la vez desde el navegador (una página de n8n, mismo origen), sin esperar.
    cy.visitarN8n('/home/workflows');
    cy.window().then((win) => {
      for (let i = 2; i <= total; i++) {
        win.fetch(`/webhook/${ruta}`, { method: 'POST', body: `orden=${i}` }).catch(() => {});
      }
    });

    // Precondición · con el límite lleno, hay como máximo `limite` en ejecución y el resto en cola.
    const esperarCola = (intentos = 20) =>
      enOrden().then((lista) =>
        lista.length < total && intentos > 1 ? cy.wait(250).then(() => esperarCola(intentos - 1)) : lista,
      );
    let estadosIniciales;
    cy.then(() => esperarCola()).then((lista) => {
      estadosIniciales = lista.map((e) => e.status);
      cy.evidencia(`Límite ${limite} · estados al inicio: ${estadosIniciales.join(', ')}`);
    });
    cy.then(() => {
      expect(estadosIniciales.filter((s) => s === 'running').length, 'en ejecución').to.be.at.most(limite);
      expect(estadosIniciales.filter((s) => s === 'new').length, 'en cola').to.be.at.least(1);
    });

    // Esperar · todas terminan con éxito.
    const esperarFin = (intentos = 40) =>
      enOrden().then((lista) =>
        lista.length === total && lista.every((e) => e.status === 'success')
          ? lista
          : intentos > 1
            ? cy.wait(1000).then(() => esperarFin(intentos - 1))
            : lista,
      );

    // Verificar · las 5 terminan con éxito y empiezan en orden de llegada.
    let final;
    cy.then(() => esperarFin()).then((lista) => {
      final = lista;
      cy.evidencia(`Fin: ${lista.map((e) => `#${e.id} ${e.status} ${e.startedAt}`).join(' | ')}`);
    });
    cy.then(() => {
      const lista = final;
      const inicios = lista.map((e) => new Date(e.startedAt).getTime());
      expect(lista, 'ejecuciones').to.have.length(total);
      expect(lista.every((e) => e.status === 'success'), 'todas con éxito').to.eq(true);
      expect(inicios, 'inicio en orden de llegada').to.deep.eq([...inicios].sort((a, b) => a - b));
    });
  });
});
