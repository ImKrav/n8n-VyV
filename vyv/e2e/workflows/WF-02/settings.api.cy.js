/// <reference types="cypress" />
/**
 * WF-02 · Ajustes del workflow (caja negra, API).
 * Trazabilidad: CP-WF-02-01, 02-03, 02-04, 02-05 y 02-06.
 * Éxito: 02-06 (los ajustes persisten), 02-05 (zona horaria) · alternativo: 02-01 (no guardar éxitos)
 * · error: 02-03 (timeout cancela la ejecución), 02-04 (el workflow de error se dispara ante un fallo).
 */
import { n8nApi } from '../../support/api.js';

describe('WF-02 · Ajustes del workflow (API)', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() => workflows.forEach((id) => n8nApi.desactivarWorkflow(id)));

  /** Publica Webhook → nodos, con los ajustes dados. */
  const publicar = (nombre, ruta, nodos, ajustes, modo = 'onReceived') => {
    const nodes = [n8nApi.nodoWebhook('GET', ruta, modo), ...nodos];
    return n8nApi
      .req('POST', '/rest/workflows', { name: nombre, nodes, connections: n8nApi.cadena(...nodes.map((n) => n.name)), settings: ajustes, active: false })
      .then(n8nApi.ok)
      .then((wf) => {
        workflows.push(wf.id);
        return n8nApi.req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }).then(() => wf);
      });
  };

  it('CP-WF-02-06 / CP-WF-02-05 · los ajustes (zona horaria y timeout) persisten al volver a leer el workflow', () => {
    n8nApi
      .req('POST', '/rest/workflows', { name: 'VyV ajustes', nodes: [], connections: {}, settings: {}, active: false })
      .then(n8nApi.ok)
      .then((wf) =>
        n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, {
          versionId: wf.versionId, settings: { timezone: 'America/Bogota', executionTimeout: 120, saveManualExecutions: false },
        }).then((r) => {
          expect(r.status).to.eq(200);
          return n8nApi.obtenerWorkflow(wf.id);
        }),
      )
      .then((leido) => {
        cy.evidencia(`Ajustes leídos: ${JSON.stringify(leido.settings)}`);
        expect(leido.settings).to.include({ timezone: 'America/Bogota', executionTimeout: 120, saveManualExecutions: false });
      });
  });

  it('CP-WF-02-01 · (alternativo) con «no guardar ejecuciones exitosas» la ejecución de producción no queda registrada', () => {
    const ruta = n8nApi.rutaUnica('vyv-nosave');
    publicar('VyV sin guardar éxitos', ruta, [], { saveDataSuccessExecution: 'none' }).then((wf) => {
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
      cy.wait(1500);
      n8nApi.ejecuciones(wf.id).then((lista) => {
        cy.evidencia(`Ejecuciones guardadas: ${lista.length}`);
        expect(lista, 'no se guarda la ejecución exitosa').to.have.length(0);
      });
    });
  });

  it('CP-WF-02-03 · (error) una ejecución más larga que el timeout del workflow se cancela', () => {
    const ruta = n8nApi.rutaUnica('vyv-timeout');
    publicar('VyV timeout', ruta, [n8nApi.nodoEspera(4)], { executionTimeout: 1 }).then((wf) => {
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
      n8nApi.esperarEjecuciones(wf.id, 1, (e) => !['new', 'running'].includes(e.status), 20).then((lista) => {
        cy.evidencia(`Estado con timeout de 1 s y espera de 4 s: ${lista[0]?.status}`);
        expect(lista[0]?.status, 'la ejecución se cancela por timeout').to.eq('canceled');
      });
    });
  });

  it('CP-WF-02-04 · (error) el workflow de error se dispara cuando el workflow principal falla', () => {
    const manejador = [
      { id: 'et', name: 'Error Trigger', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
      n8nApi.nodoCampos({ manejado: true }),
    ];
    n8nApi
      .req('POST', '/rest/workflows', { name: 'VyV manejador de errores', nodes: manejador, connections: n8nApi.cadena('Error Trigger', 'Edit Fields'), settings: {}, active: false })
      .then(n8nApi.ok)
      .then((errWf) => {
        workflows.push(errWf.id);
        // n8n solo ejecuta la versión publicada del workflow de error.
        n8nApi.req('POST', `/rest/workflows/${errWf.id}/activate`, { versionId: errWf.versionId }).its('status').should('eq', 200);
        const ruta = n8nApi.rutaUnica('vyv-falla');
        publicar('VyV falla con manejador', ruta, [n8nApi.nodoFalla('fallo VyV')], { errorWorkflow: errWf.id }).then(() => {
          n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
          n8nApi.esperarEjecuciones(errWf.id, 1, (e) => !['new', 'running'].includes(e.status)).then((lista) => {
            cy.evidencia(`Ejecuciones del workflow de error: ${lista.map((e) => `${e.mode}/${e.status}`).join(', ')}`);
            expect(lista, 'el workflow de error se ejecutó').to.have.length.at.least(1);
            expect(lista[0]).to.include({ mode: 'error', status: 'success' });
          });
        });
      });
  });
});
