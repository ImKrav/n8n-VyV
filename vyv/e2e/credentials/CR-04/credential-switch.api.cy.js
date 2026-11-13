/// <reference types="cypress" />
/**
 * CR-04 · Usar credenciales en nodos · después de cambiar la credencial, la petición usa la nueva (caja negra).
 * Trazabilidad: CP-CR-04-08. Un workflow de eco (Webhook que responde con lo que recibe) muestra las
 * cabeceras que envía el nodo HTTP Request de un segundo workflow.
 */
import { n8nApi } from '../../support/api.js';

describe('CR-04 · Cambiar la credencial de un nodo (API)', () => {
  const creadas = { credenciales: [], workflows: [] };
  beforeEach(() => cy.loginApi());
  after(() => {
    creadas.workflows.forEach((id) => n8nApi.desactivarWorkflow(id).then(() => n8nApi.req('DELETE', `/rest/workflows/${id}`)));
    creadas.credenciales.forEach((id) => n8nApi.borrarCredencial(id));
  });

  it('CP-CR-04-08 · la ejecución envía la cabecera de la credencial nueva y no la de la anterior', () => {
    const rutaEco = n8nApi.rutaUnica('vyv-eco');
    const rutaPrueba = n8nApi.rutaUnica('vyv-cr04');
    let anterior;
    let nueva;
    let wf;

    cy.nombreUnico('VyV-Anterior').then((n) => n8nApi.crearCredencialHeader(n, 'X-API-Key', 'k-anterior')).then((c) => {
      anterior = c;
      creadas.credenciales.push(c.id);
    });
    cy.nombreUnico('VyV-Nodo').then((n) => n8nApi.crearCredencialHeader(n, 'X-Token', 'abc')).then((c) => {
      nueva = c;
      creadas.credenciales.push(c.id);
    });

    // Eco: devuelve las cabeceras que recibe.
    n8nApi.crearWorkflowActivo('VyV eco de cabeceras', [n8nApi.nodoWebhook('GET', rutaEco)], {}).then((w) => creadas.workflows.push(w.id));

    const nodoHttp = (cred) => ({
      id: 'http', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [220, 0],
      parameters: {
        url: `${Cypress.config('baseUrl')}/webhook/${rutaEco}`,
        authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', options: {},
      },
      credentials: { httpHeaderAuth: { id: cred.id, name: cred.name } },
    });
    const conexion = { Webhook: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] } };

    // Precondición: el nodo usa la credencial anterior.
    cy.then(() =>
      n8nApi.crearWorkflowActivo('VyV cambio de credencial', [n8nApi.nodoWebhook('GET', rutaPrueba), nodoHttp(anterior)], conexion),
    ).then((w) => {
      wf = w;
      creadas.workflows.push(w.id);
    });
    n8nApi.llamarWebhook('GET', rutaEco).its('status').should('eq', 200);
    cy.then(() => n8nApi.llamarWebhook('GET', rutaPrueba)).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.headers, 'antes del cambio').to.include({ 'x-api-key': 'k-anterior' });
    });

    // Cambiar la credencial del nodo y volver a publicar.
    cy.then(() =>
      n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, {
        versionId: wf.versionId, nodes: [n8nApi.nodoWebhook('GET', rutaPrueba), nodoHttp(nueva)], connections: conexion,
      }),
    ).then((r) => {
      expect(r.status, JSON.stringify(r.body).slice(0, 200)).to.eq(200);
      return n8nApi.req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: r.body.data.versionId });
    }).its('status').should('eq', 200);

    // Ejecutar y verificar las cabeceras devueltas por el eco. n8n aplica la versión publicada poco
    // después de responder: se reintenta hasta 10 s mientras siga respondiendo la versión anterior.
    let intentos = 0;
    const llamarHastaNueva = (restantes = 20) =>
      n8nApi.llamarWebhook('GET', rutaPrueba).then((r) => {
        intentos += 1;
        return r.body?.headers?.['x-token'] || restantes <= 1 ? r : cy.wait(500).then(() => llamarHastaNueva(restantes - 1));
      });
    cy.then(() => llamarHastaNueva()).then((r) => {
      expect(r.status).to.eq(200);
      const cabeceras = r.body.headers;
      cy.evidencia(`Cabeceras recibidas por el eco (intento ${intentos}): x-token=${cabeceras['x-token']} · x-api-key=${cabeceras['x-api-key'] ?? '(ausente)'}`);
      expect(cabeceras, 'usa la credencial nueva').to.include({ 'x-token': 'abc' });
      expect(cabeceras, 'no envía la credencial anterior').not.to.have.property('x-api-key');
    });
  });
});
