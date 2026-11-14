/**
 * Tareas del módulo 2 · Ejecuciones (EX-01 a EX-05).
 * Las ejecuciones se generan con workflows de webhook publicados (modo de producción).
 * Memoria del actor: «ejecucion» (la última usada), «ejec:<alias>», «listaEjecuciones», «reintento».
 */
import { actividad } from '../Actor.js';
import { CallAnApi } from '../abilities/index.js';
import { Send } from '../interactions/index.js';
import { CallTheWebhook, PublishWebhookWorkflow } from './workflows.js';
import { Stage } from '../Stage.js';

const api = (actor) => actor.abilityTo(CallAnApi).api;
const terminada = (e) => ['success', 'error', 'canceled', 'crashed'].includes(e.status);

/** Nodos que usan los escenarios de ejecuciones. */
export const Nodes = {
  /** If que envía a «Rama sí» cuando el query `ok` vale «si» y a «Rama no» en otro caso. */
  ifOk: () => ({
    id: 'if', name: 'If', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [220, 0],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{ id: 'c1', leftValue: '={{ $json.query.ok }}', rightValue: 'si', operator: { type: 'string', operation: 'equals' } }],
        combinator: 'and',
      },
      options: {},
    },
  }),
  ifConnections: (api, siguienteSi, siguienteNo) => ({
    ...api.cadena('Webhook', 'If'),
    If: { main: [[{ node: siguienteSi, type: 'main', index: 0 }], [{ node: siguienteNo, type: 'main', index: 0 }]] },
  }),
  executeWorkflow: (workflowId) => ({
    id: 'exec', name: 'Execute Workflow', type: 'n8n-nodes-base.executeWorkflow', typeVersion: 1.2, position: [220, 0],
    parameters: { workflowId: { __rl: true, value: workflowId, mode: 'id' }, options: {} },
  }),
  subWorkflowTrigger: {
    id: 'ewt', name: 'When Executed by Another Workflow', type: 'n8n-nodes-base.executeWorkflowTrigger', typeVersion: 1.1,
    position: [0, 0], parameters: { inputSource: 'passthrough' },
  },
};

/** Espera la ejecución más reciente del workflow (o del alias) que cumple `cond`. */
export const latestExecution = (actor, cond = terminada, alias) => {
  const wf = actor.recall(alias ? `wf:${alias}` : 'wf');
  return api(actor).esperarEjecuciones(wf.id, 1, cond).then(([e]) => {
    expect(e, `ejecución de «${wf.name}»`).to.exist;
    actor.remember('ejecucion', e);
    return e;
  });
};

export const PrepareExecutions = {
  /** Un workflow que termina bien («correcto») y otro que falla («fallido»), cada uno con una ejecución. */
  successAndFailure: () =>
    actividad('preparar una ejecución exitosa y otra fallida', (actor) => {
      const a = api(actor);
      actor.attemptsTo(
        PublishWebhookWorkflow.with({ alias: 'correcto', nodos: [a.nodoCampos({ ok: true })] }),
        CallTheWebhook.ofTheWorkflow({ alias: 'correcto' }),
        PublishWebhookWorkflow.with({ alias: 'fallido', nodos: [a.nodoFalla('fallo BDD')] }),
        CallTheWebhook.ofTheWorkflow({ alias: 'fallido' }),
      );
      cy.then(() => ['correcto', 'fallido'].forEach((alias) =>
        latestExecution(actor, terminada, alias).then((e) => actor.remember(`ejec:${alias}`, e))));
    }),
};

export const FilterExecutions = {
  /** `filtro` usa los alias: { workflow: 'fallido', status: ['error'] }. */
  by: ({ workflow, status } = {}) =>
    actividad(`filtrar ejecuciones ${JSON.stringify({ workflow, status })}`, (actor) => {
      const filter = { ...(workflow ? { workflowId: actor.recall(`wf:${workflow}`).id } : {}), ...(status ? { status } : {}) };
      api(actor).req('GET', `/rest/executions?filter=${encodeURIComponent(JSON.stringify(filter))}&limit=100`)
        .then(api(actor).ok).then((d) => actor.remember('listaEjecuciones', d.results));
    }),
  withQuery: (consulta) => actividad(`consultar /rest/executions?${consulta}`, (actor) => actor.attemptsTo(Send.a('GET', `/rest/executions?${consulta}`))),
};

export const StopExecution = {
  latest: () =>
    actividad('detener la última ejecución', (actor) =>
      actor.attemptsTo(Send.a('POST', `/rest/executions/${actor.recall('ejecucion').id}/stop`, {}))),
  /** Detener en bloque: solo las ejecuciones en espera del workflow con ese alias. */
  waitingOf: (alias) =>
    actividad(`detener en bloque las ejecuciones en espera de «${alias}»`, (actor) =>
      actor.attemptsTo(Send.a('POST', '/rest/executions/stopMany', { filter: { workflowId: actor.recall(`wf:${alias}`).id, status: ['waiting'] } }))),
};

export const RetryExecution = {
  /** `loadWorkflow` true usa la versión actual del workflow; false, la versión con la que falló. */
  latest: (loadWorkflow) =>
    actividad(`reintentar la última ejecución con la versión ${loadWorkflow ? 'actual' : 'original'}`, (actor) =>
      latestExecution(actor).then((e) =>
        api(actor).req('POST', `/rest/executions/${e.id}/retry`, { loadWorkflow }).then(api(actor).ok).then((r) => {
          actor.remember('reintento', r);
          actor.remember('ejecucionOriginal', e);
        }))),
};

export const DeleteExecution = {
  latest: () =>
    actividad('eliminar la última ejecución', (actor) =>
      latestExecution(actor).then((e) => { actor.attemptsTo(Send.a('POST', '/rest/executions/delete', { ids: [e.id] })); })),
};

export const FixWorkflow = {
  /** El nodo que fallaba pasa a ser un Edit Fields con el mismo nombre (se conservan las conexiones). */
  replacingNode: (nombre) =>
    actividad(`corregir el workflow sustituyendo el nodo "${nombre}"`, (actor) => {
      const a = api(actor);
      a.obtenerWorkflow(actor.recall('wf').id).then((actual) => {
        const nodos = actual.nodes.map((n) => (n.name === nombre ? a.nodoCampos({ corregido: true }, nombre) : n));
        a.req('PATCH', `/rest/workflows/${actual.id}`, { versionId: actual.versionId, nodes: nodos, connections: actual.connections })
          .its('status').should('eq', 200);
      });
    }),
};

export const PublishSubWorkflow = {
  /** Workflow hijo (Execute Workflow Trigger → Edit Fields «desde: hijo») publicado. */
  returning: (campos) =>
    actividad('publicar un workflow hijo', (actor) => {
      const a = api(actor);
      const disparador = Nodes.subWorkflowTrigger;
      a.req('POST', '/rest/workflows', {
        name: 'VyV BDD hijo', nodes: [disparador, a.nodoCampos(campos)], connections: a.cadena(disparador.name, 'Edit Fields'), settings: {}, active: false,
      }).then(a.ok).then((hijo) => {
        Stage.registrar('workflow', hijo.id);
        actor.remember('wf:hijo', hijo);
        a.req('POST', `/rest/workflows/${hijo.id}/activate`, { versionId: hijo.versionId }).its('status').should('eq', 200);
      });
    }),
};
