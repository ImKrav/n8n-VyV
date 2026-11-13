/**
 * CR-01 · Crear credencial — modal de edición (crear, probar conexión).
 * Origen: packages/frontend/editor-ui/src/features/credentials/components/CredentialEdit/CredentialEdit.test.ts
 */
import { usePostHog } from '@/app/stores/posthog.store';
import { createComponentRenderer } from '@/__tests__/render';
import CredentialEdit from '@/features/credentials/components/CredentialEdit/CredentialEdit.vue';
import { createTestingPinia } from '@pinia/testing';
import { getActivePinia, setActivePinia } from 'pinia';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { STORES } from '@n8n/stores';
import { retry, mockedStore } from '@/__tests__/utils';
import { mockRestrictedCredentialTypes } from '@n8n/frontend-module-type-availability-policies/__tests__/mocks';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useExternalSecretsStore } from '@/features/integrations/externalSecrets.ee/externalSecrets.ee.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import {
	createWorkflowDocumentId,
	useWorkflowDocumentStore,
} from '@/app/stores/workflowDocument.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { NewCredentialsModal } from '@/Interface';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import { within, waitFor, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import type { ICredentialType, INode, INodeTypeDescription } from 'n8n-workflow';
import type { Scope } from '@n8n/permissions';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useAiGatewayStore } from '@/app/stores/aiGateway.store';
import { reactive } from 'vue';
import { CREDENTIAL_DESCRIPTION_MAX_LENGTH } from '@n8n/api-types';
import { TEMPLATED_CUSTOM_AUTH_CREDENTIAL_TYPE } from '@/features/credentials/templatedAuth.utils';
import { getCredentialOptions } from '@/features/credentials/credentials.api';

vi.mock('@/features/credentials/credentials.api', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getCredentialOptions: vi.fn(),
}));

const { isAgentUi, getAgentCredentialHelp } = vi.hoisted(() => ({
	isAgentUi: { value: false },
	getAgentCredentialHelp: vi.fn(),
}));
vi.mock('@/features/agents/composables/useAgentAssistantCredentialHelp', () => ({
	useAgentAssistantCredentialHelp: () => ({ isAgentUi, getCredentialHelp: getAgentCredentialHelp }),
}));

const { confirmMock, routerCurrentRouteMock, routerReplaceMock } = vi.hoisted(() => ({
	confirmMock: vi.fn(),
	routerCurrentRouteMock: { value: { query: {} } },
	routerReplaceMock: vi.fn(),
}));
const {
	aiGatewayBalance,
	aiGatewayEnabled,
	fetchGatewayConfigMock,
	fetchGatewayWalletMock,
	saveAfterGatewayToggleMock,
	toastShowMessageMock,
} = vi.hoisted(() => ({
	aiGatewayBalance: { value: 1 },
	aiGatewayEnabled: { value: false },
	fetchGatewayConfigMock: vi.fn(),
	fetchGatewayWalletMock: vi.fn(),
	saveAfterGatewayToggleMock: vi.fn(),
	toastShowMessageMock: vi.fn(),
}));

vi.mock('vue-router', async () => ({
	...(await vi.importActual('vue-router')),
	useRouter: vi.fn(() => ({
		currentRoute: routerCurrentRouteMock,
		replace: routerReplaceMock,
	})),
	useRoute: () => ({
		params: {},
		query: {},
		path: '',
	}),
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showError: vi.fn(),
		showMessage: toastShowMessageMock,
	}),
}));

const telemetryTrackMock = vi.hoisted(() => vi.fn());
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrackMock }),
}));

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: () => ({
		isEnabled: aiGatewayEnabled,
		balance: aiGatewayBalance,
		creditsLabelKey: { value: 'generic.freeCredits' },
		fetchConfig: fetchGatewayConfigMock,
		fetchWallet: fetchGatewayWalletMock,
		saveAfterToggle: saveAfterGatewayToggleMock,
	}),
}));

vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({ confirm: confirmMock }),
}));

vi.mock('@/features/resolvers/composables/usePrivateCredentials', async () => {
	const { ref } = await vi.importActual<typeof import('vue')>('vue');
	return { usePrivateCredentials: () => ({ isEnabled: ref(true) }) };
});

// N8nDialog (reka-ui) doesn't render its portalled content in jsdom, so stub the
// type-to-confirm dialog with a plain element that surfaces its title + message.
vi.mock('@/features/credentials/components/CredentialEdit/TypeToConfirmDialog.vue', () => ({
	default: {
		name: 'TypeToConfirmDialog',
		props: ['open', 'title', 'message', 'confirmLabel', 'confirmKeyword', 'loading'],
		emits: ['confirm', 'update:open'],
		template:
			'<div v-if="open" data-test-id="credential-type-to-confirm-dialog">{{ title }} {{ message }}</div>',
	},
}));

