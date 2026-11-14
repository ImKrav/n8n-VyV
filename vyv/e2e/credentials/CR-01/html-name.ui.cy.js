/// <reference types="cypress" />
/**
 * CR-01 · Crear credenciales · un nombre con etiquetas HTML se muestra como texto (caja negra, UI).
 * Trazabilidad: CP-CR-01-08 (error: entrada con marcado). El nombre lleva un <img onerror> que,
 * si se interpretara como HTML, fijaría una marca en `window`.
 */
import { n8nApi } from '../../support/api.js';

describe('CR-01 · Nombre de credencial con HTML (UI)', () => {
  let credencial;
  const marca = `vyv${Date.now() % 100000}`;
  // La etiqueta de cierre se arma en ejecución: escrita literal cerraría el <script> con el que Cypress carga este archivo.
  const cierre = ['<', '/script>'].join('');
  const nombre = `<img src=x onerror="window.__vyvMarca=1"><script>window.__vyvMarca=1${cierre}${marca}`;
  before(() => {
    cy.loginApi();
    // Sin registrar la petición ni su cuerpo: el registro de comandos de Cypress pinta ese HTML y rompería el propio runner.
    n8nApi.req('POST', '/rest/credentials', { name: nombre, type: 'httpHeaderAuth', data: { name: 'X-API-Key', value: 'html' } }, { log: false })
      .then((r) => {
        credencial = r.body.data;
        expect(r.status, 'credencial creada').to.eq(200);
      });
  });
  beforeEach(() => cy.loginApi());
  after(() => credencial && n8nApi.borrarCredencial(credencial.id));

  it('CP-CR-01-08 · (error) el nombre se muestra literal y no ejecuta ningún script', () => {
    cy.on('window:alert', () => { throw new Error('se ejecutó un alert'); });
    cy.visitarN8n('/home/credentials');
    cy.get('input[data-test-id="resources-list-search"], [data-test-id="resources-list-search"] input').first().type(marca);
    cy.get('[data-test-id="resources-list-item"]', { timeout: 30000 }).should('have.length', 1).first().within(() => {
      cy.contains('<script>').should('be.visible');
      cy.get('img[src="x"], script').should('not.exist');
    });
    cy.window().its('__vyvMarca').should('be.undefined');
    cy.screenshot('CP-CR-01-08_nombre-html');
    cy.evidencia('El nombre con <img onerror> y <script> aparece como texto y no se ejecuta');
  });
});
