/// <reference types="cypress" />
/**
 * CR-01 · Crear credenciales y probar la conexión (caja negra, API).
 * Trazabilidad: CP-CR-01-01, 01-02, 01-03, 01-04, 01-05 y 01-06.
 * Éxito: 01-01, 01-03 · alternativo: 01-02 (sin dato obligatorio), 01-06 (nombre repetido)
 * · error: 01-04 (clave incorrecta), 01-05 (tipo inexistente).
 */
import { n8nApi } from '../../support/api.js';

describe('CR-01 · Crear credenciales (API)', () => {
  const credenciales = [];
  const claves = [];
  beforeEach(() => cy.loginApi());
  after(() => {
    credenciales.forEach((id) => n8nApi.borrarCredencial(id));
    claves.forEach((id) => n8nApi.req('DELETE', `/rest/api-keys/${id}`));
  });

  const crear = (body) =>
    n8nApi.req('POST', '/rest/credentials', body).then((r) => {
      if (r.status === 200) credenciales.push(r.body.data.id);
      return r;
    });
  /** Crea y prueba una credencial «n8n API» contra la API pública de esta instancia. */
  const probarN8nApi = (nombre, apiKey) => {
    const datos = { apiKey, baseUrl: `${Cypress.config('baseUrl')}/api/v1` };
    return crear({ name: nombre, type: 'n8nApi', data: datos }).then(n8nApi.ok).then((c) =>
      n8nApi.req('POST', '/rest/credentials/test', { credentials: { id: c.id, name: nombre, type: 'n8nApi', data: datos } }).then(n8nApi.ok),
    );
  };

  it('CP-CR-01-01 · una credencial Header Auth con todos sus campos se guarda y aparece en el listado', () => {
    cy.nombreUnico('VyV-Header').then((nombre) =>
      crear({ name: nombre, type: 'httpHeaderAuth', data: { name: 'X-API-Key', value: 'valor-vyv' } }).then(n8nApi.ok).then((c) => {
        expect(c).to.include({ name: nombre, type: 'httpHeaderAuth' });
        n8nApi.req('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify({ name: nombre }))}`).then(n8nApi.ok).then((lista) => {
          cy.evidencia(`Credencial ${c.id} «${nombre}» en el listado: ${lista.length} coincidencia`);
          expect(lista.map((x) => x.id)).to.deep.eq([c.id]);
        });
      }),
    );
  });

  it('CP-CR-01-03 · la credencial «n8n API» con una clave válida de la instancia prueba la conexión con éxito', () => {
    n8nApi.req('POST', '/rest/api-keys', { label: `vyv-${Date.now()}`, expiresAt: null, scopes: ['workflow:list'] }).then(n8nApi.ok).then((clave) => {
      claves.push(clave.id);
      probarN8nApi('VyV n8n API válida', clave.rawApiKey).then((r) => {
        cy.evidencia(`Prueba de conexión: ${r.status} · ${r.message}`);
        expect(r).to.deep.eq({ status: 'OK', message: 'Connection successful!' });
      });
    });
  });

  it('CP-CR-01-04 · (error) la credencial «n8n API» con una clave incorrecta informa el error', () => {
    probarN8nApi('VyV n8n API incorrecta', 'clave-incorrecta-vyv').then((r) => {
      cy.evidencia(`Prueba de conexión: ${r.status} · ${r.message}`);
      expect(r).to.deep.eq({ status: 'Error', message: 'Unauthorized' });
    });
  });

  it('CP-CR-01-05 · (error) un tipo de credencial inexistente se rechaza con 400', () => {
    crear({ name: 'VyV tipo inexistente', type: 'tipoNoExisteVyv', data: {} }).then((r) => {
      cy.evidencia(`Tipo inexistente → HTTP ${r.status}: ${r.body.message}`);
      expect(r.status).to.eq(400);
    });
  });

  it('CP-CR-01-06 · (alternativo) dos credenciales con el mismo nombre se permiten y se distinguen por su ID', () => {
    cy.nombreUnico('VyV-Repetida').then((nombre) => {
      const body = { name: nombre, type: 'httpHeaderAuth', data: { name: 'X-A', value: 'b' } };
      crear(body).then(n8nApi.ok).then((a) =>
        crear(body).then(n8nApi.ok).then((b) => {
          cy.evidencia(`Mismo nombre «${nombre}»: ${a.id} y ${b.id}`);
          expect(a.id).not.to.eq(b.id);
          n8nApi.req('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify({ name: nombre }))}`).then(n8nApi.ok).its('length').should('eq', 2);
        }),
      );
    });
  });

  it('CP-CR-01-02 · (alternativo) la API guarda una credencial sin su campo obligatorio; la validación es de la interfaz', () => {
    crear({ name: 'VyV sin valor', type: 'httpHeaderAuth', data: {} }).then((r) => {
      cy.evidencia(`Header Auth sin «name» ni «value» → HTTP ${r.status}`);
      // Comportamiento observado: la API no valida los campos obligatorios; el formulario los marca.
      expect(r.status).to.eq(200);
      expect(r.body.data.data, 'los datos quedan cifrados aunque estén vacíos').to.be.a('string');
    });
  });
});
