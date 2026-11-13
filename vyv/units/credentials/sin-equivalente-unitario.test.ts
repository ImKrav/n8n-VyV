/**
 * Módulo Credenciales — casos del plan sin equivalente unitario.
 * Cada caso queda como `it.todo` con el motivo, para que la suite muestre los 142 casos del plan.
 * Se cubren con pruebas de sistema, de integración o de rendimiento (ver vyv/units/README.md).
 */

describe('CP-CR-01-07 · Secretos cifrados en la base de datos', () => {
	it.todo(
		'Necesita la base de datos. Cubierto en Cypress: e2e/credentials/CR-01/encryption-at-rest.api.cy.js (CYPRESS_dbPath).',
	);
});

describe('CP-CR-02-03 · Secretos no expuestos por la API', () => {
	it.todo('Necesita la API. Cubierto en Cypress: e2e/credentials/CR-02/secret-exposure.api.cy.js.');
});

describe('CP-CR-02-04 · Exportar un workflow no incluye secretos', () => {
	it.todo('Necesita la API. Cubierto en Cypress: e2e/credentials/CR-02/secret-exposure.api.cy.js.');
});

describe('CP-CR-03-05 · Token revocado produce error al ejecutar', () => {
	it.todo('Necesita un proveedor OAuth2 real: prueba manual (procedimiento en vyv/README.md).');
});

describe('CP-CR-04-08 · La ejecución usa la credencial nueva', () => {
	it.todo(
		'Necesita ejecutar el workflow. Cubierto en Cypress: e2e/credentials/CR-04/credential-switch.api.cy.js.',
	);
});

describe('CP-CR-05-05 · Miembro no ve credenciales no compartidas', () => {
	it.todo(
		'Necesita los permisos de la API. Cubierto en Cypress: e2e/credentials/CR-05/isolation.api.cy.js.',
	);
});
