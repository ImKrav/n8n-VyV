/**
 * Preguntas del módulo 2 · Ejecuciones. Devuelven Chainables; los pasos «Entonces» hacen las aserciones.
 */
import { pregunta } from '../Actor.js';
import { CallAnApi } from '../abilities/index.js';
import { latestExecution } from '../tasks/executions.js';

const api = (actor) => actor.abilityTo(CallAnApi).api;

/** Nombres de los nodos en el orden real de ejecución (por executionIndex). */
const ordenReal = (runData) =>
  Object.entries(runData).flatMap(([n, runs]) => runs.map((r) => [n, r.executionIndex])).sort((a, b) => a[1] - b[1]).map(([n]) => n);

export const LatestExecution = {
  /** La ejecución más reciente que ya terminó. */
  settled: (alias) => pregunta('la última ejecución terminada', (a) => latestExecution(a, undefined, alias)),
  /** La ejecución más reciente con el estado dado (espera hasta que lo tenga). */
  withStatus: (estado, alias) => pregunta(`la última ejecución en estado «${estado}»`, (a) => latestExecution(a, (e) => e.status === estado, alias)),
  /** Estado de la misma ejecución leído de nuevo; espera hasta `estado` (n8n guarda el cambio poco después). */
  statusReaching: (estado) =>
    pregunta(`el estado actual de la ejecución (se espera «${estado}»)`, (a) => {
      const leer = (intentos) =>
        api(a).req('GET', `/rest/executions/${a.recall('ejecucion').id}`).then(api(a).ok).then((e) =>
          (e.status === estado || intentos <= 1 ? e.status : cy.wait(500).then(() => leer(intentos - 1))));
      return leer(10);
    }),
};

export const ExecutionLog = {
  /** Detalle de la última ejecución terminada, con `data` decodificado: lo que muestran la vista previa y el panel de logs. */
  ofTheLatest: () =>
    pregunta('el registro de la última ejecución', (a) => latestExecution(a).then((e) => api(a).detalleEjecucion(e.id))),
  order: () => pregunta('el orden de los nodos en el registro', (a) => ExecutionLog.ofTheLatest().answeredBy(a).then((d) => ordenReal(d.data.resultData.runData))),
  outputOf: (nodo) =>
    pregunta(`la salida de "${nodo}" en el registro`, (a) =>
      ExecutionLog.ofTheLatest().answeredBy(a).then((d) => d.data.resultData.runData[nodo]?.[0]?.data?.main?.flat()?.[0]?.json)),
};

export const ListedExecutions = {
  all: () => pregunta('las ejecuciones listadas', (a) => cy.wrap(a.recall('listaEjecuciones'))),
};

export const Retry = {
  result: () => pregunta('el resultado del reintento', (a) => cy.wrap(a.recall('reintento'))),
};

export const ExecutionsOfWorkflow = {
  ids: (alias) => pregunta('los ids de las ejecuciones del workflow', (a) => api(a).ejecuciones(a.recall(alias ? `wf:${alias}` : 'wf').id).then((l) => l.map((e) => e.id))),
};
