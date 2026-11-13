/**
 * EX-01 · Lista de ejecuciones — store de ejecuciones (carga incremental, refresco, filtro por workflow).
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/executions.store.test.ts
 */
import { vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

import type { SerializedCursor } from '@n8n/api-types';
import type {
	ExecutionSummaryWithScopes,
	IExecutionsListResponse,
} from '@/features/execution/executions/executions.types';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { makeRestApiRequest } from '@n8n/rest-api-client';

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: vi.fn(),
}));

// Test-only cursors are plain strings; the brand is only meaningful in app code.
const cursor = (value: string) => value as SerializedCursor;

// Setup of describe('executions.store', (original top-level describe)
let executionsStore: ReturnType<typeof useExecutionsStore>;

beforeEach(() => {
	setActivePinia(createPinia());
	executionsStore = useExecutionsStore();
	// Queued `mockResolvedValueOnce` responses outlive a test otherwise, and a
	// test that consumes fewer than it queued then breaks the next one.
	vi.mocked(makeRestApiRequest).mockReset();
});

describe('CP-EX-01-05 · Carga incremental con más de 50 ejecuciones', () => {
	describe('pagination', () => {
		// count is far larger than a page so the tests fail if loading more is ever
		// driven by the total count again instead of page fullness.
		const page = (n: number): IExecutionsListResponse => ({
			nextCursor: n === 10 ? cursor('next-page') : null,
			count: 100_000,
			estimated: true,
			concurrentExecutionsCount: 0,
			results: Array.from(
				{ length: n },
				(_, i) => ({ id: `${i}`, scopes: [] }) as unknown as ExecutionSummaryWithScopes,
			),
		});

		const mockResponse = (n: number) =>
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(page(n));

		it('should allow loading more when the first page is full', async () => {
			mockResponse(10);
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(true);
		});
	});

	describe('pagination', () => {
		// count is far larger than a page so the tests fail if loading more is ever
		// driven by the total count again instead of page fullness.
		const page = (n: number): IExecutionsListResponse => ({
			nextCursor: n === 10 ? cursor('next-page') : null,
			count: 100_000,
			estimated: true,
			concurrentExecutionsCount: 0,
			results: Array.from(
				{ length: n },
				(_, i) => ({ id: `${i}`, scopes: [] }) as unknown as ExecutionSummaryWithScopes,
			),
		});

		const mockResponse = (n: number) =>
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(page(n));

		it('should stop allowing more once a paginated page comes back partial', async () => {
			mockResponse(10);
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(true);

			mockResponse(10);
			await executionsStore.loadMoreExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(true);

			mockResponse(4);
			await executionsStore.loadMoreExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(false);
		});
	});

	describe('pagination', () => {
		// count is far larger than a page so the tests fail if loading more is ever
		// driven by the total count again instead of page fullness.
		const page = (n: number): IExecutionsListResponse => ({
			nextCursor: n === 10 ? cursor('next-page') : null,
			count: 100_000,
			estimated: true,
			concurrentExecutionsCount: 0,
			results: Array.from(
				{ length: n },
				(_, i) => ({ id: `${i}`, scopes: [] }) as unknown as ExecutionSummaryWithScopes,
			),
		});

		const mockResponse = (n: number) =>
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(page(n));

		it('should not request a page once the list has ended', async () => {
			mockResponse(3);
			await executionsStore.fetchExecutions({});
			expect(executionsStore.hasMoreExecutions).toBe(false);

			vi.mocked(makeRestApiRequest).mockClear();
			await executionsStore.loadMoreExecutions({});

			expect(makeRestApiRequest).not.toHaveBeenCalled();
		});
	});
});

// executionsFilters reads the current project from the route; these tests have no router.
vi.mock('vue-router', () => ({
	useRoute: () => ({ params: {}, query: {} }),
	useRouter: () => ({}),
}));

