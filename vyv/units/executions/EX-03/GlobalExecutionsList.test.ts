/**
 * EX-03 · Vista previa, reintento y borrado — lista global.
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsList.test.ts
 */
import { vi, describe, it, expect } from 'vitest';
import merge from 'lodash/merge';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import { STORES } from '@n8n/stores';
import { MODAL_CANCEL, MODAL_CONFIRM, VIEWS } from '@/app/constants';
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

describe('CP-EX-03-03 · Reintentar con la versión actual', () => {
	it('should show "retry" data when appropriate', async () => {
		const retryOf = executionsData[0].results.filter((execution) => execution.retryOf);
		const retrySuccessId = executionsData[0].results.filter(
			(execution) => !execution.retryOf && execution.retrySuccessId,
		);

		const { queryAllByText } = renderComponent({
			props: {
				executions: executionsData[0].results as ExecutionSummaryWithScopes[],
				total: executionsData[0].count,
				filters: {} as ExecutionFilterType,
			},
		});
		await waitAllPromises();

		expect(queryAllByText(/Retry of/).length).toBe(retryOf.length);
		expect(queryAllByText(/Success retry/).length).toBe(retrySuccessId.length);
	});
});

// ---------------------------------------------------------------------------
// Pruebas nuevas (no existían en el repositorio). Usan la misma preparación.
// ---------------------------------------------------------------------------

// Mock: the confirmation dialog. Each test decides what the user answers.
const confirm = vi.fn();
vi.mock('@/app/composables/useMessage', () => ({ useMessage: () => ({ confirm }) }));

const renderList = (executions: ExecutionSummary[]) =>
	renderComponent({
		props: {
			executions: executions as ExecutionSummaryWithScopes[],
			filters: {} as ExecutionFilterType,
			total: executions.length,
		},
	});

const selectRow = async (getAllByTestId: (id: string) => HTMLElement[], index: number) =>
	await userEvent.click(getAllByTestId('select-execution-checkbox')[index]);

describe('CP-EX-03-05 · Eliminar una ejecución con confirmación', () => {
	beforeEach(() => confirm.mockReset());

	it('pide confirmación y borra la ejecución elegida al aceptar', async () => {
		// Arrange
		confirm.mockResolvedValue(MODAL_CONFIRM);
		const executions = generateExecutionsData()[0].results.slice(0, 3);
		const { getAllByTestId, getByTestId } = renderList(executions);
		const executionsStore = mockedStore(useExecutionsStore);
		await waitAllPromises();
		await selectRow(getAllByTestId, 0);

		// Act
		await userEvent.click(getByTestId('delete-selected-button'));

		// Assert
		expect(confirm).toHaveBeenCalledOnce();
		await waitFor(() =>
			expect(executionsStore.deleteExecutions).toHaveBeenCalledWith(
				expect.objectContaining({ ids: [executions[0].id] }),
			),
		);
	});

	it('no borra nada si el usuario cancela la confirmación', async () => {
		// Arrange
		confirm.mockResolvedValue(MODAL_CANCEL);
		const executions = generateExecutionsData()[0].results.slice(0, 3);
		const { getAllByTestId, getByTestId } = renderList(executions);
		const executionsStore = mockedStore(useExecutionsStore);
		vi.mocked(executionsStore.deleteExecutions).mockClear();
		await waitAllPromises();
		await selectRow(getAllByTestId, 0);

		// Act
		await userEvent.click(getByTestId('delete-selected-button'));

		// Assert
		expect(confirm).toHaveBeenCalledOnce();
		expect(executionsStore.deleteExecutions).not.toHaveBeenCalled();
	});
});

describe('CP-EX-03-06 · Eliminar varias ejecuciones seleccionadas', () => {
	beforeEach(() => confirm.mockReset());

	it('borra solo las ejecuciones seleccionadas', async () => {
		// Arrange
		confirm.mockResolvedValue(MODAL_CONFIRM);
		const executions = generateExecutionsData()[0].results.slice(0, 4);
		const { getAllByTestId, getByTestId } = renderList(executions);
		const executionsStore = mockedStore(useExecutionsStore);
		vi.mocked(executionsStore.deleteExecutions).mockClear();
		await waitAllPromises();
		await selectRow(getAllByTestId, 0);
		await selectRow(getAllByTestId, 2);

		// Act
		await userEvent.click(getByTestId('delete-selected-button'));

		// Assert
		await waitFor(() => expect(executionsStore.deleteExecutions).toHaveBeenCalledOnce());
		const [{ ids }] = vi.mocked(executionsStore.deleteExecutions).mock.calls[0] as [
			{ ids: string[] },
		];
		expect(ids).toHaveLength(2);
		expect(ids).toEqual(expect.arrayContaining([executions[0].id, executions[2].id]));
		expect(ids).not.toContain(executions[1].id);
	});
});
