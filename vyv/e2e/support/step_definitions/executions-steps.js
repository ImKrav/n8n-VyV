/**
 * Pasos Gherkin del módulo 2 · Ejecuciones (EX-01 a EX-05), implementados con Screenplay.
 */
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { Stage } from '../../screenplay/Stage.js';
import { n8nApi } from '../api.js';
import {
  CallTheWebhook, DeleteExecution, FilterExecutions, FixWorkflow, Nodes, OpenWorkflow, PrepareExecutions,
  PublishSubWorkflow, PublishWebhookWorkflow, RetryExecution, StopExecution,
} from '../../screenplay/tasks/index.js';
import {
  ExecutionCards, ExecutionLog, ExecutionsOfWorkflow, LastResponse, LatestExecution, ListedExecutions, Retry,
  WebhookResponse, WorkflowExecutions,
} from '../../screenplay/questions/index.js';

const actor = () => Stage.actorInTheSpotlight();
const lista = (texto) => texto.split(',').map((s) => s.trim());
const ids = (ejecuciones) => ejecuciones.map((e) => e.id);

// ----------------------------------------------------------------- EX-01 Lista
When('abre la lista de ejecuciones del workflow en el editor', () => actor().attemptsTo(OpenWorkflow.executions()));
Then('la lista del editor muestra {int} ejecución(es)', (n) => actor().asks(ExecutionCards.displayed()).should('have.length', n));
Then('la lista del editor muestra {int} ejecución(es) con el texto {string}', (n, texto) =>
  actor().asks(ExecutionCards.displayed()).should('have.length', n).and('contain.text', texto));

// ----------------------------------------------------------------- EX-02 Filtros
Given('que tiene una ejecución exitosa y una ejecución fallida en workflows distintos', () => actor().attemptsTo(PrepareExecutions.successAndFailure()));
When('filtra las ejecuciones por el estado {string}', (estado) => actor().attemptsTo(FilterExecutions.by({ status: [estado] })));
When('filtra las ejecuciones del workflow {string}', (alias) => actor().attemptsTo(FilterExecutions.by({ workflow: alias })));
When('filtra las ejecuciones del workflow {string} con el estado {string}', (alias, estado) =>
  actor().attemptsTo(FilterExecutions.by({ workflow: alias, status: [estado] })));
When('consulta la lista de ejecuciones con {string}', (consulta) => actor().attemptsTo(FilterExecutions.withQuery(consulta)));
Then('todas las ejecuciones listadas tienen el estado {string}', (estado) =>
  actor().asks(ListedExecutions.all()).then((l) => {
    expect(l, 'ejecuciones listadas').not.to.be.empty;
    expect(l.every((e) => e.status === estado), `solo «${estado}»`).to.eq(true);
  }));
Then('la lista incluye la ejecución del workflow {string}', (alias) =>
  actor().asks(ListedExecutions.all()).then((l) => expect(ids(l)).to.include(actor().recall(`ejec:${alias}`).id)));
Then('la lista contiene solo la ejecución del workflow {string}', (alias) =>
  actor().asks(ListedExecutions.all()).then((l) => expect(ids(l)).to.deep.eq([actor().recall(`ejec:${alias}`).id])));
Then('la lista de ejecuciones está vacía', () => actor().asks(ListedExecutions.all()).should('have.length', 0));

// ----------------------------------------------------------------- EX-03 Vista previa, reintento y eliminación
When('corrige el workflow sustituyendo el nodo {string}', (nodo) => actor().attemptsTo(FixWorkflow.replacingNode(nodo)));
When('reintenta la última ejecución con la versión actual', () => actor().attemptsTo(RetryExecution.latest(true)));
When('reintenta la última ejecución con la versión original', () => actor().attemptsTo(RetryExecution.latest(false)));
When('elimina la última ejecución', () => actor().attemptsTo(DeleteExecution.latest()));
Then('la vista previa de la última ejecución muestra los nodos {string}', (texto) =>
  actor().asks(ExecutionLog.ofTheLatest()).then((d) => expect(Object.keys(d.data.resultData.runData)).to.deep.eq(lista(texto))));
Then('la salida de {string} en la vista previa coincide con la respuesta del webhook', (nodo) =>
  actor().asks(ExecutionLog.outputOf(nodo)).then((salida) => expect(salida).to.deep.eq(actor().recall('respuestaWebhook').body)));
Then('el reintento queda enlazado a la ejecución original y termina con el estado {string}', (estado) =>
  actor().asks(Retry.result()).then((r) => expect(r).to.include({ retryOf: actor().recall('ejecucionOriginal').id, mode: 'retry', status: estado })));
Then('la ejecución eliminada ya no aparece en la lista del workflow', () =>
  actor().asks(ExecutionsOfWorkflow.ids()).should('not.include', actor().recall('ejecucion').id));
