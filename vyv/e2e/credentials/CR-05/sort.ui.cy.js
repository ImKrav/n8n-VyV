/// <reference types="cypress" />
/**
 * CR-05 · Listado y permisos de credenciales · cambiar el orden del listado desde el desplegable (UI).
 * Trazabilidad: CP-CR-05-02. La prueba unitaria cubre el orden por defecto; el desplegable de
 * element-plus solo se abre en un navegador real.
 */
import { n8nApi } from '../../support/api.js';

describe('CR-05 · Orden del listado de credenciales (UI)', () => {
  const prefijo = `vyvorden${Date.now() % 100000}`;
  const nombres = ['Bravo', 'Charlie', 'Alpha'].map((n) => `${prefijo} ${n}`);
  const creadas = [];
  before(() => {
    cy.loginApi();
    // Se crean en este orden: Alpha es la más reciente.
    nombres.forEach((n) => n8nApi.crearCredencialHeader(n, 'X-API-Key', 'orden').then((c) => creadas.push(c)));
  });
  beforeEach(() => cy.loginApi());
  after(() => creadas.forEach((c) => n8nApi.borrarCredencial(c.id)));

  /** Nombres de las tarjetas visibles, en el orden de la pantalla. */
  const visibles = () =>
    cy.get('[data-test-id="resources-list-item"]').then(($items) =>
      [...$items].map((el) => el.querySelector('h2')?.textContent.trim() ?? '').filter((t) => t.startsWith(prefijo)),
    );
  const ordenar = (opcion) => {
    cy.get('[data-test-id="resources-list-sort"]').click();
    cy.contains('[data-test-id="resources-list-sort-item"]:visible', opcion).click();
  };
  const abrirListado = () => {
    cy.visitarN8n('/home/credentials');
    cy.get('input[data-test-id="resources-list-search"], [data-test-id="resources-list-search"] input').first().clear().type(prefijo);
    cy.get('[data-test-id="resources-list-item"]').should('have.length', 3);
  };

  it('CP-CR-05-02 · el listado respeta el orden por nombre y por última actualización', () => {
    abrirListado();

    // Paso 1 · Orden por nombre A-Z.
    ordenar('Sort by name (A-Z)');
    visibles().should('deep.equal', [...nombres].sort());
    cy.screenshot('CP-CR-05-02_nombre_az');

    // Paso 2 · Orden por última actualización: la más reciente primero.
    ordenar('Sort by last updated');
    visibles().should('deep.equal', [nombres[2], nombres[1], nombres[0]]);

    // Paso 3 · Editar Bravo (la más antigua) y volver a ordenar por fecha: pasa al primer lugar.
    cy.then(() => {
      const bravo = creadas.find((c) => c.name === nombres[0]);
      return n8nApi.req('PATCH', `/rest/credentials/${bravo.id}`, {
        name: bravo.name, type: 'httpHeaderAuth', data: { name: 'X-API-Key', value: 'orden-editado' },
      });
    }).its('status').should('eq', 200);
    abrirListado();
    ordenar('Sort by last updated');
    visibles().then((orden) => {
      cy.evidencia(`Orden por última actualización tras editar ${nombres[0]}: ${orden.join(' > ')}`);
      expect(orden[0], 'la editada pasa al primer lugar').to.eq(nombres[0]);
    });
    cy.screenshot('CP-CR-05-02_ultima_actualizacion');
  });
});
