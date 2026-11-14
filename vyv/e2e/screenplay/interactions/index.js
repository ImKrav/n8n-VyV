import { actividad } from '../Actor.js';
import { BrowseTheWeb, CallAnApi } from '../abilities/index.js';

/** Elementos de la interfaz que usan las interacciones y las preguntas. */
export const Target = {
  canvasNode: (nombre) => `[data-test-id="canvas-node"]${nombre ? `[data-node-name="${nombre}"]` : ''}`,
  canvasEdge: (origen, destino) =>
    `[data-test-id="edge"][data-source-node-name="${origen}"][data-target-node-name="${destino}"]`,
  publicationIndicator: '[data-test-id="workflow-active-version-indicator"]',
  executionCard: 'div.execution-card',
  resourceItem: '[data-test-id="resources-list-item"]',
  credentialModal: '[data-test-id="editCredential-modal"]',
  credentialValueInput: '[data-test-id="parameter-input-value"] input',
};

/** Envía una petición a la API de n8n y guarda la respuesta como «ultimaRespuesta». */
export const Send = {
  a: (metodo, url, body) =>
    actividad(`enviar ${metodo} ${url}`, (actor) =>
      actor.abilityTo(CallAnApi).api.req(metodo, url, body).then((r) => actor.remember('ultimaRespuesta', r))),
};

/** Interacciones atómicas sobre la interfaz. */
export const Navigate = {
  to: (ruta) => actividad(`navegar a ${ruta}`, (actor) => actor.abilityTo(BrowseTheWeb).visitar(ruta)),
};

export const Click = {
  on: (testId, opciones = {}) =>
    actividad(`hacer clic en [${testId}]`, () => cy.tid(testId).first().click(opciones)),
  onText: (texto) => actividad(`hacer clic en "${texto}"`, () => cy.contains(texto).click()),
};

export const Enter = {
  theValue: (valor) => ({
    into: (testId) =>
      actividad(`escribir "${valor}" en [${testId}]`, () => {
        cy.campo(testId).clear().type(valor);
      }),
  }),
};

export const Press = {
  key: (tecla) => actividad(`presionar ${tecla}`, () => cy.focused().type(`{${tecla}}`)),
  /** Atajos del lienzo: se escriben sobre el documento, como lo hace la persona usuaria. */
  onCanvas: (teclas) => actividad(`presionar ${teclas} en el lienzo`, () => cy.get('body').type(teclas)),
};

export const Select = {
  canvasNode: (nombre) => actividad(`seleccionar el nodo "${nombre}"`, () => cy.get(Target.canvasNode(nombre), { timeout: 30000 }).click()),
};
