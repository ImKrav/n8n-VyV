/// <reference types="cypress" />
/**
 * CR-05 · Listado y permisos de credenciales · búsqueda, filtro por tipo y compartir (caja negra, API).
 * Trazabilidad: CP-CR-05-01, 05-03 y 05-06.
 * Éxito: 05-01 (término parcial), 05-03 (filtro por tipo) · alternativo: 05-01 (término inexistente)
 * · error: 05-06 (compartir sin licencia).
 */
import { n8nApi } from '../../support/api.js';

const listar = (filter) =>
  n8nApi.req('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify(filter))}`).then(n8nApi.ok);

describe('CR-05 · Buscar, filtrar y compartir credenciales (API)', () => {
  const prefijo = `vyvbusca${Date.now() % 100000}`;
  const creadas = {};
  before(() => {
    cy.loginApi();
    n8nApi.crearCredencialHeader(`${prefijo} Facturación`, 'X-A', 'a').then((c) => { creadas.factura = c; });
    n8nApi.crearCredencialHeader(`${prefijo} Correo`, 'X-A', 'b').then((c) => { creadas.correo = c; });
    n8nApi.req('POST', '/rest/credentials', { name: `${prefijo} Básica`, type: 'httpBasicAuth', data: { user: 'u', password: 'p' } }).then(n8nApi.ok).then((c) => { creadas.basica = c; });
  });
  beforeEach(() => cy.loginApi());
  after(() => Object.values(creadas).forEach((c) => n8nApi.borrarCredencial(c.id)));

  it('CP-CR-05-01 · un término parcial devuelve solo las coincidencias', () => {
    listar({ name: `${prefijo} Fact` }).then((lista) => {
      cy.evidencia(`«${prefijo} Fact» → ${lista.map((c) => c.name).join(', ')}`);
      expect(lista.map((c) => c.id)).to.deep.eq([creadas.factura.id]);
    });
    listar({ name: prefijo }).its('length').should('eq', 3);
  });

  it('CP-CR-05-01 · (alternativo) un término inexistente devuelve un listado vacío', () => {
    listar({ name: `${prefijo}-no-existe` }).then((lista) => {
      cy.evidencia(`Término inexistente → ${lista.length} credenciales`);
      expect(lista).to.have.length(0);
    });
  });

  it('CP-CR-05-03 · el filtro por tipo solo muestra credenciales de ese tipo', () => {
    listar({ name: prefijo, type: 'httpBasicAuth' }).then((lista) => {
      cy.evidencia(`type=httpBasicAuth → ${lista.map((c) => `${c.name} (${c.type})`).join(', ')}`);
      expect(lista.map((c) => c.id)).to.deep.eq([creadas.basica.id]);
    });
    listar({ name: prefijo, type: 'httpHeaderAuth' }).then((lista) => {
      expect(lista.map((c) => c.id)).to.have.members([creadas.factura.id, creadas.correo.id]);
    });
  });

  it('CP-CR-05-06 · (error) compartir una credencial sin licencia responde 403 y no la comparte', () => {
    n8nApi.req('PUT', `/rest/credentials/${creadas.correo.id}/share`, { shareWithIds: [] }).then((r) => {
      cy.evidencia(`Compartir sin licencia → HTTP ${r.status}: ${r.body.message}`);
      expect(r.status).to.eq(403);
      expect(r.body.message).to.match(/license/i);
    });
    n8nApi.req('GET', `/rest/credentials/${creadas.correo.id}`).then(n8nApi.ok).then((c) => {
      expect(c.sharedWithProjects ?? [], 'no queda compartida').to.have.length(0);
    });
  });
});
