/**
 * CR-04 · Uso desde un nodo — selector de credenciales del nodo.
 * Origen: packages/frontend/editor-ui/src/features/credentials/components/NodeCredentials.test.ts
 */
import { shallowRef, ref, computed, nextTick, watchSyncEffect } from 'vue';
import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, within, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import type { ICredentialType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { SYSTEM_RESOLVER_ID } from '@n8n/api-types';
import type { FrontendSettings } from '@n8n/api-types';
import type { Scope } from '@n8n/permissions';
import { mockRestrictedCredentialTypes } from '@n8n/frontend-module-type-availability-policies/__tests__/mocks';
import NodeCredentials from '@/features/credentials/components/NodeCredentials.vue';
import type { RenderOptions } from '@/__tests__/render';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import * as credentialsApi from '@/features/credentials/credentials.api';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { Project } from '@/features/collaboration/projects/projects.types';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUsersStore } from '@n8n/stores/users.store';
import type { IUser } from '@n8n/rest-api-client/api/users';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { AI_GATEWAY_TOP_UP_MODAL_KEY } from '@/app/constants';
import {
	ChatHubToolContextKey,
	EditorEnabledFeaturesKey,
	WorkflowDocumentStoreKey,
} from '@/app/constants/injectionKeys';
import {
	useWorkflowDocumentStore,
	createWorkflowDocumentId,
} from '@/app/stores/workflowDocument.store';

const trackMock = vi.hoisted(() => vi.fn());
const authorizeMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: trackMock }),
}));

// Keep the real composable (quick-connect tests need it); stub only `authorize`.
vi.mock('@/features/credentials/composables/useCredentialOAuth', async (importOriginal) => {
	const actual =
		await importOriginal<typeof import('@/features/credentials/composables/useCredentialOAuth')>();
	return {
		useCredentialOAuth: () => ({
			...actual.useCredentialOAuth(),
			authorize: authorizeMock,
		}),
	};
});

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({
		isEnabled: ref(false),
		isCredentialTypeSupported: vi.fn(() => false),
		canServeCredentialType: vi.fn(() => false),
		balance: computed(() => undefined),
		budget: computed(() => undefined),
		creditsLabelKey: computed(() => 'generic.freeCredits'),
		fetchConfig: vi.fn().mockResolvedValue(undefined),
		fetchWallet: vi.fn().mockResolvedValue(undefined),
		saveAfterToggle: vi.fn().mockResolvedValue(undefined),
	})),
}));

const httpNode: INodeUi = {
	parameters: {
		curlImport: '',
		method: 'GET',
		url: '',
		authentication: 'predefinedCredentialType',
		nodeCredentialType: 'openAiApi',
		provideSslCertificates: false,
		sendQuery: false,
		sendHeaders: false,
		sendBody: false,
		options: {},
		infoMessage: '',
	},
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	position: [-200, -160],
	id: '416988b5-e994-42c7-8576-6ef28a7619b2',
	name: 'HTTP Request',
	credentials: { openAiApi: { id: 'c8vqdPpPClh4TgIO', name: 'OpenAi account 2' } },
	issues: { parameters: { url: ['Parameter "URL" is required.'] } },
};

const openAiNode: INodeUi = {
	parameters: {
		resource: 'text',
		operation: 'message',
		modelId: { __rl: true, mode: 'list', value: '' },
		messages: { values: [{ content: '', role: 'user' }] },
		simplify: true,
		jsonOutput: false,
		options: {},
	},
	type: '@n8n/n8n-nodes-langchain.openAi',
	typeVersion: 1.8,
	position: [440, 0],
	id: '17241295-a277-4cdf-8c46-6c3f85b335e9',
	name: 'OpenAI',
	credentials: { openAiApi: { id: 'byDFnd7vN5GzMVD2', name: 'n8n free OpenAI API credits' } },
	issues: { parameters: { modelId: ['Parameter "Model" is required.'] } },
};

const openAiNodeNoCreds: INodeUi = {
	...openAiNode,
	id: '54b41295-a277-4cdf-8c46-6c3f85b335e9',
	name: 'OpenAI no creds',
	credentials: {},
};

