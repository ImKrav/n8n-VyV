/// <reference types="cypress" />
/**
 * EX-01 · Lista de ejecuciones · estados y coherencia de la lista (caja negra, API).
 * Trazabilidad: CP-EX-01-01, 01-02, 01-03, 01-04 y 01-07.
 * Éxito: 01-01, 01-07 · alternativo: 01-03 (en espera), 01-04 (en ejecución → éxito) · error: 01-02.
 */
import { n8nApi } from '../../support/api.js';

describe('EX-01 · Estados de las ejecuciones (API)', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() => {
    // Cancela las ejecuciones en espera que dejan las pruebas y despublica los workflows.
    workflows.forEach((id) => {
      n8nApi.req('POST', '/rest/executions/stopMany', { filter: { workflowId: id, status: ['waiting', 'running'] } });
      n8nApi.desactivarWorkflow(id);
    });
  });

  /** Publica Webhook → nodos y llama al webhook. Devuelve el workflow y la respuesta. */
  const publicarYLlamar = (nombre, nodos, modo = 'lastNode') => {
    const ruta = n8nApi.rutaUnica('vyv-ex01');
    const nodes = [n8nApi.nodoWebhook('GET', ruta, modo), ...nodos];
    return n8nApi.crearWorkflowActivo(nombre, nodes, n8nApi.cadena(...nodes.map((n) => n.name))).then((wf) => {
      workflows.push(wf.id);
      return n8nApi.llamarWebhook('GET', ruta).then((r) => ({ wf, r }));
    });
  };
  const terminada = (e) => !['new', 'running', 'waiting'].includes(e.status);

  it('CP-EX-01-01 · una ejecución exitosa aparece como «success» con inicio y duración coherentes', () => {
    const antes = Date.now();
    publicarYLlamar('VyV ejecución exitosa', [n8nApi.nodoCampos({ ok: true })]).then(({ wf, r }) => {
      expect(r.status).to.eq(200);
      n8nApi.esperarEjecuciones(wf.id, 1, terminada).then(([e]) => {
        const duracion = Date.parse(e.stoppedAt) - Date.parse(e.startedAt);
        cy.evidencia(`Ejecución ${e.id}: ${e.status} · modo ${e.mode} · duración ${duracion} ms`);
        expect(e).to.include({ status: 'success', mode: 'webhook' });
        expect(Date.parse(e.startedAt), 'inicio después de llamar').to.be.within(antes - 2000, Date.now());
        expect(duracion, 'duración coherente').to.be.within(0, 10000);
      });
    });
  });

  it('CP-EX-01-02 · (error) una ejecución cuyo nodo falla aparece con estado «error»', () => {
    publicarYLlamar('VyV ejecución fallida', [n8nApi.nodoFalla('fallo controlado VyV')]).then(({ wf, r }) => {
      expect(r.status, 'el webhook informa el fallo').to.eq(500);
      n8nApi.esperarEjecuciones(wf.id, 1, terminada).then(([e]) => {
        cy.evidencia(`Webhook → HTTP ${r.status} · ejecución ${e.id}: ${e.status}`);
        expect(e.status).to.eq('error');
        expect(e.stoppedAt, 'tiene hora de fin').to.be.a('string');
      });
    });
  });

  it('CP-EX-01-03 · (alternativo) mientras dura el nodo Wait la ejecución aparece «waiting»', () => {
    publicarYLlamar('VyV ejecución en espera', [n8nApi.nodoEspera(5, 'minutes')], 'onReceived').then(({ wf }) => {
      n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'waiting').then(([e]) => {
        cy.evidencia(`Ejecución ${e.id}: ${e.status} hasta ${e.waitTill}`);
        expect(e.status).to.eq('waiting');
        expect(Date.parse(e.waitTill), 'espera unos 5 minutos').to.be.greaterThan(Date.now() + 4 * 60 * 1000);
      });
    });
  });

  it('CP-EX-01-04 · (alternativo) una ejecución larga aparece «running» y cambia a «success» al terminar', () => {
    publicarYLlamar('VyV ejecución larga', [n8nApi.nodoEspera(4)], 'onReceived').then(({ wf }) => {
      n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'running', 20).then((enCurso) => {
        expect(enCurso, 'se observa en ejecución').to.have.length(1);
        n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'success', 30).then((fin) => {
          cy.evidencia(`Ejecución ${enCurso[0].id}: running → ${fin[0]?.status}`);
          expect(fin[0]?.id).to.eq(enCurso[0].id);
        });
      });
    });
  });

  it('CP-EX-01-07 · la lista global y la del workflow muestran las mismas ejecuciones con los mismos datos', () => {
    publicarYLlamar('VyV coherencia de listas', [n8nApi.nodoCampos({ ok: true })]).then(({ wf }) => {
      n8nApi.esperarEjecuciones(wf.id, 1, terminada).then((delWorkflow) => {
        n8nApi.req('GET', '/rest/executions?limit=100').then(n8nApi.ok).then(({ results }) => {
          const global = results.filter((e) => e.workflowId === wf.id);
          const campos = (e) => Cypress._.pick(e, ['id', 'status', 'mode', 'startedAt', 'stoppedAt', 'workflowName']);
          cy.evidencia(`Workflow ${wf.id}: ${delWorkflow.length} en su lista · ${global.length} en la global`);
          expect(global.map(campos)).to.deep.eq(delWorkflow.map(campos));
        });
      });
    });
  });
});
