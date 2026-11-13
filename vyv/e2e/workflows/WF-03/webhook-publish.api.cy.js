/// <reference types="cypress" />
/**
 * WF-03 · Publicar workflows y disparadores · URL de producción del Webhook (caja negra).
 * Trazabilidad: CP-WF-03-02, CP-WF-03-04 y CP-WF-03-08.
 * CP-WF-03-08 reinicia n8n con el comando de CYPRESS_restartCommand; sin esa variable se omite.
 */
import { n8nApi } from '../../support/api.js';

/** Nodo Edit Fields (Set) que devuelve los campos dados. */
const nodoCampos = (campos) => ({
  id: 'set', name: 'Edit Fields', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [220, 0],
  parameters: {
    mode: 'manual',
    assignments: {
      assignments: Object.entries(campos).map(([name, value], i) => ({
        id: String(i), name, value, type: typeof value === 'boolean' ? 'boolean' : 'string',
      })),
    },
    options: {},
  },
});
const conexion = { Webhook: { main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]] } };

describe('WF-03 · Webhook de producción (API)', () => {
  let p;
  const workflows = [];
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  beforeEach(() => cy.loginApi());
  after(() => workflows.forEach((id) => n8nApi.desactivarWorkflow(id)));

  const publicar = (nombre, metodo, ruta, campos) =>
    n8nApi.crearWorkflowActivo(nombre, [n8nApi.nodoWebhook(metodo, ruta), nodoCampos(campos)], conexion, p).then((wf) => {
      workflows.push(wf.id);
      return wf;
    });

  it('CP-WF-03-02 · el webhook de producción responde 200 y registra una ejecución exitosa', () => {
    const ruta = n8nApi.rutaUnica('vyv-wf03');
    publicar('VyV webhook producción', 'GET', ruta, { ok: true }).then((wf) => {
      expect(wf.active, 'el workflow queda publicado').to.eq(true);
      n8nApi.llamarWebhook('GET', ruta).then((r) => {
        expect(r.status).to.eq(200);
        expect(r.body).to.deep.include({ ok: true });
        cy.evidencia(`GET /webhook/${ruta} → ${r.status} ${JSON.stringify(r.body)}`);
      });
      n8nApi.ejecuciones(wf.id).then((ejecuciones) => {
        expect(ejecuciones, 'ejecuciones del workflow').to.have.length(1);
        expect(ejecuciones[0]).to.include({ status: 'success', mode: 'webhook' });
      });
    });
  });

  it('CP-WF-03-04 · dos workflows con la misma ruta y métodos distintos reciben cada uno su método', () => {
    const ruta = n8nApi.rutaUnica('vyv-met');
    publicar('VyV webhook GET', 'GET', ruta, { workflow: 'A' }).then((a) => {
      publicar('VyV webhook POST', 'POST', ruta, { workflow: 'B' }).then((b) => {
        expect([a.active, b.active], 'ambos publicados sin conflicto').to.deep.eq([true, true]);
        n8nApi.llamarWebhook('GET', ruta).its('body').should('deep.include', { workflow: 'A' });
        n8nApi.llamarWebhook('POST', ruta).its('body').should('deep.include', { workflow: 'B' });
        n8nApi.ejecuciones(a.id).should('have.length', 1);
        n8nApi.ejecuciones(b.id).should('have.length', 1);
        cy.evidencia(`GET y POST /webhook/${ruta} → A y B (una ejecución cada uno)`);
      });
    });
  });

  it('CP-WF-03-08 · después de reiniciar n8n el workflow sigue publicado y su webhook responde', function () {
    const reiniciar = Cypress.env('restartCommand');
    if (!reiniciar) this.skip();
    const ruta = n8nApi.rutaUnica('vyv-wf03');
    publicar('VyV webhook reinicio', 'GET', ruta, { ok: true }).then((wf) => {
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
      // El comando debe terminar cuando n8n vuelve a responder (ver vyv/README.md).
      cy.task('ejecutar', reiniciar, { timeout: 200000 });
      cy.loginApi();
      n8nApi.obtenerWorkflow(wf.id).its('active').should('eq', true);
      n8nApi.llamarWebhook('GET', ruta, {}, 30).then((r) => {
        expect(r.status, 'webhook después del reinicio').to.eq(200);
        cy.evidencia(`Después del reinicio: GET /webhook/${ruta} → ${r.status}`);
      });
      n8nApi.ejecuciones(wf.id).should('have.length', 2);
    });
  });
});