const openAiApiCredentialType = {
	name: 'openAiApi',
	displayName: 'OpenAi',
	documentationUrl: 'openAi',
	properties: [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	],
	authenticate: {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'OpenAI-Organization': '={{$credentials.organizationId}}',
			},
		},
	},
	test: { request: { baseURL: '={{$credentials?.url}}', url: '/models' } },
	supportedNodes: ['openAi'],
	iconUrl: {
		light: 'icons/n8n-nodes-base/dist/nodes/OpenAi/openAi.svg',
		dark: 'icons/n8n-nodes-base/dist/nodes/OpenAi/openAi.dark.svg',
	},
} satisfies ICredentialType;

function createCredential(
	overrides: Partial<{
		id: string;
		name: string;
		type: string;
		isManaged: boolean;
		isResolvable: boolean;
		scopes: Scope[];
		sharedRoute: 'project' | 'personal';
		isGlobal: boolean;
	}> = {},
) {
	return {
		id: 'c8vqdPpPClh4TgIO',
		name: 'OpenAi account',
		type: 'openAiApi',
		isManaged: false,
		createdAt: '',
		updatedAt: '',
		...overrides,
	};
}

// Setup of describe('NodeCredentials', (original top-level describe)
let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
let ndvStore: ReturnType<typeof mockedStore<typeof useNDVStore>>;
let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
let projectsStore: ReturnType<typeof mockedStore<typeof useProjectsStore>>;
let settingsStore: ReturnType<typeof mockedStore<typeof useSettingsStore>>;
let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
let workflowDocumentStore: ReturnType<typeof useWorkflowDocumentStore>;
let workflowDocumentStoreRef: ReturnType<
	typeof shallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>
>;
let renderComponent: ReturnType<typeof createComponentRenderer>;
let stopCredentialsMirror: () => void;

beforeEach(() => {
	vi.clearAllMocks();

	const pinia = createTestingPinia({ stubActions: false });
	setActivePinia(pinia);

	workflowDocumentStore = useWorkflowDocumentStore(createWorkflowDocumentId('1'));
	workflowDocumentStoreRef = shallowRef<ReturnType<typeof useWorkflowDocumentStore> | null>(
		workflowDocumentStore,
	);

	const defaultRenderOptions: RenderOptions<typeof NodeCredentials> = {
		pinia,
		props: {
			overrideCredType: 'openAiApi',
			node: httpNode,
			readonly: false,
			showAll: false,
			hideIssues: false,
		},
		global: {
			provide: {
				[WorkflowDocumentStoreKey as symbol]: workflowDocumentStoreRef,
			},
		},
	};

	renderComponent = createComponentRenderer(NodeCredentials, defaultRenderOptions);

	credentialsStore = mockedStore(useCredentialsStore);
	// Component triggers this on mount; avoid a real XHR with stubActions: false.
	credentialsStore.fetchUsableCredentials = vi
		.fn()
		.mockImplementation(async () => Object.values(credentialsStore.usableCredentials));

	// The picker reads `usableCredentials`, the slice only the scoped fetch writes.
	// Tests seed the flat map, and by the time an NDV mounts in production the
	// scoped fetch has already run (useWorkflowInitialization), so mirror the seed
	// into the slice. Tests that need the two to diverge stop the mirror first.
	stopCredentialsMirror = watchSyncEffect(() => {
		credentialsStore.usableCredentials = { ...credentialsStore.state.credentials };
	});
	credentialsStore.hasFetchedUsableCredentials = true;

	ndvStore = mockedStore(useNDVStore, createWorkflowDocumentId('1'));
	uiStore = mockedStore(useUIStore);
	projectsStore = mockedStore(useProjectsStore);
	settingsStore = mockedStore(useSettingsStore);
	workflowsStore = mockedStore(useWorkflowsStore);

	workflowsStore.isNewWorkflow = false;

	projectsStore.currentProject = { id: 'default', scopes: ['credential:create'] } as Project;
	settingsStore.settings = {
		envFeatureFlags: {
			N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: true,
		},
		activeModules: ['dynamic-credentials'],
	} as unknown as FrontendSettings;
	vi.spyOn(settingsStore, 'isModuleActive').mockReturnValue(true);

	credentialsStore.state.credentialTypes = {
		openAiApi: openAiApiCredentialType,
	};
});

