/**
 * Pasos Gherkin del módulo 1 · Workflows (WF-01 a WF-05), implementados con Screenplay.
 */
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { Stage } from '../../screenplay/Stage.js';
import { n8nApi } from '../api.js';
import { Target } from '../../screenplay/interactions/index.js';
import {
  PrepareWorkflow, PublishWebhookWorkflow, Publish, Unpublish, SaveSettings, SaveChanges, RestoreVersion,
  RequestVersion, NameVersion, ImportWorkflow, SaveWorkflow, PrepareTaggedWorkflow, DuplicateWorkflow,
  OpenWorkflow, DeleteNode, Undo,
} from '../../screenplay/tasks/index.js';
import { Canvas, CurrentPage, LatestExecution, WebhookResponse, SavedWorkflow, VersionHistory, WorkflowExecutions } from '../../screenplay/questions/index.js';

const actor = () => Stage.actorInTheSpotlight();
const lista = (texto) => texto.split(',').map((s) => s.trim());
const nombres = (nodos) => nodos.map((n) => n.name).sort();

// ----------------------------------------------------------------- WF-01 Lienzo
Given('que tiene un workflow con los nodos {string} conectados en cadena', (texto) => actor().attemptsTo(PrepareWorkflow.withNodes(lista(texto))));
Given('que publica un workflow de webhook con el nodo desactivado {string} antes del nodo {string}', (desactivado, final) => {
  const nodoDesactivado = { ...n8nApi.nodoCampos({ [desactivado.toLowerCase()]: 'si' }, desactivado), disabled: true };
  const nodoFinal = n8nApi.nodoCampos({ [final.toLowerCase()]: 'ok' }, final, [440, 0]);
  nodoFinal.parameters.includeOtherFields = true;
  actor().attemptsTo(PublishWebhookWorkflow.with({ nodos: [nodoDesactivado, nodoFinal] }));
});

When('elimina el nodo {string} del lienzo', (nodo) => actor().attemptsTo(DeleteNode.named(nodo)));
When('deshace el último cambio con el teclado', () => actor().attemptsTo(Undo.lastChange()));
When('abre en el editor el workflow con id {string}', (id) => actor().attemptsTo(OpenWorkflow.withId(id)));

Then('el lienzo muestra {int} nodos', (n) => actor().asks(Canvas.nodes()).should('have.length', n));
Then('el lienzo no muestra nodos', () => cy.get(Target.canvasNode()).should('not.exist'));
Then('el lienzo no muestra el nodo {string}', (nodo) => actor().asks(Canvas.node(nodo)).should('not.exist'));
Then('el lienzo muestra la conexión de {string} a {string}', (o, d) => actor().asks(Canvas.edge(o, d)).should('exist'));
Then('el lienzo no muestra la conexión de {string} a {string}', (o, d) => actor().asks(Canvas.edge(o, d)).should('not.exist'));
Then('el nodo {string} aparece como desactivado en el lienzo', (nodo) => actor().asks(Canvas.node(nodo)).should('contain.text', 'Deactivated'));
Then('la respuesta del webhook incluye el campo {string}', (campo) => actor().asks(WebhookResponse.body()).should('have.property', campo));
Then('la respuesta del webhook no incluye el campo {string}', (campo) => actor().asks(WebhookResponse.body()).should('not.have.property', campo));
Then('ve la página {string} con el aviso {string}', (ruta, aviso) => {
  actor().asks(CurrentPage.path()).should('eq', ruta);
  cy.contains(aviso).should('be.visible');
});

// ----------------------------------------------------------------- WF-02 Ajustes
When('guarda la zona horaria {string} y un timeout de {int} segundos', (zona, segundos) =>
  actor().attemptsTo(SaveSettings.of({ timezone: zona, executionTimeout: segundos })));
Then('el workflow guardado tiene la zona horaria {string} y un timeout de {int} segundos', (zona, segundos) =>
  actor().asks(SavedWorkflow.named()).its('settings').should('include', { timezone: zona, executionTimeout: segundos }));

Given('que publica un workflow de webhook que no guarda las ejecuciones exitosas', () =>
  actor().attemptsTo(PublishWebhookWorkflow.with({ settings: { saveDataSuccessExecution: 'none' }, modo: 'onReceived' })));
Then('el workflow no tiene ejecuciones guardadas', () => {
  cy.wait(1500); // n8n guarda la ejecución después de responder al webhook.
  actor().asks(WorkflowExecutions.of()).should('have.length', 0);
});

