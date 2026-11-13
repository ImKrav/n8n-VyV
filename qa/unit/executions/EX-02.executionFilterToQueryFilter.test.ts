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

describe('EX-02 executionFilterToQueryFilter() · rango de fechas', () => {
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
