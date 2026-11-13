/// <reference types="cypress" />
/**
 * CO-01 · Data tables desde la interfaz (/home/datatables).
 * Selectores data-test-id tomados de los page objects oficiales de n8n
 * (packages/quality/testing/playwright/pages/DataTableView.ts y DataTableDetails.ts).
 * La preparación de datos se hace por API para que cada prueba sea rápida e independiente.
 */
import { n8nApi } from '../../support/api.js';

describe('CO-01 · Data tables (UI)', () => {
  let p;
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  // Cypress borra la sesión entre pruebas: se restaura antes de cada una (igual que en las pruebas de API).
  beforeEach(() => cy.loginApi());

  const abrirTabla = (id) => cy.visitarN8n(`/projects/${p}/datatables/${id}`);

  it('CP-016-01 · crea una data table desde cero y aparece su tarjeta', () => {
    cy.nombreUnico('vyv_ui').then((nombre) => {
      cy.visitarN8n('/home/datatables');
      cy.abrirModalDataTable();
      cy.campo('data-table-name-input-select').type(nombre);
      cy.tid('create-from-scratch-option').first().click();
      cy.screenshot('CP-016-01_paso2_nombre');
      cy.tid('proceed-from-select-button').first().click();
      cy.tid('data-table-details-view').should('be.visible');
      cy.screenshot('CP-016-01_paso3_detalle');
      cy.visitarN8n('/home/datatables');
      cy.tid('data-table-card').filter(`:contains("${nombre}")`).should('have.length', 1);
      cy.screenshot('CP-016-01_paso4_tarjeta');
    });
  });

  it('CP-016-02 · el botón Create queda deshabilitado con nombre vacío', () => {
    // Si esta prueba falla en el paso "solo espacios" es un DEFECTO REAL de n8n: el botón usa
    // !dataTableName sin trim() (AddDataTableModal.vue), así que "   " habilita Create y el
    // rechazo llega solo desde el servidor (400).
    cy.visitarN8n('/home/datatables');
    cy.abrirModalDataTable();
    cy.tid('create-from-scratch-option').first().click();
    cy.tid('proceed-from-select-button').should('be.disabled'); // nombre vacío
    cy.campo('data-table-name-input-select').type('   ');
    cy.screenshot('CP-016-02_nombre_solo_espacios');
    cy.tid('proceed-from-select-button').should('be.disabled'); // solo espacios
  });

  it('CP-016-04 · muestra los encabezados de las columnas de los 4 tipos', () => {
    cy.nombreUnico('vyv_ui_cols').then((n) => {
      n8nApi.crearTablaOk(p, n, [
        { name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' },
        { name: 'activo', type: 'boolean' }, { name: 'fecha', type: 'date' },
      ]).then((t) => {
        abrirTabla(t.id);
        ['nombre', 'edad', 'activo', 'fecha'].forEach((c) =>
          cy.tid('data-table-column-header-text').should('contain.text', c));
        cy.screenshot('CP-016-04_encabezados');
      });
    });
  });

  it('CP-016-05 · el popover de nueva columna no crea nombres inválidos', () => {
    cy.nombreUnico('vyv_ui_inv').then((n) => {
      n8nApi.crearTablaOk(p, n, [{ name: 'nombre', type: 'string' }]).then((t) => {
        abrirTabla(t.id);
        cy.tid('data-table-add-column-trigger-button').first().click();
        cy.campo('add-column-name-input').type('1edad');
        cy.tid('data-table-add-column-submit-button').first().click({ force: true });
        cy.tid('add-column-popover-content').invoke('text').should('match', /invalid column name/i);
        cy.screenshot('CP-016-05_mensaje_formato');
        n8nApi.columnas(p, t.id).then((cols) => expect(cols.map((c) => c.name)).to.deep.equal(['nombre']));
      });
    });
  });
});
