/// <reference types="cypress" />
/**
 * EX-05 · Panel de logs de la ejecución (caja negra, API: los datos que muestra el panel).
 * Trazabilidad: CP-EX-05-01, 05-02, 05-03 y 05-04.
 * Éxito: 05-01 (orden y rama tomada), 05-02 (entrada y salida de un nodo)
 * · alternativo: 05-04 (ejecución hija de Execute Workflow) · error: 05-03 (nodo con error).
 */
import { n8nApi } from '../../support/api.js';

/** If que envía a «Rama sí» cuando el query `ok` vale «si» y a «Rama no» en otro caso. */
const nodoIf = {
  id: 'if', name: 'If', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [220, 0],
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
      conditions: [{ id: 'c1', leftValue: '={{ $json.query.ok }}', rightValue: 'si', operator: { type: 'string', operation: 'equals' } }],
      combinator: 'and',
    },
    options: {},
  },
};
const conexionesIf = (siguienteSi, siguienteNo) => ({
  ...n8nApi.cadena('Webhook', 'If'),
  If: { main: [[{ node: siguienteSi, type: 'main', index: 0 }], [{ node: siguienteNo, type: 'main', index: 0 }]] },
});
/** Nombres de los nodos en el orden real de ejecución (por executionIndex). */
const ordenReal = (runData) =>
  Object.entries(runData).flatMap(([n, runs]) => runs.map((r) => [n, r.executionIndex])).sort((a, b) => a[1] - b[1]).map(([n]) => n);

describe('EX-05 · Datos del panel de logs (API)', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() => workflows.forEach((id) => n8nApi.desactivarWorkflow(id)));

  /** Publica el workflow, llama al webhook con `query` y devuelve la respuesta y el detalle de la ejecución. */
  const ejecutar = (nombre, nodosTrasWebhook, connections, query = '') => {
    const ruta = n8nApi.rutaUnica('vyv-ex05');
    return n8nApi.crearWorkflowActivo(nombre, [n8nApi.nodoWebhook('GET', ruta), ...nodosTrasWebhook], connections).then((wf) => {
      workflows.push(wf.id);
      return n8nApi.llamarWebhook('GET', `${ruta}${query}`).then((r) =>
        n8nApi.esperarEjecuciones(wf.id, 1, (e) => ['success', 'error'].includes(e.status))
          .then(([e]) => n8nApi.detalleEjecucion(e.id))
          .then((detalle) => ({ wf, r, detalle, runData: detalle.data.resultData.runData })),
      );
    });
  };
  const ramas = () => [nodoIf, n8nApi.nodoCampos({ rama: 'si' }, 'Rama sí', [440, -100]), n8nApi.nodoCampos({ rama: 'no' }, 'Rama no', [440, 100])];

  it('CP-EX-05-01 · el árbol sigue el orden real de ejecución e incluye solo la rama tomada', () => {
    ejecutar('VyV logs con If', ramas(), conexionesIf('Rama sí', 'Rama no'), '?ok=si').then(({ runData }) => {
      const orden = ordenReal(runData);
      cy.evidencia(`Orden de ejecución: ${orden.join(' → ')}`);
      expect(orden).to.deep.eq(['Webhook', 'If', 'Rama sí']);
      expect(runData, 'la rama no tomada no se ejecuta').not.to.have.property('Rama no');
    });
  });

  it('CP-EX-05-02 · la entrada y la salida de un nodo coinciden con los datos del workflow', () => {
    ejecutar('VyV logs entrada y salida', ramas(), conexionesIf('Rama sí', 'Rama no'), '?ok=no').then(({ r, runData }) => {
      const salidaIf = runData.If[0].data.main;
      const salidaRama = runData['Rama no'][0].data.main[0][0].json;
      cy.evidencia(`If: ${salidaIf[0].length} ítems en «true» y ${salidaIf[1].length} en «false» · salida de «Rama no»: ${JSON.stringify(salidaRama)}`);
      expect(salidaIf[0], 'salida true').to.have.length(0);
      expect(salidaIf[1][0].json.query, 'la entrada del If es el query del webhook').to.deep.eq({ ok: 'no' });
      expect(salidaRama).to.deep.eq({ rama: 'no' });
      expect(r.body, 'la respuesta es la salida del último nodo').to.deep.eq(salidaRama);
    });
  });

  it('CP-EX-05-03 · (error) el nodo que falla queda marcado con error y su mensaje', () => {
    ejecutar('VyV logs con error', [nodoIf, n8nApi.nodoFalla('fallo en la rama sí', 'Rama sí', [440, -100]), n8nApi.nodoCampos({ rama: 'no' }, 'Rama no', [440, 100])], conexionesIf('Rama sí', 'Rama no'), '?ok=si')
      .then(({ detalle, runData }) => {
        const nodoError = Object.entries(runData).find(([, runs]) => runs[0].error);
        cy.evidencia(`Estado: ${detalle.status} · nodo con error: ${nodoError?.[0]} · ${nodoError?.[1][0].error.message}`);
        expect(detalle.status).to.eq('error');
        expect(nodoError[0]).to.eq('Rama sí');
        expect(runData['Rama sí'][0].executionStatus).to.eq('error');
        expect(runData.If[0].executionStatus, 'los nodos previos terminan bien').to.eq('success');
      });
  });

  it('CP-EX-05-04 · (alternativo) la ejecución de Execute Workflow enlaza con la ejecución hija y sus datos', () => {
    const disparadorHijo = { id: 'ewt', name: 'When Executed by Another Workflow', type: 'n8n-nodes-base.executeWorkflowTrigger', typeVersion: 1.1, position: [0, 0], parameters: { inputSource: 'passthrough' } };
    n8nApi.req('POST', '/rest/workflows', {
      name: 'VyV hijo', nodes: [disparadorHijo, n8nApi.nodoCampos({ desde: 'hijo' })], connections: n8nApi.cadena(disparadorHijo.name, 'Edit Fields'), settings: {}, active: false,
    }).then(n8nApi.ok).then((hijo) => {
      workflows.push(hijo.id);
      n8nApi.req('POST', `/rest/workflows/${hijo.id}/activate`, { versionId: hijo.versionId });
      const llamar = {
        id: 'exec', name: 'Execute Workflow', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [220, 0],
        parameters: { workflowId: { __rl: true, value: hijo.id, mode: 'id' }, options: {} },
      };
      ejecutar('VyV padre', [llamar], n8nApi.cadena('Webhook', 'Execute Workflow')).then(({ r, runData }) => {
        const sub = runData['Execute Workflow'][0].metadata?.subExecution;
        cy.evidencia(`Respuesta del padre: ${JSON.stringify(r.body)} · ejecución hija: ${JSON.stringify(sub)}`);
        expect(r.body).to.deep.eq({ desde: 'hijo' });
        expect(sub, 'enlace a la ejecución hija').to.include({ workflowId: hijo.id });
        n8nApi.detalleEjecucion(sub.executionId).then((hija) => {
          expect(hija.workflowId).to.eq(hijo.id);
          expect(hija.data.resultData.runData['Edit Fields'][0].data.main[0][0].json).to.deep.eq({ desde: 'hijo' });
        });
      });
    });
  });
});
