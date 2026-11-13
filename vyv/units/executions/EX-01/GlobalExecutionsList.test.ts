/**
 * EX-01 · Lista de ejecuciones — lista global.
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsList.test.ts
 */
import { vi, describe, it, expect } from 'vitest';
import merge from 'lodash/merge';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { STORES } from '@n8n/stores';
import { VIEWS } from '@/app/constants';
import ExecutionsList from '@/features/execution/executions/components/global/GlobalExecutionsList.vue';
import { randomInt, type ExecutionSummary } from 'n8n-workflow';
import type { MockedStore } from '@/__tests__/utils';
import {
	mockedStore,
	retry,
	SETTINGS_STORE_DEFAULT_STATE,
	waitAllPromises,
} from '@/__tests__/utils';
import { createComponentRenderer } from '@/__tests__/render';
import { waitFor } from '@testing-library/vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import type {
	ExecutionFilterType,
	ExecutionSummaryWithScopes,
} from '@/features/execution/executions/executions.types';

vi.mock('vue-router', () => ({
	useRoute: vi.fn().mockReturnValue({
		name: VIEWS.WORKFLOW_EXECUTIONS,
	}),
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		displayTimer: (timer: number) => timer,
		baseText: (key: string) => {
			if (key === 'executionsList.retryOf') {
				return 'Retry of';
			} else if (key === 'executionsList.successRetry') {
				return 'Success retry';
			}
			return key;
		},
	}),
}));

let settingsStore: MockedStore<typeof useSettingsStore>;

const generateUndefinedNullOrString = () => {
	switch (randomInt(4)) {
		case 0:
			return undefined;
		case 1:
			return null;
		case 2:
			return faker.string.uuid();
		case 3:
			return '';
		default:
			return undefined;
	}
};

const executionDataFactory = (): ExecutionSummary => ({
	id: faker.string.uuid(),
	finished: faker.datatype.boolean(),
	mode: faker.helpers.arrayElement(['manual', 'trigger']),
	createdAt: faker.date.past(),
	startedAt: faker.date.past(),
	stoppedAt: faker.date.past(),
	workflowId: faker.number.int().toString(),
	workflowName: faker.string.sample(),
	status: faker.helpers.arrayElement(['error', 'success']),
	nodeExecutionStatus: {},
	retryOf: generateUndefinedNullOrString(),
	retrySuccessId: generateUndefinedNullOrString(),
});

const generateExecutionsData = () =>
	Array.from({ length: 2 }, () => ({
		count: 20,
		results: Array.from({ length: 10 }, executionDataFactory),
	}));

const renderComponent = createComponentRenderer(ExecutionsList, {
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
	global: {
		mocks: {
			$route: {
				params: {},
			},
		},
	},
});

// Setup of describe('GlobalExecutionsList', (original top-level describe)
let executionsData: Array<{
	count: number;
	results: ExecutionSummary[];
}>;

beforeEach(() => {
	executionsData = generateExecutionsData();
	settingsStore = mockedStore(useSettingsStore);
});

describe('CP-EX-01-05 · Carga incremental con más de 50 ejecuciones', () => {
	it('should stop offering "load more" once all executions are shown, even on a large instance', async () => {
		const executionsStore = mockedStore(useExecutionsStore);

		// On large tables the reported total is an inflated estimate; the user must
		// still see "all loaded" rather than a load-more button that fetches nothing.
		executionsStore.hasMoreExecutions = false;
		const { queryByTestId, getByText } = renderComponent({
			props: {
				executions: executionsData[0].results as ExecutionSummaryWithScopes[],
				total: 100_000,
				filters: {} as ExecutionFilterType,
			},
		});
		await waitAllPromises();

		expect(queryByTestId('load-more-button')).not.toBeInTheDocument();
		expect(getByText('executionsList.loadedAll')).toBeInTheDocument();

		executionsStore.hasMoreExecutions = true;
		await waitAllPromises();
		expect(queryByTestId('load-more-button')).toBeInTheDocument();
	});
});
