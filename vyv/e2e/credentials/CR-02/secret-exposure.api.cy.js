/// <reference types="cypress" />
/**
 * CR-02 · Editar y ver credenciales · el secreto no sale del servidor en claro (caja negra).
 * Trazabilidad: CP-CR-02-03 (respuesta de la API) y CP-CR-02-04 (JSON del workflow descargado).
 * El editor descarga el workflow con el mismo JSON que devuelve GET /rest/workflows/:id.
 */
import { n8nApi } from '../../support/api.js';

const SECRETO = 'vyv-456';

describe('CR-02 · Secretos de una credencial (API)', () => {
  let p;
  let cred;
  let wf;
  before(() => {
    cy.loginApi();
    cy.proyectoPersonal().then((id) => { p = id; });
    cy.nombreUnico('VyV-Header').then((nombre) =>
      n8nApi.crearCredencialHeader(nombre, 'X-API-Key', SECRETO).then((c) => { cred = c; }),
    );
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    if (wf) n8nApi.req('DELETE', `/rest/workflows/${wf.id}`);
    if (cred) n8nApi.borrarCredencial(cred.id);
  });

  it('CP-CR-02-03 · abrir la credencial y el listado no devuelven el secreto en claro', () => {
    [`/rest/credentials/${cred.id}`, `/rest/credentials/${cred.id}?includeData=true`].forEach((url) => {
      n8nApi.req('GET', url).then((r) => {
        expect(r.status, url).to.eq(200);
        const texto = JSON.stringify(r.body);
        cy.evidencia(`GET ${url} → ${texto.slice(0, 180)}`);
        expect(texto, `${url} no contiene el secreto`).not.to.contain(SECRETO);
      });
    });
    n8nApi.req('GET', '/rest/credentials?includeScopes=true').then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.data.map((c) => c.id), 'la credencial está en el listado').to.include(cred.id);
      expect(JSON.stringify(r.body), 'el listado no contiene el secreto').not.to.contain(SECRETO);
    });
  });

  it('CP-CR-02-04 · el JSON del workflow que usa la credencial solo la referencia por ID y nombre', () => {
    const nodes = [
      { id: 'm', name: 'Inicio', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
      {
        id: 'h', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [220, 0],
        parameters: { url: 'https://example.com', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', options: {} },
        credentials: { httpHeaderAuth: { id: cred.id, name: cred.name } },
      },
    ];
    const connections = { Inicio: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] } };
    n8nApi
      .req('POST', '/rest/workflows', { name: 'VyV workflow con credencial', nodes, connections, settings: {}, active: false, projectId: p })
      .then(n8nApi.ok)
      .then((w) => {
        wf = w;
        n8nApi.req('GET', `/rest/workflows/${w.id}`).then((r) => {
          const json = JSON.stringify(r.body.data);
          const referencia = r.body.data.nodes.find((n) => n.name === 'HTTP Request').credentials.httpHeaderAuth;
          cy.evidencia(`credentials del nodo: ${JSON.stringify(referencia)}`);
          expect(json, 'el JSON no contiene el secreto').not.to.contain(SECRETO);
          expect(Object.keys(referencia).sort(), 'solo ID y nombre').to.deep.eq(['id', 'name']);
          expect(referencia).to.deep.eq({ id: cred.id, name: cred.name });
        });
      });
  });
});
