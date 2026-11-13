/**
 * EX-02 · Filtros de ejecuciones — ciclo TDD.
 *
 * Defecto: si el usuario elige una fecha de fin anterior a la de inicio, la UI
 * envía `startedAfter > startedBefore` y la API siempre devuelve una lista vacía.
 * Mejora: la función normaliza el rango (el extremo menor siempre es `startedAfter`).
 *
 * Función pura: no necesita dobles de prueba. Cada prueba sigue AAA y FIRST
 * (rápida, independiente, repetible, auto-validada y escrita antes del código).
 */
import { executionFilterToQueryFilter } from '@/features/execution/executions/executions.utils';
import type { ExecutionFilterType } from '@/features/execution/executions/executions.types';

const EARLIER = '2026-01-01T00:00:00.000Z';
const LATER = '2026-01-31T23:59:59.000Z';

const filterWith = (overrides: Partial<ExecutionFilterType>): Partial<ExecutionFilterType> => ({
	workflowId: 'all',
	status: 'all',
	vote: 'all',
	workflowVersionId: 'all',
	...overrides,
});

describe('CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro', () => {
	it('mantiene un rango válido sin cambios', () => {
		// Arrange
		const filter = filterWith({ startDate: EARLIER, endDate: LATER });

		// Act
		const query = executionFilterToQueryFilter(filter);

		// Assert
		expect(query).toMatchObject({ startedAfter: EARLIER, startedBefore: LATER });
	});

	it('normaliza un rango invertido (fin anterior al inicio)', () => {
		// Arrange
		const filter = filterWith({ startDate: LATER, endDate: EARLIER });

		// Act
		const query = executionFilterToQueryFilter(filter);

		// Assert
		expect(query.startedAfter).toBe(EARLIER);
		expect(query.startedBefore).toBe(LATER);
	});

	it('normaliza un rango invertido cuando el date picker entrega objetos Date', () => {
		// Arrange: ElDatePicker sin `value-format` emite `Date`, no `string`.
		const filter = filterWith({
			startDate: new Date(LATER) as unknown as string,
			endDate: new Date(EARLIER) as unknown as string,
		});

		// Act
		const query = executionFilterToQueryFilter(filter);

		// Assert
		expect(new Date(query.startedAfter as string).toISOString()).toBe(EARLIER);
		expect(new Date(query.startedBefore as string).toISOString()).toBe(LATER);
	});

	it('acepta un solo extremo del rango sin inventar el otro', () => {
		// Arrange
		const filter = filterWith({ endDate: EARLIER });

		// Act
		const query = executionFilterToQueryFilter(filter);

		// Assert
		expect(query).toHaveProperty('startedBefore', EARLIER);
		expect(query).not.toHaveProperty('startedAfter');
	});

	it('no añade fechas cuando el filtro no tiene rango', () => {
		// Arrange
		const filter = filterWith({});

		// Act
		const query = executionFilterToQueryFilter(filter);

		// Assert
		expect(query).not.toHaveProperty('startedAfter');
		expect(query).not.toHaveProperty('startedBefore');
	});
});

describe('CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro', () => {
	it('acepta un rango dentro del mismo día', () => {
		// Arrange
		const filter = filterWith({
			startDate: '2026-01-15T00:00:00.000Z',
			endDate: '2026-01-15T23:59:59.000Z',
		});

		// Act
		const query = executionFilterToQueryFilter(filter);

		// Assert
		expect(query).toMatchObject({
			startedAfter: '2026-01-15T00:00:00.000Z',
			startedBefore: '2026-01-15T23:59:59.000Z',
		});
	});

	it('envía un rango futuro tal cual (la API responde vacío)', () => {
		// Arrange
		const filter = filterWith({
			startDate: '2099-01-01T00:00:00.000Z',
			endDate: '2099-12-31T00:00:00.000Z',
		});

		// Act
		const query = executionFilterToQueryFilter(filter);

		// Assert
		expect(query).toMatchObject({
			startedAfter: '2099-01-01T00:00:00.000Z',
			startedBefore: '2099-12-31T00:00:00.000Z',
		});
	});
});

describe('CP-EX-02-01 · Filtrar por cada estado', () => {
	it.each([
		{ status: 'success', expected: ['success'] },
		{ status: 'error', expected: ['crashed', 'error'] },
		{ status: 'waiting', expected: ['waiting'] },
		{ status: 'running', expected: ['running', 'new'] },
		{ status: 'canceled', expected: ['canceled'] },
	])('el estado «$status» consulta $expected', ({ status, expected }) => {
		// Arrange
		const filter = filterWith({ status });

		// Act
		const query = executionFilterToQueryFilter(filter);

		// Assert
		expect(query.status).toEqual(expected);
	});

	it('«all» no filtra por estado', () => {
		// Arrange / Act
		const query = executionFilterToQueryFilter(filterWith({ status: 'all' }));

		// Assert
		expect(query).not.toHaveProperty('status');
	});
});

describe('CP-EX-02-02 · Filtrar por workflow', () => {
	it('envía el id del workflow elegido', () => {
		// Arrange / Act
		const query = executionFilterToQueryFilter(filterWith({ workflowId: 'wf-42' }));

		// Assert
		expect(query).toHaveProperty('workflowId', 'wf-42');
	});

	it('«all» no filtra por workflow', () => {
		// Arrange / Act
		const query = executionFilterToQueryFilter(filterWith({ workflowId: 'all' }));

		// Assert
		expect(query).not.toHaveProperty('workflowId');
	});
});

describe('CP-EX-02-04 · Combinación de filtros', () => {
	it('combina estado, workflow y rango de fechas en una sola consulta', () => {
		// Arrange
		const filter = filterWith({
			status: 'error',
			workflowId: 'wf-42',
			startDate: EARLIER,
			endDate: LATER,
		});

		// Act
		const query = executionFilterToQueryFilter(filter);

		// Assert
		expect(query).toEqual({
			status: ['crashed', 'error'],
			workflowId: 'wf-42',
			startedAfter: EARLIER,
			startedBefore: LATER,
		});
	});
});

describe('CP-EX-02-06 · Filtro de fechas con zona horaria distinta a UTC', () => {
	it('conserva el instante exacto de una fecha local de America/Bogota (UTC-5) cerca de medianoche', () => {
		// Arrange: 23:30 local on Nov 11 is 04:30 UTC on Nov 12
		const localEndOfDay = new Date('2026-11-11T23:30:00-05:00');
		const filter = filterWith({
			startDate: new Date('2026-11-11T19:00:00-05:00') as unknown as string,
			endDate: localEndOfDay as unknown as string,
		});

		// Act
		const query = executionFilterToQueryFilter(filter);

		// Assert
		expect(new Date(query.startedAfter as string).toISOString()).toBe('2026-11-12T00:00:00.000Z');
		expect(new Date(query.startedBefore as string).toISOString()).toBe('2026-11-12T04:30:00.000Z');
	});
});