Given('que publica un workflow de webhook con una espera de {int} segundos y un timeout de {int} segundo(s)', (espera, timeout) =>
  actor().attemptsTo(PublishWebhookWorkflow.with({ nodos: [n8nApi.nodoEspera(espera)], settings: { executionTimeout: timeout }, modo: 'onReceived' })));

Given('que tiene publicado un workflow de error', () => actor().attemptsTo(PublishWebhookWorkflow.asErrorHandler()));
Given('publica un workflow de webhook que falla y usa ese workflow de error', () =>
  actor().attemptsTo(PublishWebhookWorkflow.with({ nodos: [n8nApi.nodoFalla('fallo BDD')], settings: { errorWorkflow: actor().recall('wf:error').id } })));
Then('el workflow de error tiene una ejecución en modo {string} con el estado {string}', (modo, estado) =>
  actor().asks(LatestExecution.settled('error')).then((e) => expect(e).to.include({ mode: modo, status: estado })));

// ----------------------------------------------------------------- WF-03 Publicar
When('despublica el workflow', () => actor().attemptsTo(Unpublish.theWorkflow()));
When('intenta publicar el workflow', () => actor().attemptsTo(Publish.theWorkflow()));
When('intenta publicar otro workflow con la misma ruta y el mismo método', () => actor().attemptsTo(Publish.aSecondWorkflowOnTheSameWebhook()));
Then('el editor indica que el workflow está publicado', () => actor().asks(Canvas.publicationIndicator()).should('match', /indicatorPublished/));
Then('el workflow sigue sin publicar', () => actor().asks(SavedWorkflow.named()).its('active').should('eq', false));

// ----------------------------------------------------------------- WF-04 Historial
When('(que )guarda {int} cambios en el workflow', (n) => actor().attemptsTo(SaveChanges.times(n)));
When('restaura la primera versión del historial', () => actor().attemptsTo(RestoreVersion.first()));
When('consulta la versión {string} del historial', (v) => actor().attemptsTo(RequestVersion.named(v)));
When('intenta nombrar la última versión {string}', (nombre) => actor().attemptsTo(NameVersion.latestAs(nombre)));
Then('el historial tiene {int} versiones con la más reciente primero', (n) =>
  actor().asks(VersionHistory.ofTheWorkflow()).then((versiones) => {
    expect(versiones, 'versiones del historial').to.have.length(n);
    expect(versiones[0].versionId, 'la primera es la versión actual').to.eq(actor().recall('wf').versionId);
    const fechas = versiones.map((v) => Date.parse(v.createdAt));
    expect(fechas, 'orden descendente').to.deep.eq([...fechas].sort((a, b) => b - a));
  }));
Then('el workflow guardado tiene los nodos de la primera versión', () =>
  actor().asks(SavedWorkflow.named()).then((wf) => expect(nombres(wf.nodes)).to.deep.eq(nombres(actor().recall('versionRestaurada').nodes))));

// ----------------------------------------------------------------- WF-05 Importar y duplicar
Given('que tiene el workflow {string} con la etiqueta {string}', (nombre, etiqueta) =>
  actor().attemptsTo(PrepareTaggedWorkflow.named(nombre, Stage.unico(etiqueta))));
When('lo duplica con el nombre {string}', (nombre) => actor().attemptsTo(DuplicateWorkflow.as(nombre)));
When('renombra el duplicado a {string}', (nombre) => actor().attemptsTo(DuplicateWorkflow.renameCopyTo(nombre)));
When('guarda un workflow con un nombre de {int} caracteres', (n) => actor().attemptsTo(SaveWorkflow.named('x'.repeat(n))));
When('importa un workflow desde la URL {string}', (url) => actor().attemptsTo(ImportWorkflow.fromUrl(url)));
Then('el duplicado tiene la etiqueta {string}', (etiqueta) =>
  actor().asks(SavedWorkflow.copy()).then((c) => expect(c.tags.map((t) => t.name)).to.deep.eq([Stage.unico(etiqueta)])));
Then('el original conserva el nombre {string} y su versión', (nombre) =>
  actor().asks(SavedWorkflow.named('original')).then((o) => {
    expect(o.name).to.eq(nombre);
    expect(o.versionId, 'el original no cambia').to.eq(actor().recall('wf:original').versionId);
  }));
