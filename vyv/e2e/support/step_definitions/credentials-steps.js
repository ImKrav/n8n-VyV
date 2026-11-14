/**
 * Pasos Gherkin del módulo 3 · Credenciales (CR-01 a CR-05), implementados con Screenplay.
 * Los nombres «vyv_…» se hacen únicos por ejecución; los de CR-05 comparten un prefijo para buscarlos
 * por un término parcial.
 */
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { Stage } from '../../screenplay/Stage.js';
import {
  CancelAtTheProvider, CreateCredential, DeleteCredential, OpenCredentials, PublishWorkflowUsingCredential,
  ReplaceNodeCredential, RequestAuthorizationUrl, SearchCredentials, ShareCredential, StartEchoService,
  TestCredential, UpdateCredential,
} from '../../screenplay/tasks/index.js';
import {
  AuthorizationUrl, CredentialCards, CredentialForm, CredentialSearch, CredentialTest, EchoedHeader, ExecutionLog,
  LastResponse, ListedCredentials, OAuthCallback, SavedWorkflow, StoredCredential,
} from '../../screenplay/questions/index.js';

const actor = () => Stage.actorInTheSpotlight();
// La pregunta lee la memoria al formularse: se espera a que termine la publicación.
const publicadoConExito = () => cy.then(() => actor().asks(LastResponse.status()).should('eq', 200));

// ----------------------------------------------------------------- Preparación
Given('que existe el servicio de eco publicado', () => actor().attemptsTo(StartEchoService.published()));
Given('que existe la credencial Header Auth {string} con la cabecera {string} y el valor {string}', (nombre, cabecera, valor) =>
  actor().attemptsTo(CreateCredential.headerAuth(nombre, cabecera, valor, nombre)));
Given('que existe la credencial Basic Auth {string}', (nombre) => actor().attemptsTo(CreateCredential.basicAuth(nombre, nombre)));
Given('que tiene las credenciales Header Auth {string} y {string} y la credencial Basic Auth {string}', (a, b, c) =>
  actor().attemptsTo(
    CreateCredential.headerAuth(Stage.conPrefijo(a), 'X-A', 'a', a),
    CreateCredential.headerAuth(Stage.conPrefijo(b), 'X-A', 'b', b),
    CreateCredential.basicAuth(Stage.conPrefijo(c), c),
  ));
Given('que publica un workflow que llama al eco con esa credencial', () => {
  actor().attemptsTo(PublishWorkflowUsingCredential.current());
  publicadoConExito();
});
Given('que publica un workflow que llama al eco sin credencial', () => {
  actor().attemptsTo(PublishWorkflowUsingCredential.none());
  publicadoConExito();
});

// ----------------------------------------------------------------- CR-01 Crear y probar
When('crea la credencial Header Auth {string} con la cabecera {string} y el valor {string}', (nombre, cabecera, valor) =>
  actor().attemptsTo(CreateCredential.headerAuth(nombre, cabecera, valor, nombre)));
When('crea dos credenciales Header Auth llamadas {string}', (nombre) =>
  actor().attemptsTo(CreateCredential.headerAuth(nombre, 'X-A', 'a', 'primera'), CreateCredential.headerAuth(nombre, 'X-A', 'b', 'segunda')));
When('prueba una credencial n8n API con la clave {string}', (clave) => actor().attemptsTo(TestCredential.n8nApiWithKey(clave)));
When('intenta crear una credencial de tipo {string}', (tipo) =>
  actor().attemptsTo(CreateCredential.withBody({ name: `VyV BDD tipo ${Stage.sufijo()}`, type: tipo, data: {} })));
When('abre el listado de credenciales buscando {string}', (nombre) => actor().attemptsTo(OpenCredentials.listSearching(Stage.unico(nombre))));

Then('la búsqueda por el nombre {string} devuelve {int} credencial(es)', (nombre, n) =>
  actor().asks(CredentialSearch.byName(Stage.unico(nombre))).should('have.length', n));
Then('las dos credenciales tienen identificadores distintos', () =>
  cy.then(() => expect(actor().recall('cred:primera').id).not.to.eq(actor().recall('cred:segunda').id)));
Then('la prueba de conexión responde {string} con el mensaje {string}', (estado, mensaje) =>
  actor().asks(CredentialTest.result()).should('deep.eq', { status: estado, message: mensaje }));
Then('el listado del editor muestra {int} credencial(es) llamada(s) {string}', (n, nombre) =>
  actor().asks(CredentialCards.displayed()).should('have.length', n).each((item) => expect(item.text()).to.contain(nombre)));

// ----------------------------------------------------------------- CR-02 Editar y eliminar
When('cambia el valor de la credencial a {string}', (valor) => actor().attemptsTo(UpdateCredential.value(valor)));
When('abre la primera credencial del listado', () => actor().attemptsTo(OpenCredentials.firstOfTheList()));
When('elimina la credencial', () => actor().attemptsTo(DeleteCredential.current()));
Then('el eco recibe la cabecera {string} con el valor {string}', (cabecera, valor) => actor().asks(EchoedHeader.named(cabecera)).should('eq', valor));
Then('el campo secreto no muestra el valor {string}', (valor) => actor().asks(CredentialForm.secretValue()).should('not.eq', valor));
Then('la credencial ya no se puede consultar', () => actor().asks(StoredCredential.response()).its('status').should('eq', 404));
Then('la última ejecución del workflow falla en el nodo {string} con el error {string}', (nodo, tipo) =>
  actor().asks(ExecutionLog.ofTheLatest()).then((d) => {
    const ejecucion = d.data.resultData.runData[nodo][0];
    expect(d.data.resultData.lastNodeExecuted).to.eq(nodo);
    expect(ejecucion.executionStatus).to.eq('error');
    expect(JSON.stringify(ejecucion.redactedError ?? ejecucion.error)).to.contain(tipo);
  }));
