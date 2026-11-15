/// <reference types="cypress" />
/**
 * Suite de regresión · módulo 4 · Core (data tables, CSV y carpetas).
 * Este módulo tiene las correcciones y la refactorización de esta rama (ver vyv/README.md,
 * «Pruebas de regresión»): por eso también entran sus pruebas de interfaz y de seguridad.
 * Ejecutar: npm run test:regression · comparar: npm run regression:compare
 */
// CO-01 · Crear data table y columnas (BUG-016-01: botón Create con un nombre de solo espacios)
import '../core/CO-01/data-table-columns.api.cy.js';
import '../core/CO-01/data-tables.ui.cy.js';
// CO-02 · Edición de filas
import '../core/CO-02/row-editing.api.cy.js';
import '../core/CO-02/data-table-node.api.cy.js';
import '../core/CO-02/data-table-rows.ui.cy.js';
// CO-03 · Importar y exportar CSV (BUG-018-01/02/03/05: parser e importación)
import '../core/CO-03/csv-import-export.api.cy.js';
import '../core/CO-03/csv.ui.cy.js';
// CO-04 · Crear y navegar carpetas
import '../core/CO-04/folders-create-navigate.api.cy.js';
import '../core/CO-04/folders.ui.cy.js';
// CO-05 · Mover y eliminar carpetas
import '../core/CO-05/folders-move-delete.api.cy.js';
import '../core/CO-05/move-to-root.api.cy.js';
import '../core/CO-05/folders.ui.cy.js';
// Seguridad de data tables y carpetas (BUG-018-04: fórmulas en el CSV exportado)
import '../core/security/owasp.cy.js';
