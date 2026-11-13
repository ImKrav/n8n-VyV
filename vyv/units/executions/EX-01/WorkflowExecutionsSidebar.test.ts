/**
 * EX-01 · Lista de ejecuciones — lista del workflow (barra lateral).
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsSidebar.test.ts
 */
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import WorkflowExecutionsSidebar from '@/features/execution/executions/components/workflow/WorkflowExecutionsSidebar.vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { mockedStore, SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import { STORES } from '@n8n/stores';
import merge from 'lodash/merge';
import { expect, it, vi } from 'vitest';
import { computed, nextTick } from 'vue';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import type { ExecutionSummary } from 'n8n-workflow';

const observe = vi.fn();
const disconnect = vi.fn();

vi.mock('@/app/composables/useIntersectionObserver', () => ({
	useIntersectionObserver: () => ({
		observe,
		disconnect,
		observer: { value: null },
	}),
}));

vi.mock('vue-router', () => {
	return {
		useRouter: vi.fn(),
		useRoute: () => ({
			params: {},
			query: {},
			name: '',
			path: '',
		}),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const renderComponent = createComponentRenderer(WorkflowExecutionsSidebar, {
	global: {
		provide: {
			[WorkflowIdKey as unknown as string]: computed(() => 'test-workflow-id'),
		},
	},
	pinia: createTestingPinia({
		initialState: {
			[STORES.EXECUTIONS]: {
				executions: [],
				initialLoadComplete: true,
			},
			[STORES.SETTINGS]: {
				settings: merge(SETTINGS_STORE_DEFAULT_STATE.settings, {
					enterprise: {
						advancedExecutionFilters: true,
					},
				}),
			},
		},
	}),
});

const buildExecutions = (count: number): ExecutionSummary[] =>
	Array.from({ length: count }, (_, index) => ({
		id: `exec-${index}`,
		workflowId: 'test-workflow-id',
		mode: 'manual',
		status: 'success',
		createdAt: new Date().toISOString(),
		startedAt: new Date().toISOString(),
		stoppedAt: new Date().toISOString(),
		finished: true,
	})) as unknown as ExecutionSummary[];

let settingsStore: MockedStore<typeof useSettingsStore>;

// Setup of describe('WorkflowExecutionsSidebar', (original top-level describe)
beforeEach(() => {
	settingsStore = mockedStore(useSettingsStore);
	observe.mockClear();
	disconnect.mockClear();
});

describe('CP-EX-01-05 · Carga incremental con más de 50 ejecuciones', () => {
	describe('infinite scroll sentinel', () => {
		it('should observe the sentinel when executions are present and more pages exist', async () => {
			const { getByTestId } = renderComponent({
				props: {
					loading: false,
					loadingMore: false,
					hasMore: true,
					executions: buildExecutions(20),
				},
			});

			await nextTick();

			const sentinel = getByTestId('executions-load-more-sentinel');
			expect(observe).toHaveBeenCalledWith(sentinel);
		});
	});
});
