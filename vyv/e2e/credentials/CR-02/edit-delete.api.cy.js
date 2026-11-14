/// <reference types="cypress" />
/**
 * CR-02 · Editar y eliminar credenciales (caja negra, API + workflow de eco).
 * Trazabilidad: CP-CR-02-01, 02-05, 02-07 y 02-08.
 * Éxito: 02-01 (valor nuevo en uso), 02-05 (renombrar en uso) · alternativo: 02-07 (eliminar sin uso)
 * · error: 02-08 (eliminar en uso), eliminar una credencial inexistente.
 */
import { n8nApi } from '../../support/api.js';

describe('CR-02 · Editar y eliminar credenciales (API)', () => {
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
    cy.nombreUnico('VyV-CR02').then((n) => n8nApi.crearCredencialHeader(n, 'X-Token', valor)).then((c) => {
      credenciales.push(c.id);
      return c;
    });
  /** Publica Webhook → HTTP Request (con la credencial) hacia el eco. Devuelve la ruta del webhook. */
  const usar = (cred) => {
    const ruta = n8nApi.rutaUnica('vyv-cr02');
    return n8nApi
      .crearWorkflowActivo('VyV usa credencial', [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoHttpCredencial(urlEco, cred)], n8nApi.cadena('Webhook', 'HTTP Request'))
      .then((wf) => {
        workflows.push(wf.id);
        return { wf, ruta };
      });
  };
  const actualizar = (cred, cambios) =>
    n8nApi.req('PATCH', `/rest/credentials/${cred.id}`, { name: cred.name, type: 'httpHeaderAuth', data: { name: 'X-Token', value: 'v1' }, ...cambios });

  it('CP-CR-02-01 · al cambiar el valor de una credencial en uso, el workflow envía el valor nuevo', () => {
    crearCred('v1').then((cred) =>
      usar(cred).then(({ ruta }) => {
        n8nApi.llamarWebhook('GET', ruta).its('body.headers.x-token').should('eq', 'v1');
        actualizar(cred, { data: { name: 'X-Token', value: 'v2' } }).its('status').should('eq', 200);
        n8nApi.llamarWebhook('GET', ruta).then((r) => {
          cy.evidencia(`Antes: x-token=v1 · después de editar: x-token=${r.body.headers['x-token']}`);
          expect(r.status).to.eq(200);
          expect(r.body.headers['x-token']).to.eq('v2');
        });
      }),
    );
  });

  it('CP-CR-02-05 · renombrar una credencial en uso cambia el nombre y el workflow la sigue usando', () => {
    crearCred('renombrada').then((cred) =>
      usar(cred).then(({ ruta }) => {
        const nuevo = `${cred.name}-renombrada`;
        actualizar(cred, { name: nuevo, data: { name: 'X-Token', value: 'renombrada' } }).its('status').should('eq', 200);
        n8nApi.req('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify({ name: nuevo }))}`).then(n8nApi.ok).then((lista) => {
          expect(lista.map((c) => c.id), 'el listado muestra el nombre nuevo').to.deep.eq([cred.id]);
        });
        n8nApi.llamarWebhook('GET', ruta).then((r) => {
          cy.evidencia(`Credencial ${cred.id} renombrada a «${nuevo}» · el workflow responde ${r.status} con x-token=${r.body.headers?.['x-token']}`);
          expect(r.body.headers['x-token'], 'el nodo la encuentra por su ID').to.eq('renombrada');
        });
      }),
    );
  });

  it('CP-CR-02-07 · (alternativo) eliminar una credencial sin uso la quita del listado y de la base de datos', () => {
    crearCred('sin-uso').then((cred) => {
      n8nApi.borrarCredencial(cred.id).its('status').should('eq', 200);
      n8nApi.req('GET', `/rest/credentials/${cred.id}`).its('status').should('eq', 404);
      n8nApi.req('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify({ name: cred.name }))}`).then(n8nApi.ok).then((lista) => {
        cy.evidencia(`Después de eliminar ${cred.id}: GET → 404 · ${lista.length} en el listado`);
        expect(lista).to.have.length(0);
      });
    });
  });

  it('CP-CR-02-08 · (error) eliminar una credencial en uso hace que la ejecución informe el problema', () => {
    crearCred('en-uso').then((cred) =>
      usar(cred).then(({ wf, ruta }) => {
        n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
        n8nApi.borrarCredencial(cred.id).its('status').should('eq', 200);
        n8nApi.llamarWebhook('GET', ruta).then((r) => {
          expect(r.status, 'el webhook informa el fallo').to.eq(500);
        });
        n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'error').then(([e]) =>
          n8nApi.detalleEjecucion(e.id).then((d) => {
            // n8n oculta el detalle del error porque la credencial ya no es accesible.
            const nodo = d.data.resultData.runData['HTTP Request'][0];
            cy.evidencia(`Ejecución ${e.id}: ${e.status} · nodo HTTP Request ${nodo.executionStatus} · ${nodo.redactedError?.type} · redacción: ${d.data.redactionInfo?.reason}`);
            expect(d.data.resultData.lastNodeExecuted).to.eq('HTTP Request');
            expect(nodo.executionStatus).to.eq('error');
            expect(nodo.redactedError).to.deep.eq({ type: 'CredentialNotFoundError' });
            expect(d.data.redactionInfo).to.include({ reason: 'credential_inaccessible', canReveal: false });
          }),
        );
      }),
    );
  });

  it('CP-CR-02 · (error) eliminar una credencial inexistente responde 404', () => {
    n8nApi.borrarCredencial('no-existe-vyv').then((r) => {
      cy.evidencia(`DELETE de una credencial inexistente → HTTP ${r.status}: ${r.body.message}`);
      expect(r.status).to.eq(404);
    });
  });
});
