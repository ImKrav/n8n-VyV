/**
 * EX-01 · Lista de ejecuciones — fila de una ejecución (estado y tiempos).
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.test.ts
 */
import { vi } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { WAIT_INDEFINITELY, type ExecutionSummary } from 'n8n-workflow';
import GlobalExecutionsListItem from '@/features/execution/executions/components/global/GlobalExecutionsListItem.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { DateTime } from 'luxon';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');

	return {
		...actual,
		useRouter: vi.fn(() => ({
			resolve: vi.fn(() => ({ href: 'mockedRoute' })),
		})),
	};
});

const globalExecutionsListItemQueuedTooltipRenderSpy = vi.fn();

const renderComponent = createComponentRenderer(GlobalExecutionsListItem, {
	global: {
		stubs: {
			N8nButton: true,
			I18nT: true,
			GlobalExecutionsListItemQueuedTooltip: {
				render: globalExecutionsListItemQueuedTooltipRenderSpy,
			},
		},
	},
});

// Setup of describe('GlobalExecutionsListItem', (original top-level describe)

afterEach(() => {
	vitest.useRealTimers();
});

describe('CP-EX-01-01 · Ejecución exitosa con estado y duración', () => {
	it('should show formatted start date', () => {
		const testDate = '2022-01-01T12:00:00Z';
		const { getByText } = renderComponent({
			props: {
				execution: {
					status: 'success',
					id: 123,
					startedAt: testDate,
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
			},
		});

		expect(
			getByText(`Jan 1, 2022, ${DateTime.fromJSDate(new Date(testDate)).toFormat('HH')}:00:00`),
		).toBeInTheDocument();
	});
});

describe('CP-EX-01-03 · Ejecución en espera (Wait)', () => {
	it('should render queued tooltip for an indefinitely waiting execution', async () => {
		renderComponent({
			props: {
				execution: {
					status: 'waiting',
					waitTill: WAIT_INDEFINITELY,
					id: 123,
					workflowName: 'Test Workflow',
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		expect(globalExecutionsListItemQueuedTooltipRenderSpy).toHaveBeenCalled();
	});
});

describe('CP-EX-01-04 · Ejecución en curso', () => {
	it('should render the status text for an execution', () => {
		const { getByTestId } = renderComponent({
			props: {
				execution: { status: 'running', id: 123, workflowName: 'Test Workflow' },
			} as unknown as ExecutionSummary,
		});

		expect(getByTestId('execution-status')).toBeInTheDocument();
	});

	it('uses `createdAt` to calculate running time if `startedAt` is undefined', async () => {
		const createdAt = new Date('2024-09-27T12:00:00Z');
		const now = new Date('2024-09-27T12:30:00Z');
		vitest.useFakeTimers({ now });
		const { getByTestId } = renderComponent({
			props: {
				execution: {
					status: 'running',
					id: 123,
					workflowName: 'Test Workflow',
					createdAt,
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		const executionTimeElement = getByTestId('execution-time');
		expect(executionTimeElement).toBeVisible();
		expect(executionTimeElement.textContent).toBe('-1727438401s');
	});
});

// ---------------------------------------------------------------------------
// Pruebas nuevas (no existían en el repositorio). Usan la misma preparación.
// ---------------------------------------------------------------------------

const renderWithStatus = (execution: Partial<ExecutionSummary>) =>
	renderComponent({
		props: {
			execution: { id: 7, workflowName: 'VyV', ...execution } as ExecutionSummary,
			workflowPermissions: {},
		},
	});

describe.each([
	{
		cp: 'CP-EX-01-01 · Ejecución exitosa con estado y duración',
		status: 'success',
		label: 'Success',
	},
	{ cp: 'CP-EX-01-02 · Ejecución fallida', status: 'error', label: 'Error' },
	{ cp: 'CP-EX-01-02 · Ejecución fallida', status: 'crashed', label: 'Error' },
	{ cp: 'CP-EX-01-03 · Ejecución en espera (Wait)', status: 'waiting', label: 'Waiting' },
	{ cp: 'CP-EX-01-04 · Ejecución en curso', status: 'running', label: 'Running' },
] as const)('$cp', ({ status, label }) => {
	it(`muestra el estado «${label}» para una ejecución «${status}»`, () => {
		// Arrange / Act
		const { getByTestId } = renderWithStatus({
			status,
			startedAt: new Date('2026-11-11T10:00:00Z'),
		});

		// Assert
		expect(getByTestId('execution-status')).toHaveTextContent(label);
	});
});

describe('CP-EX-01-01 · Ejecución exitosa con estado y duración', () => {
	it('muestra la duración calculada entre el inicio y el fin', () => {
		// Arrange / Act
		const { getByTestId } = renderWithStatus({
			status: 'success',
			startedAt: new Date('2026-11-11T10:00:00Z'),
			stoppedAt: new Date('2026-11-11T10:00:05Z'),
		});

		// Assert
		expect(getByTestId('execution-time')).toHaveTextContent('5s');
	});
});
