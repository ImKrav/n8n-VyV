/**
 * Módulo Workflows — casos del plan sin equivalente unitario.
 * Cada caso queda como `it.todo` con el motivo, para que la suite muestre los 142 casos del plan.
 * Se cubren con pruebas de sistema, de integración o de rendimiento (ver vyv/unitarias/README.md).
 */

describe('CP-WF-01-08 · Rendimiento del lienzo con 100 nodos', () => {
	it.todo(
		'Prueba de rendimiento: mide la carga del lienzo con 100 nodos en un navegador real (Lighthouse / Playwright).',
	);
});

describe('CP-WF-03-02 · Publicar workflow con Webhook y responder en producción', () => {
	it.todo(
		'Necesita el servidor: el webhook de producción debe responder y registrar la ejecución.',
	);
});

describe('CP-WF-03-04 · Mismo path con distinto método HTTP', () => {
	it.todo(
		'Necesita el servidor: el registro de webhooks decide si dos workflows comparten path con métodos distintos.',
	);
});

describe('CP-WF-03-08 · Publicación persiste tras reiniciar la instancia', () => {
	it.todo('Necesita reiniciar el servidor y comprobar que el trigger se reactiva.');
});
