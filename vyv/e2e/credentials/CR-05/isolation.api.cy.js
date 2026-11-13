/// <reference types="cypress" />
/**
 * CR-05 · Listado y permisos de credenciales · aislamiento entre usuarios (caja negra).
 * Trazabilidad: CP-CR-05-05. El propietario invita a un miembro por API; el miembro inicia sesión
 * al aceptar la invitación y consulta las credenciales con su propia sesión.
 */
import { n8nApi } from '../../support/api.js';

const h = () => ({ 'browser-id': Cypress.env('browserId') });

describe('CR-05 · Aislamiento de credenciales entre usuarios (API)', () => {
  let privada;
  let miembroId;
  beforeEach(() => cy.loginApi());
  after(() => {
    cy.loginApi();
    if (miembroId) n8nApi.req('DELETE', `/rest/users/${miembroId}`);
    if (privada) n8nApi.borrarCredencial(privada.id);
  });

  it('CP-CR-05-05 · el miembro no ve ni puede consultar una credencial que no se le compartió', () => {
    // Precondición: credencial del propietario sin compartir.
    cy.nombreUnico('VyV-Privada').then((n) => n8nApi.crearCredencialHeader(n, 'X-API-Key', 'privado-vyv')).then((c) => { privada = c; });

    // El propietario invita a un miembro y el miembro acepta (la aceptación inicia su sesión).
    const correo = `vyv.miembro.${Date.now()}@example.com`;
    n8nApi.req('POST', '/rest/invitations', [{ email: correo, role: 'global:member' }]).then((r) => {
      expect(r.status, JSON.stringify(r.body).slice(0, 200)).to.eq(200);
      const invitado = r.body.data[0].user;
      miembroId = invitado.id;
      const token = new URL(invitado.inviteAcceptUrl).searchParams.get('token');
      cy.clearCookies();
      cy.request({
        method: 'POST', url: '/rest/invitations/accept', headers: h(),
        body: { token, firstName: 'Miembro', lastName: 'VyV', password: 'VyvMiembro2026' },
      }).its('status').should('eq', 200);
    });

    // Listado con la sesión del miembro.
    cy.then(() => n8nApi.req('GET', '/rest/credentials')).then((r) => {
      expect(r.status).to.eq(200);
      const ids = r.body.data.map((c) => c.id);
      cy.evidencia(`Miembro · GET /rest/credentials → ${ids.length} credenciales; VyV-Privada visible: ${ids.includes(privada.id)}`);
      expect(ids, 'el listado del miembro no incluye la credencial privada').not.to.include(privada.id);
    });

    // Consulta directa por ID con la sesión del miembro.
    cy.then(() => n8nApi.req('GET', `/rest/credentials/${privada.id}`)).then((r) => {
      cy.evidencia(`Miembro · GET /rest/credentials/${privada.id} → HTTP ${r.status}`);
      expect(r.status, 'acceso denegado').to.be.oneOf([403, 404]);
      expect(JSON.stringify(r.body)).not.to.contain('privado-vyv');
    });
  });
});
