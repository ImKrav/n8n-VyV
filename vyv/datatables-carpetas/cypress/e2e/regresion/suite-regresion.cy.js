/// <reference types="cypress" />
/**
 * Suite de regresión (punto 10).
 * Reúne los casos críticos de CO-01..CO-05 (prioridad Alta) para ejecutarlos después de cada
 * corrección o refactorización. Ejecutar:  npm run test:regresion
 * Luego comparar contra la línea base:   npm run regresion:comparar
 */
import '../api/co01-crear-tabla-columnas.api.cy.js';
import '../api/co02-edicion-filas.api.cy.js';
import '../api/co03-importar-exportar-csv.api.cy.js';
import '../api/co04-crear-navegar-carpetas.api.cy.js';
import '../api/co05-mover-eliminar-carpetas.api.cy.js';
