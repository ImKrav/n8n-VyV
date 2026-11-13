/// <reference types="cypress" />
/** CO-03 · Importar / descargar CSV desde la interfaz. */
import { n8nApi } from '../../support/api.js';

describe('CO-03 · CSV (UI)', () => {
  let p;
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  // Cypress borra la sesión entre pruebas: se restaura antes de cada una (igual que en las pruebas de API).
  beforeEach(() => cy.loginApi());

  it('CP-018-01 · importa valido.csv desde el modal de nueva data table', () => {
    cy.nombreUnico('vyv_ui_csv').then((nombre) => {
      cy.visitarN8n('/home/datatables');
      cy.abrirModalDataTable();
      cy.campo('data-table-name-input-select').type(nombre);
      cy.tid('import-csv-option').first().click();
      cy.get('input[type="file"]').selectFile('fixtures/csv/valido.csv', { force: true });
      cy.tid('proceed-from-select-button').should('not.be.disabled').click();
      // Paso de vista previa: columnas inferidas (nombre, edad, activo, fecha)
      cy.campo('column-name-3').should('have.value', 'fecha');
      cy.screenshot('CP-018-01_vista_previa');
      cy.tid('confirm-add-data-table-button').first().click();
      cy.tid('data-table-details-view').should('be.visible');
      cy.get('[data-test-id="data-table-grid"] .ag-center-cols-container [row-index]').should('have.length', 5);
      // Verificación adicional por API: la tabla creada desde la interfaz tiene las 5 filas del archivo
      cy.location('pathname').then((ruta) => {
        const id = ruta.split('/').filter(Boolean).pop();
        n8nApi.filasOk(p, id).should('have.length', 5);
      });
      cy.screenshot('CP-018-01_tabla_importada');
    });
  });

  it('CP-018-06 · descarga el CSV desde la vista de la tabla', () => {
    cy.nombreUnico('vyv_ui_dl').then((n) => {
      n8nApi.crearTablaOk(p, n, [{ name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' }]).then((t) => {
        n8nApi.insertar(p, t.id, [{ nombre: 'Ana', edad: 30 }]);
        cy.intercept('GET', '**/download-csv*').as('descarga');
        cy.visitarN8n(`/projects/${p}/datatables/${t.id}`);
        cy.tid('data-table-details-view').should('be.visible');
        cy.tid('data-table-card-actions').first().find('button').first().click();
        cy.get('[data-test-id="action-toggle-dropdown"]').contains(/download/i).click();
        cy.tid('download-modal-confirm').first().click();
        cy.wait('@descarga').its('response.statusCode').should('eq', 200);
        cy.get('@descarga').its('response.body.data.csvContent').should('contain', 'Ana');
        cy.screenshot('CP-018-06_descarga');
      });
    });
  });
});
