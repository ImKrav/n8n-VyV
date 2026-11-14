/**
 * Tareas del módulo 3 · Credenciales (CR-01 a CR-05).
 * Un workflow de eco (Webhook que devuelve las cabeceras recibidas) muestra qué valor envía un nodo.
 * Memoria del actor: «cred» (la credencial actual), «cred:<alias>», «urlEco», «resultadoPrueba»,
 * «listaCredenciales», «callback».
 */
import { actividad } from '../Actor.js';
import { CallAnApi } from '../abilities/index.js';
import { Navigate, Send, Target } from '../interactions/index.js';
import { Stage } from '../Stage.js';

const api = (actor) => actor.abilityTo(CallAnApi).api;

const recordar = (actor, cred, alias) => {
  Stage.registrar('credential', cred.id);
  actor.remember('cred', cred);
  if (alias) actor.remember(`cred:${alias}`, cred);
};

export const StartEchoService = {
  published: () =>
    actividad('publicar el servicio de eco', (actor) =>
      api(actor).crearEco().then(({ wf, ruta }) => {
        Stage.registrar('workflow', wf.id);
        actor.remember('urlEco', `${Cypress.config('baseUrl')}/webhook/${ruta}`);
        api(actor).llamarWebhook('GET', ruta).its('status').should('eq', 200);
      })),
};

export const CreateCredential = {
  headerAuth: (nombre, cabecera, valor, alias) =>
    actividad(`crear la credencial Header Auth «${nombre}»`, (actor) =>
      api(actor).crearCredencialHeader(Stage.unico(nombre), cabecera, valor).then((c) => recordar(actor, { ...c, data: { name: cabecera, value: valor } }, alias))),
  basicAuth: (nombre, alias) =>
    actividad(`crear la credencial Basic Auth «${nombre}»`, (actor) =>
      api(actor).req('POST', '/rest/credentials', { name: Stage.unico(nombre), type: 'httpBasicAuth', data: { user: 'u', password: 'p' } })
        .then(api(actor).ok).then((c) => recordar(actor, c, alias))),
  oauth2: (datos) =>
    actividad('crear una credencial OAuth2', (actor) =>
      api(actor).req('POST', '/rest/credentials', { name: `VyV BDD OAuth2 ${Stage.sufijo()}`, type: 'oAuth2Api', data: datos })
        .then(api(actor).ok).then((c) => { recordar(actor, c); actor.remember('datosOAuth', datos); })),
  /** Petición tal cual: sirve para los casos de error (tipo inexistente, datos incompletos). */
  withBody: (body) =>
    actividad(`intentar crear la credencial ${JSON.stringify(body).slice(0, 60)}`, (actor) =>
      api(actor).req('POST', '/rest/credentials', body).then((r) => {
        if (r.status === 200) recordar(actor, r.body.data);
        actor.remember('ultimaRespuesta', r);
      })),
};

export const TestCredential = {
  /** Crea una credencial «n8n API» contra la API pública de esta instancia y prueba la conexión. */
  n8nApiWithKey: (apiKey) =>
    actividad('probar una credencial «n8n API»', (actor) => {
      const a = api(actor);
      const nombre = `VyV BDD n8n API ${Stage.sufijo()}`;
      const datos = { apiKey, baseUrl: `${Cypress.config('baseUrl')}/api/v1` };
      a.req('POST', '/rest/credentials', { name: nombre, type: 'n8nApi', data: datos }).then(a.ok).then((c) => {
        recordar(actor, c);
        a.req('POST', '/rest/credentials/test', { credentials: { id: c.id, name: nombre, type: 'n8nApi', data: datos } })
          .then(a.ok).then((r) => actor.remember('resultadoPrueba', r));
      });
    }),
};

export const UpdateCredential = {
  /** PATCH con el nombre, el tipo y los datos completos, como envía el formulario. */
  value: (valor) =>
    actividad(`cambiar el valor de la credencial a «${valor}»`, (actor) => {
      const c = actor.recall('cred');
      api(actor).req('PATCH', `/rest/credentials/${c.id}`, { name: c.name, type: c.type, data: { ...c.data, value: valor } })
        .its('status').should('eq', 200);
    }),
};

export const DeleteCredential = {
  current: () => actividad('eliminar la credencial', (actor) => actor.attemptsTo(Send.a('DELETE', `/rest/credentials/${actor.recall('cred').id}`))),
  withId: (id) => actividad(`eliminar la credencial ${id}`, (actor) => actor.attemptsTo(Send.a('DELETE', `/rest/credentials/${id}`))),
};

