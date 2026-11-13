/// <reference types="cypress" />
/**
 * CO-05 · Mover y eliminar carpetas desde la vista de workflows.
 * Selectores tomados de packages/quality/testing/playwright/pages/WorkflowsPage.ts.
 * PRECONDICIÓN: licencia community registrada (Folders).
 */
import { n8nApi } from '../../support/api.js';

describe('CO-05 · Carpetas: mover y eliminar (UI)', () => {
  let p;
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  // Cypress borra la sesión entre pruebas: se restaura antes de cada una (igual que en las pruebas de API).
  beforeEach(() => cy.loginApi());

  const abrirCarpeta = (id) => cy.visitarN8n(`/projects/${p}/folders/${id}/workflows`);
  const MENU = '[data-test-id="action-toggle-dropdown"]';
  /**
   * Abre el menú "⋯" de la carpeta actual y elige una acción.
   * - n8n 2.47 usa N8nDropdownMenu (Reka UI): se abre con "pointerdown" (el clic simulado de Cypress no
   *   lo activa) y las opciones tienen data-test-id="action-<acción>".
   * - n8n 2.46 usa el menú clásico (Element Plus): se abre con clic y las opciones se buscan por texto.
   * Se prueba cada forma de abrirlo y se sigue con la primera que muestra el menú.
   */
  const accionCarpeta = (accion, texto) => {
    const abierto = () => Cypress.$(`${MENU}:visible`).length > 0;
    const intentos = [
      ($b) => cy.wrap($b).trigger('pointerdown', { button: 0, ctrlKey: false, pointerType: 'mouse', eventConstructor: 'PointerEvent', force: true }),
      ($b) => cy.wrap($b).click({ force: true }),
      ($b) => cy.wrap($b).focus().trigger('keydown', { key: 'Enter', code: 'Enter', eventConstructor: 'KeyboardEvent', force: true }),
    ];
    const intentar = (n) => {
      if (n >= intentos.length) return;
      cy.tid('folder-breadcrumbs-actions').first().then(($boton) => {
        const $b = $boton.is('button') ? $boton : $boton.find('button').first();
        intentos[n]($b);
      });
      cy.wait(600).then(() => {
        if (!abierto()) intentar(n + 1);
      });
    };
    intentar(0);
    cy.get(`${MENU}:visible`)
      .first()
      .then(($menu) => {
        const porId = $menu.find(`[data-test-id="action-${accion}"]`);
        return porId.length ? cy.wrap(porId.first()) : cy.wrap($menu).contains(texto);
      })
      .click({ force: true });
  };

  it('CP-020-04 · elimina una carpeta transfiriendo su contenido', () => {
    cy.nombreUnico('VyV Borrar').then((n) => {
      n8nApi.crearCarpetaOk(p, n).then((A) => {
        cy.nombreUnico('VyV Destino').then((d) => {
          n8nApi.crearCarpetaOk(p, d).then((D) => {
            n8nApi.crearWorkflow('WF trasladado', A.id);
            abrirCarpeta(A.id);
            accionCarpeta('delete', /delete/i);
            cy.tid('deleteFolder-modal').should('be.visible');
            cy.tid('transfer-content-radio').first().click();
            cy.tid('deleteFolder-modal').find('[role="combobox"]').click().type(d);
            cy.contains('.el-select-dropdown__item, [role="option"]', d).click();
            cy.screenshot('CP-020-04_modal');
            cy.tid('confirm-delete-folder-button').first().click();
            n8nApi.contenido(p, D.id).its('totalWorkflows').should('eq', 1);
          });
        });
      });
    });
  });

  it('CP-020-02 · mueve una carpeta a otra con el modal de mover', () => {
    cy.nombreUnico('VyV Mover').then((n) => {
      n8nApi.crearCarpetaOk(p, n).then((A) => {
        cy.nombreUnico('VyV Padre').then((d) => {
          n8nApi.crearCarpetaOk(p, d).then((D) => {
            abrirCarpeta(A.id);
            accionCarpeta('move', /move/i);
            cy.tid('moveFolder-modal').should('be.visible');
            cy.tid('move-to-folder-dropdown').find('[role="combobox"]').click().type(d);
            cy.contains('.el-select-dropdown__item, [role="option"]', d).click();
            cy.tid('confirm-move-folder-button').first().click();
            n8nApi.arbol(p, A.id).then((arbol) => expect(arbol[0].id).to.eq(D.id));
            cy.screenshot('CP-020-02_movida');
          });
        });
      });
    });
  });
});