describe('CP-EX-01-06 · Actualización automática de la lista', () => {
	describe('pagination', () => {
		// count is far larger than a page so the tests fail if loading more is ever
		// driven by the total count again instead of page fullness.
		const page = (n: number): IExecutionsListResponse => ({
			nextCursor: n === 10 ? cursor('next-page') : null,
			count: 100_000,
			estimated: true,
			concurrentExecutionsCount: 0,
			results: Array.from(
				{ length: n },
				(_, i) => ({ id: `${i}`, scopes: [] }) as unknown as ExecutionSummaryWithScopes,
			),
		});

		const mockResponse = (n: number) =>
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(page(n));

		it('moves an execution from the current list to the completed list', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				results: [{ ...page(1).results[0], status: 'running' }],
			});
			await executionsStore.fetchExecutions({});
			expect(executionsStore.currentExecutions).toHaveLength(1);
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(1),
				results: [{ ...page(1).results[0], status: 'success' }],
			});
			await executionsStore.refreshExecutions({});
			expect(executionsStore.currentExecutions).toHaveLength(0);
			expect(executionsStore.executions).toHaveLength(1);
		});
	});
});

describe('CP-EX-01-07 · Coherencia entre lista global y por workflow', () => {
	describe('pagination', () => {
		// count is far larger than a page so the tests fail if loading more is ever
		// driven by the total count again instead of page fullness.
		const page = (n: number): IExecutionsListResponse => ({
			nextCursor: n === 10 ? cursor('next-page') : null,
			count: 100_000,
			estimated: true,
			concurrentExecutionsCount: 0,
			results: Array.from(
				{ length: n },
				(_, i) => ({ id: `${i}`, scopes: [] }) as unknown as ExecutionSummaryWithScopes,
			),
		});

		const mockResponse = (n: number) =>
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(page(n));

		it('resets the continuation and rows when the workflow filter changes', async () => {
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce({
				...page(2),
				nextCursor: cursor('older'),
			});
			await executionsStore.fetchExecutions({ workflowId: 'one' });
			vi.mocked(makeRestApiRequest).mockResolvedValueOnce(page(0));
			await executionsStore.loadMoreExecutions({ workflowId: 'two' });
			expect(executionsStore.nextCursor).toBeNull();
			expect(executionsStore.executions).toEqual([]);
			expect(makeRestApiRequest).toHaveBeenLastCalledWith(
				expect.anything(),
				'GET',
				'/executions',
				expect.not.objectContaining({ cursor: expect.anything() }),
			);
		});
	});
});

// ---------------------------------------------------------------------------
// Pruebas nuevas (no existían en el repositorio). Usan la misma preparación.
// ---------------------------------------------------------------------------

describe('CP-EX-01-06 · Actualización automática de la lista', () => {
	const response = (status: string): IExecutionsListResponse => ({
		nextCursor: null,
		count: 1,
		estimated: false,
		concurrentExecutionsCount: 0,
		results: [{ id: '1', status, scopes: [] } as unknown as ExecutionSummaryWithScopes],
	});

	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		executionsStore.stopAutoRefreshInterval();
		vi.useRealTimers();
	});

	it('vuelve a pedir la lista cada 4 segundos sin recargar la página', async () => {
		// Arrange
		vi.mocked(makeRestApiRequest).mockResolvedValue(response('running'));
		await executionsStore.initialize();
		const callsAfterLoad = vi.mocked(makeRestApiRequest).mock.calls.length;

		// Act
		vi.mocked(makeRestApiRequest).mockResolvedValue(response('success'));
		await vi.advanceTimersByTimeAsync(4_000);

		// Assert
		expect(vi.mocked(makeRestApiRequest).mock.calls.length).toBeGreaterThan(callsAfterLoad);
		expect(executionsStore.executions.map((e) => e.status)).toEqual(['success']);
	});

	it('no vuelve a pedir la lista después de detener el refresco', async () => {
		// Arrange
		vi.mocked(makeRestApiRequest).mockResolvedValue(response('running'));
		await executionsStore.initialize();
		executionsStore.stopAutoRefreshInterval();
		const callsAfterStop = vi.mocked(makeRestApiRequest).mock.calls.length;

		// Act
		await vi.advanceTimersByTimeAsync(12_000);

		// Assert
		expect(vi.mocked(makeRestApiRequest)).toHaveBeenCalledTimes(callsAfterStop);
	});
});
