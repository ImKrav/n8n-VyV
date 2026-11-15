/// <reference types="cypress" />
/**
 * Suite de regresión · módulo 1 · Workflows. Una o dos specs por funcionalidad: el flujo principal,
 * el alternativo y el error de cada una (ver vyv/README.md, «Pruebas de regresión»).
 * Ejecutar: npm run test:regression · comparar: npm run regression:compare
 */
import '../workflows/WF-01/canvas-edit.ui.cy.js'; // WF-01 · Crear y editar
import '../workflows/WF-02/settings.api.cy.js'; // WF-02 · Ajustes
import '../workflows/WF-02/manual-executions.ui.cy.js';
import '../workflows/WF-03/webhook-publish.api.cy.js'; // WF-03 · Publicar
import '../workflows/WF-03/unpublished-changes.ui.cy.js';
import '../workflows/WF-04/version-history.api.cy.js'; // WF-04 · Historial de versiones
import '../workflows/WF-05/import-duplicate.api.cy.js'; // WF-05 · Plantillas, importar y duplicar
