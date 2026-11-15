/// <reference types="cypress" />
/**
 * Suite de regresión · módulo 2 · Ejecuciones. Una o dos specs por funcionalidad: el flujo principal,
 * el alternativo y el error de cada una (ver vyv/README.md, «Pruebas de regresión»).
 * Ejecutar: npm run test:regression · comparar: npm run regression:compare
 */
import '../executions/EX-01/execution-states.api.cy.js'; // EX-01 · Lista de ejecuciones
import '../executions/EX-02/filters.api.cy.js'; // EX-02 · Filtros
import '../executions/EX-03/preview-retry-delete.api.cy.js'; // EX-03 · Vista previa, reintento y eliminación
import '../executions/EX-04/stop.api.cy.js'; // EX-04 · Detener
import '../executions/EX-04/editor-stop.ui.cy.js';
import '../executions/EX-05/execution-log.api.cy.js'; // EX-05 · Panel de logs
import '../executions/EX-05/logs-keyboard.ui.cy.js';
