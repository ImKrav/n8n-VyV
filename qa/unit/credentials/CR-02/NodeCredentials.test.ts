/**
 * CR-02 · Editar, renombrar y eliminar — el nombre nuevo aparece en el nodo.
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

describe('CP-CR-02-05 · Renombrar una credencial', () => {
	it('should refetch credentials when the dropdown opens so a rename from another tab shows up', async () => {
		ndvStore.activeNode = httpNode;
		credentialsStore.state.credentials = {
			c8vqdPpPClh4TgIO: createCredential({ name: 'Scout' }),
		};

		renderComponent();

		// The rename happened in another tab: only a fresh fetch can bring the new name.
		credentialsStore.fetchUsableCredentials = vi.fn().mockImplementation(async () => {
			credentialsStore.state.credentials = {
				c8vqdPpPClh4TgIO: createCredential({ name: 'Scout renamed' }),
			};
			return Object.values(credentialsStore.state.credentials);
		});

		// Click the input: the dropdown only opens from inside the select trigger.
		const select = screen.getByTestId('node-credentials-select');
		await userEvent.click(select.querySelector('input') as HTMLElement);

		expect(credentialsStore.fetchUsableCredentials).toHaveBeenCalledWith({ workflowId: '1' });
		expect(await screen.findByText('Scout renamed')).toBeInTheDocument();
		expect(screen.queryByText('Scout')).not.toBeInTheDocument();
	});
});
