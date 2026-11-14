/// <reference types="cypress" />
/**
 * WF-03 · Publicar workflows y disparadores · URL de producción del Webhook (caja negra).
 * Trazabilidad: CP-WF-03-01, 03-02, 03-03, 03-04, 03-05 y 03-08.
 * Éxito: 03-02, 03-04 · alternativo: 03-05, 03-08 · error: 03-01, 03-03.
 * CP-WF-03-08 reinicia n8n con el comando de CYPRESS_restartCommand; sin esa variable se omite.
 */
import { n8nApi } from '../../support/api.js';

const nodoCampos = (campos) => n8nApi.nodoCampos(campos);
const conexion = n8nApi.cadena('Webhook', 'Edit Fields');

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

  it('CP-WF-03-01 · (error) no se puede publicar un workflow sin nodo trigger', () => {
    n8nApi
      .req('POST', '/rest/workflows', { name: 'VyV sin trigger', nodes: [nodoCampos({ ok: true })], connections: {}, settings: {}, active: false, projectId: p })
      .then(n8nApi.ok)
      .then((wf) => {
        workflows.push(wf.id);
        n8nApi.req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }).then((r) => {
          cy.evidencia(`Publicar sin trigger → HTTP ${r.status}: ${r.body.message}`);
          expect(r.status).to.eq(400);
          expect(r.body.message).to.match(/no trigger node/i);
        });
        n8nApi.obtenerWorkflow(wf.id).its('active').should('eq', false);
      });
  });

  it('CP-WF-03-03 · (error) un segundo workflow con la misma ruta y método no se publica', () => {
    const ruta = n8nApi.rutaUnica('vyv-conflicto');
    publicar('VyV conflicto A', 'GET', ruta, { workflow: 'A' });
    n8nApi
      .req('POST', '/rest/workflows', {
        name: 'VyV conflicto B', nodes: [n8nApi.nodoWebhook('GET', ruta), nodoCampos({ workflow: 'B' })], connections: conexion, settings: {}, active: false, projectId: p,
      })
      .then(n8nApi.ok)
      .then((b) => {
        workflows.push(b.id);
        n8nApi.req('POST', `/rest/workflows/${b.id}/activate`, { versionId: b.versionId }).then((r) => {
          cy.evidencia(`Publicar B con la misma ruta → HTTP ${r.status}: ${r.body.message}`);
          expect(r.status).to.eq(409);
          expect(r.body.message).to.match(/conflict with one of the webhooks/i);
        });
      });
    // El workflow A sigue respondiendo.
    n8nApi.llamarWebhook('GET', ruta).its('body').should('deep.include', { workflow: 'A' });
  });

  it('CP-WF-03-05 · (alternativo) despublicar el workflow detiene su webhook de producción', () => {
    const ruta = n8nApi.rutaUnica('vyv-despublicar');
    publicar('VyV despublicar', 'GET', ruta, { ok: true }).then((wf) => {
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
      n8nApi.desactivarWorkflow(wf.id).its('status').should('eq', 200);
      // n8n quita el webhook poco después de responder: se reintenta hasta 5 s mientras siga en 200.
      const hasta404 = (restantes = 10) =>
        cy.request({ url: `/webhook/${ruta}`, failOnStatusCode: false }).then((r) =>
          r.status === 404 || restantes <= 1 ? r : cy.wait(500).then(() => hasta404(restantes - 1)),
        );
      hasta404().then((r) => {
        cy.evidencia(`Después de despublicar: GET /webhook/${ruta} → ${r.status}`);
        expect(r.status, 'el webhook ya no está registrado').to.eq(404);
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
