/**
 * WF-04 · Historial de versiones y diff — vista del historial (nombrar, clonar, descargar).
 * Origen: packages/frontend/editor-ui/src/features/workflows/workflowHistory/views/WorkflowHistory.test.ts
 */
import type { MockInstance } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { defineComponent, type PropType } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { faker } from '@faker-js/faker';
import { createComponentRenderer } from '@/__tests__/render';
import { SETTINGS_STORE_DEFAULT_STATE } from '@/__tests__/utils';
import WorkflowHistoryPage from '@/features/workflows/workflowHistory/views/WorkflowHistory.vue';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { STORES } from '@n8n/stores';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { VIEWS } from '@/app/constants';
import {
	workflowHistoryDataFactory,
	workflowVersionDataFactory,
} from '@/features/workflows/workflowHistory/__tests__/utils';
import type { WorkflowVersion } from '@n8n/rest-api-client/api/workflowHistory';
import type { IWorkflowDb } from '@/Interface';
import { telemetry } from '@/app/plugins/telemetry';
import { registerToastNotifier } from '@/app/init/toastNotifier';

vi.mock('vue-router', async () => {
	const { reactive } = await import('vue');
	const params = reactive({});
	const query = {};
	const push = vi.fn();
	const replace = vi.fn();
	const resolve = vi.fn().mockImplementation(() => ({ href: '' }));
	return {
		useRoute: () => ({
			params,
			query,
		}),
		useRouter: () => ({
			push,
			replace,
			resolve,
		}),
		RouterLink: vi.fn(),
	};
});

const workflowId = faker.string.nanoid();
const historyData = Array.from({ length: 5 }, workflowHistoryDataFactory);
const versionData: WorkflowVersion = {
	...workflowVersionDataFactory(),
	...historyData[0],
};
const versionId = faker.string.nanoid();

const renderComponent = createComponentRenderer(WorkflowHistoryPage, {
	global: {
		stubs: {
			Modal: defineComponent({
				template: '<div><slot name="content" /></div>',
			}),
			WorkflowHistoryDiff: defineComponent({
				emits: ['versionsChange', 'close'],
				template: `<div>
					<button
						data-test-id="stub-diff-emit-same"
						@click="$emit('versionsChange', { sourceVersionId: 'v-source', targetVersionId: 'v-target' })"
					/>
					<button
						data-test-id="stub-diff-emit-other"
						@click="$emit('versionsChange', { sourceVersionId: 'v-other-source', targetVersionId: 'v-other-target' })"
					/>
				</div>`,
			}),
			WorkflowHistoryContent: true,
			WorkflowPublishTimelineContent: defineComponent({
				props: {
					id: {
						type: String,
						default: versionId,
					},
				},
				template: `<div>
						<button data-test-id="stub-publish-timeline-select" @click="() => $emit('selectVersion', id)" />
					</div>`,
			}),
			WorkflowHistoryList: defineComponent({
				props: {
					id: {
						type: String,
						default: versionId,
					},
					actions: {
						type: Array as PropType<Array<{ value: string; disabled?: boolean }>>,
						default: () => [],
					},
				},
				template: `<div>
						<span
							data-test-id="stub-restore-action"
							:data-disabled="String(actions.find((action) => action.value === 'restore')?.disabled)"
						/>
						<button data-test-id="stub-preview-button" @click="event => $emit('preview', {id, event})" />
						<button data-test-id="stub-compare-button" @click="() => $emit('compare', { id })" />
						<button data-test-id="stub-open-button" @click="() => $emit('action', { action: 'open', id })" />
						<button data-test-id="stub-clone-button" @click="() => $emit('action', { action: 'clone', id })" />
						<button data-test-id="stub-download-button" @click="() => $emit('action', { action: 'download', id })" />
						<button data-test-id="stub-name-button" @click="() => $emit('action', { action: 'name', id, data: { formattedCreatedAt: '2024-01-01', versionName: 'Test Version', description: 'Test description' } })" />
					</div>`,
			}),
		},
	},
});

let pinia: ReturnType<typeof createTestingPinia>;
let router: ReturnType<typeof useRouter>;
let route: ReturnType<typeof useRoute>;
let workflowHistoryStore: ReturnType<typeof useWorkflowHistoryStore>;
let workflowsListStore: ReturnType<typeof useWorkflowsListStore>;
let settingsStore: ReturnType<typeof useSettingsStore>;
let windowOpenSpy: MockInstance;

// Setup of describe('WorkflowHistory', (original top-level describe)
beforeEach(() => {
	// This suite asserts on rendered toast content, which needs the notifier the
	// app registers at bootstrap. Explicit here because it no longer arrives as a
	// side effect of importing `@n8n/composables/useToast` (N8N-104).
	registerToastNotifier();

	pinia = createTestingPinia({
		initialState: {
			[STORES.SETTINGS]: SETTINGS_STORE_DEFAULT_STATE,
		},
	});
	workflowHistoryStore = useWorkflowHistoryStore();
	workflowsListStore = useWorkflowsListStore();
	settingsStore = useSettingsStore();
	route = useRoute();
	router = useRouter();

	vi.spyOn(workflowsListStore, 'fetchWorkflow').mockResolvedValue({} as IWorkflowDb);
	vi.spyOn(workflowHistoryStore, 'getWorkflowHistory').mockResolvedValue(historyData);
	vi.spyOn(workflowHistoryStore, 'getWorkflowVersion').mockResolvedValue(versionData);
	vi.spyOn(telemetry, 'track').mockImplementation(() => {});
	windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('CP-WF-04-02 · Nombrar una versión', () => {
	it('should open name version modal when name action is triggered', async () => {
		route.params.workflowId = workflowId;
		vi.spyOn(workflowHistoryStore, 'updateWorkflowHistoryVersion').mockResolvedValue(undefined);

		const { getByTestId, container } = renderComponent({ pinia });
		await userEvent.click(getByTestId('stub-name-button'));

		await flushPromises();

		expect(container).toBeInTheDocument();
	});
});

describe('CP-WF-04-04 · Clonar una versión a un workflow nuevo', () => {
	it('should clone workflow from version data', async () => {
		route.params.workflowId = workflowId;
		const newWorkflowId = faker.string.nanoid();
		vi.spyOn(workflowHistoryStore, 'cloneIntoNewWorkflow').mockResolvedValue({
			id: newWorkflowId,
		} as IWorkflowDb);

		const { getByTestId, getByRole } = renderComponent({ pinia });
		await userEvent.click(getByTestId('stub-clone-button'));

		await waitFor(() => {
			expect(router.resolve).toHaveBeenCalledWith({
				name: VIEWS.WORKFLOW,
				params: { workflowId: newWorkflowId },
			});
			expect(telemetry.track).toHaveBeenCalledWith('User cloned version', {
				instance_id: '',
				workflow_id: workflowId,
			});
		});

		expect(within(getByRole('alert')).getByRole('link')).toBeInTheDocument();
	});
});

describe('CP-WF-04-06 · Descargar una versión como JSON importable', () => {
	it('should download workflow version', async () => {
		route.params.workflowId = workflowId;

		const { getByTestId } = renderComponent({ pinia });
		await userEvent.click(getByTestId('stub-download-button'));

		await waitFor(() => {
			expect(telemetry.track).toHaveBeenCalledWith('User downloaded version', {
				instance_id: '',
				workflow_id: workflowId,
			});
		});
	});
});
