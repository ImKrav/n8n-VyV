/// <reference types="cypress" />
/**
 * Suite de regresión (punto 10).
 * Reúne los casos críticos de CO-01..CO-05 (prioridad Alta) para ejecutarlos después de cada
 * corrección o refactorización. Ejecutar:  npm run test:regression
 * Luego comparar contra la línea base:   npm run regression:compare
 */
import '../CO-01/data-table-columns.api.cy.js';
import '../CO-02/row-editing.api.cy.js';
import '../CO-03/csv-import-export.api.cy.js';
import '../CO-04/folders-create-navigate.api.cy.js';
import '../CO-05/folders-move-delete.api.cy.js';
