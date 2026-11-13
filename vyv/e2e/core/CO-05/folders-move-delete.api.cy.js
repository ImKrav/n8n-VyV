/// <reference types="cypress" />
/**
 * CO-05 · Mover y eliminar carpetas – Pruebas de API.
 * Técnicas: particiones de equivalencia y tabla de decisión (transferir / no transferir).
 * Trazabilidad: REQ-020-01..04 · ESC-020 · CP-020-01..08 (09 es unitaria con mocks).
 */
import { n8nApi, mensaje } from '../../support/api.js';

describe('CO-05 · Carpetas: mover y eliminar (API)', () => {
  let p;
  let A; let B; let C;

  before(() => cy.proyectoPersonal().then((id) => { p = id; }));

  beforeEach(() => {
    cy.loginApi();
    // Estructura nueva por prueba: A (con hija B) y C.
    cy.nombreUnico('VyV A').then((n) => n8nApi.crearCarpetaOk(p, n).then((f) => { A = f; }));
    cy.then(() => n8nApi.crearCarpetaOk(p, 'B', A.id).then((f) => { B = f; }));
    cy.nombreUnico('VyV C').then((n) => n8nApi.crearCarpetaOk(p, n).then((f) => { C = f; }));
  });

  afterEach(() => {
    [A, C].forEach((f) => f && n8nApi.borrarCarpeta(p, f.id));
  });

  it('CP-020-01 · mueve un workflow de la raíz a una carpeta', () => {
    n8nApi.crearWorkflow(`WF mover ${Date.now()}`).then((wf) => {
      n8nApi.moverWorkflow(wf, C.id).its('status').should('eq', 200);
      n8nApi.obtenerWorkflow(wf.id).its('parentFolder.id').should('eq', C.id);
      n8nApi.contenido(p, C.id).its('totalWorkflows').should('eq', 1);
    });
  });

  it('CP-020-02 · mueve una carpeta con contenido dentro de otra', () => {
    n8nApi.actualizarCarpeta(p, A.id, { parentFolderId: C.id }).its('status').should('eq', 200);
    n8nApi.arbol(p, B.id).then((arbol) => {
      expect(arbol[0].id).to.eq(C.id);
      expect(arbol[0].children[0].id).to.eq(A.id);
      expect(arbol[0].children[0].children[0].id).to.eq(B.id);
    });
    cy.then(() => { A = null; }); // A queda dentro de C: se elimina con C
  });

  it('CP-020-03 · impide que una carpeta sea su propio padre', () => {
    n8nApi.actualizarCarpeta(p, A.id, { parentFolderId: A.id }).then((r) => {
      expect(r.status).to.eq(400);
      expect(mensaje(r)).to.contain('Cannot set a folder as its own parent');
    });
  });

  it('Complementaria · impide mover una carpeta dentro de su descendiente', () => {
    n8nApi.actualizarCarpeta(p, A.id, { parentFolderId: B.id }).then((r) => {
      expect(r.status).to.eq(400);
      expect(mensaje(r)).to.match(/descendant of the current folder/);
    });
  });

  it('Complementaria · elimina una carpeta vacía', () => {
    n8nApi.borrarCarpeta(p, C.id).its('status').should('eq', 200);
    n8nApi.listarCarpetas(p).then((l) => expect((l.data ?? l).map((f) => f.id)).not.to.include(C.id));
    cy.then(() => { C = null; });
  });

  it('CP-020-04 · elimina con contenido transfiriéndolo a otra carpeta', () => {
    n8nApi.crearWorkflow('WF transferir 1', A.id);
    n8nApi.crearWorkflow('WF transferir 2', A.id);
    n8nApi.borrarCarpeta(p, A.id, C.id).its('status').should('eq', 200);
    n8nApi.contenido(p, C.id).should('deep.include', { totalWorkflows: 2, totalSubFolders: 1 });
    cy.then(() => { A = null; });
  });

  it('CP-020-05 · elimina con contenido sin transferir: los workflows quedan archivados', () => {
    n8nApi.crearWorkflow('WF archivar', A.id).then((wf) => {
      n8nApi.borrarCarpeta(p, A.id).its('status').should('eq', 200);
      n8nApi.obtenerWorkflow(wf.id).then((w) => {
        expect(w.isArchived, 'workflow archivado').to.eq(true);
        expect(w.parentFolder ?? null, 'movido a la raíz').to.eq(null);
      });
      cy.then(() => { A = null; });
    });
  });

  it('Complementaria · rechaza transferir el contenido a la carpeta que se elimina', () => {
    n8nApi.borrarCarpeta(p, A.id, A.id).then((r) => {
      expect(r.status).to.eq(400);
      expect(mensaje(r)).to.contain('Cannot transfer folder contents to the folder being deleted');
    });
    n8nApi.listarCarpetas(p).then((l) => expect((l.data ?? l).map((f) => f.id)).to.include(A.id));
  });
});
