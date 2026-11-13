import { vi } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { type ExecutionSummary } from 'n8n-workflow';
import GlobalExecutionsListItem from './GlobalExecutionsListItem.vue';
import { createComponentRenderer } from '@/__tests__/render';

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

describe('GlobalExecutionsListItem', () => {
	it('disables the delete dropdown item when the user cannot delete executions, even with workflow edit rights', async () => {
		const { getByTestId } = renderComponent({
			props: {
				execution: {
					status: 'error',
					id: 123,
					stoppedAt: undefined,
				} as unknown as ExecutionSummary,
				workflowPermissions: {
					update: true,
					execute: true,
				},
				executionPermissions: {},
			},
		});

		await fireEvent.click(getByTestId('execution-actions-menu'));
		expect(getByTestId('execution-delete-dropdown-item')).toHaveClass('is-disabled');
	});

	it('enables the delete dropdown item when the user can delete executions', async () => {
		const { getByTestId } = renderComponent({
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
		expect(getByTestId('execution-delete-dropdown-item')).not.toHaveClass('is-disabled');
	});

	it('should not render queued tooltip for a not indefinitely waiting execution', async () => {
		renderComponent({
			props: {
				execution: {
					status: 'waiting',
					waitTill: new Date(Date.now() + 10000000).toISOString(),
					id: 123,
					workflowName: 'Test Workflow',
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		expect(globalExecutionsListItemQueuedTooltipRenderSpy).not.toHaveBeenCalled();
	});

	afterEach(() => {
		vitest.useRealTimers();
	});

	it('uses `createdAt` to calculate running time if `startedAt` is undefined and `stoppedAt` is defined', async () => {
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
					stoppedAt: now,
				} as unknown as ExecutionSummary,
				workflowPermissions: {},
				concurrencyCap: 5,
			},
		});

		const executionTimeElement = getByTestId('execution-time');
		expect(executionTimeElement).toBeVisible();
		expect(executionTimeElement.textContent).toBe('30m 0s');
	});
});
