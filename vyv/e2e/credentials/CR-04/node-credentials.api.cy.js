/// <reference types="cypress" />
/**
 * CR-04 · Usar credenciales en nodos (caja negra, API + workflow de eco).
 * Trazabilidad: CP-CR-04-01, 04-02, 04-05, 04-06 y 04-07.
 * Éxito: 04-01 (credencial asignada), 04-07 (sustituir y guardar) · alternativo: 04-02 (solo el tipo
 * requerido) · error: 04-05 (credencial inexistente), 04-06 (nodo sin credencial).
 */
import { n8nApi } from '../../support/api.js';

describe('CR-04 · Credenciales en nodos (API)', () => {
  const credenciales = [];
  const workflows = [];
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

  const crearCred = (valor) =>
    cy.nombreUnico('VyV-CR04').then((n) => n8nApi.crearCredencialHeader(n, 'X-Token', valor)).then((c) => {
      credenciales.push(c.id);
      return c;
    });
  /** Crea Webhook → HTTP Request con `cred` y lo publica. */
  const publicar = (cred) => {
    const ruta = n8nApi.rutaUnica('vyv-cr04');
    return n8nApi
      .req('POST', '/rest/workflows', {
        name: 'VyV nodo con credencial', nodes: [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoHttpCredencial(urlEco, cred)],
        connections: n8nApi.cadena('Webhook', 'HTTP Request'), settings: {}, active: false,
      })
      .then(n8nApi.ok)
      .then((wf) => {
        workflows.push(wf.id);
        return n8nApi.req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }).then((r) => ({ wf, ruta, activar: r }));
      });
  };
  /** Llama al webhook y devuelve el mensaje de error de la ejecución resultante. */
  const errorDeEjecucion = (wf, ruta) => {
    n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 500);
    return n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'error')
      .then(([e]) => n8nApi.detalleEjecucion(e.id))
      .then((d) => ({ nodo: d.data.resultData.lastNodeExecuted, mensaje: d.data.resultData.error?.message }));
  };

  it('CP-CR-04-01 · el nodo HTTP Request usa la credencial asignada al ejecutar', () => {
    crearCred('asignada').then((cred) =>
      publicar(cred).then(({ ruta, activar }) => {
        expect(activar.status).to.eq(200);
        n8nApi.llamarWebhook('GET', ruta).then((r) => {
          cy.evidencia(`Cabecera recibida por el eco: x-token=${r.body.headers['x-token']}`);
          expect(r.body.headers['x-token']).to.eq('asignada');
        });
      }),
    );
  });

  it('CP-CR-04-07 · sustituir la credencial del nodo se conserva al guardar y volver a leer', () => {
    crearCred('primera').then((a) =>
      crearCred('segunda').then((b) =>
        publicar(a).then(({ wf }) => {
          const nodos = wf.nodes.map((n) => (n.name === 'HTTP Request' ? n8nApi.nodoHttpCredencial(urlEco, b) : n));
          n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, { versionId: wf.versionId, nodes: nodos, connections: wf.connections }).its('status').should('eq', 200);
          n8nApi.obtenerWorkflow(wf.id).then((leido) => {
            const asignada = leido.nodes.find((n) => n.name === 'HTTP Request').credentials.httpHeaderAuth;
            cy.evidencia(`Credencial del nodo tras guardar: ${asignada.id} «${asignada.name}»`);
            expect(asignada).to.deep.eq({ id: b.id, name: b.name });
          });
        }),
      ),
    );
  });

  it('CP-CR-04-02 · (alternativo) al filtrar por el tipo requerido solo aparecen credenciales de ese tipo', () => {
    crearCred('tipo').then((header) =>
      n8nApi.req('POST', '/rest/credentials', { name: `VyV-otro-tipo-${Date.now()}`, type: 'httpBasicAuth', data: { user: 'u', password: 'p' } }).then(n8nApi.ok).then((basica) => {
        credenciales.push(basica.id);
        n8nApi.req('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify({ type: 'httpHeaderAuth' }))}`).then(n8nApi.ok).then((lista) => {
          cy.evidencia(`Filtro type=httpHeaderAuth: ${lista.length} credenciales, tipos ${[...new Set(lista.map((c) => c.type))]}`);
          expect(lista.every((c) => c.type === 'httpHeaderAuth')).to.eq(true);
          expect(lista.map((c) => c.id)).to.include(header.id).and.not.to.include(basica.id);
        });
      }),
    );
  });

  it('CP-CR-04-05 · (error) un workflow importado con una credencial que no existe no se publica e informa el nodo', () => {
    publicar({ id: 'no-existe-vyv', name: 'Credencial de otra instancia' }).then(({ wf, activar }) => {
      cy.evidencia(`Publicar con credencial inexistente → HTTP ${activar.status}: ${activar.body.message}`);
      expect(activar.status).to.eq(400);
      expect(activar.body.message).to.match(/credential/i);
      n8nApi.obtenerWorkflow(wf.id).its('active').should('eq', false);
    });
  });

  it('CP-CR-04-06 · (error) un nodo que requiere credencial y no tiene ninguna falla y lo informa', () => {
    publicar(undefined).then(({ wf, ruta, activar }) => {
      expect(activar.status).to.eq(200);
      errorDeEjecucion(wf, ruta).then(({ nodo, mensaje }) => {
        cy.evidencia(`Nodo ${nodo}: ${mensaje}`);
        expect(nodo).to.eq('HTTP Request');
        expect(mensaje).to.match(/credential/i);
      });
    });
  });
});
