/// <reference types="cypress" />
/**
 * CR-03 · Credenciales OAuth2 · URL de autorización, scopes y cancelación (caja negra, API).
 * Trazabilidad: CP-CR-03-01, 03-03 y 03-04.
 * Éxito: 03-01 (URL de redirección de la instancia) · alternativo: 03-04 (scopes)
 * · error: 03-03 (el usuario cancela en el proveedor), credencial inexistente.
 * Sin proveedor real: 03-02 y 03-06 se cubren en units/ con dobles de prueba; 03-05 es manual (ver vyv/README.md).
 */
import { n8nApi } from '../../support/api.js';

const datosOAuth = {
  grantType: 'authorizationCode',
  authUrl: 'https://auth.example.com/authorize',
  accessTokenUrl: 'https://auth.example.com/token',
  clientId: 'cliente-vyv',
  clientSecret: 'secreto-vyv',
  scope: 'read write',
  authQueryParameters: '',
  authentication: 'header',
};

describe('CR-03 · OAuth2 (API)', () => {
  let cred;
  before(() => {
    cy.loginApi();
    n8nApi.req('POST', '/rest/credentials', { name: `VyV OAuth2 ${Date.now()}`, type: 'oAuth2Api', data: datosOAuth }).then(n8nApi.ok).then((c) => { cred = c; });
  });
  beforeEach(() => cy.loginApi());
  after(() => cred && n8nApi.borrarCredencial(cred.id));

  const urlAutorizacion = () => n8nApi.req('GET', `/rest/oauth2-credential/auth?id=${cred.id}`).then(n8nApi.ok).then((u) => new URL(u));

  it('CP-CR-03-01 · la URL de autorización apunta al proveedor y su redirect_uri es el callback de esta instancia', () => {
    urlAutorizacion().then((url) => {
      const redirect = url.searchParams.get('redirect_uri');
      cy.evidencia(`Autorización: ${url.origin}${url.pathname} · redirect_uri=${redirect}`);
      expect(`${url.origin}${url.pathname}`).to.eq(datosOAuth.authUrl);
      expect(redirect).to.eq(`${Cypress.config('baseUrl')}/rest/oauth2-credential/callback`);
      expect(url.searchParams.get('client_id')).to.eq(datosOAuth.clientId);
      expect(url.searchParams.get('response_type')).to.eq('code');
      expect(url.searchParams.get('state'), 'incluye un state anti-CSRF').to.have.length.greaterThan(10);
    });
  });

  it('CP-CR-03-04 · (alternativo) los scopes de la URL coinciden con los configurados en la credencial', () => {
    urlAutorizacion().then((url) => {
      const scopes = url.searchParams.get('scope').split(' ');
      cy.evidencia(`Scopes pedidos al proveedor: ${scopes.join(', ')}`);
      expect(scopes).to.deep.eq(datosOAuth.scope.split(' '));
    });
  });

  it('CP-CR-03-03 · (error) si el usuario cancela en el proveedor, el callback informa el error y no se guarda token', () => {
    cy.request({ url: '/rest/oauth2-credential/callback?error=access_denied&state=vyv', failOnStatusCode: false }).then((r) => {
      const texto = r.body.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      cy.evidencia(`Callback con error=access_denied → HTTP ${r.status}: ${texto.slice(0, 120)}`);
      expect(texto).to.contain('The OAuth2 server returned an error');
      expect(texto).to.contain('access_denied');
      expect(texto).to.contain('Failed to connect');
    });
    n8nApi.req('GET', `/rest/credentials/${cred.id}?includeData=true`).then(n8nApi.ok).then((c) => {
      expect(c.data, 'la credencial no queda conectada').not.to.have.property('oauthTokenData');
    });
  });

  it('CP-CR-03 · (error) pedir la URL de autorización de una credencial inexistente responde 404', () => {
    n8nApi.req('GET', '/rest/oauth2-credential/auth?id=no-existe-vyv').then((r) => {
      cy.evidencia(`Autorizar una credencial inexistente → HTTP ${r.status}: ${r.body.message}`);
      expect(r.status).to.eq(404);
      expect(r.body.message).to.eq('Credential not found');
    });
  });
});