Then('el registro indica que el último nodo ejecutado es {string}', (nodo) =>
  actor().asks(ExecutionLog.ofTheLatest()).its('data.resultData.lastNodeExecuted').should('eq', nodo));
Then('el error de la ejecución es {string}', (mensaje) =>
  actor().asks(ExecutionLog.ofTheLatest()).its('data.resultData.error.message').should('eq', mensaje));

// ----------------------------------------------------------------- EX-04 Detener
When('detiene la última ejecución', () => actor().attemptsTo(StopExecution.latest()));
When('detiene en bloque las ejecuciones en espera del workflow {string}', (alias) => actor().attemptsTo(StopExecution.waitingOf(alias)));
Given('que publica los workflows en espera {string} y {string} y llama a sus webhooks', (a, b) => {
  [a, b].forEach((alias) =>
    actor().attemptsTo(
      PublishWebhookWorkflow.with({ alias, nodos: [n8nApi.nodoEspera(5, 'minutes')], modo: 'onReceived' }),
      CallTheWebhook.ofTheWorkflow({ alias }),
    ));
  // Las preguntas leen la memoria al formularse: se esperan a que terminen las publicaciones.
  cy.then(() => [a, b].forEach((alias) => actor().asks(LatestExecution.withStatus('waiting', alias))));
});
Then('la ejecución queda en estado {string}', (estado) => actor().asks(LatestExecution.statusReaching(estado)).should('eq', estado));
Then('la respuesta informa {int} ejecución(es) detenida(s)', (n) => actor().asks(LastResponse.body()).its('data.stopped').should('eq', n));
Then('la ejecución del workflow {string} sigue en estado {string}', (alias, estado) =>
  actor().asks(WorkflowExecutions.of(alias)).then((l) => expect(l[0]?.status).to.eq(estado)));

// ----------------------------------------------------------------- EX-05 Panel de logs
Given('que publica un workflow de webhook con una bifurcación If entre {string} y {string}', (si, no) =>
  actor().attemptsTo(PublishWebhookWorkflow.with({
    nodos: [Nodes.ifOk(), n8nApi.nodoCampos({ rama: 'si' }, si, [440, -100]), n8nApi.nodoCampos({ rama: 'no' }, no, [440, 100])],
    connections: Nodes.ifConnections(n8nApi, si, no),
  })));
Given('que publica un workflow de webhook con una bifurcación If cuya rama {string} falla', (si) =>
  actor().attemptsTo(PublishWebhookWorkflow.with({
    nodos: [Nodes.ifOk(), n8nApi.nodoFalla('fallo en la rama', si, [440, -100]), n8nApi.nodoCampos({ rama: 'no' }, 'Rama no', [440, 100])],
    connections: Nodes.ifConnections(n8nApi, si, 'Rama no'),
  })));
Given('que tiene publicado un workflow hijo que devuelve el campo {string} con el valor {string}', (campo, valor) =>
  actor().attemptsTo(PublishSubWorkflow.returning({ [campo]: valor })));
Given('publica un workflow de webhook que llama al workflow hijo', () =>
  actor().attemptsTo(PublishWebhookWorkflow.with({ nodos: [Nodes.executeWorkflow(actor().recall('wf:hijo').id)] })));

Then('el registro de la última ejecución sigue el orden {string}', (texto) => actor().asks(ExecutionLog.order()).should('deep.eq', lista(texto)));
Then('el registro no incluye el nodo {string}', (nodo) =>
  actor().asks(ExecutionLog.ofTheLatest()).its('data.resultData.runData').should('not.have.property', nodo));
Then('la salida de {string} en el registro tiene el campo {string} con el valor {string}', (nodo, campo, valor) =>
  actor().asks(ExecutionLog.outputOf(nodo)).its(campo).should('eq', valor));
Then('en el registro el nodo {string} termina con error y el nodo {string} termina bien', (conError, bien) =>
  actor().asks(ExecutionLog.ofTheLatest()).then((d) => {
    const { runData } = d.data.resultData;
    expect(d.status).to.eq('error');
    expect(runData[conError][0].executionStatus).to.eq('error');
    expect(runData[bien][0].executionStatus, 'los nodos previos terminan bien').to.eq('success');
  }));
Then('la respuesta del webhook tiene el campo {string} con el valor {string}', (campo, valor) =>
  actor().asks(WebhookResponse.body()).its(campo).should('eq', valor));
Then('el registro enlaza el nodo {string} con una ejecución del workflow hijo', (nodo) =>
  actor().asks(ExecutionLog.ofTheLatest()).then((d) =>
    expect(d.data.resultData.runData[nodo][0].metadata?.subExecution).to.include({ workflowId: actor().recall('wf:hijo').id })));