afterEach(() => {
	stopCredentialsMirror?.();
});

// A host can hand the picker its own list (the Instance AI setup
// card receives one in the suspend payload). Every path that reads a picked
// or restored credential must then resolve from that list, because the flat
// map and the usable slice may hold nothing yet — or ever, if the fetch fails.

describe('CP-CR-04-01 · Seleccionar una credencial existente', () => {
	describe('onCredentialSelected', () => {
		it('should call assignCredentialToMatchingNodes after selecting credentials', async () => {
			// Start with a credential already assigned so the dropdown renders
			const openAiNodeWithCred: INodeUi = {
				...openAiNodeNoCreds,
				credentials: { openAiApi: { id: 'c8vqdPpPClh4TgIO', name: 'OpenAi account' } },
			};

			ndvStore.activeNode = openAiNodeWithCred;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
				secondCred: createCredential({ id: 'secondCred', name: 'OpenAi account 2' }),
			};

			const assignSpy = vi.spyOn(workflowDocumentStore, 'assignCredentialToMatchingNodes');

			renderComponent(
				{
					props: {
						node: openAiNodeWithCred,
					},
				},
				{ merge: true },
			);

			const credentialsSelect = screen.getByTestId('node-credentials-select');

			await userEvent.click(credentialsSelect);

			const openAiCreds = screen.queryByText('OpenAi account 2');
			expect(openAiCreds).toBeInTheDocument();

			await userEvent.click(openAiCreds!);

			expect(assignSpy).toHaveBeenCalledWith({
				credentials: {
					id: 'secondCred',
					name: 'OpenAi account 2',
				},
				currentNodeName: 'OpenAI no creds',
				type: 'openAiApi',
			});
		});
	});
});

describe('CP-CR-04-03 · Crear credencial desde el nodo', () => {
	it('should open the new credential modal when clicked', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential(),
		};

		renderComponent();

		const credentialsSelect = screen.getByTestId('node-credentials-select');

		await userEvent.click(credentialsSelect);
		await userEvent.click(screen.getByTestId('node-credentials-select-item-new'));

		expect(uiStore.openNewCredential).toHaveBeenCalledWith(
			'openAiApi',
			false,
			false,
			undefined,
			undefined,
			httpNode.name,
			httpNode,
			{ hideAskAssistant: false, closeOnSave: true, workflowId: '1' },
		);
	});
});

