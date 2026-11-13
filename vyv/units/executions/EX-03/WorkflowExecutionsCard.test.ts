/**
 * EX-03 · Vista previa, reintento y borrado — menú de reintento (versión actual u original).
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsCard.test.ts
 */
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowExecutionsCard from '@/features/execution/executions/components/workflow/WorkflowExecutionsCard.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import type { ComponentProps } from 'vue-component-type-helpers';
import type { ExecutionSummary } from 'n8n-workflow';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import { computed } from 'vue';
import userEvent from '@testing-library/user-event';

vi.mock('vue-router', () => ({
	useRoute: () => ({
		params: {},
	}),
	RouterLink: vi.fn(),
	useRouter: vi.fn(),
}));

const initialState = {
	[STORES.SETTINGS]: {
		settings: {
			templates: {
				enabled: true,
				host: 'https://api.n8n.io/api/',
			},
			license: {
				environment: 'development',
			},
			deployment: {
				type: 'default',
			},
			enterprise: {},
		},
	},
};

const renderComponent = createComponentRenderer(WorkflowExecutionsCard, {
	global: {
		stubs: {
			RouterLink: {
				template: '<div><slot /></div>',
			},
		},
		mocks: {
			$route: {
				params: {},
			},
		},
		provide: {
			[WorkflowIdKey]: computed(() => 'test-workflow-id'),
		},
	},
});

// Setup of describe('WorkflowExecutionsCard', (original top-level describe)
beforeEach(() => {
	setActivePinia(createTestingPinia({ initialState }));
});

afterEach(() => {
	vitest.useRealTimers();
});

describe('CP-EX-03-04 · Reintentar con la versión original', () => {
	test('aligns the retry menu and explains both retry options', async () => {
		const { getByTestId, findByRole, getByText, emitted } = renderComponent({
			props: {
				execution: {
					id: '2',
					mode: 'manual',
					status: 'error',
					retryOf: null,
					retrySuccessId: null,
				} as ExecutionSummary,
				workflowPermissions: { execute: true },
			},
		});

		await userEvent.click(getByTestId('retry-execution-button'));

		expect(await findByRole('menu')).toHaveAttribute('data-align', 'end');
		expect(getByText('Retry with current version')).toBeVisible();
		expect(getByText('Includes the latest changes')).toBeVisible();
		expect(getByText('Retry with original version')).toBeVisible();
		expect(getByText('Exactly as it ran')).toBeVisible();

		await userEvent.click(getByText('Retry with current version'));
		expect(emitted('retryExecution')).toEqual([
			[{ execution: expect.objectContaining({ id: '2' }), command: 'current-workflow' }],
		]);
	});
});
