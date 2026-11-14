/**
 * Preguntas del módulo 1 · Workflows. Devuelven Chainables; los pasos «Entonces» hacen las aserciones.
 */
import { pregunta } from '../Actor.js';
import { CallAnApi } from '../abilities/index.js';
import { Target } from '../interactions/index.js';

const api = (actor) => actor.abilityTo(CallAnApi).api;

export const Canvas = {
  nodes: () => pregunta('los nodos del lienzo', () => cy.get(Target.canvasNode(), { timeout: 30000 })),
  node: (nombre) => pregunta(`el nodo "${nombre}" del lienzo`, () => cy.get(Target.canvasNode(nombre), { timeout: 30000 })),
  edge: (origen, destino) => pregunta(`la conexión ${origen} → ${destino}`, () => cy.get(Target.canvasEdge(origen, destino), { timeout: 30000 })),
  publicationIndicator: () =>
    pregunta('el indicador de publicación del editor', () => cy.get(Target.publicationIndicator, { timeout: 30000 }).invoke('attr', 'class')),
};

export const CurrentPage = {
  path: () => pregunta('la ruta de la página actual', () => cy.location('pathname', { timeout: 30000 })),
};

export const WebhookResponse = {
  status: () => pregunta('el código de la respuesta del webhook', (a) => cy.wrap(a.recall('respuestaWebhook').status)),
  body: () => pregunta('el cuerpo de la respuesta del webhook', (a) => cy.wrap(a.recall('respuestaWebhook').body)),
};

export const SavedWorkflow = {
  /** El workflow tal como está guardado ahora (sin alias: el actual). */
  named: (alias) => pregunta(`el workflow guardado${alias ? ` «${alias}»` : ''}`, (a) => api(a).obtenerWorkflow(a.recall(alias ? `wf:${alias}` : 'wf').id)),
  copy: () => pregunta('el duplicado guardado', (a) => api(a).obtenerWorkflow(a.recall('copia').id)),
};

export const VersionHistory = {
  ofTheWorkflow: () =>
    pregunta('el historial de versiones', (a) => api(a).req('GET', `/rest/workflow-history/workflow/${a.recall('wf').id}?take=20`).then(api(a).ok)),
};

export const WorkflowExecutions = {
  /** Ejecuciones guardadas del workflow (las más recientes primero). */
  of: (alias) => pregunta(`las ejecuciones del workflow${alias ? ` «${alias}»` : ''}`, (a) => api(a).ejecuciones(a.recall(alias ? `wf:${alias}` : 'wf').id)),
  /** Espera hasta que el workflow tenga al menos una ejecución. */
  atLeastOne: (alias) =>
    pregunta(`las ejecuciones del workflow${alias ? ` «${alias}»` : ''}`, (a) => api(a).esperarEjecuciones(a.recall(alias ? `wf:${alias}` : 'wf').id, 1)),
};

export const ExecutionCards = {
  displayed: () => pregunta('las tarjetas de la lista de ejecuciones del editor', () => cy.get(Target.executionCard, { timeout: 30000 })),
};
