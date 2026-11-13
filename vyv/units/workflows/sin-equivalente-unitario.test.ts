/**
 * Módulo Workflows — casos del plan sin equivalente unitario.
 * Cada caso queda como `it.todo` con el motivo, para que la suite muestre los 142 casos del plan.
 * Se cubren con pruebas de sistema, de integración o de rendimiento (ver vyv/units/README.md).
 */

describe('CP-WF-01-08 · Rendimiento del lienzo con 100 nodos', () => {
	it.todo(
		'Prueba de rendimiento en un navegador real. Cubierto en Cypress: e2e/workflows/WF-01/large-workflow.ui.cy.js.',
	);
});

describe('CP-WF-03-02 · Publicar workflow con Webhook y responder en producción', () => {
	it.todo(
		'Necesita el servidor. Cubierto en Cypress: e2e/workflows/WF-03/webhook-publish.api.cy.js.',
	);
});

describe('CP-WF-03-04 · Mismo path con distinto método HTTP', () => {
	it.todo(
		'Necesita el servidor. Cubierto en Cypress: e2e/workflows/WF-03/webhook-publish.api.cy.js.',
	);
});

describe('CP-WF-03-08 · Publicación persiste tras reiniciar la instancia', () => {
	it.todo(
		'Necesita reiniciar el servidor. Cubierto en Cypress: e2e/workflows/WF-03/webhook-publish.api.cy.js (CYPRESS_restartCommand).',
	);
});
