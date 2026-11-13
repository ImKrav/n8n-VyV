/// <reference types="cypress" />
/**
 * CO-04 y CO-05 · Carpetas desde la vista de workflows.
 * Selectores tomados de packages/quality/testing/playwright/pages/WorkflowsPage.ts.
 * PRECONDICIÓN: licencia community registrada (Folders).
 */
import { n8nApi } from '../../support/api.js';

describe('CO-04 / CO-05 · Carpetas (UI)', () => {
  let p;
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  // Cypress borra la sesión entre pruebas: se restaura antes de cada una (igual que en las pruebas de API).
  beforeEach(() => cy.loginApi());

  const abrirCarpeta = (id) => cy.visitarN8n(`/projects/${p}/folders/${id}/workflows`);
  const tarjeta = (nombre) => cy.tid('folder-card').filter(`:contains("${nombre}")`);
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

  it('CP-019-01 · crea una carpeta desde el botón de añadir recurso', () => {
    cy.nombreUnico('VyV UI').then((nombre) => {
      cy.visitarN8n(`/projects/${p}/workflows`);
      cy.tid('add-resource').first().click();
      cy.contains('[role="menuitem"], li', /folder/i).click();
      cy.get('.el-message-box input, [role="dialog"] input').first().type(nombre);
      cy.get('.el-message-box, [role="dialog"]').contains('button', /create/i).click();
      tarjeta(nombre).should('have.length', 1);
      cy.screenshot('CP-019-01_tarjeta');
    });
  });

  it('CP-019-03/05 · renombra desde los breadcrumbs y navega con las migas de pan', () => {
    cy.nombreUnico('VyV Nav').then((a) => {
      n8nApi.crearCarpetaOk(p, a).then((A) => {
        n8nApi.crearCarpetaOk(p, 'B', A.id).then((B) => {
          n8nApi.crearCarpetaOk(p, 'C', B.id).then((C) => {
            abrirCarpeta(C.id);
            // n8n muestra la carpeta padre (B) y la actual (C); los niveles superiores (A) quedan detrás de "…"
            cy.tid('breadcrumbs-item').should('contain.text', 'B');
            cy.tid('breadcrumbs-item-current').should('contain.text', 'C');
            cy.screenshot('CP-019-05_breadcrumbs');
            // Renombrar la carpeta actual con edición en línea
            cy.tid('breadcrumbs-item-current').find('[data-test-id="inline-edit-preview"]').click();
            cy.tid('inline-edit-input').clear().type('C renombrada{enter}');
            cy.tid('breadcrumbs-item-current').should('contain.text', 'C renombrada');
            // Volver a la carpeta padre B con las migas de pan: debe mostrar la carpeta C renombrada
            cy.tid('breadcrumbs-item').contains('B').click();
            tarjeta('C renombrada').should('be.visible');
            cy.screenshot('CP-019-03_06_navegacion');
          });
        });
      });
    });
  });

  it('CP-019-06 · la tarjeta de carpeta muestra los conteos', () => {
    cy.nombreUnico('VyV Cards').then((n) => {
      n8nApi.crearCarpetaOk(p, n).then((f) => {
        n8nApi.crearWorkflow('WF card 1', f.id);
        n8nApi.crearWorkflow('WF card 2', f.id);
        n8nApi.crearCarpetaOk(p, 'Sub', f.id);
        cy.visitarN8n(`/projects/${p}/workflows`);
        tarjeta(n).should('contain.text', '2').and('contain.text', '1');
        cy.screenshot('CP-019-06_conteos');
      });
    });
  });

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
