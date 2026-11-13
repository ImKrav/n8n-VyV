/**
 * Módulo Ejecuciones — casos del plan sin equivalente unitario.
 * Cada caso queda como `it.todo` con el motivo, para que la suite muestre los 142 casos del plan.
 * Se cubren con pruebas de sistema, de integración o de rendimiento (ver vyv/units/README.md).
 */

describe('CP-EX-01-08 · Rendimiento con más de 1 000 ejecuciones', () => {
	it.todo(
		'Prueba de rendimiento en una instancia real. Cubierto en Cypress: e2e/executions/EX-01/many-executions.api.cy.js.',
	);
});

describe('CP-EX-04-08 · La cola se procesa al liberar capacidad', () => {
	it.todo(
		'La cola la procesa el backend. Cubierto en Cypress: e2e/executions/EX-04/concurrency-queue.api.cy.js.',
	);
});
