/**
 * WF-02 · Configuración del workflow (WorkflowSettings.vue).
 * Origen: packages/frontend/editor-ui/src/features/workflows/components/WorkflowSettings/WorkflowSettings.test.ts
 */
import { reactive } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import type { MockInstance } from 'vitest';
import { fireEvent, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { SYSTEM_RESOLVER_ID, type FrontendSettings } from '@n8n/api-types';
import { i18n, i18nInstance } from '@n8n/i18n';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestWorkflow } from '@/__tests__/mocks';
import { getDropdownItems, mockedStore, type MockedStore } from '@/__tests__/utils';
import { EnterpriseEditionFeature, EXECUTE_WORKFLOW_NODE_TYPE } from '@/app/constants';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useRBACStore } from '@n8n/stores/rbac.store';
import WorkflowSettingsVue from '@/features/workflows/components/WorkflowSettings/WorkflowSettings.vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import * as restApiClient from '@n8n/rest-api-client';
import { mock } from 'vitest-mock-extended';
import type { Scope } from '@n8n/permissions';
import { BINARY_MODE_COMBINED } from 'n8n-workflow';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

const toast = {
	showMessage: vi.fn(),
	showError: vi.fn(),
};

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => toast,
}));

// The modal is mounted globally, so it can be opened from views whose route has no
// `workflowId` param (e.g. the AI artifact view). The whole suite runs under that
// condition: the workflow id must always come from the document store, never the route.
vi.mock('vue-router', async () => ({
	useRouter: vi.fn(),
	useRoute: () =>
		reactive({
			params: {},
			query: {},
		}),
	RouterLink: {
		template: '<a><slot /></a>',
	},
}));

vi.mock('@n8n/rest-api-client', async (importOriginal) => {
	const actual = await importOriginal<typeof restApiClient>();
	return {
		...actual,
		getCredentialResolvers: vi.fn(),
		getCredentialResolverTypes: vi.fn().mockResolvedValue([]),
	};
});

const getSecuritySettings = vi.fn();
vi.mock('@n8n/rest-api-client/api/security-settings', () => ({
	getSecuritySettings: (...args: unknown[]) => getSecuritySettings(...args),
	updateSecuritySettings: vi.fn(),
}));

const DEFAULT_SECURITY_SETTINGS = {
	personalSpacePublishing: false,
	personalSpaceSharing: false,
	publishedPersonalWorkflowsCount: 0,
	sharedPersonalWorkflowsCount: 0,
	sharedPersonalCredentialsCount: 0,
	managedByEnv: false,
};

let workflowsStore: MockedStore<typeof useWorkflowsStore>;
let workflowsListStore: MockedStore<typeof useWorkflowsListStore>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let sourceControlStore: MockedStore<typeof useSourceControlStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;
let pinia: ReturnType<typeof createTestingPinia>;

let searchWorkflowsSpy: MockInstance<(typeof workflowsListStore)['searchWorkflows']>;
let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;

const workflowSettingsStubs = {
	Modal: {
		template:
			'<div role="dialog"><slot name="header" /><slot name="content" /><slot name="footer" /></div>',
	},
	// Stub N8nSwitch to prevent spurious update:model-value emissions in jsdom.
	// userEvent.click simulates pointer movement that can trigger the switch
	// during mouse path traversal, toggling executionTimeout and breaking save.
	N8nSwitch: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<button type="button" :data-test-id="$attrs[\'data-test-id\']" :aria-checked="!!modelValue" role="switch" :disabled="disabled" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
	ParameterInputFull: {
		props: ['value', 'isReadOnly', 'path'],
		emits: ['update'],
		template: `
			<input
				:data-test-id="$attrs['data-test-id']"
				:value="value"
				:disabled="isReadOnly"
				@input="$emit('update', { name: path, value: $event.target.value })"
			/>
		`,
	},
};

const createComponent = createComponentRenderer(WorkflowSettingsVue, {
	global: {
		stubs: workflowSettingsStubs,
	},
});

