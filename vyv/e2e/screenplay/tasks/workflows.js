/**
 * Tareas del módulo 1 · Workflows (WF-01 a WF-05).
 * La preparación de datos usa la API; abrir el editor, eliminar nodos y deshacer usan la interfaz.
 * Memoria del actor: «wf» (workflow actual), «wf:<alias>», «ruta» (path del webhook),
 * «respuestaWebhook», «ultimaRespuesta», «versiones», «copia».
 */
import { actividad } from '../Actor.js';
import { CallAnApi } from '../abilities/index.js';
import { Navigate, Press, Select, Send } from '../interactions/index.js';
import { Stage } from '../Stage.js';

const api = (actor) => actor.abilityTo(CallAnApi).api;

export const disparadorManual = {
  id: 'mt', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {},
};
const errorTrigger = {
  id: 'et', name: 'Error Trigger', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0], parameters: {},
};

/** «Manual Trigger» es el disparador; cualquier otro nombre es un Edit Fields con un campo propio. */
const nodoPorNombre = (actor, nombre, i) =>
  (nombre === 'Manual Trigger' ? disparadorManual : api(actor).nodoCampos({ [`campo${i}`]: i }, nombre, [220 * i, 0]));

/** Guarda el workflow como «wf» (y «wf:<alias>») y lo anota para borrarlo al final. */
const recordar = (actor, wf, alias) => {
  Stage.registrar('workflow', wf.id);
  actor.remember('wf', wf);
  if (alias) actor.remember(`wf:${alias}`, wf);
};

export const PrepareWorkflow = {
  /** Workflow sin publicar con los nodos dados conectados en cadena. */
  withNodes: (nombres) =>
    actividad(`preparar un workflow con ${nombres.join(' → ')}`, (actor) => {
      const nodes = nombres.map((n, i) => nodoPorNombre(actor, n, i));
      api(actor).req('POST', '/rest/workflows', {
        name: `VyV BDD ${Stage.sufijo()}`, nodes, connections: api(actor).cadena(...nombres), settings: {}, active: false,
      }).then(api(actor).ok).then((wf) => recordar(actor, wf));
    }),
};

export const PublishWebhookWorkflow = {
  /**
   * Publica Webhook → `nodos`. `modo` «lastNode» responde con la salida del último nodo y
   * «onReceived» responde al recibir la llamada (para esperas largas).
   */
  with: ({ nodos = [], connections, settings = {}, modo = 'lastNode', alias, nombre = 'VyV BDD webhook' } = {}) =>
    actividad(`publicar un workflow de webhook${alias ? ` «${alias}»` : ''}`, (actor) => {
      const a = api(actor);
      const ruta = a.rutaUnica('vyv-bdd');
      const nodes = [a.nodoWebhook('GET', ruta, modo), ...nodos];
      const conexiones = connections ?? a.cadena(...nodes.map((n) => n.name));
      a.req('POST', '/rest/workflows', { name: nombre, nodes, connections: conexiones, settings, active: false })
        .then(a.ok)
        .then((wf) => {
          recordar(actor, wf, alias);
          actor.remember('ruta', ruta);
          if (alias) actor.remember(`ruta:${alias}`, ruta);
          a.req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }).then((r) => {
            expect(r.status, `publicar: ${JSON.stringify(r.body).slice(0, 200)}`).to.eq(200);
          });
        });
    }),
  /** Workflow de error (Error Trigger → Edit Fields) publicado: n8n solo ejecuta la versión publicada. */
  asErrorHandler: () =>
    actividad('publicar un workflow de error', (actor) => {
      const a = api(actor);
      a.req('POST', '/rest/workflows', {
        name: 'VyV BDD manejador de errores', nodes: [errorTrigger, a.nodoCampos({ manejado: true })],
        connections: a.cadena('Error Trigger', 'Edit Fields'), settings: {}, active: false,
      }).then(a.ok).then((wf) => {
        Stage.registrar('workflow', wf.id);
        actor.remember('wf:error', wf);
        a.req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }).its('status').should('eq', 200);
      });
    }),
};

