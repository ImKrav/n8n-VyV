/// <reference types="cypress" />
/**
 * EX-05 · Panel de logs · navegación solo con el teclado (caja negra, UI).
 * Trazabilidad: CP-EX-05-05. Atajos del editor 2.47: «l» abre y cierra el panel; dentro del árbol,
 * flecha abajo/arriba (o j/k) cambian el nodo seleccionado y Esc quita la selección.
 */
import { n8nApi } from '../../support/api.js';

const disparador = { id: 'mt', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} };
const cuerpo = '[data-test-id="logs-overview-body"]';
const filas = `${cuerpo} [role="treeitem"]`;
const seleccionada = `${cuerpo} [role="treeitem"][aria-selected="true"]`;

describe('EX-05 · Panel de logs con el teclado (UI)', () => {
  let wf;
  beforeEach(() => cy.loginApi());
  after(() => wf && n8nApi.req('DELETE', `/rest/workflows/${wf.id}`));

  it('CP-EX-05-05 · los atajos abren, recorren y cierran el panel de logs', () => {
    const nodos = [disparador, n8nApi.nodoCampos({ a: 1 }, 'Paso A', [220, 0]), n8nApi.nodoCampos({ b: 2 }, 'Paso B', [440, 0])];
    n8nApi.req('POST', '/rest/workflows', { name: 'VyV logs con teclado', nodes: nodos, connections: n8nApi.cadena('Manual Trigger', 'Paso A', 'Paso B'), settings: {}, active: false })
      .then(n8nApi.ok)
      .then((w) => {
        wf = w;
        cy.visitarN8n(`/workflow/${wf.id}`);
        cy.get('[data-test-id="execute-workflow-button"]', { timeout: 30000 }).click();
        cy.get('[data-test-id="canvas-node"][data-node-name="Paso B"] [data-test-id="canvas-node-status-success"]', { timeout: 30000 }).should('exist');

        // Cerrar y abrir con «l» desde el lienzo.
        const alternar = () => cy.get('[data-test-id="canvas"]').click('topLeft', { force: true }).type('l');
        cy.get('body').then(($b) => { if ($b.find(cuerpo).length) alternar(); });
        cy.get(cuerpo).should('not.exist');
        alternar();
        cy.get(filas, { timeout: 10000 }).should('have.length', 3);

        // Recorrer con las flechas.
        cy.get(filas).first().click();
        cy.get(seleccionada).should('contain.text', 'Manual Trigger');
        cy.focused().type('{downArrow}');
        cy.get(seleccionada).should('contain.text', 'Paso A');
        cy.focused().type('{downArrow}');
        cy.get(seleccionada).should('contain.text', 'Paso B');
        cy.focused().type('{upArrow}');
        cy.get(seleccionada).should('contain.text', 'Paso A');
        cy.screenshot('CP-EX-05-05_seleccion-con-flechas');

        // Esc quita la selección; «l» cierra el panel.
        cy.focused().type('{esc}');
        cy.get(seleccionada).should('not.exist');
        alternar();
        cy.get(cuerpo).should('not.exist');
        cy.evidencia('«l» abre el panel, ↓/↑ recorren Manual Trigger → Paso A → Paso B → Paso A, Esc quita la selección y «l» cierra');
      });
  });
});
