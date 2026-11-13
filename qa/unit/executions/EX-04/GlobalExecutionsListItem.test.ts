/**
 * EX-04 · Detener ejecuciones — detener desde la lista y ejecuciones en cola.
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

describe('CP-EX-04-02 · Detener una ejecución desde la lista', () => {
	it('should emit stop event on stop button click for a running execution', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				execution: { status: 'running', id: 123, stoppedAt: undefined, waitTill: true },
			} as unknown as ExecutionSummary,
		});

		const stopButton = getByTestId('stop-execution-button');

		expect(stopButton).toBeInTheDocument();

		await fireEvent.click(stopButton);
		expect(emitted().stop).toBeTruthy();
	});
});

describe('CP-EX-04-07 · Ejecuciones excedentes quedan en cola', () => {
	it('should render queued tooltip for a new execution', async () => {
		renderComponent({
			props: {
				execution: {
					status: 'new',
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

// ---------------------------------------------------------------------------
// Pruebas nuevas (no existían en el repositorio). Usan la misma preparación.
// ---------------------------------------------------------------------------

describe('CP-EX-04-03 · Detener una ejecución en espera', () => {
	it('ofrece detener una ejecución en espera (Wait) aunque ya tenga hora de parada', async () => {
		// Arrange: a Wait node stores stoppedAt and waitTill while the execution waits
		const { getByTestId, emitted } = renderComponent({
			props: {
				execution: {
					id: 9,
					status: 'waiting',
					stoppedAt: new Date('2026-11-11T10:00:05Z'),
					waitTill: new Date('2026-11-11T10:05:05Z'),
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
			},
		});

		// Act
		await fireEvent.click(getByTestId('stop-execution-button'));

		// Assert
		expect(emitted('stop')).toHaveLength(1);
		expect(emitted('stop')[0]).toEqual([expect.objectContaining({ id: 9, status: 'waiting' })]);
	});

	it('no ofrece detener una ejecución terminada', () => {
		// Arrange / Act
		const { queryByTestId } = renderComponent({
			props: {
				execution: {
					id: 10,
					status: 'success',
					stoppedAt: new Date('2026-11-11T10:00:05Z'),
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
			},
		});

		// Assert
		expect(queryByTestId('stop-execution-button')).not.toBeInTheDocument();
	});
});
