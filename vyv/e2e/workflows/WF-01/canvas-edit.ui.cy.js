/// <reference types="cypress" />
/**
 * WF-01 · Crear y editar workflows · lienzo, nodos desactivados y notas (caja negra, UI y API).
 * Trazabilidad: CP-WF-01-01, 01-02, 01-04, 01-05 y 01-07.
 * Éxito: 01-01, 01-07 · alternativo: 01-02/01-05 (eliminar y deshacer), 01-04 (nodo desactivado)
 * · error: abrir un workflow que no existe.
 */
import { n8nApi } from '../../support/api.js';

const nodo = (nombre) => `[data-test-id="canvas-node"][data-node-name="${nombre}"]`;
const arista = (origen, destino) =>
  `[data-test-id="edge"][data-source-node-name="${origen}"][data-target-node-name="${destino}"]`;

describe('WF-01 · Lienzo del editor (UI)', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() => workflows.forEach((id) => n8nApi.desactivarWorkflow(id).then(() => n8nApi.req('DELETE', `/rest/workflows/${id}`))));

  const crear = (name, nodes, connections) =>
    n8nApi.req('POST', '/rest/workflows', { name, nodes, connections, settings: {}, active: false }).then(n8nApi.ok).then((wf) => {
      workflows.push(wf.id);
      return wf;
    });
  const disparador = { id: 'mt', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} };

  it('CP-WF-01-01 · los nodos Manual Trigger y Edit Fields conectados se conservan al recargar', () => {
    crear('VyV dos nodos', [disparador, n8nApi.nodoCampos({ saludo: 'hola' })], n8nApi.cadena('Manual Trigger', 'Edit Fields')).then((wf) => {
      cy.visitarN8n(`/workflow/${wf.id}`);
      cy.get('[data-test-id="canvas-node"]', { timeout: 30000 }).should('have.length', 2);
      cy.get(arista('Manual Trigger', 'Edit Fields')).should('exist');
      cy.reload();
      cy.get(nodo('Edit Fields'), { timeout: 30000 }).should('be.visible');
      cy.get(arista('Manual Trigger', 'Edit Fields')).should('exist');
      cy.screenshot('CP-WF-01-01_lienzo');
      cy.evidencia('Después de recargar: 2 nodos y la conexión Manual Trigger → Edit Fields');
    });
  });

  it('CP-WF-01-02 / CP-WF-01-05 · (alternativo) eliminar un nodo quita sus conexiones y Ctrl+Z lo restaura', () => {
    const nodos = [disparador, n8nApi.nodoCampos({ a: 1 }, 'Paso A'), n8nApi.nodoCampos({ b: 2 }, 'Paso B', [440, 0])];
    crear('VyV eliminar y deshacer', nodos, n8nApi.cadena('Manual Trigger', 'Paso A', 'Paso B')).then((wf) => {
      cy.visitarN8n(`/workflow/${wf.id}`);
      cy.get('[data-test-id="canvas-node"]', { timeout: 30000 }).should('have.length', 3);
      cy.get(nodo('Paso B')).click();
      cy.get('body').type('{del}');
      cy.get(nodo('Paso B')).should('not.exist');
      cy.get(arista('Paso A', 'Paso B')).should('not.exist');
      cy.get(arista('Manual Trigger', 'Paso A')).should('exist');
      cy.evidencia('Eliminar "Paso B": el nodo y su conexión desaparecen; el resto se conserva');

      cy.get('body').type('{ctrl}z');
      cy.get(nodo('Paso B')).should('exist');
      cy.get(arista('Paso A', 'Paso B')).should('exist');
      cy.get('body').type('{ctrl}{shift}z');
      cy.get(nodo('Paso B')).should('not.exist');
      cy.screenshot('CP-WF-01-05_rehacer');
      cy.evidencia('Ctrl+Z restaura el nodo con su conexión; Ctrl+Shift+Z lo vuelve a eliminar');
    });
  });

  it('CP-WF-01-04 · (alternativo) un nodo desactivado se muestra atenuado y no transforma los datos', () => {
    const ruta = n8nApi.rutaUnica('vyv-desactivado');
    const desactivado = { ...n8nApi.nodoCampos({ desactivado: 'si' }, 'Desactivado'), disabled: true };
    const final = n8nApi.nodoCampos({ final: 'ok' }, 'Final', [440, 0]);
    final.parameters.includeOtherFields = true;
    n8nApi
      .crearWorkflowActivo('VyV nodo desactivado', [n8nApi.nodoWebhook('GET', ruta), desactivado, final], n8nApi.cadena('Webhook', 'Desactivado', 'Final'))
      .then((wf) => {
        workflows.push(wf.id);
        n8nApi.llamarWebhook('GET', ruta).then((r) => {
          cy.evidencia(`Campos de la respuesta: ${Object.keys(r.body).join(', ')} · final=${r.body.final}`);
          expect(r.status).to.eq(200);
          expect(r.body, 'el resto del flujo se ejecuta').to.include({ final: 'ok' });
          expect(r.body, 'el nodo desactivado no añade su campo').not.to.have.property('desactivado');
        });
        cy.visitarN8n(`/workflow/${wf.id}`);
        cy.get(nodo('Desactivado'), { timeout: 30000 }).should('contain.text', 'Deactivated');
        cy.screenshot('CP-WF-01-04_desactivado');
      });
  });

  it('CP-WF-01-07 · la nota adhesiva conserva color, contenido y tamaño al guardar', () => {
    const nota = {
      id: 'nota', name: 'Nota VyV', type: 'n8n-nodes-base.stickyNote', typeVersion: 1, position: [0, -200],
      parameters: { content: '## Nota VyV\nTexto de prueba', color: 4, width: 300, height: 180 },
    };
    crear('VyV nota adhesiva', [disparador], {}).then((wf) => {
      n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, { versionId: wf.versionId, nodes: [disparador, nota] }).its('status').should('eq', 200);
      n8nApi.obtenerWorkflow(wf.id).then((leido) => {
        const guardada = leido.nodes.find((n) => n.name === 'Nota VyV');
        cy.evidencia(`Nota leída: ${JSON.stringify(guardada.parameters)}`);
        expect(guardada.parameters).to.include({ color: 4, width: 300, height: 180 });
        expect(guardada.parameters.content).to.contain('Texto de prueba');
      });
      cy.visitarN8n(`/workflow/${wf.id}`);
      cy.contains('Texto de prueba', { timeout: 30000 }).should('be.visible');
      cy.screenshot('CP-WF-01-07_nota');
    });
  });

  it('CP-WF-01 · (error) abrir un workflow que no existe muestra el aviso y no abre un lienzo', () => {
    cy.visitarN8n('/workflow/no-existe-vyv-000');
    cy.location('pathname', { timeout: 30000 }).should('eq', '/entity-not-found/workflow');
    cy.contains('Workflow not found').should('be.visible');
    cy.get('[data-test-id="canvas-node"]').should('not.exist');
    cy.screenshot('CP-WF-01_no-existe');
    cy.evidencia('Un id inexistente lleva a /entity-not-found/workflow con el aviso "Workflow not found"');
  });
});
