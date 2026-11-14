/// <reference types="cypress" />
/**
 * ES-01 · Ciclo de vida de una automatización (escenario extremo a extremo del plan).
 * Crear un workflow, crear su credencial desde el nodo, configurar ajustes, publicarlo y revisar
 * sus ejecuciones y logs. Cubre WF-01, CR-01, CR-04, WF-02, WF-03, EX-01 y EX-05.
 * Se ejecuta en las dos resoluciones del plan (1366 × 768 y 1920 × 1080).
 */
import { n8nApi } from '../support/api.js';

const RESOLUCIONES = [[1366, 768], [1920, 1080]];
const selector = '[data-test-id="node-credentials-select"] input';

describe('ES-01 · Ciclo de vida de una automatización', () => {
  const workflows = [];
  const credenciales = [];
  let urlEco;
  before(() => {
    cy.loginApi();
    n8nApi.crearEco().then(({ wf, ruta }) => {
      workflows.push(wf.id);
      urlEco = `${Cypress.config('baseUrl')}/webhook/${ruta}`;
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
    });
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    workflows.forEach((id) => n8nApi.desactivarWorkflow(id));
    credenciales.forEach((id) => n8nApi.borrarCredencial(id));
  });

  RESOLUCIONES.forEach(([ancho, alto]) => {
    it(`ES-01 · crear, credencial desde el nodo, ajustes, publicar, ejecuciones y logs (${ancho} × ${alto})`, () => {
      cy.viewport(ancho, alto);
      const ruta = n8nApi.rutaUnica('vyv-es01');
      const nombreCred = `VyV-ES01 ${ancho} ${Date.now() % 100000}`;
      let wf;

      // 1 · Crear el workflow: Webhook → HTTP Request hacia el eco, todavía sin credencial.
      n8nApi.req('POST', '/rest/workflows', {
        name: `VyV ES-01 ${ancho}`, nodes: [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoHttpCredencial(urlEco, undefined)],
        connections: n8nApi.cadena('Webhook', 'HTTP Request'), settings: {}, active: false,
      }).then(n8nApi.ok).then((w) => { wf = w; workflows.push(w.id); });

      // 2 · Crear la credencial desde el selector del nodo (UI).
      cy.then(() => cy.visitarN8n(`/workflow/${wf.id}`));
      cy.get('[data-test-id="canvas-node"][data-node-name="HTTP Request"]', { timeout: 30000 }).dblclick();
      cy.get(selector, { timeout: 15000 }).click();
      cy.contains('Create new credential').filter(':visible').first().click();
      cy.get('[data-test-id="editCredential-modal"]', { timeout: 15000 }).should('be.visible');
      cy.get('[data-test-id="credential-name"]').click();
      cy.get('[data-test-id="credential-name"] input').clear().type(`${nombreCred}{enter}`);
      cy.get('[data-test-id="parameter-input-name"] input').type('X-Token');
      // El campo secreto se vuelve a pintar tras la primera tecla: se escribe con pausa y se verifica.
      cy.get('[data-test-id="parameter-input-value"] input').click().type('es01', { delay: 120 });
      cy.get('[data-test-id="parameter-input-value"] input').should('have.value', 'es01').blur();
      // El formulario actualiza sus datos con un retardo: se espera antes de guardar.
      cy.wait(1000);
      cy.get('[data-test-id="credential-save-button"]').click();
      cy.get('[data-test-id="editCredential-modal"]', { timeout: 15000 }).should('not.exist');
      cy.get(selector).should('have.value', nombreCred);
      cy.screenshot(`ES-01_${ancho}x${alto}_credencial`);
      cy.get('body').type('{esc}');

      // El editor guarda la asignación con el autoguardado. Al abrir el nodo, n8n asigna antes la
      // credencial compatible más reciente: se espera hasta que el nodo tenga la credencial nueva.
      const leer = (restantes = 30) =>
        n8nApi.obtenerWorkflow(wf.id).then((w) =>
          w.nodes.find((n) => n.name === 'HTTP Request').credentials?.httpHeaderAuth?.name === nombreCred || restantes <= 1
            ? w : cy.wait(500).then(() => leer(restantes - 1)));
      cy.then(() => leer()).then((w) => {
        const cred = w.nodes.find((n) => n.name === 'HTTP Request').credentials.httpHeaderAuth;
        expect(cred.name).to.eq(nombreCred);
        credenciales.push(cred.id);
        // 3 · Configurar ajustes y 4 · publicar la versión guardada.
        return n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, { versionId: w.versionId, settings: { timezone: 'America/Bogota', saveDataSuccessExecution: 'all', executionTimeout: 60 } });
      }).then(n8nApi.ok).then((w) => n8nApi.req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: w.versionId })).its('status').should('eq', 200);

      // 5 · Llamar el webhook de producción: la petición sale con la credencial creada en el nodo.
      n8nApi.llamarWebhook('GET', ruta).then((r) => {
        expect(r.status).to.eq(200);
        expect(r.body.headers['x-token']).to.eq('es01');
      });

      // 6 · Ejecuciones en la interfaz y 7 · logs (orden real de los nodos).
      cy.then(() => n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'success')).then(([e]) => {
        cy.visitarN8n(`/workflow/${wf.id}/executions`);
        cy.get('div.execution-card', { timeout: 30000 }).should('have.length', 1);
        cy.screenshot(`ES-01_${ancho}x${alto}_ejecuciones`);
        n8nApi.detalleEjecucion(e.id).then((d) => {
          const orden = Object.keys(d.data.resultData.runData);
          cy.evidencia(`${ancho}×${alto}: credencial «${nombreCred}» creada desde el nodo · ajustes guardados · publicado · ejecución ${e.id} ${e.status} · logs: ${orden.join(' → ')}`);
          expect(orden).to.deep.eq(['Webhook', 'HTTP Request']);
        });
      });
    });
  });
});
