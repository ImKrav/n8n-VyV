/// <reference types="cypress" />
/**
 * CO-02 · Edición de filas de una data table desde la interfaz.
 * Selectores data-test-id tomados de los page objects oficiales de n8n
 * (packages/quality/testing/playwright/pages/DataTableView.ts y DataTableDetails.ts).
 * La preparación de datos se hace por API para que cada prueba sea rápida e independiente.
 */
import { n8nApi } from '../../support/api.js';

describe('CO-02 · Edición de filas (UI)', () => {
  let p;
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  // Cypress borra la sesión entre pruebas: se restaura antes de cada una (igual que en las pruebas de API).
  beforeEach(() => cy.loginApi());

  const abrirTabla = (id) => cy.visitarN8n(`/projects/${p}/datatables/${id}`);
  // Igual que las pruebas oficiales de n8n (DataTableDetails.ts): el col-id de las celdas es un ID interno
  // que se lee desde el encabezado de la columna; las filas de datos son las que tienen [row-index].
  const GRID = '[data-test-id="data-table-grid"] .ag-center-cols-container';
  const filasGrid = () => cy.get(`${GRID} [row-index]`);
  const colId = (nombre) =>
    cy.get('[role="columnheader"]')
      .filter(`:has([data-test-id="data-table-column-header-text"]:contains("${nombre}"))`)
      .first()
      .invoke('attr', 'col-id');
  const celdas = (nombre) => colId(nombre).then((id) => cy.get(`${GRID} [row-index] [col-id="${id}"]`));
  const celda = (fila, nombre) => colId(nombre).then((id) => cy.get(`${GRID} [row-index="${fila}"] [col-id="${id}"]`));
  /** Valores de una columna en el orden visual de las filas (row-index), no en el orden del DOM. */
  const valoresOrdenados = (nombre) =>
    colId(nombre).then((id) =>
      cy.get(`${GRID} [row-index]`).then(($filas) =>
        [...$filas]
          .sort((x, y) => Number(x.getAttribute('row-index')) - Number(y.getAttribute('row-index')))
          .map((f) => f.querySelector(`[col-id="${id}"]`)?.innerText.trim()),
      ));

  it('CP-017-01 · añade una fila y los valores persisten tras recargar', () => {
    cy.nombreUnico('vyv_ui_fila').then((n) => {
      n8nApi.crearTablaOk(p, n, [{ name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' }]).then((t) => {
        abrirTabla(t.id);
        cy.tid('data-table-header-add-row-button').first().click();
        filasGrid().should('have.length', 1);
        // Al pulsar "Add row", n8n abre automáticamente el editor en la primera celda de la fila nueva.
        // Si ya está abierto se escribe directamente; si no, se abre con doble clic.
        cy.wait(500);
        cy.get('body').then(($b) => {
          if (!$b.find('.ag-text-area-input').length) celda(0, 'nombre').dblclick({ force: true });
        });
        cy.get('.ag-text-area-input').should('be.visible').clear().type('Ana{enter}');
        // Si el editor emergente sigue abierto tapa la celda vecina: el doble clic forzado sobre "edad"
        // hace que AG Grid confirme la edición anterior y abra la nueva.
        celda(0, 'edad').dblclick({ force: true });
        celda(0, 'edad').find('input').type('25{enter}');
        cy.get('.ag-text-area-input').should('not.exist');
        cy.wait(1000); // guardado asíncrono
        cy.reload();
        celda(0, 'nombre').should('contain.text', 'Ana');
        celda(0, 'edad').should('contain.text', '25');
        cy.screenshot('CP-017-01_persistencia');
        n8nApi.filasOk(p, t.id).then((f) => expect(f[0]).to.include({ nombre: 'Ana', edad: 25 }));
      });
    });
  });

  it('CP-017-06/07 · ordena y busca filas en la vista', () => {
    cy.nombreUnico('vyv_ui_orden').then((n) => {
      n8nApi.crearTablaOk(p, n, [{ name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' }]).then((t) => {
        n8nApi.insertar(p, t.id, [{ nombre: 'Ana', edad: 30 }, { nombre: 'Juan', edad: 12 }, { nombre: 'Mariana', edad: 45 }]);
        abrirTabla(t.id);
        filasGrid().should('have.length', 3);
        // El clic sobre el texto del encabezado abre el renombrado; el orden se activa en el contenedor del encabezado.
        cy.tid('data-table-column-header').filter(':contains("edad")').first().trigger('click');
        cy.wait(800);
        valoresOrdenados('edad').should('deep.equal', ['12', '30', '45']);
        cy.screenshot('CP-017-06_orden_ascendente');
        // La búsqueda de la interfaz no distingue mayúsculas: "ari" solo coincide con "Mariana"
        cy.campo('data-table-search-input').type('ari');
        filasGrid().should('have.length', 1);
        valoresOrdenados('nombre').should('deep.equal', ['Mariana']);
        cy.screenshot('CP-017-07_busqueda');
      });
    });
  });

  it('Complementaria · elimina filas seleccionadas', () => {
    cy.nombreUnico('vyv_ui_del').then((n) => {
      n8nApi.crearTablaOk(p, n, [{ name: 'nombre', type: 'string' }]).then((t) => {
        n8nApi.insertar(p, t.id, [{ nombre: 'Uno' }, { nombre: 'Dos' }, { nombre: 'Tres' }]);
        abrirTabla(t.id);
        filasGrid().should('have.length', 3);
        cy.get(`${GRID} [row-index="0"] [col-id="ag-Grid-SelectionColumn"] input[type="checkbox"]`).check({ force: true });
        cy.get(`${GRID} [row-index="1"] [col-id="ag-Grid-SelectionColumn"] input[type="checkbox"]`).check({ force: true });
        cy.tid('selected-items-info').should('be.visible');
        cy.tid('delete-selected-button').first().click();
        cy.get('.el-message-box, [role="dialog"]').contains('button', /delete/i).click();
        filasGrid().should('have.length', 1);
        n8nApi.filasOk(p, t.id).should('have.length', 1);
        cy.screenshot('Complementaria_filas_eliminadas');
      });
    });
  });
});
