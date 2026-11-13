/**
 * CP-018-08 · BUG-018-04 – Refactorización de la exportación CSV (escapeCsvValue → utils/csv-escape.ts)
 * TDD: estas pruebas se escribieron primero (rojo: la función privada no neutralizaba fórmulas),
 * luego se extrajo la utilidad y se añadió la neutralización (verde).
 * Patrón AAA · principios FIRST (funciones puras: rápidas, independientes y repetibles).
 */
import { escapeCsvValue, isFormulaLike } from '../utils/csv-escape';

describe('escapeCsvValue (VyV)', () => {
	describe('RFC 4180 (comportamiento previo, regresión)', () => {
		it.each([
			['texto simple', 'hola', 'hola'],
			['coma', 'a,b', '"a,b"'],
			['comillas dobles', 'di "hola"', '"di ""hola"""'],
			['salto de línea', 'a\nb', '"a\nb"'],
			['espacio inicial', ' a', '" a"'],
			['número', 42, '42'],
			['booleano', true, 'true'],
		])('%s', (_caso, entrada, esperado) => {
			// Act
			const resultado = escapeCsvValue(entrada);
			// Assert
			expect(resultado).toBe(esperado);
		});
	});

	describe('Neutralización de fórmulas (OWASP A03 / CWE-1236)', () => {
		it.each([
			['=1+1', "'=1+1"],
			['+1+1', "'+1+1"],
			['-2+3', "'-2+3"],
			['@SUM(1+1)', "'@SUM(1+1)"],
			['=HYPERLINK("https://example.com";"clic")', '"\'=HYPERLINK(""https://example.com"";""clic"")"'],
		])('%s se exporta como texto', (entrada, esperado) => {
			expect(escapeCsvValue(entrada, { neutralizeFormulas: true })).toBe(esperado);
		});

		it('no modifica valores que no son fórmulas', () => {
			expect(escapeCsvValue('Medellín', { neutralizeFormulas: true })).toBe('Medellín');
			expect(escapeCsvValue('a=b', { neutralizeFormulas: true })).toBe('a=b');
		});

		it('sin la opción conserva el valor (columnas numéricas: -5 sigue siendo -5)', () => {
			expect(escapeCsvValue('-5')).toBe('-5');
		});
	});

	describe('isFormulaLike', () => {
		it('detecta los disparadores y descarta el vacío', () => {
			expect(['=', '+', '-', '@', '\t', '\r'].every((c) => isFormulaLike(`${c}x`))).toBe(true);
			expect(isFormulaLike('')).toBe(false);
			expect(isFormulaLike('texto')).toBe(false);
		});
	});
});
