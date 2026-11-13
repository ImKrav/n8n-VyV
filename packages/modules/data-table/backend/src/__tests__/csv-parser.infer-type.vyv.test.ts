/**
 * CP-018-07 · TDD + caja blanca de CsvParserService.inferColumnType / isDate
 * (packages/modules/data-table/backend/src/csv-parser.service.ts)
 *
 * CICLO TDD
 *  🔴 ROJO   : las pruebas del bloque "Defecto" fallan con el código original:
 *              - '2024-02-30' y '2023-02-29' se infieren como 'date' porque new Date() las
 *                "corrige" a 1 y 2 de marzo (pérdida silenciosa de datos al importar).
 *              - 'Infinity' y '0x1A' se infieren como 'number' (Number() los acepta).
 *  🟢 VERDE  : aplicar unit-tests-n8n/tdd/csv-parser-isDate.patch.
 *  🔵 REFACTOR: extraer la validación de calendario a isValidCalendarDate() y volver a
 *              ejecutar toda la suite del módulo (pruebas de regresión).
 *
 * Doble de prueba: GlobalConfig es un mock (vitest-mock-extended); los métodos privados se
 * invocan a través de una vista tipada para probar la unidad aislada (caja blanca).
 */
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import { CsvParserService } from '../csv-parser.service';

type Tipo = 'string' | 'number' | 'boolean' | 'date';
type VistaPrivada = { inferColumnType(v: string | undefined): Tipo; isDate(v: string): boolean };

describe('CsvParserService.inferColumnType (VyV)', () => {
	let svc: VistaPrivada;

	beforeEach(() => {
		// Arrange común: servicio con configuración simulada (no toca disco ni base de datos)
		const config = mock<GlobalConfig>({ dataTable: { uploadDir: '/tmp/vyv' } });
		svc = new CsvParserService(config) as unknown as VistaPrivada;
	});

	describe('Caminos independientes del grafo (V(G) = 5)', () => {
		it.each<[string, string | undefined, Tipo]>([
			['C1 vacío/undefined → string', undefined, 'string'],
			['C1 solo espacios → string', '   ', 'string'],
			['C2 booleano (sin distinguir mayúsculas) → boolean', ' TRUE ', 'boolean'],
			['C3 número decimal → number', '-12.5', 'number'],
			['C4 fecha ISO válida → date', '2024-02-29', 'date'],
			['C4 fecha-hora ISO → date', '2026-11-08T10:30:00Z', 'date'],
			['C5 texto → string', 'Medellín', 'string'],
		])('%s', (_caso, entrada, esperado) => {
			// Act
			const tipo = svc.inferColumnType(entrada);
			// Assert
			expect(tipo).toBe(esperado);
		});
	});

	describe('Defecto encontrado (deben fallar antes del parche TDD)', () => {
		it.each(['2024-02-30', '2023-02-29', '2024-04-31', '2024-02-31T10:00:00Z'])(
			'una fecha imposible (%s) NO se infiere como date',
			(entrada) => {
				expect(svc.inferColumnType(entrada)).toBe('string');
			},
		);

		it.each(['Infinity', '-Infinity', '0x1A', '0b101'])(
			'un literal no decimal (%s) NO se infiere como number',
			(entrada) => {
				expect(svc.inferColumnType(entrada)).toBe('string');
			},
		);
	});

	describe('Valores límite de fechas', () => {
		it('29 de febrero solo es válido en año bisiesto', () => {
			expect(svc.isDate('2024-02-29')).toBe(true);
			expect(svc.isDate('2023-02-29')).toBe(false);
		});

		it('días 30/31 según el mes', () => {
			expect(svc.isDate('2024-04-30')).toBe(true);
			expect(svc.isDate('2024-04-31')).toBe(false);
			expect(svc.isDate('2024-12-31')).toBe(true);
		});

		it('mes 13 se rechaza', () => {
			expect(svc.isDate('2024-13-01')).toBe(false);
		});
	});
});