/** Nodo HTTP Request hacia el eco. `cred` undefined = sin credencial asignada. */
const usar = (cred) =>
  actividad(`publicar un workflow que llama al eco ${cred ? `con «${cred.name}»` : 'sin credencial'}`, (actor) => {
    const n = api(actor);
    const ruta = n.rutaUnica('vyv-bdd-cred');
    n.req('POST', '/rest/workflows', {
      name: 'VyV BDD usa credencial', nodes: [n.nodoWebhook('GET', ruta), n.nodoHttpCredencial(actor.recall('urlEco'), cred)],
      connections: n.cadena('Webhook', 'HTTP Request'), settings: {}, active: false,
    }).then(n.ok).then((wf) => {
      Stage.registrar('workflow', wf.id);
      actor.remember('wf', wf).remember('ruta', ruta);
      actor.attemptsTo(Send.a('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }));
    });
  });

export const PublishWorkflowUsingCredential = {
  current: () => actividad('publicar un workflow con la credencial actual', (actor) => actor.attemptsTo(usar(actor.recall('cred')))),
  none: () => usar(undefined),
  /** Credencial de otra instancia: el JSON importado la referencia, pero aquí no existe. */
  missing: () => usar({ id: 'no-existe-vyv', name: 'Credencial de otra instancia' }),
};

export const ReplaceNodeCredential = {
  with: (alias) =>
    actividad(`sustituir la credencial del nodo por «${alias}»`, (actor) => {
      const a = api(actor);
      const nueva = actor.recall(`cred:${alias}`);
      a.obtenerWorkflow(actor.recall('wf').id).then((wf) => {
        const nodos = wf.nodes.map((n) => (n.name === 'HTTP Request' ? { ...n, credentials: { httpHeaderAuth: { id: nueva.id, name: nueva.name } } } : n));
        a.req('PATCH', `/rest/workflows/${wf.id}`, { versionId: wf.versionId, nodes: nodos, connections: wf.connections }).its('status').should('eq', 200);
      });
    }),
};

export const RequestAuthorizationUrl = {
  ofTheCredential: () =>
    actividad('pedir la URL de autorización OAuth2', (actor) =>
      actor.attemptsTo(Send.a('GET', `/rest/oauth2-credential/auth?id=${actor.recall('cred').id}`))),
  ofCredentialId: (id) => actividad(`pedir la URL de autorización de ${id}`, (actor) => actor.attemptsTo(Send.a('GET', `/rest/oauth2-credential/auth?id=${id}`))),
};

export const CancelAtTheProvider = {
  /** El proveedor redirige al callback con error=access_denied cuando la persona cancela. */
  withError: (error) =>
    actividad(`volver del proveedor con error=${error}`, (actor) =>
      cy.request({ url: `/rest/oauth2-credential/callback?error=${error}&state=vyv`, failOnStatusCode: false }).then((r) => {
        const texto = String(r.body).replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        actor.remember('callback', texto);
      })),
};

export const ShareCredential = {
  /** Compartir es una función de licencia: en la edición community la API la rechaza. */
  current: () =>
    actividad('compartir la credencial', (actor) =>
      actor.attemptsTo(Send.a('PUT', `/rest/credentials/${actor.recall('cred').id}/share`, { shareWithIds: [] }))),
};

export const SearchCredentials = {
  byName: (termino) =>
    actividad(`buscar credenciales por «${termino}»`, (actor) => {
      const filtro = encodeURIComponent(JSON.stringify({ name: termino }));
      api(actor).req('GET', `/rest/credentials?filter=${filtro}`).then(api(actor).ok).then((l) => actor.remember('listaCredenciales', l));
    }),
  byType: (tipo) =>
    actividad(`filtrar credenciales por el tipo «${tipo}»`, (actor) => {
      const filtro = encodeURIComponent(JSON.stringify({ type: tipo }));
      api(actor).req('GET', `/rest/credentials?filter=${filtro}`).then(api(actor).ok).then((l) => actor.remember('listaCredenciales', l));
    }),
};

export const OpenCredentials = {
  /** El editor conserva la búsqueda en la URL (?search=). */
  listSearching: (termino) =>
    actividad(`abrir el listado de credenciales buscando «${termino}»`, (actor) =>
      actor.attemptsTo(Navigate.to(`/home/credentials?search=${encodeURIComponent(termino)}`))),
  firstOfTheList: () =>
    actividad('abrir la primera credencial del listado', () => {
      cy.get(Target.resourceItem, { timeout: 30000 }).first().click();
      cy.get(Target.credentialModal, { timeout: 30000 }).should('be.visible');
    }),
};
