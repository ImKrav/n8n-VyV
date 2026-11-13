/**
 * Módulo Core — casos del plan sin equivalente unitario.
 * Cada caso queda como `it.todo` con el motivo, para que la suite muestre los 142 casos del plan.
 * Se cubren con pruebas de sistema, de integración o de rendimiento (ver qa/README.md).
 */

describe('CP-CO-01-04 · Nombre en el límite de longitud', () => {
	it.todo(
		'El límite de longitud del nombre de la tabla lo valida la API; el modal no limita la entrada.',
	);
});

describe('CP-CO-01-06 · Nombre de columna duplicado', () => {
	it.todo(
		'El nombre de columna duplicado lo rechaza la API; el botón de añadir columna no lo comprueba.',
	);
});

describe('CP-CO-02-03 · Fecha inválida', () => {
	it.todo(
		'La celda de fecha usa un selector de fecha: verificar en E2E que no acepta fechas inválidas.',
	);
});

describe('CP-CO-02-08 · Leer y escribir filas desde el nodo Data Table', () => {
	it.todo('Necesita ejecutar un workflow con el nodo Data Table en el servidor.');
});

describe('CP-CO-03-03 · CSV con tipos incompatibles', () => {
	it.todo('Los tipos de las columnas de un CSV los infiere el servidor al subir el archivo.');
});

describe('CP-CO-03-04 · CSV con BOM, separador ’;’ y tildes', () => {
	it.todo('El análisis del CSV (BOM, separador «;», tildes) ocurre en el servidor.');
});

describe('CP-CO-03-05 · Importar un archivo grande', () => {
	it.todo('Prueba de rendimiento: importar un CSV de 10 000 filas en una instancia real.');
});

describe('CP-CO-05-08 · Sin workflows huérfanos tras eliminar', () => {
	it.todo(
		'Necesita la base de datos: comprobar que ningún workflow apunta a una carpeta eliminada.',
	);
});
