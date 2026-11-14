/// <reference types="cypress" />
/**
 * CO-05 · Mover y eliminar carpetas · mover un workflow de una carpeta a la raíz (caja negra, API).
 * Trazabilidad: CP-CO-05-02. Éxito: el workflow vuelve a la raíz del proyecto y conserva sus ejecuciones.
 * La raíz del proyecto es parentFolderId '0' (PROJECT_ROOT en n8n-workflow).
 */
import { n8nApi } from '../../support/api.js';

describe('CO-05 · Mover un workflow a la raíz (API)', () => {
  let p;
  let carpeta;
  let wf;
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  beforeEach(() => cy.loginApi());
  after(() => {
    if (wf) n8nApi.desactivarWorkflow(wf.id);
    if (carpeta) n8nApi.borrarCarpeta(p, carpeta.id);
  });

  it('CP-CO-05-02 · el workflow movido a la raíz sale de la carpeta y conserva sus ejecuciones', () => {
    const ruta = n8nApi.rutaUnica('vyv-co05');
    cy.nombreUnico('VyV-raiz').then((nombre) => n8nApi.crearCarpetaOk(p, nombre)).then((c) => {
      carpeta = c;
      return n8nApi.req('POST', '/rest/workflows', {
        name: 'VyV-basico', nodes: [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoCampos({ ok: true })],
        connections: n8nApi.cadena('Webhook', 'Edit Fields'), settings: {}, active: false, parentFolderId: c.id, projectId: p,
      }).then(n8nApi.ok);
    }).then((creado) => {
      wf = creado;
      expect(creado.parentFolder?.id, 'empieza dentro de la carpeta').to.eq(carpeta.id);
      n8nApi.req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }).its('status').should('eq', 200);
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
      n8nApi.esperarEjecuciones(wf.id, 1).should('have.length', 1);

      n8nApi.obtenerWorkflow(wf.id).then((actual) => n8nApi.moverWorkflow(actual, '0')).its('status').should('eq', 200);
      n8nApi.obtenerWorkflow(wf.id).then((movido) => {
        cy.evidencia(`Tras mover a la raíz: parentFolder=${JSON.stringify(movido.parentFolder)}`);
        expect(movido.parentFolder ?? null, 'está en la raíz').to.eq(null);
      });
      n8nApi.contenido(p, carpeta.id).then((c) => {
        cy.evidencia(`Contenido de la carpeta: ${JSON.stringify(c)}`);
        expect(c.totalWorkflows ?? c.workflows?.length ?? 0, 'la carpeta queda sin el workflow').to.eq(0);
      });
      n8nApi.ejecuciones(wf.id).then((lista) => {
        cy.evidencia(`Ejecuciones conservadas: ${lista.length}`);
        expect(lista).to.have.length(1);
      });
    });
  });
});