Then('la última ejecución del workflow falla en el nodo {string} con un mensaje sobre {string}', (nodo, tema) =>
  actor().asks(ExecutionLog.ofTheLatest()).then((d) => {
    expect(d.data.resultData.lastNodeExecuted).to.eq(nodo);
    expect(d.data.resultData.error?.message).to.match(new RegExp(tema, 'i'));
  }));

// ----------------------------------------------------------------- CR-03 OAuth2
Given('que existe una credencial OAuth2 del proveedor {string} con los scopes {string}', (authUrl, scope) =>
  actor().attemptsTo(CreateCredential.oauth2({
    grantType: 'authorizationCode', authUrl, accessTokenUrl: 'https://auth.example.com/token', clientId: 'cliente-vyv',
    clientSecret: 'secreto-vyv', scope, authQueryParameters: '', authentication: 'header',
  })));
When('pide la URL de autorización de la credencial', () => actor().attemptsTo(RequestAuthorizationUrl.ofTheCredential()));
When('pide la URL de autorización de la credencial {string}', (id) => actor().attemptsTo(RequestAuthorizationUrl.ofCredentialId(id)));
When('cancela la autorización en el proveedor', () => actor().attemptsTo(CancelAtTheProvider.withError('access_denied')));
Then('la URL de autorización apunta a {string}', (url) => actor().asks(AuthorizationUrl.parsed()).then((u) => expect(`${u.origin}${u.pathname}`).to.eq(url)));
Then('la URL de autorización vuelve al callback de esta instancia', () =>
  actor().asks(AuthorizationUrl.parsed()).then((u) => {
    expect(u.searchParams.get('redirect_uri')).to.eq(`${Cypress.config('baseUrl')}/rest/oauth2-credential/callback`);
    expect(u.searchParams.get('state'), 'incluye un state').to.have.length.greaterThan(10);
  }));
Then('la URL de autorización pide los scopes {string}', (scope) =>
  actor().asks(AuthorizationUrl.parsed()).then((u) => expect(u.searchParams.get('scope').split(' ')).to.deep.eq(scope.split(' '))));
Then('la página de callback informa {string}', (texto) => actor().asks(OAuthCallback.text()).should('contain', texto));
Then('la credencial no guarda un token de acceso', () =>
  actor().asks(StoredCredential.response()).its('body.data.data').should('not.have.property', 'oauthTokenData'));

// ----------------------------------------------------------------- CR-04 Credenciales en nodos
When('publica un workflow que llama al eco con una credencial que no existe', () => actor().attemptsTo(PublishWorkflowUsingCredential.missing()));
When('sustituye la credencial del nodo por {string}', (nombre) => actor().attemptsTo(ReplaceNodeCredential.with(nombre)));
When('filtra las credenciales por el tipo {string}', (tipo) => actor().attemptsTo(SearchCredentials.byType(tipo)));
Then('el nodo {string} guardado usa la credencial {string}', (nodo, nombre) =>
  actor().asks(SavedWorkflow.named()).then((wf) => {
    const c = actor().recall(`cred:${nombre}`);
    expect(wf.nodes.find((n) => n.name === nodo).credentials.httpHeaderAuth).to.deep.eq({ id: c.id, name: c.name });
  }));
Then('todas las credenciales listadas son del tipo {string}', (tipo) =>
  actor().asks(ListedCredentials.types()).then((tipos) => {
    expect(tipos, 'credenciales listadas').not.to.be.empty;
    expect(tipos.every((t) => t === tipo)).to.eq(true);
  }));
Then('la lista incluye la credencial {string}', (nombre) => actor().asks(ListedCredentials.names()).should('include', Stage.unico(nombre)));
Then('la lista no incluye la credencial {string}', (nombre) => actor().asks(ListedCredentials.names()).should('not.include', Stage.unico(nombre)));

// ----------------------------------------------------------------- CR-05 Listado y permisos
When('busca sus credenciales por {string}', (termino) => actor().attemptsTo(SearchCredentials.byName(Stage.conPrefijo(termino))));
When('busca {string} en el listado de credenciales del editor', (termino) => actor().attemptsTo(OpenCredentials.listSearching(Stage.conPrefijo(termino))));
When('intenta compartir la credencial {string}', (nombre) => {
  cy.then(() => actor().remember('cred', actor().recall(`cred:${nombre}`)));
  actor().attemptsTo(ShareCredential.current());
});
Then('el resultado contiene solo {string}', (nombre) =>
  actor().asks(ListedCredentials.names()).then((n) => expect(n.map(Stage.sinPrefijo)).to.deep.eq([nombre])));
Then('el resultado incluye {string}', (nombre) => actor().asks(ListedCredentials.names()).should('include', Stage.conPrefijo(nombre)));
Then('el resultado está vacío', () => actor().asks(ListedCredentials.names()).should('have.length', 0));
Then('la credencial {string} no queda compartida', (nombre) =>
  actor().asks(StoredCredential.response(nombre)).then((r) => expect(r.body.data.sharedWithProjects ?? [], 'proyectos con acceso').to.have.length(0)));