// N8nDropdownMenu (reka-ui) doesn't render its portalled menu items in jsdom, so stub the
// auth-mode selector with plain buttons that emit the same event.
vi.mock('@/features/credentials/components/CredentialEdit/CredentialModeSelector.vue', () => ({
	default: {
		name: 'CredentialModeSelector',
		props: [
			'credentialType',
			'useCustomOauth',
			'showManagedOauthOptions',
			'quickConnectAvailable',
			'isQuickConnectMode',
			'contextNode',
		],
		emits: ['update:authType'],
		template: `
			<div data-test-id="credential-mode-selector-stub">
				<button
					data-test-id="select-service-account-auth"
					@click="$emit('update:authType', { type: 'serviceAccount' })"
				>Service Account</button>
				<button
					data-test-id="select-managed-oauth-auth"
					@click="$emit('update:authType', { type: 'oAuth2' })"
				>Managed OAuth</button>
				<button
					data-test-id="select-custom-oauth-auth"
					@click="$emit('update:authType', { type: 'oAuth2', customOauth: true })"
				>Custom OAuth</button>
			</div>
		`,
	},
}));

const oAuth2Api: ICredentialType = {
	name: 'oAuth2Api',
	displayName: 'OAuth2 API',
	documentationUrl: 'httpRequest',
	genericAuth: true,
	properties: [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'options',
			options: [
				{
					name: 'Authorization Code',
					value: 'authorizationCode',
				},
				{
					name: 'Client Credentials',
					value: 'clientCredentials',
				},
				{
					name: 'PKCE',
					value: 'pkce',
				},
			],
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'string',
			displayOptions: {
				show: {
					grantType: ['authorizationCode', 'pkce'],
				},
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'string',
			displayOptions: {
				show: {
					grantType: ['authorizationCode', 'pkce'],
				},
			},
			default: '',
			description:
				'For some services additional query parameters have to be set which can be defined here',
			placeholder: 'access_type=offline',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{
					name: 'Body',
					value: 'body',
					description: 'Send credentials in body',
				},
				{
					name: 'Header',
					value: 'header',
					description: 'Send credentials as Basic Auth header',
				},
			],
			default: 'header',
		},
		{
			displayName: 'Ignore SSL Issues (Insecure)',
			name: 'ignoreSSLIssues',
			type: 'boolean',
			default: false,
			doNotInherit: true,
		},
	],
	iconUrl: 'icons/n8n-nodes-base/dist/nodes/GraphQL/graphql.png',
	supportedNodes: ['n8n-nodes-base.graphql', 'n8n-nodes-base.httpRequest'],
};

const googleOAuth2Api: ICredentialType = {
	name: 'googleOAuth2Api',
	extends: ['oAuth2Api'],
	displayName: 'Google OAuth2 API',
	documentationUrl: 'google/oauth-generic',
	properties: [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://accounts.google.com/o/oauth2/v2/auth',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://oauth2.googleapis.com/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'access_type=offline&prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	],
	iconUrl: 'icons/n8n-nodes-base/dist/credentials/icons/Google.svg',
	supportedNodes: [],
};

const googleBigQueryOAuth2Api: ICredentialType = {
	name: 'googleBigQueryOAuth2Api',
	extends: ['googleOAuth2Api'],
	displayName: 'Google BigQuery OAuth2 API',
	documentationUrl: 'google/oauth-single-service',
	properties: [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default:
				'https://www.googleapis.com/auth/bigquery https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/drive',
		},
	],
	iconUrl: 'icons/n8n-nodes-base/dist/nodes/Google/BigQuery/googleBigQuery.svg',
	supportedNodes: ['n8n-nodes-base.googleBigQuery'],
};

const renderComponent = createComponentRenderer(CredentialEdit, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: {
					[CREDENTIAL_EDIT_MODAL_KEY]: { open: true },
				},
			},
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						sharing: true,
						externalSecrets: false,
					},
					templates: {
						host: '',
					},
				},
			},
		},
	}),
});

let broadcastMessageListener: ((event: MessageEvent) => void) | undefined;

class BroadcastChannelMock {
	constructor(public readonly name: string) {}

	addEventListener(_event: 'message', listener: (event: MessageEvent) => void) {
		broadcastMessageListener = listener;
	}

	removeEventListener = vi.fn();

	close = vi.fn();
}

