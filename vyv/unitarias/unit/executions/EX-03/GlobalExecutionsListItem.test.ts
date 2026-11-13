/**
 * EX-03 · Vista previa, reintento y borrado — acciones de una fila de la lista.
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

describe('CP-EX-03-03 · Reintentar con la versión actual', () => {
	it('should emit retry events on retry original and retry saved dropdown items click', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				execution: {
					status: 'error',
					id: 123,
					stoppedAt: '01-01-2024',
					finished: false,
					retryOf: undefined,
					retrySuccessfulId: undefined,
					waitTill: false,
				} as unknown as ExecutionSummary,
				workflowPermissions: {
					execute: true,
				},
			},
		});

		await fireEvent.click(getByTestId('execution-actions-menu'));
		await fireEvent.click(getByTestId('execution-retry-saved-dropdown-item'));
		expect(emitted().retrySaved).toBeTruthy();

		await fireEvent.click(getByTestId('execution-retry-original-dropdown-item'));
		expect(emitted().retryOriginal).toBeTruthy();
	});
});

describe('CP-EX-03-05 · Eliminar una ejecución con confirmación', () => {
	it('should emit delete event on delete dropdown item click', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				execution: {
					status: 'error',
					id: 123,
					stoppedAt: undefined,
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				executionPermissions: {
					delete: true,
				},
			},
		});

		await fireEvent.click(getByTestId('execution-actions-menu'));
		await fireEvent.click(getByTestId('execution-delete-dropdown-item'));
		expect(emitted().delete).toBeTruthy();
	});
});