describe('CP-CR-04-04 · Asignación automática de la única credencial', () => {
	describe('AI Gateway toggle (onAiGatewaySelector)', () => {
		const googlePalmApiCredType: ICredentialType = {
			name: 'googlePalmApi',
			displayName: 'Google PaLM API',
			properties: [{ displayName: 'API Key', name: 'apiKey', type: 'string', default: '' }],
		};

		const googleAiNodeType: INodeTypeDescription = {
			displayName: 'Google AI',
			name: 'googleAi',
			group: ['transform'],
			version: 1,
			description: '',
			defaults: { name: 'Google AI' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [{ name: 'googlePalmApi', required: true }],
			properties: [],
		};

		const googleAiNode: INodeUi = {
			id: 'node-google-ai',
			name: 'Google AI',
			type: 'googleAi',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			credentials: {},
		};

		// Declares resource and operation, so the picker can resolve the node's action.
		const googleAiNodeTypeWithActions: INodeTypeDescription = {
			...googleAiNodeType,
			properties: [
				{ displayName: 'Resource', name: 'resource', type: 'options', default: 'image' },
				{ displayName: 'Operation', name: 'operation', type: 'options', default: 'analyze' },
			],
		};

		beforeEach(() => {
			// Enable AI Gateway for this describe block
			vi.mocked(useAiGateway).mockReturnValue({
				isEnabled: computed(() => true),
				isCredentialTypeSupported: vi.fn((credType: string) => credType === 'googlePalmApi'),
				canServeCredentialType: vi.fn((credType: string) => credType === 'googlePalmApi'),
				isNodeTypeVersionSupported: vi.fn(() => true),
				isActionSupported: vi.fn(() => true),
				isActionOptionVisible: vi.fn(() => true),
				isNodePropertyHidden: vi.fn(() => false),
				balance: computed(() => undefined),
				budget: computed(() => undefined),
				creditsLabelKey: computed(() => 'generic.freeCredits'),
				fetchConfig: vi.fn().mockResolvedValue(undefined),
				fetchWallet: vi.fn().mockResolvedValue(undefined),
				saveAfterToggle: vi.fn().mockResolvedValue(undefined),
				fetchError: computed(() => null),
			});

			const nodeTypesStore = mockedStore(useNodeTypesStore);
			nodeTypesStore.setNodeTypes([googleAiNodeType]);

			credentialsStore.state.credentialTypes = { googlePalmApi: googlePalmApiCredType };
		});

		it('should auto-select an own credential when one is available', () => {
			const ownCred = {
				id: 'cred-1',
				name: 'My Google Key',
				type: 'googlePalmApi',
				isManaged: false,
				createdAt: '2024-01-01',
				updatedAt: '2024-01-01',
			};
			credentialsStore.state.credentials = { 'cred-1': ownCred };
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(ownCred);

			const nodeWithoutCred: INodeUi = {
				...googleAiNode,
				credentials: {},
				parameters: { resource: 'chat', operation: 'message' },
			};
			ndvStore.activeNode = nodeWithoutCred;

			const { emitted } = renderComponent({
				props: { node: nodeWithoutCred, overrideCredType: 'googlePalmApi' },
			});

			expect(emitted('credentialSelected')).toBeTruthy();
			const payload = ((emitted('credentialSelected')[0] as unknown[]) ?? [])[0] as {
				properties: { credentials: Record<string, unknown> };
			};
			expect(payload.properties.credentials['googlePalmApi']).toEqual({
				id: 'cred-1',
				name: 'My Google Key',
			});
		});
	});
});

describe('CP-CR-04-07 · Cambiar la credencial de un nodo', () => {
	describe('onCredentialSelected', () => {
		it('should drop credentials the node no longer uses when selecting a credential', async () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			nodeTypesStore.setNodeTypes([
				{
					displayName: 'HTTP Request',
					name: 'n8n-nodes-base.httpRequest',
					group: ['input'],
					version: [4, 4.1, 4.2],
					description: 'Makes an HTTP request',
					defaults: { name: 'HTTP Request' },
					inputs: [NodeConnectionTypes.Main],
					outputs: [NodeConnectionTypes.Main],
					credentials: [
						{
							name: 'httpSslAuth',
							required: true,
							displayOptions: { show: { provideSslCertificates: [true] } },
						},
					],
					properties: [],
				} as unknown as INodeTypeDescription,
			]);

			// Node switched from generic to predefined auth: the httpHeaderAuth entry is stale.
			// Built from scratch (not from the shared httpNode fixture) because store actions
			// in earlier tests mutate the fixture object in place.
			const httpNodeWithStaleCred: INodeUi = {
				parameters: {
					method: 'GET',
					url: '',
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'openAiApi',
					provideSslCertificates: false,
					options: {},
				},
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [-200, -160],
				id: 'e4b917b5-e994-42c7-8576-6ef28a7619b2',
				name: 'HTTP Request Stale',
				credentials: {
					openAiApi: { id: 'c8vqdPpPClh4TgIO', name: 'OpenAi account' },
					httpHeaderAuth: { id: 'staleCred', name: 'Header Auth' },
				},
			};

			ndvStore.activeNode = httpNodeWithStaleCred;
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential(),
				secondCred: createCredential({ id: 'secondCred', name: 'OpenAi account 2' }),
			};

			const { emitted } = renderComponent(
				{ props: { node: httpNodeWithStaleCred } },
				{ merge: true },
			);

			await userEvent.click(screen.getByTestId('node-credentials-select'));
			await userEvent.click(screen.queryByText('OpenAi account 2')!);

			const events = emitted('credentialSelected');
			const payload = (events[events.length - 1] as unknown[])[0] as {
				properties: { credentials: Record<string, unknown> };
			};
			expect(payload.properties.credentials).toEqual({
				openAiApi: { id: 'secondCred', name: 'OpenAi account 2' },
			});
		});
	});
});