const createCredentialResponse = (
	overrides: Partial<ICredentialsResponse> = {},
): ICredentialsResponse =>
	({
		id: 'cred-1',
		name: 'Test API account',
		type: 'testApi',
		isManaged: false,
		sharedWithProjects: [],
		scopes: ['credential:update'],
		...overrides,
	}) as ICredentialsResponse;

// Setup of describe('CredentialEdit', (original top-level describe)
beforeEach(() => {
	broadcastMessageListener = undefined;
	isAgentUi.value = false;
	getAgentCredentialHelp.mockReset();
	routerCurrentRouteMock.value = { query: {} };
	aiGatewayBalance.value = 1;
	aiGatewayEnabled.value = false;
	fetchGatewayConfigMock.mockResolvedValue(undefined);
	fetchGatewayWalletMock.mockResolvedValue(undefined);
	saveAfterGatewayToggleMock.mockResolvedValue(true);

	const externalSecretsStore = mockedStore(useExternalSecretsStore);
	externalSecretsStore.fetchSecretsForProject.mockResolvedValue(undefined);
});

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

const alphaCredType: ICredentialType = {
	name: 'alphaApi',
	displayName: 'Alpha API',
	properties: [
		{
			displayName: 'Alpha Key',
			name: 'alphaKey',
			type: 'string',
			default: '',
		},
	],
};

const betaCredType: ICredentialType = {
	name: 'betaApi',
	displayName: 'Beta API',
	properties: [
		{
			displayName: 'Beta Token',
			name: 'betaToken',
			type: 'string',
			default: '',
		},
	],
};

// Renders the new-credential modal (auth selector on) requesting the beta type
// of an alpha/beta node; returns the credentials store for assertions.
const renderDualCredModal = (mockNodeType: INodeTypeDescription) => {
	const pinia = createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: {
					[CREDENTIAL_EDIT_MODAL_KEY]: {
						open: true,
						showAuthSelector: true,
					},
				},
			},
			[STORES.SETTINGS]: {
				settings: {
					enterprise: {
						sharing: true,
						externalSecrets: false,
					},
					templates: {
						host: '',
					},
				},
			},
			[STORES.PROJECTS]: {
				personalProject: {
					id: 'personal-project',
					type: 'personal',
					scopes: ['credential:create', 'credential:read'],
				},
			},
		},
	});

	const credStore = mockedStore(useCredentialsStore);
	credStore.state.credentialTypes = {
		alphaApi: alphaCredType,
		betaApi: betaCredType,
	};
	credStore.getNewCredentialName.mockResolvedValue('Beta API');

	const workflowsStore = mockedStore(useWorkflowsStore);
	workflowsStore.workflowId = 'test-workflow-id';
	const ndvStore = mockedStore(useNDVStore, createWorkflowDocumentId('test-workflow-id'));
	ndvStore.activeNode = {
		name: mockNodeType.displayName,
		type: mockNodeType.name,
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	} as INode;

	const nodeTypesStore = mockedStore(useNodeTypesStore);
	nodeTypesStore.getNodeType = () => mockNodeType;

	renderComponent({
		props: {
			activeId: 'betaApi',
			modalName: CREDENTIAL_EDIT_MODAL_KEY,
			mode: 'new',
		},
		pinia,
	});

	return credStore;
};

