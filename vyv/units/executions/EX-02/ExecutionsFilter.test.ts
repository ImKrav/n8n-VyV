/**
 * EX-02 · Filtros de ejecuciones — componente de filtros (aplicar y limpiar).
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/components/ExecutionsFilter.test.ts
 */
import { reactive } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { mockedStore, getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';
import userEvent from '@testing-library/user-event';
import { faker } from '@faker-js/faker';
import ExecutionsFilter from '@/features/execution/executions/components/ExecutionsFilter.vue';
import type { IWorkflowShortResponse } from '@/Interface';
import type { ExecutionFilterType } from '@/features/execution/executions/executions.types';
import { createComponentRenderer } from '@/__tests__/render';
import * as telemetryModule from '@n8n/composables/useTelemetry';
import type { Telemetry } from '@/app/plugins/telemetry';
import type { MockInstance } from 'vitest';
import * as restApiClient from '@n8n/rest-api-client';

vi.mock('@n8n/rest-api-client');

vi.mock('vue-router', () => ({
	useRoute: () =>
		reactive({
			location: {},
		}),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/usePageRedirectionHelper', () => ({
	usePageRedirectionHelper: () => ({
		goToUpgrade: vi.fn(),
	}),
}));

vi.mock('@/features/shared/tags/components/AnnotationTagsDropdown.ee.vue', () => ({
	default: {
		name: 'AnnotationTagsDropdown',
		template: '<div data-test-id="executions-filter-annotation-tags-select"></div>',
	},
}));

const defaultFilterState: ExecutionFilterType = {
	status: 'all',
	workflowId: 'all',
	annotationTags: [],
	startDate: '',
	endDate: '',
	metadata: [{ key: '', value: '', exactMatch: false }],
	vote: 'all',
	workflowVersionId: 'all',
};

const workflowDataFactory = (): IWorkflowShortResponse => ({
	createdAt: faker.date.past().toDateString(),
	updatedAt: faker.date.past().toDateString(),
	id: faker.string.uuid(),
	name: faker.string.sample(),
	active: false,
	activeVersionId: null,
	tags: [],
});

const workflowsData = Array.from({ length: 10 }, workflowDataFactory);

let renderComponent: ReturnType<typeof createComponentRenderer>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;

// Setup of describe('ExecutionsFilter', (original top-level describe)
beforeEach(() => {
	renderComponent = createComponentRenderer(ExecutionsFilter, {
		props: {
			teleported: false,
		},
		pinia: createTestingPinia(),
	});

	settingsStore = mockedStore(useSettingsStore);

	settingsStore.settings = {
		enterprise: {
			advancedExecutionFilters: true,
		},
	} as FrontendSettings;
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('CP-EX-02-05 · Limpiar filtros', () => {
	test('state change', async () => {
		const { getByTestId, queryByTestId, emitted } = renderComponent();

		let filterChangedEvent = emitted().filterChanged;

		// Initial state: no active filters
		expect(queryByTestId('execution-filter-form')).not.toBeInTheDocument();
		expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();
		expect(queryByTestId('execution-filter-badge')).not.toBeInTheDocument();

		// Open filter popover
		await userEvent.click(getByTestId('executions-filter-button'));
		expect(getByTestId('execution-filter-form')).toBeInTheDocument();

		await userEvent.click(getByTestId('executions-filter-status-select'));

		await userEvent.click(getByTestId('executions-filter-status-select').querySelectorAll('li')[1]);
		filterChangedEvent = emitted().filterChanged;

		expect(filterChangedEvent).toHaveLength(1);
		expect(filterChangedEvent[0]).toEqual([{ ...defaultFilterState, status: 'error' }]);
		expect(getByTestId('executions-filter-reset-button')).toBeInTheDocument();
		expect(getByTestId('execution-filter-badge')).toBeInTheDocument();

		await userEvent.click(getByTestId('executions-filter-reset-button'));
		filterChangedEvent = emitted().filterChanged;

		expect(filterChangedEvent).toHaveLength(2);
		expect(filterChangedEvent[1]).toEqual([defaultFilterState]);
		expect(queryByTestId('executions-filter-reset-button')).not.toBeInTheDocument();
		expect(queryByTestId('execution-filter-badge')).not.toBeInTheDocument();
	});
});
