/**
 * Módulo Core — casos del plan sin equivalente unitario.
 * Cada caso queda como `it.todo` con el motivo, para que la suite muestre los 142 casos del plan.
 * Se cubren con pruebas de sistema, de integración o de rendimiento (ver vyv/unitarias/README.md).
 * Donde existe, el motivo nombra la prueba de vyv/datatables-carpetas que cubre el caso (ver vyv/README.md).
 */

describe('CP-CO-01-04 · Nombre en el límite de longitud', () => {
	it.todo(
		'La API valida el límite (el modal no limita la entrada). Cubierto en Cypress: co01 API «valores límite de la longitud del nombre».',
	);
});

describe('CP-CO-01-06 · Nombre de columna duplicado', () => {
	it.todo(
		'La API rechaza el duplicado (el botón no lo comprueba). Cubierto en Cypress: co01 API «rechaza columna duplicada (409)».',
	);
});

describe('CP-CO-02-03 · Fecha inválida', () => {
	it.todo(
		'La celda usa un selector de fecha. Cubierto en Cypress: CP-017-02 (la API rechaza «no-es-fecha» con 400).',
	);
});

describe('CP-CO-02-08 · Leer y escribir filas desde el nodo Data Table', () => {
	it.todo('Necesita ejecutar un workflow con el nodo Data Table en el servidor.');
});

describe('CP-CO-03-03 · CSV con tipos incompatibles', () => {
	it.todo(
		'El servidor infiere los tipos. Cubierto en Cypress CP-018-04 y en la prueba unitaria backend CP-018-07.',
	);
});

describe('CP-CO-03-04 · CSV con BOM, separador ’;’ y tildes', () => {
	it.todo('El análisis del CSV (BOM, separador «;», tildes) ocurre en el servidor.');
});

describe('CP-CO-03-05 · Importar un archivo grande', () => {
	it.todo('Prueba de rendimiento: importar un CSV de 10 000 filas en una instancia real.');
});

describe('CP-CO-05-08 · Sin workflows huérfanos tras eliminar', () => {
	it.todo(
		'Necesita la base de datos. Cubierto en parte: CP-020-05 (Cypress) y CP-020-06 (FolderService.deleteFolder con mocks).',
	);
});