describe('CP-CR-01-01 · Crear credencial Header Auth válida', () => {
	describe('saving credentials', () => {
		const createPiniaForSaveTest = (
			credentialModalState: Partial<NewCredentialsModal> = {},
			projectsState: Record<string, unknown> = {},
		) =>
			createTestingPinia({
				initialState: {
					[STORES.UI]: {
						modalStateById: {
							[CREDENTIAL_EDIT_MODAL_KEY]: {
								open: true,
								showAuthSelector: false,
								...credentialModalState,
							},
						},
					},
					[STORES.SETTINGS]: {
						settings: {
							enterprise: {
								sharing: true,
								externalSecrets: false,
							},
							templates: {
								host: '',
							},
						},
					},
					[STORES.PROJECTS]: {
						personalProject: {
							id: 'personal-project',
							type: 'personal',
							scopes: ['credential:create', 'credential:read', 'credential:update'],
						},
						...projectsState,
					},
				},
			});

		const setupNewCredential = (
			credentialType: ICredentialType,
			credentialModalState: Partial<NewCredentialsModal> = {},
			projectsState: Record<string, unknown> = {},
		) => {
			const pinia = createPiniaForSaveTest(credentialModalState, projectsState);
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.state.credentialTypes = {
				[credentialType.name]: credentialType,
			};
			credentialsStore.getNewCredentialName.mockResolvedValue(
				`${credentialType.displayName} account`,
			);
			credentialsStore.createNewCredential.mockResolvedValue(
				createCredentialResponse({
					type: credentialType.name,
					name: `${credentialType.displayName} account`,
				}),
			);

			const uiStore = mockedStore(useUIStore);

			return { credentialsStore, pinia, uiStore };
		};

		const setupGatewayCredentialError = async ({
			contextNode = {
				id: 'node-1',
				name: 'Test node',
				type: 'n8n-nodes-base.test',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: {
					testApi: { id: 'cred-1', name: 'Test API account' },
					otherApi: { id: 'cred-2', name: 'Other API account' },
				},
			},
			activeTab = 'connection',
			balance = 1,
			eligible = true,
			includeAssignmentContext = true,
		}: {
			contextNode?: INode;
			activeTab?: 'connection' | 'sharing';
			balance?: number;
			eligible?: boolean;
			includeAssignmentContext?: boolean;
		} = {}) => {
			const credentialType = {
				name: 'testApi',
				displayName: 'Test API',
				properties: [],
				test: { request: {} },
			} as unknown as ICredentialType;
			const modalState: Partial<NewCredentialsModal> = {
				closeOnSave: true,
				workflowId: 'test-workflow-id',
				...(includeAssignmentContext ? { contextNode, nodeName: contextNode.name } : {}),
			};
			const { credentialsStore, pinia, uiStore } = setupNewCredential(credentialType, modalState);
			credentialsStore.testCredential.mockResolvedValue({
				status: 'Error',
				message: 'Could not connect',
			});
			aiGatewayBalance.value = balance;
			aiGatewayEnabled.value = true;
			mockedStore(useAiGatewayStore).isNodeEligible.mockReturnValue(eligible);

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.workflowId = 'test-workflow-id';
			if (!includeAssignmentContext) {
				mockedStore(useNDVStore, createWorkflowDocumentId('test-workflow-id')).activeNode =
					contextNode;
			}
			const workflowDocumentStore = mockedStore(
				useWorkflowDocumentStore,
				createWorkflowDocumentId('test-workflow-id'),
			);
			workflowDocumentStore.getNodeById = vi.fn(() => contextNode);
			mockedStore(useNodeTypesStore).getNodeType = () => ({
				displayName: 'Test',
				name: contextNode.type,
				group: [],
				version: 1,
				description: '',
				defaults: { name: 'Test' },
				inputs: [],
				outputs: [],
				properties: [],
				credentials: [{ name: credentialType.name, required: true }],
			});

			const rendered = renderComponent({
				props: {
					activeId: credentialType.name,
					modalName: CREDENTIAL_EDIT_MODAL_KEY,
					mode: 'new',
				},
				pinia,
			});

			await waitFor(() => expect(credentialsStore.getNewCredentialName).toHaveBeenCalled());
			if (activeTab === 'sharing') await userEvent.click(rendered.getByText('Sharing'));
			await userEvent.click(
				within(rendered.getByTestId('credential-save-button')).getByRole('button'),
			);
			await waitFor(() => expect(credentialsStore.testCredential).toHaveBeenCalled());

			return {
				...rendered,
				contextNode,
				credentialType,
				credentialsStore,
				uiStore,
				workflowDocumentStore,
			};
		};

		const setupExistingOAuthCredential = (
			credentialModalState: Partial<NewCredentialsModal> = {},
			dataOverrides: {
				scopes?: Scope[];
				isResolvable?: boolean;
				connectedByMe?: boolean;
				data?: Record<string, string>;
			} = {},
		) => {
			vi.stubGlobal('BroadcastChannel', BroadcastChannelMock);
			vi.stubGlobal(
				'open',
				vi.fn(() => ({ close: vi.fn(), closed: false, location: { href: '' } })),
			);

			const pinia = createPiniaForSaveTest(credentialModalState);
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.state.credentialTypes = {
				[oAuth2Api.name]: oAuth2Api,
			};
			credentialsStore.state.credentials = {
				'oauth-cred': createCredentialResponse({
					id: 'oauth-cred',
					name: 'OAuth account',
					type: oAuth2Api.name,
				}),
			};
			credentialsStore.getCredentialData.mockResolvedValueOnce({
				// @ts-expect-error data is decrypted
				data: dataOverrides.data ?? {
					grantType: 'authorizationCode',
					authUrl: 'https://auth.example.com',
					accessTokenUrl: 'https://token.example.com',
					clientId: 'client',
					clientSecret: 'secret',
				},
				createdAt: '2026-05-22T10:00:00.000Z',
				updatedAt: '2026-05-22T10:00:00.000Z',
				id: 'oauth-cred',
				name: 'OAuth account',
				type: oAuth2Api.name,
				isManaged: false,
				isResolvable: dataOverrides.isResolvable ?? false,
				connectedByMe: dataOverrides.connectedByMe,
				sharedWithProjects: [],
				scopes: dataOverrides.scopes ?? ['credential:update'],
				oauthTokenData: false,
			});
			credentialsStore.updateCredential.mockResolvedValue(
				createCredentialResponse({
					id: 'oauth-cred',
					name: 'OAuth account',
					type: oAuth2Api.name,
				}),
			);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://example.com/oauth');
			credentialsStore.fetchAllCredentials.mockResolvedValue([]);
			const uiStore = mockedStore(useUIStore);

			const renderResult = renderComponent({
				props: {
					activeId: 'oauth-cred',
					modalName: CREDENTIAL_EDIT_MODAL_KEY,
					mode: 'edit',
				},
				pinia,
			});

			return { credentialsStore, uiStore, ...renderResult };
		};

		test('calls onCredentialCreated with the newly created credential', async function () {
			const onCredentialCreated = vi.fn();
			const credentialType = {
				name: 'testApi',
				displayName: 'Test API',
				properties: [],
			} as ICredentialType;
			const { credentialsStore, pinia } = setupNewCredential(credentialType, {
				onCredentialCreated,
			});
			const createdCredential = createCredentialResponse({
				id: 'new-credential',
				name: 'Test API account',
				type: credentialType.name,
			});
			credentialsStore.createNewCredential.mockResolvedValue(createdCredential);

			const { getByTestId } = renderComponent({
				props: {
					activeId: credentialType.name,
					modalName: CREDENTIAL_EDIT_MODAL_KEY,
					mode: 'new',
				},
				pinia,
			});

			await waitFor(() => expect(credentialsStore.getNewCredentialName).toHaveBeenCalled());
			await userEvent.click(within(getByTestId('credential-save-button')).getByRole('button'));

			await waitFor(() => expect(onCredentialCreated).toHaveBeenCalledWith(createdCredential));
			expect(onCredentialCreated).toHaveBeenCalledTimes(1);
		});
	});
});

