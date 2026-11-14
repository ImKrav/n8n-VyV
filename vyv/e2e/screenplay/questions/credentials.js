/**
 * Preguntas del módulo 3 · Credenciales. Devuelven Chainables; los pasos «Entonces» hacen las aserciones.
 */
import { pregunta } from '../Actor.js';
import { CallAnApi } from '../abilities/index.js';
import { Target } from '../interactions/index.js';

const api = (actor) => actor.abilityTo(CallAnApi).api;

export const EchoedHeader = {
  /** El eco devuelve las cabeceras que recibió del nodo HTTP Request (en minúsculas). */
  named: (cabecera) => pregunta(`la cabecera «${cabecera}» que recibe el eco`, (a) => cy.wrap(a.recall('respuestaWebhook').body?.headers?.[cabecera.toLowerCase()])),
};

export const CredentialTest = {
  result: () => pregunta('el resultado de la prueba de conexión', (a) => cy.wrap(a.recall('resultadoPrueba'))),
};

export const ListedCredentials = {
  names: () => pregunta('los nombres de las credenciales listadas', (a) => cy.wrap(a.recall('listaCredenciales').map((c) => c.name))),
  types: () => pregunta('los tipos de las credenciales listadas', (a) => cy.wrap(a.recall('listaCredenciales').map((c) => c.type))),
};

export const StoredCredential = {
  /** Respuesta completa (código y cuerpo) al leer la credencial actual o la del alias. */
  response: (alias) =>
    pregunta(`la credencial guardada${alias ? ` «${alias}»` : ''}`, (a) =>
      api(a).req('GET', `/rest/credentials/${a.recall(alias ? `cred:${alias}` : 'cred').id}?includeData=true`)),
};

export const CredentialSearch = {
  /** Credenciales cuyo nombre contiene `termino` (búsqueda parcial de la API). */
  byName: (termino) =>
    pregunta(`las credenciales que se llaman «${termino}»`, (a) =>
      api(a).req('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify({ name: termino }))}`).then(api(a).ok)),
};

export const AuthorizationUrl = {
  /** La URL que n8n devuelve para ir a la pantalla de consentimiento del proveedor. */
  parsed: () => pregunta('la URL de autorización', (a) => cy.wrap(new URL(a.recall('ultimaRespuesta').body.data))),
};

export const OAuthCallback = {
  text: () => pregunta('el texto de la página de callback', (a) => cy.wrap(a.recall('callback'))),
};

export const CredentialCards = {
  displayed: () => pregunta('las credenciales del listado del editor', () => cy.get(Target.resourceItem, { timeout: 30000 })),
};

export const CredentialForm = {
  secretValue: () => pregunta('el valor del campo secreto del formulario', () => cy.get(Target.credentialValueInput).invoke('val')),
  pageHtml: () => pregunta('el HTML de la página', () => cy.document().then((d) => d.documentElement.outerHTML)),
};