export const CallTheWebhook = {
  /** Llama a la URL de producción. Con `intentos` 1 no reintenta mientras responde 404. */
  ofTheWorkflow: ({ query = '', alias, intentos = 10 } = {}) =>
    actividad(`llamar al webhook de producción${query}`, (actor) => {
      const ruta = actor.recall(alias ? `ruta:${alias}` : 'ruta');
      api(actor).llamarWebhook('GET', `${ruta}${query}`, {}, intentos).then((r) => actor.remember('respuestaWebhook', r));
    }),
};

export const Publish = {
  theWorkflow: () =>
    actividad('intentar publicar el workflow', (actor) => {
      const wf = actor.recall('wf');
      actor.attemptsTo(Send.a('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }));
    }),
  /** Un segundo workflow con la misma ruta y el mismo método que el webhook ya publicado. */
  aSecondWorkflowOnTheSameWebhook: () =>
    actividad('intentar publicar otro workflow con la misma ruta y método', (actor) => {
      const a = api(actor);
      a.req('POST', '/rest/workflows', {
        name: 'VyV BDD ruta repetida', nodes: [a.nodoWebhook('GET', actor.recall('ruta'))], connections: {}, settings: {}, active: false,
      }).then(a.ok).then((wf) => {
        Stage.registrar('workflow', wf.id);
        actor.attemptsTo(Send.a('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }));
      });
    }),
};

export const Unpublish = {
  theWorkflow: () =>
    actividad('despublicar el workflow', (actor) => api(actor).desactivarWorkflow(actor.recall('wf').id).its('status').should('eq', 200)),
};

export const SaveSettings = {
  of: (ajustes) =>
    actividad(`guardar los ajustes ${JSON.stringify(ajustes)}`, (actor) => {
      const wf = actor.recall('wf');
      api(actor).req('PATCH', `/rest/workflows/${wf.id}`, { versionId: wf.versionId, settings: ajustes })
        .then(api(actor).ok).then((w) => actor.remember('wf', w));
    }),
};

const noOp = (nombre, x) => ({ id: `noop-${nombre}`, name: nombre, type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [x, 0], parameters: {} });

export const SaveChanges = {
  /** Guarda `veces` cambios: el cambio i deja i nodos No Op tras el disparador. */
  times: (veces) =>
    actividad(`guardar ${veces} cambios`, (actor) => {
      const a = api(actor);
      const wf = actor.recall('wf');
      const versiones = [wf.versionId];
      actor.remember('versiones', versiones);
      Cypress._.times(veces, (j) => {
        cy.then(() => a.req('PATCH', `/rest/workflows/${wf.id}`, {
          versionId: versiones.at(-1),
          nodes: [disparadorManual, ...Array.from({ length: j + 1 }, (_, k) => noOp(`Paso ${k + 1}`, 220 * (k + 1)))],
        }).then(a.ok).then((w) => { versiones.push(w.versionId); actor.remember('wf', w); }));
      });
    }),
};

const historial = (wfId) => `/rest/workflow-history/workflow/${wfId}`;

export const RestoreVersion = {
  /** Restaurar = guardar el contenido de una versión anterior como versión nueva. */
  first: () =>
    actividad('restaurar la primera versión del historial', (actor) => {
      const a = api(actor);
      const wf = actor.recall('wf');
      a.req('GET', `${historial(wf.id)}/version/${actor.recall('versiones')[0]}`).then(a.ok).then((v) => {
        actor.remember('versionRestaurada', v);
        a.req('PATCH', `/rest/workflows/${wf.id}`, { versionId: actor.recall('wf').versionId, nodes: v.nodes, connections: v.connections })
          .then(a.ok).then((w) => actor.remember('wf', w));
      });
    }),
};

export const RequestVersion = {
  named: (versionId) =>
    actividad(`consultar la versión «${versionId}» del historial`, (actor) =>
      actor.attemptsTo(Send.a('GET', `${historial(actor.recall('wf').id)}/version/${versionId}`))),
};

export const NameVersion = {
  latestAs: (nombre) =>
    actividad(`nombrar la última versión «${nombre}»`, (actor) => {
      const wf = actor.recall('wf');
      actor.attemptsTo(Send.a('PATCH', `${historial(wf.id)}/versions/${wf.versionId}`, { name: nombre }));
    }),
};

export const ImportWorkflow = {
  /** Las rutas que empiezan por «/» se resuelven contra la instancia de pruebas. */
  fromUrl: (url) =>
    actividad(`importar un workflow desde ${url}`, (actor) => {
      const completa = url.startsWith('/') ? `${Cypress.config('baseUrl')}${url}` : url;
      actor.abilityTo(CallAnApi).proyecto().then((p) => {
        actor.attemptsTo(Send.a('GET', `/rest/workflows/from-url?${new URLSearchParams({ url: completa, projectId: p })}`));
      });
    }),
};

export const SaveWorkflow = {
  named: (nombre) =>
    actividad(`guardar un workflow llamado «${nombre.slice(0, 20)}${nombre.length > 20 ? '…' : ''}»`, (actor) => {
      api(actor).req('POST', '/rest/workflows', { name: nombre, nodes: [disparadorManual], connections: {}, settings: {}, active: false })
        .then((r) => {
          if (r.status === 200) Stage.registrar('workflow', r.body.data.id);
          actor.remember('ultimaRespuesta', r);
        });
    }),
};

export const PrepareTaggedWorkflow = {
  named: (nombre, etiqueta) =>
    actividad(`preparar el workflow «${nombre}» con la etiqueta «${etiqueta}»`, (actor) => {
      const a = api(actor);
      a.req('POST', '/rest/tags', { name: etiqueta }).then(a.ok).then((tag) => {
        Stage.registrar('tag', tag.id);
        a.req('POST', '/rest/workflows', {
          name: nombre, nodes: [disparadorManual, noOp('No Op', 220)], connections: a.cadena('Manual Trigger', 'No Op'),
          settings: {}, active: false, tags: [tag.id],
        }).then(a.ok).then((wf) => recordar(actor, wf, 'original'));
      });
    }),
};

export const DuplicateWorkflow = {
  /** Duplicar = crear un workflow con el contenido y las etiquetas del original, como hace el editor. */
  as: (nombre) =>
    actividad(`duplicar el workflow como «${nombre}»`, (actor) => {
      const a = api(actor);
      const o = actor.recall('wf:original');
      a.req('POST', '/rest/workflows', {
        name: nombre, nodes: o.nodes, connections: o.connections, settings: {}, active: false, tags: o.tags.map((t) => t.id),
      }).then(a.ok).then((copia) => { Stage.registrar('workflow', copia.id); actor.remember('copia', copia); });
    }),
  renameCopyTo: (nombre) =>
    actividad(`renombrar el duplicado a «${nombre}»`, (actor) => {
      const c = actor.recall('copia');
      api(actor).req('PATCH', `/rest/workflows/${c.id}`, { versionId: c.versionId, name: nombre, nodes: [disparadorManual], connections: {} })
        .its('status').should('eq', 200);
    }),
};

export const OpenWorkflow = {
  inTheEditor: () => actividad('abrir el workflow en el editor', (actor) => actor.attemptsTo(Navigate.to(`/workflow/${actor.recall('wf').id}`))),
  withId: (id) => actividad(`abrir el workflow ${id} en el editor`, (actor) => actor.attemptsTo(Navigate.to(`/workflow/${id}`))),
  executions: () =>
    actividad('abrir la lista de ejecuciones del workflow en el editor', (actor) =>
      actor.attemptsTo(Navigate.to(`/workflow/${actor.recall('wf').id}/executions`))),
};

export const DeleteNode = {
  named: (nombre) => actividad(`eliminar el nodo "${nombre}" del lienzo`, (actor) => actor.attemptsTo(Select.canvasNode(nombre), Press.onCanvas('{del}'))),
};

export const Undo = {
  lastChange: () => actividad('deshacer el último cambio', (actor) => actor.attemptsTo(Press.onCanvas('{ctrl}z'))),
};