describe('CP-CR-01-03 · Prueba de conexión exitosa', () => {
	describe('saving credentials', () => {
		const createPiniaForSaveTest = (
			credentialModalState: Partial<NewCredentialsModal> = {},
			projectsState: Record<string, unknown> = {},
		) =>
			createTestingPinia({
				initialState: {
					[STORES.UI]: {
						modalStateById: {
							[CREDENTIAL_EDIT_MODAL_KEY]: {
								open: true,
								showAuthSelector: false,
								...credentialModalState,
							},
						},
					},
					[STORES.SETTINGS]: {
						settings: {
							enterprise: {
								sharing: true,
								externalSecrets: false,
							},
							templates: {
								host: '',
							},
						},
					},
					[STORES.PROJECTS]: {
						personalProject: {
							id: 'personal-project',
							type: 'personal',
							scopes: ['credential:create', 'credential:read', 'credential:update'],
						},
						...projectsState,
					},
				},
			});

		const setupNewCredential = (
			credentialType: ICredentialType,
			credentialModalState: Partial<NewCredentialsModal> = {},
			projectsState: Record<string, unknown> = {},
		) => {
			const pinia = createPiniaForSaveTest(credentialModalState, projectsState);
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.state.credentialTypes = {
				[credentialType.name]: credentialType,
			};
			credentialsStore.getNewCredentialName.mockResolvedValue(
				`${credentialType.displayName} account`,
			);
			credentialsStore.createNewCredential.mockResolvedValue(
				createCredentialResponse({
					type: credentialType.name,
					name: `${credentialType.displayName} account`,
				}),
			);

			const uiStore = mockedStore(useUIStore);

			return { credentialsStore, pinia, uiStore };
		};

		const setupGatewayCredentialError = async ({
			contextNode = {
				id: 'node-1',
				name: 'Test node',
				type: 'n8n-nodes-base.test',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: {
					testApi: { id: 'cred-1', name: 'Test API account' },
					otherApi: { id: 'cred-2', name: 'Other API account' },
				},
			},
			activeTab = 'connection',
			balance = 1,
			eligible = true,
			includeAssignmentContext = true,
		}: {
			contextNode?: INode;
			activeTab?: 'connection' | 'sharing';
			balance?: number;
			eligible?: boolean;
			includeAssignmentContext?: boolean;
		} = {}) => {
			const credentialType = {
				name: 'testApi',
				displayName: 'Test API',
				properties: [],
				test: { request: {} },
			} as unknown as ICredentialType;
			const modalState: Partial<NewCredentialsModal> = {
				closeOnSave: true,
				workflowId: 'test-workflow-id',
				...(includeAssignmentContext ? { contextNode, nodeName: contextNode.name } : {}),
			};
			const { credentialsStore, pinia, uiStore } = setupNewCredential(credentialType, modalState);
			credentialsStore.testCredential.mockResolvedValue({
				status: 'Error',
				message: 'Could not connect',
			});
			aiGatewayBalance.value = balance;
			aiGatewayEnabled.value = true;
			mockedStore(useAiGatewayStore).isNodeEligible.mockReturnValue(eligible);

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.workflowId = 'test-workflow-id';
			if (!includeAssignmentContext) {
				mockedStore(useNDVStore, createWorkflowDocumentId('test-workflow-id')).activeNode =
					contextNode;
			}
			const workflowDocumentStore = mockedStore(
				useWorkflowDocumentStore,
				createWorkflowDocumentId('test-workflow-id'),
			);
			workflowDocumentStore.getNodeById = vi.fn(() => contextNode);
			mockedStore(useNodeTypesStore).getNodeType = () => ({
				displayName: 'Test',
				name: contextNode.type,
				group: [],
				version: 1,
				description: '',
				defaults: { name: 'Test' },
				inputs: [],
				outputs: [],
				properties: [],
				credentials: [{ name: credentialType.name, required: true }],
			});

			const rendered = renderComponent({
				props: {
					activeId: credentialType.name,
					modalName: CREDENTIAL_EDIT_MODAL_KEY,
					mode: 'new',
				},
				pinia,
			});

			await waitFor(() => expect(credentialsStore.getNewCredentialName).toHaveBeenCalled());
			if (activeTab === 'sharing') await userEvent.click(rendered.getByText('Sharing'));
			await userEvent.click(
				within(rendered.getByTestId('credential-save-button')).getByRole('button'),
			);
			await waitFor(() => expect(credentialsStore.testCredential).toHaveBeenCalled());

			return {
				...rendered,
				contextNode,
				credentialType,
				credentialsStore,
				uiStore,
				workflowDocumentStore,
			};
		};

		const setupExistingOAuthCredential = (
			credentialModalState: Partial<NewCredentialsModal> = {},
			dataOverrides: {
				scopes?: Scope[];
				isResolvable?: boolean;
				connectedByMe?: boolean;
				data?: Record<string, string>;
			} = {},
		) => {
			vi.stubGlobal('BroadcastChannel', BroadcastChannelMock);
			vi.stubGlobal(
				'open',
				vi.fn(() => ({ close: vi.fn(), closed: false, location: { href: '' } })),
			);

			const pinia = createPiniaForSaveTest(credentialModalState);
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.state.credentialTypes = {
				[oAuth2Api.name]: oAuth2Api,
			};
			credentialsStore.state.credentials = {
				'oauth-cred': createCredentialResponse({
					id: 'oauth-cred',
					name: 'OAuth account',
					type: oAuth2Api.name,
				}),
			};
			credentialsStore.getCredentialData.mockResolvedValueOnce({
				// @ts-expect-error data is decrypted
				data: dataOverrides.data ?? {
					grantType: 'authorizationCode',
					authUrl: 'https://auth.example.com',
					accessTokenUrl: 'https://token.example.com',
					clientId: 'client',
					clientSecret: 'secret',
				},
				createdAt: '2026-05-22T10:00:00.000Z',
				updatedAt: '2026-05-22T10:00:00.000Z',
				id: 'oauth-cred',
				name: 'OAuth account',
				type: oAuth2Api.name,
				isManaged: false,
				isResolvable: dataOverrides.isResolvable ?? false,
				connectedByMe: dataOverrides.connectedByMe,
				sharedWithProjects: [],
				scopes: dataOverrides.scopes ?? ['credential:update'],
				oauthTokenData: false,
			});
			credentialsStore.updateCredential.mockResolvedValue(
				createCredentialResponse({
					id: 'oauth-cred',
					name: 'OAuth account',
					type: oAuth2Api.name,
				}),
			);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://example.com/oauth');
			credentialsStore.fetchAllCredentials.mockResolvedValue([]);
			const uiStore = mockedStore(useUIStore);

			const renderResult = renderComponent({
				props: {
					activeId: 'oauth-cred',
					modalName: CREDENTIAL_EDIT_MODAL_KEY,
					mode: 'edit',
				},
				pinia,
			});

			return { credentialsStore, uiStore, ...renderResult };
		};

		test('closes the modal after saving credentials with a successful connection test when closeOnSave is enabled', async () => {
			const credentialType = {
				name: 'testApi',
				displayName: 'Test API',
				properties: [],
				test: { request: {} },
			} as unknown as ICredentialType;
			const { credentialsStore, pinia, uiStore } = setupNewCredential(credentialType, {
				closeOnSave: true,
			});
			credentialsStore.testCredential.mockResolvedValue({
				status: 'OK',
				message: 'Connected',
			});

			const { getByTestId } = renderComponent({
				props: {
					activeId: credentialType.name,
					modalName: CREDENTIAL_EDIT_MODAL_KEY,
					mode: 'new',
				},
				pinia,
			});

			await waitFor(() => expect(credentialsStore.getNewCredentialName).toHaveBeenCalled());
			await userEvent.click(within(getByTestId('credential-save-button')).getByRole('button'));

			await waitFor(() => {
				expect(credentialsStore.testCredential).toHaveBeenCalled();
				expect(uiStore.closeModal).toHaveBeenCalledWith(CREDENTIAL_EDIT_MODAL_KEY);
			});
		});
	});
});