const createComponentWithCustomTelemetryTagsStub = createComponentRenderer(WorkflowSettingsVue, {
	global: {
		stubs: {
			...workflowSettingsStubs,
			WorkflowCustomTelemetryTags: {
				props: ['modelValue', 'isReadOnly', 'saveTags'],
				emits: ['update:modelValue', 'validity-change'],
				methods: {
					async saveCustomTelemetryTags() {
						const tags = [{ key: 'env', value: 'production' }];
						try {
							await this.saveTags(tags);
						} catch {
							return;
						}
						this.$emit('update:modelValue', tags);
					},
				},
				template: `
					<div data-test-id="workflow-settings-custom-telemetry-tags">
						<button
							type="button"
							data-test-id="workflow-settings-custom-telemetry-tags-update"
							@click="$emit('update:modelValue', [{ key: 'env', value: 'production' }])"
						/>
						<button
							type="button"
							data-test-id="workflow-settings-custom-telemetry-tags-save-immediate"
							@click="saveCustomTelemetryTags"
						/>
						<button
							type="button"
							data-test-id="workflow-settings-custom-telemetry-tags-invalid"
							@click="$emit('validity-change', true)"
						/>
					</div>
				`,
			},
		},
	},
});

// Setup of describe('WorkflowSettingsVue', (original top-level describe)
beforeEach(async () => {
	getSecuritySettings.mockResolvedValue({
		...DEFAULT_SECURITY_SETTINGS,
		redactionEnforcement: { floor: 'off' },
	});
	pinia = createTestingPinia({ stubActions: false });
	workflowsStore = mockedStore(useWorkflowsStore);
	workflowsListStore = mockedStore(useWorkflowsListStore);
	settingsStore = mockedStore(useSettingsStore);
	vi.spyOn(useNodeTypesStore(), 'isNodeTypeUnavailable').mockReturnValue(false);
	sourceControlStore = mockedStore(useSourceControlStore);
	projectsStore = mockedStore(useProjectsStore);

	// Mock specific store actions that tests assert on
	workflowsStore.updateWorkflow = vi.fn();
	workflowsListStore.fetchWorkflow = vi.fn();
	// Component calls this on mount; avoid a real XHR with stubActions: false.
	settingsStore.getTimezones = vi.fn().mockResolvedValue({});

	// Create document store on the main pinia (same one the component uses).
	// With stubActions: false, setSettings and getSettingsSnapshot work normally.
	workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('1'));

	settingsStore.settings = mock<FrontendSettings>({
		enterprise: {},
		envFeatureFlags: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
		},
		activeModules: ['dynamic-credentials'],
		releaseChannel: 'stable',
	});
	vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);
	workflowsStore.setWorkflowId('1');
	workflowDocumentStore.setName('Test Workflow');
	// Populate workflowsById to mark workflow as existing (not new)
	const testWorkflow = createTestWorkflow({
		id: '1',
		name: 'Test Workflow',
		active: true,
		scopes: ['workflow:update'],
	});
	workflowsListStore.workflowsById = { '1': testWorkflow };
	searchWorkflowsSpy = workflowsListStore.searchWorkflows.mockResolvedValue([testWorkflow]);
	workflowsListStore.getWorkflowById.mockImplementation(() => testWorkflow);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('CP-WF-02-04 · Workflow de error se dispara ante un fallo', () => {
	describe('Error Workflow', () => {
		it('should send DEFAULT value for errorWorkflow to backend when set to "No Workflow"', async () => {
			workflowDocumentStore.setSettings({
				executionOrder: 'v1',
				errorWorkflow: 'some-workflow-id',
			});

			const { getByTestId, getByRole } = createComponent({ pinia });
			await flushPromises();

			const dropdownItems = await getDropdownItems(getByTestId('error-workflow'));
			expect(dropdownItems[0]).toHaveTextContent('No Workflow');
			await userEvent.click(dropdownItems[0]);
			await flushPromises();

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({ errorWorkflow: 'DEFAULT' }),
				}),
			);
		});
	});

	describe('Error Workflow', () => {
		it('should save workflow with errorWorkflow when a specific workflow is selected', async () => {
			workflowDocumentStore.setSettings({
				executionOrder: 'v1',
			});

			const { getByTestId, getByRole } = createComponent({ pinia });
			await flushPromises();

			const dropdownItems = await getDropdownItems(getByTestId('error-workflow'));
			expect(dropdownItems[1]).toHaveTextContent('Test Workflow');
			await userEvent.click(dropdownItems[1]);
			await flushPromises();

			await userEvent.click(getByRole('button', { name: 'Save' }));

			expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					settings: expect.objectContaining({ errorWorkflow: '1' }),
				}),
			);
		});
	});
});

