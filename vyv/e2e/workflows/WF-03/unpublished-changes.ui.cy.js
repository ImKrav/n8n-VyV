/// <reference types="cypress" />
/**
 * WF-03 · Publicar workflows · cambios guardados sin publicar (caja negra, API + UI).
 * Trazabilidad: CP-WF-03-07. Alternativo: tras guardar sin publicar, producción sigue en la versión
 * publicada y la interfaz marca cambios pendientes · éxito: al volver a publicar responde la nueva.
 */
import { n8nApi } from '../../support/api.js';

const indicador = '[data-test-id="workflow-active-version-indicator"]';

describe('WF-03 · Cambios sin publicar (API y UI)', () => {
  let wf;
  beforeEach(() => cy.loginApi());
  after(() => wf && n8nApi.desactivarWorkflow(wf.id));

  it('CP-WF-03-07 · producción usa la versión publicada hasta que se publican los cambios guardados', () => {
    const ruta = n8nApi.rutaUnica('vyv-ver');
    const nodos = (v) => [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoCampos({ v })];
    n8nApi.crearWorkflowActivo('VyV versión publicada', nodos(1), n8nApi.cadena('Webhook', 'Edit Fields')).then((publicado) => {
      wf = publicado;
      n8nApi.llamarWebhook('GET', ruta).its('body').should('deep.eq', { v: 1 });
      cy.visitarN8n(`/workflow/${wf.id}`);
      cy.get(indicador, { timeout: 30000 }).should('have.attr', 'class').and('match', /indicatorPublished/);

      // Guardar v=2 sin publicar.
      n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, { versionId: wf.versionId, nodes: nodos(2), connections: wf.connections }).then(n8nApi.ok).then((guardado) => {
        n8nApi.llamarWebhook('GET', ruta).then((r) => {
          cy.evidencia(`Tras guardar v=2 sin publicar, producción responde ${JSON.stringify(r.body)}`);
          expect(r.body, 'producción sigue en la versión publicada').to.deep.eq({ v: 1 });
        });
        cy.reload();
        cy.get(indicador, { timeout: 30000 }).should('have.attr', 'class').and('match', /indicatorChanges/);
        cy.screenshot('CP-WF-03-07_cambios-sin-publicar');

        // Publicar los cambios.
        n8nApi.req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: guardado.versionId }).its('status').should('eq', 200);
        const hastaV2 = (restantes = 20) =>
          n8nApi.llamarWebhook('GET', ruta).then((r) => (r.body?.v === 2 || restantes <= 1 ? r : cy.wait(500).then(() => hastaV2(restantes - 1))));
        hastaV2().then((r) => {
          cy.evidencia(`Tras publicar, producción responde ${JSON.stringify(r.body)}`);
          expect(r.body).to.deep.eq({ v: 2 });
        });
        cy.reload();
        cy.get(indicador, { timeout: 30000 }).should('have.attr', 'class').and('match', /indicatorPublished/);
      });
    });
  });
});