describe('CP-CR-01-04 · Prueba de conexión fallida', () => {
	describe('saving credentials', () => {
		const createPiniaForSaveTest = (
			credentialModalState: Partial<NewCredentialsModal> = {},
			projectsState: Record<string, unknown> = {},
		) =>
			createTestingPinia({
				initialState: {
					[STORES.UI]: {
						modalStateById: {
							[CREDENTIAL_EDIT_MODAL_KEY]: {
								open: true,
								showAuthSelector: false,
								...credentialModalState,
							},
						},
					},
					[STORES.SETTINGS]: {
						settings: {
							enterprise: {
								sharing: true,
								externalSecrets: false,
							},
							templates: {
								host: '',
							},
						},
					},
					[STORES.PROJECTS]: {
						personalProject: {
							id: 'personal-project',
							type: 'personal',
							scopes: ['credential:create', 'credential:read', 'credential:update'],
						},
						...projectsState,
					},
				},
			});

		const setupNewCredential = (
			credentialType: ICredentialType,
			credentialModalState: Partial<NewCredentialsModal> = {},
			projectsState: Record<string, unknown> = {},
		) => {
			const pinia = createPiniaForSaveTest(credentialModalState, projectsState);
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.state.credentialTypes = {
				[credentialType.name]: credentialType,
			};
			credentialsStore.getNewCredentialName.mockResolvedValue(
				`${credentialType.displayName} account`,
			);
			credentialsStore.createNewCredential.mockResolvedValue(
				createCredentialResponse({
					type: credentialType.name,
					name: `${credentialType.displayName} account`,
				}),
			);

			const uiStore = mockedStore(useUIStore);

			return { credentialsStore, pinia, uiStore };
		};

		const setupGatewayCredentialError = async ({
			contextNode = {
				id: 'node-1',
				name: 'Test node',
				type: 'n8n-nodes-base.test',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
				credentials: {
					testApi: { id: 'cred-1', name: 'Test API account' },
					otherApi: { id: 'cred-2', name: 'Other API account' },
				},
			},
			activeTab = 'connection',
			balance = 1,
			eligible = true,
			includeAssignmentContext = true,
		}: {
			contextNode?: INode;
			activeTab?: 'connection' | 'sharing';
			balance?: number;
			eligible?: boolean;
			includeAssignmentContext?: boolean;
		} = {}) => {
			const credentialType = {
				name: 'testApi',
				displayName: 'Test API',
				properties: [],
				test: { request: {} },
			} as unknown as ICredentialType;
			const modalState: Partial<NewCredentialsModal> = {
				closeOnSave: true,
				workflowId: 'test-workflow-id',
				...(includeAssignmentContext ? { contextNode, nodeName: contextNode.name } : {}),
			};
			const { credentialsStore, pinia, uiStore } = setupNewCredential(credentialType, modalState);
			credentialsStore.testCredential.mockResolvedValue({
				status: 'Error',
				message: 'Could not connect',
			});
			aiGatewayBalance.value = balance;
			aiGatewayEnabled.value = true;
			mockedStore(useAiGatewayStore).isNodeEligible.mockReturnValue(eligible);

			const workflowsStore = mockedStore(useWorkflowsStore);
			workflowsStore.workflowId = 'test-workflow-id';
			if (!includeAssignmentContext) {
				mockedStore(useNDVStore, createWorkflowDocumentId('test-workflow-id')).activeNode =
					contextNode;
			}
			const workflowDocumentStore = mockedStore(
				useWorkflowDocumentStore,
				createWorkflowDocumentId('test-workflow-id'),
			);
			workflowDocumentStore.getNodeById = vi.fn(() => contextNode);
			mockedStore(useNodeTypesStore).getNodeType = () => ({
				displayName: 'Test',
				name: contextNode.type,
				group: [],
				version: 1,
				description: '',
				defaults: { name: 'Test' },
				inputs: [],
				outputs: [],
				properties: [],
				credentials: [{ name: credentialType.name, required: true }],
			});

			const rendered = renderComponent({
				props: {
					activeId: credentialType.name,
					modalName: CREDENTIAL_EDIT_MODAL_KEY,
					mode: 'new',
				},
				pinia,
			});

			await waitFor(() => expect(credentialsStore.getNewCredentialName).toHaveBeenCalled());
			if (activeTab === 'sharing') await userEvent.click(rendered.getByText('Sharing'));
			await userEvent.click(
				within(rendered.getByTestId('credential-save-button')).getByRole('button'),
			);
			await waitFor(() => expect(credentialsStore.testCredential).toHaveBeenCalled());

			return {
				...rendered,
				contextNode,
				credentialType,
				credentialsStore,
				uiStore,
				workflowDocumentStore,
			};
		};

		const setupExistingOAuthCredential = (
			credentialModalState: Partial<NewCredentialsModal> = {},
			dataOverrides: {
				scopes?: Scope[];
				isResolvable?: boolean;
				connectedByMe?: boolean;
				data?: Record<string, string>;
			} = {},
		) => {
			vi.stubGlobal('BroadcastChannel', BroadcastChannelMock);
			vi.stubGlobal(
				'open',
				vi.fn(() => ({ close: vi.fn(), closed: false, location: { href: '' } })),
			);

			const pinia = createPiniaForSaveTest(credentialModalState);
			const credentialsStore = mockedStore(useCredentialsStore);
			credentialsStore.state.credentialTypes = {
				[oAuth2Api.name]: oAuth2Api,
			};
			credentialsStore.state.credentials = {
				'oauth-cred': createCredentialResponse({
					id: 'oauth-cred',
					name: 'OAuth account',
					type: oAuth2Api.name,
				}),
			};
			credentialsStore.getCredentialData.mockResolvedValueOnce({
				// @ts-expect-error data is decrypted
				data: dataOverrides.data ?? {
					grantType: 'authorizationCode',
					authUrl: 'https://auth.example.com',
					accessTokenUrl: 'https://token.example.com',
					clientId: 'client',
					clientSecret: 'secret',
				},
				createdAt: '2026-05-22T10:00:00.000Z',
				updatedAt: '2026-05-22T10:00:00.000Z',
				id: 'oauth-cred',
				name: 'OAuth account',
				type: oAuth2Api.name,
				isManaged: false,
				isResolvable: dataOverrides.isResolvable ?? false,
				connectedByMe: dataOverrides.connectedByMe,
				sharedWithProjects: [],
				scopes: dataOverrides.scopes ?? ['credential:update'],
				oauthTokenData: false,
			});
			credentialsStore.updateCredential.mockResolvedValue(
				createCredentialResponse({
					id: 'oauth-cred',
					name: 'OAuth account',
					type: oAuth2Api.name,
				}),
			);
			credentialsStore.oAuth2Authorize.mockResolvedValue('https://example.com/oauth');
			credentialsStore.fetchAllCredentials.mockResolvedValue([]);
			const uiStore = mockedStore(useUIStore);

			const renderResult = renderComponent({
				props: {
					activeId: 'oauth-cred',
					modalName: CREDENTIAL_EDIT_MODAL_KEY,
					mode: 'edit',
				},
				pinia,
			});

			return { credentialsStore, uiStore, ...renderResult };
		};

		test('keeps the modal open when the connection test fails after saving', async () => {
			const credentialType = {
				name: 'testApi',
				displayName: 'Test API',
				properties: [],
				test: { request: {} },
			} as unknown as ICredentialType;
			const { credentialsStore, pinia, uiStore } = setupNewCredential(credentialType, {
				closeOnSave: true,
			});
			credentialsStore.testCredential.mockResolvedValue({
				status: 'Error',
				message: 'Could not connect',
			});

			const { getByTestId } = renderComponent({
				props: {
					activeId: credentialType.name,
					modalName: CREDENTIAL_EDIT_MODAL_KEY,
					mode: 'new',
				},
				pinia,
			});

			await waitFor(() => expect(credentialsStore.getNewCredentialName).toHaveBeenCalled());
			await userEvent.click(within(getByTestId('credential-save-button')).getByRole('button'));

			await waitFor(() => expect(credentialsStore.testCredential).toHaveBeenCalled());
			expect(uiStore.closeModal).not.toHaveBeenCalled();
			expect(
				screen.queryByTestId('gateway-credits-credential-error-nudge'),
			).not.toBeInTheDocument();
		});
	});
});
