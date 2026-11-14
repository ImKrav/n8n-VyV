/**
 * Pasos Gherkin comunes a los cuatro módulos (Dado / Cuando / Entonces), implementados con Screenplay.
 * El actor se comparte entre archivos de pasos con la escena (screenplay/Stage.js). Los pasos de cada
 * módulo están en workflows-steps.js, executions-steps.js, credentials-steps.js y core-steps.js.
 */
import { Given, When, Then, Before } from '@badeball/cypress-cucumber-preprocessor';
import { Stage } from '../../screenplay/Stage.js';
import { n8nApi } from '../api.js';
import { CallTheWebhook, OpenWorkflow, PublishWebhookWorkflow } from '../../screenplay/tasks/index.js';
import { LastResponse, LatestExecution, WebhookResponse, WorkflowExecutions } from '../../screenplay/questions/index.js';

const actor = () => Stage.actorInTheSpotlight();

Before(() => Stage.reset());

// Cada escenario borra lo que creó (FIRST: Independent, Repeatable). Es un afterEach de Mocha y no un
// After de Cucumber porque el After no se ejecuta cuando un paso falla.
afterEach(() => {
  const sinLog = { log: false };
  Stage.creados().forEach(({ tipo, id }) => {
    if (tipo === 'workflow') {
      n8nApi.req('POST', '/rest/executions/stopMany', { filter: { workflowId: id, status: ['new', 'running', 'waiting'] } }, sinLog);
      n8nApi.req('POST', `/rest/workflows/${id}/deactivate`, undefined, sinLog);
      n8nApi.req('POST', `/rest/workflows/${id}/archive`, undefined, sinLog);
      n8nApi.req('DELETE', `/rest/workflows/${id}`, undefined, sinLog);
    }
    if (tipo === 'credential') n8nApi.req('DELETE', `/rest/credentials/${id}`, undefined, sinLog);
    if (tipo === 'tag') n8nApi.req('DELETE', `/rest/tags/${id}`, undefined, sinLog);
  });
});

// ----------------------------------------------------------------- Actor
Given('que {string} es una usuaria con sesión iniciada en n8n', (nombre) => {
  Stage.actorCalled(nombre);
  cy.loginApi();
});

// ----------------------------------------------------------------- Respuestas de la API
Then('la respuesta tiene el código {int}', (codigo) => actor().asks(LastResponse.status()).should('eq', codigo));
Then('la respuesta tiene un código de error', () => actor().asks(LastResponse.status()).should('be.at.least', 400));
Then('el mensaje contiene {string}', (texto) =>
  actor().asks(LastResponse.message()).then((m) => expect(m.toLowerCase()).to.contain(texto.toLowerCase())));

// ----------------------------------------------------------------- Workflows de webhook (módulos 1 a 3)
Given('que publica un workflow de webhook que responde con el campo {string}', (campo) =>
  actor().attemptsTo(PublishWebhookWorkflow.with({ nodos: [n8nApi.nodoCampos({ [campo]: true })] })));
Given('que publica un workflow de webhook que falla con el mensaje {string}', (mensaje) =>
  actor().attemptsTo(PublishWebhookWorkflow.with({ nodos: [n8nApi.nodoFalla(mensaje)] })));
Given('que publica un workflow de webhook con una espera de {int} minuto(s)', (minutos) =>
  actor().attemptsTo(PublishWebhookWorkflow.with({ nodos: [n8nApi.nodoEspera(minutos, 'minutes')], modo: 'onReceived' })));

When('llama al webhook de producción', () => actor().attemptsTo(CallTheWebhook.ofTheWorkflow()));
When('llama una vez al webhook de producción', () => actor().attemptsTo(CallTheWebhook.ofTheWorkflow({ intentos: 1 })));
When('llama al webhook de producción con el parámetro {string} igual a {string}', (clave, valor) =>
  actor().attemptsTo(CallTheWebhook.ofTheWorkflow({ query: `?${new URLSearchParams({ [clave]: valor })}` })));
When('abre el workflow en el editor', () => actor().attemptsTo(OpenWorkflow.inTheEditor()));

Then('el webhook responde con el código {int}', (codigo) => actor().asks(WebhookResponse.status()).should('eq', codigo));
Then('el workflow tiene {int} ejecución(es) con el estado {string} en modo {string}', (n, estado, modo) =>
  actor().asks(WorkflowExecutions.atLeastOne()).then((lista) => {
    expect(lista, 'ejecuciones del workflow').to.have.length(n);
    lista.forEach((e) => expect(e).to.include({ status: estado, mode: modo }));
  }));
Then('la última ejecución del workflow termina con el estado {string}', (estado) =>
  actor().asks(LatestExecution.settled()).its('status').should('eq', estado));
Then('la última ejecución del workflow queda en estado {string}', (estado) =>
  actor().asks(LatestExecution.withStatus(estado)).its('status').should('eq', estado));
