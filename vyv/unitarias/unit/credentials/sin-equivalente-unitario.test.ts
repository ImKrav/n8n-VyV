/**
 * Módulo Credenciales — casos del plan sin equivalente unitario.
 * Cada caso queda como `it.todo` con el motivo, para que la suite muestre los 142 casos del plan.
 * Se cubren con pruebas de sistema, de integración o de rendimiento (ver vyv/unitarias/README.md).
 */

describe('CP-CR-01-07 · Secretos cifrados en la base de datos', () => {
	it.todo('Necesita la base de datos: el cifrado de la columna de datos ocurre en el servidor.');
});

describe('CP-CR-02-03 · Secretos no expuestos por la API', () => {
	it.todo('Necesita la API: la respuesta del servidor no debe incluir el secreto en claro.');
});

describe('CP-CR-02-04 · Exportar un workflow no incluye secretos', () => {
	it.todo(
		'Necesita el servidor: los secretos nunca llegan al editor, así que la exportación se verifica con la API.',
	);
});

describe('CP-CR-03-05 · Token revocado produce error al ejecutar', () => {
	it.todo('Necesita un proveedor OAuth2 real: revocar el acceso desde la cuenta del proveedor.');
});

describe('CP-CR-04-08 · La ejecución usa la credencial nueva', () => {
	it.todo(
		'Necesita ejecutar el workflow: la cabecera enviada se ve en la petición real del nodo HTTP Request.',
	);
});

describe('CP-CR-05-05 · Miembro no ve credenciales no compartidas', () => {
	it.todo('Necesita el servidor: el aislamiento entre usuarios lo aplican los permisos de la API.');
});