describe('CP-WF-02-06 · Ajustes persisten tras recargar', () => {
	it('should save time saved per execution correctly', async () => {
		workflowDocumentStore.setSettings({ timeSavedMode: 'fixed' });
		const { getByTestId, getByRole } = createComponent({ pinia });
		await flushPromises();
		await waitFor(() => {
			expect(getByTestId('workflow-settings-time-saved-per-execution')).toBeVisible();
		});

		const timeSavedPerExecutionInput = getByTestId(
			'workflow-settings-time-saved-per-execution',
		)?.querySelector('input');

		await userEvent.type(timeSavedPerExecutionInput as Element, '10');
		expect(timeSavedPerExecutionInput).toHaveValue('10');

		await userEvent.click(getByRole('button', { name: 'Save' }));
		expect(workflowsStore.updateWorkflow).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ settings: expect.objectContaining({ timeSavedPerExecution: 10 }) }),
		);
	});
});
// ---------------------------------------------------------------------------
// Pruebas nuevas (no existían en el repositorio). Usan la misma preparación.
// ---------------------------------------------------------------------------

/** Opens a settings dropdown and clicks the option with the given text. */
async function selectOption(container: HTMLElement, text: string) {
	const items = Array.from(await getDropdownItems(container));
	const option = items.find((item) => item.textContent?.trim() === text);
	expect(option, `option "${text}"`).toBeDefined();
	await userEvent.click(option!);
	await flushPromises();
}

const savedSettings = () => vi.mocked(workflowsStore.updateWorkflow).mock.calls[0][1].settings;

describe('CP-WF-02-01 · No guardar ejecuciones exitosas de producción', () => {
	it('envía saveDataSuccessExecution «none» al elegir «Do not save»', async () => {
		// Arrange
		workflowDocumentStore.setSettings({ executionOrder: 'v1' });
		const { getByTestId, getByRole } = createComponent({ pinia });
		await flushPromises();

		// Act
		await selectOption(getByTestId('workflow-settings-save-success-executions'), 'Do not save');
		await userEvent.click(getByRole('button', { name: 'Save' }));

		// Assert
		expect(savedSettings()).toMatchObject({ saveDataSuccessExecution: 'none' });
	});

	it('mantiene el guardado de ejecuciones fallidas al desactivar solo las exitosas', async () => {
		// Arrange
		workflowDocumentStore.setSettings({ executionOrder: 'v1', saveDataErrorExecution: 'all' });
		const { getByTestId, getByRole } = createComponent({ pinia });
		await flushPromises();

		// Act
		await selectOption(getByTestId('workflow-settings-save-success-executions'), 'Do not save');
		await userEvent.click(getByRole('button', { name: 'Save' }));

		// Assert
		expect(savedSettings()).toMatchObject({
			saveDataSuccessExecution: 'none',
			saveDataErrorExecution: 'all',
		});
	});
});

