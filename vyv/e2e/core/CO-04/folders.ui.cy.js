/// <reference types="cypress" />
/**
 * CO-04 · Crear y navegar carpetas desde la vista de workflows.
 * Selectores tomados de packages/quality/testing/playwright/pages/WorkflowsPage.ts.
 * PRECONDICIÓN: licencia community registrada (Folders).
 */
import { n8nApi } from '../../support/api.js';

describe('CO-04 · Carpetas: crear y navegar (UI)', () => {
  let p;
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  // Cypress borra la sesión entre pruebas: se restaura antes de cada una (igual que en las pruebas de API).
  beforeEach(() => cy.loginApi());

  const abrirCarpeta = (id) => cy.visitarN8n(`/projects/${p}/folders/${id}/workflows`);
  const tarjeta = (nombre) => cy.tid('folder-card').filter(`:contains("${nombre}")`);

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
});
