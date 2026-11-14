/// <reference types="cypress" />
/**
 * ES-06 · Rotación de credenciales (escenario extremo a extremo del plan).
 * Editar una credencial usada por varios workflows y verificar que todos usan el valor nuevo;
 * reconectar una credencial OAuth2. Cubre CR-02, CR-03 y EX-01.
 * Límite: completar la reconexión OAuth2 necesita una cuenta real del proveedor (igual que
 * CP-CR-03-05, manual). La prueba verifica la parte automatizable: la reconexión pide una URL de
 * autorización nueva (state nuevo) con la misma URL de redirección.
 * Se ejecuta en las dos resoluciones del plan.
 */
import { n8nApi } from '../support/api.js';

const RESOLUCIONES = [[1366, 768], [1920, 1080]];
const datosOAuth = {
  grantType: 'authorizationCode', authUrl: 'https://auth.example.com/authorize', accessTokenUrl: 'https://auth.example.com/token',
  clientId: 'cliente-vyv', clientSecret: 'secreto-vyv', scope: 'read', authQueryParameters: '', authentication: 'header',
};

describe('ES-06 · Rotación de credenciales', () => {
  const workflows = [];
  const credenciales = [];
  let urlEco;
  before(() => {
    cy.loginApi();
    n8nApi.crearEco().then(({ wf, ruta }) => {
      workflows.push(wf.id);
      urlEco = `${Cypress.config('baseUrl')}/webhook/${ruta}`;
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
    });
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    workflows.forEach((id) => n8nApi.desactivarWorkflow(id));
    credenciales.forEach((id) => n8nApi.borrarCredencial(id));
  });

  RESOLUCIONES.forEach(([ancho, alto]) => {
    it(`ES-06 · rotar una credencial usada por dos workflows y reconectar OAuth2 (${ancho} × ${alto})`, () => {
      cy.viewport(ancho, alto);
      const rutas = [n8nApi.rutaUnica('vyv-es06a'), n8nApi.rutaUnica('vyv-es06b')];
      let cred;

      // 1 · Una credencial usada por dos workflows publicados.
      cy.nombreUnico(`VyV-ES06-${ancho}`).then((n) => n8nApi.crearCredencialHeader(n, 'X-Token', 'antes')).then((c) => {
        cred = c;
        credenciales.push(c.id);
        rutas.forEach((ruta, i) =>
          n8nApi.crearWorkflowActivo(`VyV ES-06 ${i + 1} ${ancho}`, [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoHttpCredencial(urlEco, c)], n8nApi.cadena('Webhook', 'HTTP Request'))
            .then((w) => workflows.push(w.id)));
      });
      cy.then(() => rutas.forEach((ruta) => n8nApi.llamarWebhook('GET', ruta).its('body.headers.x-token').should('eq', 'antes')));

      // 2 · Rotar el valor: los dos workflows envían el valor nuevo.
      cy.then(() =>
        n8nApi.req('PATCH', `/rest/credentials/${cred.id}`, { name: cred.name, type: 'httpHeaderAuth', data: { name: 'X-Token', value: 'despues' } }),
      ).its('status').should('eq', 200);
      cy.then(() => rutas.forEach((ruta) => n8nApi.llamarWebhook('GET', ruta).its('body.headers.x-token').should('eq', 'despues')));
      cy.then(() => workflows.slice(-2).forEach((id) => n8nApi.ejecuciones(id).then((l) => {
        expect(l.map((e) => e.status)).to.deep.eq(['success', 'success']);
      })));

      // 3 · Reconectar OAuth2: cada intento pide una URL nueva con la misma redirección.
      n8nApi.req('POST', '/rest/credentials', { name: `VyV ES-06 OAuth2 ${ancho}`, type: 'oAuth2Api', data: datosOAuth }).then(n8nApi.ok).then((o) => {
        credenciales.push(o.id);
        const auth = () => n8nApi.req('GET', `/rest/oauth2-credential/auth?id=${o.id}`).then(n8nApi.ok).then((u) => new URL(u));
        auth().then((primera) => auth().then((segunda) => {
          expect(segunda.searchParams.get('redirect_uri')).to.eq(primera.searchParams.get('redirect_uri'));
          expect(segunda.searchParams.get('state'), 'state nuevo en cada conexión').not.to.eq(primera.searchParams.get('state'));
          cy.evidencia(`${ancho}×${alto}: credencial ${cred.id} rotada (antes → despues) en 2 workflows con éxito · OAuth2: 2 URLs de autorización con state distinto y redirect_uri ${segunda.searchParams.get('redirect_uri')}`);
        }));
      });

      // 4 · La credencial rotada en la interfaz: el valor sigue enmascarado.
      cy.then(() => {
        cy.visitarN8n('/home/credentials');
        cy.get('input[data-test-id="resources-list-search"], [data-test-id="resources-list-search"] input').first().type(cred.name);
        cy.get('[data-test-id="resources-list-item"]', { timeout: 30000 }).should('have.length', 1).first().click();
        cy.get('[data-test-id="parameter-input-value"] input', { timeout: 15000 }).invoke('val').should('not.eq', 'despues');
        cy.screenshot(`ES-06_${ancho}x${alto}_credencial-rotada`);
      });
    });
  });
});
