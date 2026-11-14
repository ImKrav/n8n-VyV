/// <reference types="cypress" />
/**
 * EX-03 · Vista previa, reintento y eliminación de ejecuciones (caja negra, API).
 * Trazabilidad: CP-EX-03-01, 03-02, 03-03, 03-04, 03-05 y 03-06.
 * Éxito: 03-01, 03-03, 03-05 · alternativo: 03-04 (reintento con la versión original), 03-06 (eliminar
 * varias) · error: 03-02 (nodo con error), consultar una ejecución eliminada.
 * Hallazgo: GET de una ejecución eliminada o inexistente responde 200 {} en lugar de 404.
 */
import { n8nApi } from '../../support/api.js';

describe('EX-03 · Vista previa, reintento y eliminación (API)', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() => workflows.forEach((id) => n8nApi.desactivarWorkflow(id)));

  /** Publica Webhook → nodo, lo llama `veces` veces y devuelve el workflow y sus ejecuciones terminadas. */
  const ejecutar = (nombre, nodo, veces = 1) => {
    const ruta = n8nApi.rutaUnica('vyv-ex03');
    return n8nApi.crearWorkflowActivo(nombre, [n8nApi.nodoWebhook('GET', ruta), nodo], n8nApi.cadena('Webhook', nodo.name)).then((wf) => {
      workflows.push(wf.id);
      Cypress._.times(veces, () => n8nApi.llamarWebhook('GET', `${ruta}`));
      return n8nApi.esperarEjecuciones(wf.id, veces, (e) => ['success', 'error'].includes(e.status)).then((lista) => ({ wf, ruta, lista }));
    });
  };
  const listaIds = (wfId) => n8nApi.ejecuciones(wfId).then((l) => l.map((e) => e.id));

  it('CP-EX-03-01 · la vista previa muestra por nodo los mismos datos que devolvió la ejecución', () => {
    const ruta = n8nApi.rutaUnica('vyv-ex03-ok');
    n8nApi.crearWorkflowActivo('VyV vista previa', [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoCampos({ pedido: 42, estado: 'listo' })], n8nApi.cadena('Webhook', 'Edit Fields')).then((wf) => {
      workflows.push(wf.id);
      n8nApi.llamarWebhook('GET', ruta).then((r) => {
        n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'success').then(([e]) =>
          n8nApi.detalleEjecucion(e.id).then((detalle) => {
            const runData = detalle.data.resultData.runData;
            const salida = runData['Edit Fields'][0].data.main[0][0].json;
            cy.evidencia(`Nodos en la vista previa: ${Object.keys(runData).join(', ')} · salida de Edit Fields: ${JSON.stringify(salida)}`);
            expect(Object.keys(runData)).to.deep.eq(['Webhook', 'Edit Fields']);
            expect(salida, 'coincide con la respuesta real').to.deep.eq(r.body);
          }),
        );
      });
    });
  });

  it('CP-EX-03-02 · (error) la ejecución fallida identifica el nodo con error, su mensaje y sus datos de entrada', () => {
    ejecutar('VyV detalle de error', n8nApi.nodoFalla('fallo controlado VyV')).then(({ lista: [e] }) =>
      n8nApi.detalleEjecucion(e.id).then((detalle) => {
        const { error, lastNodeExecuted, runData } = detalle.data.resultData;
        cy.evidencia(`Nodo con error: ${lastNodeExecuted} · mensaje: ${error.message}`);
        expect(lastNodeExecuted).to.eq('Falla');
        expect(error.message).to.eq('fallo controlado VyV');
        expect(runData.Falla[0].error.message).to.eq('fallo controlado VyV');
        expect(runData.Webhook[0].data.main[0][0].json, 'datos de entrada del nodo con error').to.have.property('headers');
      }),
    );
  });

  it('CP-EX-03-04 · (alternativo) reintentar con la versión original vuelve a fallar y queda como reintento', () => {
    ejecutar('VyV reintento original', n8nApi.nodoFalla('fallo original')).then(({ lista: [e] }) =>
      n8nApi.req('POST', `/rest/executions/${e.id}/retry`, { loadWorkflow: false }).then(n8nApi.ok).then((reintento) => {
        cy.evidencia(`Reintento ${reintento.id} de ${reintento.retryOf}: ${reintento.status} (${reintento.mode})`);
        expect(reintento).to.include({ retryOf: e.id, mode: 'retry', status: 'error' });
      }),
    );
  });

  it('CP-EX-03-03 · reintentar con la versión actual (corregida) termina con éxito', () => {
    ejecutar('VyV reintento corregido', n8nApi.nodoFalla('fallo a corregir')).then(({ wf, lista: [e] }) => {
      // Se corrige el workflow: el nodo que fallaba pasa a ser un Edit Fields con el mismo nombre.
      n8nApi.obtenerWorkflow(wf.id).then((actual) => {
        const nodos = actual.nodes.map((n) => (n.name === 'Falla' ? n8nApi.nodoCampos({ corregido: true }, 'Falla') : n));
        n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, { versionId: actual.versionId, nodes: nodos, connections: actual.connections }).its('status').should('eq', 200);
      });
      n8nApi.req('POST', `/rest/executions/${e.id}/retry`, { loadWorkflow: true }).then(n8nApi.ok).then((reintento) => {
        cy.evidencia(`Reintento ${reintento.id} con la versión actual: ${reintento.status}`);
        expect(reintento).to.include({ retryOf: e.id, mode: 'retry', status: 'success' });
      });
    });
  });

  it('CP-EX-03-05 · eliminar una ejecución la quita de la lista', () => {
    ejecutar('VyV eliminar una', n8nApi.nodoCampos({ ok: true })).then(({ wf, lista: [e] }) => {
      n8nApi.req('POST', '/rest/executions/delete', { ids: [e.id] }).its('status').should('eq', 200);
      listaIds(wf.id).then((restantes) => {
        cy.evidencia(`Después de eliminar ${e.id}: ${restantes.length} ejecuciones en la lista`);
        expect(restantes).not.to.include(e.id);
      });
    });
  });

  it('CP-EX-03-06 · (alternativo) eliminar varias seleccionadas solo quita esas', () => {
    ejecutar('VyV eliminar varias', n8nApi.nodoCampos({ ok: true }), 3).then(({ wf, lista }) => {
      const [conservar, ...borrar] = lista.map((e) => e.id);
      n8nApi.req('POST', '/rest/executions/delete', { ids: borrar }).its('status').should('eq', 200);
      listaIds(wf.id).then((restantes) => {
        cy.evidencia(`Eliminadas ${borrar.join(', ')} · quedan ${restantes.join(', ')}`);
        expect(restantes).to.deep.eq([conservar]);
      });
    });
  });

  it('CP-EX-03 · (error, hallazgo) consultar una ejecución eliminada no devuelve datos (responde 200 {} y no 404)', () => {
    ejecutar('VyV consultar eliminada', n8nApi.nodoCampos({ ok: true })).then(({ lista: [e] }) => {
      n8nApi.req('POST', '/rest/executions/delete', { ids: [e.id] });
      n8nApi.req('GET', `/rest/executions/${e.id}`).then((r) => {
        cy.evidencia(`GET de la ejecución eliminada ${e.id} → HTTP ${r.status} ${JSON.stringify(r.body)}`);
        expect(r.body.data ?? {}, 'sin datos de la ejecución').to.deep.eq({});
        // Hallazgo documentado: lo esperado por REST es 404.
        expect(r.status).to.be.oneOf([200, 404]);
      });
    });
  });
});
