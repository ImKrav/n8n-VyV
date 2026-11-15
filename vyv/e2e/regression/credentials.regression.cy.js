/// <reference types="cypress" />
/**
 * Suite de regresión · módulo 3 · Credenciales. Una a tres specs por funcionalidad: el flujo principal,
 * el alternativo, el error y la exposición de secretos (ver vyv/README.md, «Pruebas de regresión»).
 * Ejecutar: npm run test:regression · comparar: npm run regression:compare
 */
import '../credentials/CR-01/create.api.cy.js'; // CR-01 · Crear y probar
import '../credentials/CR-01/html-name.ui.cy.js';
import '../credentials/CR-02/edit-delete.api.cy.js'; // CR-02 · Editar y eliminar
import '../credentials/CR-02/secret-exposure.api.cy.js';
import '../credentials/CR-02/credential-modal.ui.cy.js';
import '../credentials/CR-03/oauth2.api.cy.js'; // CR-03 · OAuth2
import '../credentials/CR-04/node-credentials.api.cy.js'; // CR-04 · Credenciales en nodos
import '../credentials/CR-04/credential-switch.api.cy.js';
import '../credentials/CR-04/create-from-node.ui.cy.js';
import '../credentials/CR-05/search-share.api.cy.js'; // CR-05 · Listado y permisos
import '../credentials/CR-05/sort.ui.cy.js';
import '../credentials/CR-05/isolation.api.cy.js';
