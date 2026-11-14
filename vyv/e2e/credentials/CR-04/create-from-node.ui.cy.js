/// <reference types="cypress" />
/**
 * CR-04 · Usar credenciales en nodos · crear una credencial desde el selector del nodo (UI).
 * Trazabilidad: CP-CR-04-03 (éxito: al guardar la credencial nueva, el nodo la tiene seleccionada)
 * y CP-CR-04-04 (alternativo: con una sola credencial compatible, el nodo la toma sin intervención).
 */
import { n8nApi } from '../../support/api.js';

const selector = '[data-test-id="node-credentials-select"] input';
const disparador = { id: 'mt', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} };

describe('CR-04 · Crear credencial desde el nodo (UI)', () => {
  const nombre = `VyV-Nodo ${Date.now() % 100000}`;
  let wf;
  beforeEach(() => cy.loginApi());
  after(() => {
    if (wf) n8nApi.req('DELETE', `/rest/workflows/${wf.id}`);
    n8nApi.req('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify({ name: nombre }))}`)
      .then(n8nApi.ok)
      .then((lista) => lista.forEach((c) => n8nApi.borrarCredencial(c.id)));
  });

  it('CP-CR-04-03 · la credencial creada desde el selector del nodo queda seleccionada en el nodo', () => {
    const http = n8nApi.nodoHttpCredencial('https://example.com', undefined);
    n8nApi.req('POST', '/rest/workflows', { name: 'VyV credencial desde el nodo', nodes: [disparador, http], connections: n8nApi.cadena('Manual Trigger', 'HTTP Request'), settings: {}, active: false })
      .then(n8nApi.ok)
      .then((w) => {
        wf = w;
        cy.visitarN8n(`/workflow/${wf.id}`);
        cy.get('[data-test-id="canvas-node"][data-node-name="HTTP Request"]', { timeout: 30000 }).dblclick();
        cy.get(selector, { timeout: 15000 }).click();
        cy.contains('Create new credential').filter(':visible').first().click();

        cy.get('[data-test-id="editCredential-modal"]', { timeout: 15000 }).should('be.visible');
        cy.get('[data-test-id="credential-name"]').click();
        cy.get('[data-test-id="credential-name"] input').clear().type(`${nombre}{enter}`);
        cy.get('[data-test-id="parameter-input-name"] input').type('X-Token');
        cy.get('[data-test-id="parameter-input-value"] input').type('abc');
        cy.get('[data-test-id="credential-save-button"]').click();
        // Al guardar, el formulario se cierra solo y vuelve al nodo.
        cy.get('[data-test-id="editCredential-modal"]', { timeout: 15000 }).should('not.exist');

        cy.get(selector).should('have.value', nombre);
        cy.screenshot('CP-CR-04-03_seleccionada');
        n8nApi.req('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify({ name: nombre }))}`).then(n8nApi.ok).then((lista) => {
          cy.evidencia(`Credencial «${nombre}» creada (${lista.map((c) => c.type)}) y seleccionada en el nodo HTTP Request`);
          expect(lista).to.have.length(1);
          expect(lista[0].type).to.eq('httpHeaderAuth');
        });
      });
  });

  it('CP-CR-04-04 · (alternativo) con una sola credencial compatible, el nodo la toma sin intervención', () => {
    const tipo = 'httpQueryAuth';
    const unica = `VyV-Unica ${Date.now() % 100000}`;
    const delTipo = () => n8nApi.req('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify({ type: tipo }))}`).then(n8nApi.ok);
    // Quita las que dejó una corrida anterior de esta prueba; la nueva debe ser la única compatible.
    delTipo().then((previas) => previas.filter((c) => c.name.startsWith('VyV-Unica')).forEach((c) => n8nApi.borrarCredencial(c.id)));
    delTipo().should('have.length', 0);
    n8nApi.req('POST', '/rest/credentials', { name: unica, type: tipo, data: { name: 'token', value: 'q' } }).then(n8nApi.ok).then((cred) => {
      const http = { ...n8nApi.nodoHttpCredencial('https://example.com', undefined), parameters: { url: 'https://example.com', authentication: 'genericCredentialType', genericAuthType: tipo, options: {} } };
      n8nApi.req('POST', '/rest/workflows', { name: 'VyV credencial única', nodes: [disparador, http], connections: n8nApi.cadena('Manual Trigger', 'HTTP Request'), settings: {}, active: false })
        .then(n8nApi.ok)
        .then((w) => {
          cy.visitarN8n(`/workflow/${w.id}`);
          cy.get('[data-test-id="canvas-node"][data-node-name="HTTP Request"]', { timeout: 30000 }).dblclick();
          cy.get(selector, { timeout: 15000 }).should('have.value', unica);
          cy.screenshot('CP-CR-04-04_asignada');
          cy.get('body').type('{esc}');
          // El editor guarda la asignación con el autoguardado: se espera hasta 10 s.
          const leerAsignada = (restantes = 20) =>
            n8nApi.obtenerWorkflow(w.id).then((leido) => {
              const a = leido.nodes.find((n) => n.name === 'HTTP Request').credentials?.[tipo];
              return a || restantes <= 1 ? a : cy.wait(500).then(() => leerAsignada(restantes - 1));
            });
          leerAsignada().then((asignada) => {
            cy.evidencia(`El nodo toma la única credencial ${tipo}: ${asignada?.name} (${asignada?.id})`);
            expect(asignada).to.deep.eq({ id: cred.id, name: unica });
          });
          n8nApi.req('DELETE', `/rest/workflows/${w.id}`);
        });
      cy.then(() => n8nApi.borrarCredencial(cred.id));
    });
  });
});