describe('CP-WF-02-02 · No guardar ejecuciones manuales', () => {
	it('envía saveManualExecutions false al elegir «Do not save»', async () => {
		// Arrange
		workflowDocumentStore.setSettings({ executionOrder: 'v1', saveManualExecutions: true });
		const { getByTestId, getByRole } = createComponent({ pinia });
		await flushPromises();

		// Act
		await selectOption(getByTestId('workflow-settings-save-manual-executions'), 'Do not save');
		await userEvent.click(getByRole('button', { name: 'Save' }));

		// Assert
		expect(savedSettings()).toMatchObject({ saveManualExecutions: false });
	});
});

describe('CP-WF-02-03 · Timeout en sus valores límite', () => {
	const MAX = 7200; // 2 h

	const saveWithTimeout = async (executionTimeout: number) => {
		workflowDocumentStore.setSettings({
			executionOrder: 'v1',
			executionTimeout,
			maxExecutionTimeout: MAX,
		});
		const { getByRole } = createComponent({ pinia });
		await flushPromises();
		await userEvent.click(getByRole('button', { name: 'Save' }));
	};

	it.each([
		{ label: 'mínimo (1 s)', seconds: 1 },
		{ label: 'intermedio (1 h)', seconds: 3600 },
		{ label: 'máximo permitido', seconds: MAX },
	])('guarda el timeout en el valor $label', async ({ seconds }) => {
		// Arrange / Act
		await saveWithTimeout(seconds);

		// Assert
		expect(toast.showError).not.toHaveBeenCalled();
		expect(savedSettings()).toMatchObject({ executionTimeout: seconds });
		expect(savedSettings()).not.toHaveProperty('maxExecutionTimeout');
	});

	it('rechaza un timeout activado en 0 segundos', async () => {
		// Arrange / Act
		await saveWithTimeout(0);

		// Assert
		expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled();
		expect(toast.showError).toHaveBeenCalledWith(
			expect.objectContaining({ message: 'Timeout is activated but set to 0' }),
			'Problem saving settings',
			expect.anything(),
		);
	});

	it('rechaza un timeout de máximo + 1 segundo e informa el máximo', async () => {
		// Arrange / Act
		await saveWithTimeout(MAX + 1);

		// Assert
		expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled();
		expect(toast.showError).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Maximum Timeout is: 2 hours, 0 minutes, 0 seconds',
			}),
			'Problem saving settings',
			expect.anything(),
		);
	});
});

describe('CP-WF-02-05 · Zona horaria del workflow', () => {
	it('guarda la zona horaria elegida', async () => {
		// Arrange
		settingsStore.getTimezones = vi.fn().mockResolvedValue({
			'America/Bogota': 'America/Bogota (GMT-05:00)',
			'Europe/Berlin': 'Europe/Berlin (GMT+01:00)',
		});
		workflowDocumentStore.setSettings({ executionOrder: 'v1' });
		const { getByTestId, getByRole } = createComponent({ pinia });
		await flushPromises();

		// Act
		await selectOption(getByTestId('workflow-settings-timezone'), 'America/Bogota (GMT-05:00)');
		await userEvent.click(getByRole('button', { name: 'Save' }));

		// Assert
		expect(savedSettings()).toMatchObject({ timezone: 'America/Bogota' });
	});
});

describe('CP-WF-02-06 · Ajustes persisten tras recargar', () => {
	it('vuelve a enviar sin cambios los ajustes guardados al reabrir y guardar', async () => {
		// Arrange: settings as they come back from the API after a reload
		const stored = {
			executionOrder: 'v1' as const,
			saveDataErrorExecution: 'none' as const,
			saveDataSuccessExecution: 'none' as const,
			saveManualExecutions: false,
			saveExecutionProgress: true,
			executionTimeout: 90,
			maxExecutionTimeout: 3600,
			timezone: 'America/Bogota',
		};
		workflowDocumentStore.setSettings(stored);
		const { getByRole } = createComponent({ pinia });
		await flushPromises();

		// Act
		await userEvent.click(getByRole('button', { name: 'Save' }));

		// Assert
		const { maxExecutionTimeout: _max, ...persisted } = stored;
		expect(savedSettings()).toMatchObject(persisted);
	});
});
