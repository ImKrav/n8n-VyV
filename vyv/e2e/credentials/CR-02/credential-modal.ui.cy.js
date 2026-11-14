/// <reference types="cypress" />
/**
 * CR-02 · Editar y eliminar credenciales · formulario y diálogo de eliminación (caja negra, UI).
 * Trazabilidad: CP-CR-02-02 (éxito: el secreto aparece enmascarado y no está en el DOM) y
 * CP-CR-02-06 (alternativo: cancelar la eliminación conserva la credencial).
 * Diferencia con el plan: en n8n 2.47 el diálogo de eliminar no pide escribir un texto; pide
 * confirmar con «Yes, delete». La prueba verifica eso y que cancelar no elimina.
 */
import { n8nApi } from '../../support/api.js';

describe('CR-02 · Formulario y eliminación de credenciales (UI)', () => {
  const prefijo = `vyvmodal${Date.now() % 100000}`;
  const secreto = `secreto-${prefijo}`;
  let cred;
  before(() => {
    cy.loginApi();
    n8nApi.crearCredencialHeader(`${prefijo} Header`, 'X-API-Key', secreto).then((c) => { cred = c; });
  });
  beforeEach(() => cy.loginApi());
  after(() => cred && n8nApi.borrarCredencial(cred.id));

  const abrirListado = () => {
    cy.visitarN8n('/home/credentials');
    cy.get('input[data-test-id="resources-list-search"], [data-test-id="resources-list-search"] input').first().type(prefijo);
    cy.get('[data-test-id="resources-list-item"]', { timeout: 30000 }).should('have.length', 1);
  };

  it('CP-CR-02-02 · al reabrir la credencial, el valor secreto aparece enmascarado y no está en el DOM', () => {
    abrirListado();
    cy.get('[data-test-id="resources-list-item"]').first().click();
    cy.get('[data-test-id="editCredential-modal"]', { timeout: 30000 }).should('be.visible');
    cy.get('[data-test-id="parameter-input-value"] input').should('exist').invoke('val').then((valor) => {
      cy.evidencia(`Campo Value al reabrir: «${String(valor).slice(0, 30)}»`);
      expect(valor, 'no muestra el secreto').not.to.eq(secreto);
    });
    cy.document().then((doc) => {
      expect(doc.documentElement.outerHTML.includes(secreto), 'el secreto no está en el DOM').to.eq(false);
    });
    cy.screenshot('CP-CR-02-02_enmascarado');
  });

  it('CP-CR-02-06 · (alternativo) el diálogo de eliminar pide confirmación y cancelar conserva la credencial', () => {
    abrirListado();
    cy.get('[data-test-id="credential-card-actions"]').first().click();
    cy.get('[data-test-id="action-delete"]:visible, .el-dropdown-menu__item:visible').contains(/delete/i).click();
    cy.get('.el-message-box', { timeout: 10000 }).should('be.visible').within(() => {
      cy.contains('Delete Credential?').should('be.visible');
      cy.contains(`${prefijo} Header`).should('be.visible');
      // 2.47 no pide texto: el botón de confirmar está habilitado desde el principio.
      cy.get('input:visible').should('not.exist');
      cy.contains('button', 'Yes, delete').should('be.enabled');
    });
    cy.screenshot('CP-CR-02-06_dialogo');
    cy.get('.el-message-box').contains('button', 'Cancel').click();
    cy.get('.el-message-box').should('not.be.visible');
    cy.get('[data-test-id="resources-list-item"]').should('have.length', 1);
    n8nApi.req('GET', `/rest/credentials/${cred.id}`).its('status').should('eq', 200);
    cy.evidencia('El diálogo pide confirmar con «Yes, delete» (sin texto que escribir); al cancelar, la credencial sigue en el listado');
  });
});
