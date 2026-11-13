/**
 * CP-019-07 · Caja blanca de folderNameSchema (packages/@n8n/api-types/src/schemas/folder.schema.ts)
 *
 * Grafo de flujo (ver caja-blanca/README.md): 5 decisiones → V(G) = 5 + 1 = 6 caminos independientes:
 *   D1 name === ''            D2 illegalCharacterRegex    D3 dotsOnlyRegex
 *   D4 startsWith('.')        D5 length > 128 (pipe .max)  (+ trim previo)
 * Caminos C1..C6 → al menos una prueba por camino (cobertura de ramas 100 %).
 *
 * Patrón AAA (Arrange / Act / Assert) y principios FIRST:
 *  Fast (sin E/S), Independent (sin estado compartido), Repeatable (datos fijos),
 *  Self-validating (aserciones explícitas), Timely (escritas junto al análisis del grafo).
 */
import { folderNameSchema, FOLDER_NAME_MAX_LENGTH } from '../folder.schema';

const mensajes = (valor: string) => {
	const r = folderNameSchema.safeParse(valor);
	return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('folderNameSchema · caminos independientes (VyV)', () => {
	it('C1 · nombre vacío tras trim → "Folder name cannot be empty" (D1 = V)', () => {
		// Arrange
		const entrada = '    ';
		// Act
		const resultado = mensajes(entrada);
		// Assert
		expect(resultado).toEqual(['Folder name cannot be empty']);
	});

	it.each(['[', ']', '^', '\\', '/', ':', '*', '?', '"', '<', '>', '|'])(
		'C2 · carácter ilegal %s → "contains invalid characters" (D1 = F, D2 = V)',
		(caracter) => {
			// Arrange
			const entrada = `Mi${caracter}Carpeta`;
			// Act
			const resultado = mensajes(entrada);
			// Assert
			expect(resultado).toEqual(['Folder name contains invalid characters']);
		},
	);

	it('C3 · solo puntos → "cannot consist of dots only" (D3 = V) y NO evalúa D4', () => {
		expect(mensajes('...')).toEqual(['Folder name cannot consist of dots only']);
		expect(mensajes('.')).toEqual(['Folder name cannot consist of dots only']);
	});

	it('C4 · empieza por punto → "cannot start with a dot" (D3 = F, D4 = V)', () => {
		expect(mensajes('.oculta')).toEqual(['Folder name cannot start with a dot']);
	});

	it('C5 · longitud 129 → "cannot be longer than 128" (D1..D4 = F, D5 = V)', () => {
		// Arrange
		const entrada = 'a'.repeat(FOLDER_NAME_MAX_LENGTH + 1);
		// Act / Assert
		expect(mensajes(entrada)).toEqual([`Folder name cannot be longer than ${FOLDER_NAME_MAX_LENGTH} characters`]);
	});

	it('C6 · nombre válido en el límite (128) y con espacios externos → se acepta recortado', () => {
		// Arrange
		const limite = 'a'.repeat(FOLDER_NAME_MAX_LENGTH);
		// Act
		const r1 = folderNameSchema.safeParse(limite);
		const r2 = folderNameSchema.safeParse('  Proyecto VyV  ');
		// Assert (aserciones fluidas encadenadas sobre el objeto resultado)
		expect(r1).toMatchObject({ success: true, data: limite });
		expect(r2).toMatchObject({ success: true, data: 'Proyecto VyV' });
	});

	it('Límite: el recorte ocurre antes de medir (128 + espacios sigue siendo válido)', () => {
		expect(folderNameSchema.safeParse(`  ${'b'.repeat(128)}  `).success).toBe(true);
	});

	it('Punto en medio o al final es válido (no es "empieza por punto")', () => {
		expect(folderNameSchema.safeParse('v1.2').success).toBe(true);
		expect(folderNameSchema.safeParse('final.').success).toBe(true);
	});
});
