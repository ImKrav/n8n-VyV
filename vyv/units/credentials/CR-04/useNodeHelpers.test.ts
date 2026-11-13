/**
 * CR-04 · Uso desde un nodo — avisos de credencial del nodo (sin asignar, inexistente, ambigua).
 * Origen: packages/frontend/editor-ui/src/app/composables/useNodeHelpers.test.ts
 */
import { shallowRef, computed } from 'vue';
import { setActivePinia } from 'pinia';
import type {
	ExecutionStatus,
	IRunData,
	INode,
	INodeTypeDescription,
	Workflow,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers, mapConnectionsByDestination } from 'n8n-workflow';
import { createTestingPinia } from '@pinia/testing';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { createTestNode, createMockEnterpriseSettings } from '@/__tests__/mocks';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { CUSTOM_API_CALL_KEY, EnterpriseEditionFeature } from '@/app/constants';
import { mockedStore } from '@/__tests__/utils';
import { mock } from 'vitest-mock-extended';
import { faker } from '@faker-js/faker';
import type { WorkflowObjectAccessors } from '@/app/types/workflow';
import type { INodeUi } from '@/Interface';
import type {
	IUsedCredential,
	ICredentialsResponse,
} from '@/features/credentials/credentials.types';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';

vi.mock('@/features/resolvers/composables/usePrivateCredentials', () => ({
	usePrivateCredentials: vi.fn(),
}));

import { usePrivateCredentials } from '@/features/resolvers/composables/usePrivateCredentials';

const mockedUseDynamicCredentials = vi.mocked(usePrivateCredentials);

const mockDocumentStoreUsedCredentials: Record<string, IUsedCredential> = {};

const mockDocumentStore = {
	name: '',
	settings: {},
	pinnedDataByNodeName: {},
	usedCredentials: mockDocumentStoreUsedCredentials,
	allNodes: [] as INodeUi[],
	workflowTriggerNodes: [] as INodeUi[],
	connectionsBySourceNode: {} as Record<string, unknown>,
	connectionsByDestinationNode: {} as Record<string, unknown>,
	getNodeByName: vi.fn(),
	setNodeIssue: vi.fn(),
	updateNodeProperties: vi.fn(),
	getExpressionHandler: vi.fn(() => ({})),
	getPinDataSnapshot: vi.fn().mockReturnValue({}),
	getWorkflowObjectAccessorSnapshot: vi.fn(() => ({}) as unknown as WorkflowObjectAccessors),
};

vi.mock('@/app/stores/workflowDocument.store', async () => {
	const actual = await vi.importActual('@/app/stores/workflowDocument.store');
	return {
		...actual,
		useWorkflowDocumentStore: vi.fn(() => mockDocumentStore),
		injectWorkflowDocumentStore: () => shallowRef(mockDocumentStore),
	};
});

const mockInjectedRunData = { value: null as IRunData | null };

vi.mock('@/app/stores/workflowExecutionState.store', async (importOriginal) => {
	const actual = await importOriginal<Record<string, unknown>>();
	return {
		...actual,
		injectWorkflowExecutionStateStore: vi.fn(() => ({
			// Plain accessor (not `computed`) so per-test reassignment of the
			// non-reactive holder is always picked up.
			get value() {
				return { activeExecutionRunData: mockInjectedRunData.value };
			},
		})),
	};
});

// Setup of describe('useNodeHelpers()', (original top-level describe)
beforeAll(() => {
	setActivePinia(createTestingPinia());
	mockedStore(useWorkflowsStore).workflowId = 'workflow-id';
});

beforeEach(() => {
	mockedUseDynamicCredentials.mockReturnValue({
		isEnabled: computed(() => true),
	} as ReturnType<typeof usePrivateCredentials>);
});

afterEach(() => {
	vi.clearAllMocks();
	mockInjectedRunData.value = null;
	// Clear mock document store state
	for (const key of Object.keys(mockDocumentStoreUsedCredentials)) {
		delete mockDocumentStoreUsedCredentials[key];
	}
});

describe('CP-CR-04-06 · Ejecutar un nodo sin credencial asignada', () => {
	describe('credential issues with AI Gateway', () => {
		const nodeTypeWithCreds: INodeTypeDescription = {
			displayName: 'Google AI',
			name: 'googleAi',
			group: ['transform'],
			version: 1,
			description: 'Google AI node',
			defaults: { name: 'Google AI' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			credentials: [{ name: 'googlePalmApi', required: true }],
			properties: [],
		};

		it('should report credential issue when required credential is not set', () => {
			mockedStore(useNodeTypesStore).getNodeType = vi.fn().mockReturnValue(nodeTypeWithCreds);

			const node: INodeUi = createTestNode({
				type: 'googleAi',
				credentials: {},
			});

			const mockWorkflow = mock<Workflow>();
			const { getNodeIssues } = useNodeHelpers();
			const result = getNodeIssues(nodeTypeWithCreds, node, mockWorkflow, ['parameters']);

			expect(result?.credentials?.googlePalmApi).toBeDefined();
		});
	});
});

// ---------------------------------------------------------------------------
// Pruebas nuevas (no existían en el repositorio). Usan la misma preparación.
// ---------------------------------------------------------------------------

// Mock: permission check. The "does not exist" issue is only shown to users
// who cannot read every credential (members), so each test sets the answer.
const hasPermissionMock = vi.hoisted(() => vi.fn(() => false));
vi.mock('@/app/utils/rbac/permissions', () => ({ hasPermission: hasPermissionMock }));

const httpHeaderNodeType: INodeTypeDescription = {
	displayName: 'Test API',
	name: 'testApi',
	group: ['transform'],
	version: 1,
	description: 'Node with a required credential',
	defaults: { name: 'Test API' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [{ name: 'httpHeaderAuth', required: true }],
	properties: [],
};

const issuesFor = (credentials: INodeUi['credentials']) => {
	mockedStore(useNodeTypesStore).getNodeType = vi.fn().mockReturnValue(httpHeaderNodeType);
	const node: INodeUi = createTestNode({ type: 'testApi', credentials });
	const { getNodeIssues } = useNodeHelpers();
	return getNodeIssues(httpHeaderNodeType, node, mock<Workflow>(), ['parameters']);
};

const storedCredentials = (list: Array<{ id: string; name: string }>) => {
	mockedStore(useCredentialsStore).getCredentialsByType = vi
		.fn()
		.mockReturnValue(list.map((c) => ({ ...c, type: 'httpHeaderAuth' })));
};

describe('CP-CR-04-05 · Importar workflow con credencial inexistente', () => {
	beforeEach(() => hasPermissionMock.mockReturnValue(false));

	it('advierte que la credencial referenciada no existe en la instancia', () => {
		// Arrange
		storedCredentials([{ id: 'c1', name: 'Mi API' }]);

		// Act
		const result = issuesFor({
			httpHeaderAuth: { id: 'imported-id', name: 'API de otra instancia' },
		});

		// Assert
		expect(result?.credentials?.httpHeaderAuth?.[0]).toContain(
			'Credentials with name API de otra instancia do not exist',
		);
	});

	it('no avisa cuando la credencial referenciada existe', () => {
		// Arrange
		storedCredentials([{ id: 'c1', name: 'Mi API' }]);

		// Act
		const result = issuesFor({ httpHeaderAuth: { id: 'c1', name: 'Mi API' } });

		// Assert
		expect(result?.credentials).toBeUndefined();
	});
});

describe('CP-CR-02-08 · Eliminar una credencial en uso', () => {
	beforeEach(() => hasPermissionMock.mockReturnValue(false));

	it('el nodo señala el problema cuando su credencial ya no existe', () => {
		// Arrange: the credential was deleted, so the store no longer has it
		storedCredentials([]);

		// Act
		const result = issuesFor({ httpHeaderAuth: { id: 'deleted-id', name: 'Borrada' } });

		// Assert
		expect(result?.credentials?.httpHeaderAuth).toEqual([
			expect.stringContaining('Credentials with name Borrada do not exist'),
			expect.any(String),
		]);
	});
});

describe('CP-CR-01-06 · Nombre de credencial duplicado', () => {
	beforeEach(() => hasPermissionMock.mockReturnValue(false));

	it('pide elegir la credencial cuando dos tienen el mismo nombre y el nodo no guarda el id', () => {
		// Arrange
		storedCredentials([
			{ id: 'c1', name: 'Duplicada' },
			{ id: 'c2', name: 'Duplicada' },
		]);

		// Act
		const result = issuesFor({ httpHeaderAuth: { id: null, name: 'Duplicada' } });

		// Assert
		expect(result?.credentials?.httpHeaderAuth?.[0]).toContain(
			'Credentials with name Duplicada exist',
		);
	});

	it('distingue las dos credenciales por su id', () => {
		// Arrange
		storedCredentials([
			{ id: 'c1', name: 'Duplicada' },
			{ id: 'c2', name: 'Duplicada' },
		]);

		// Act
		const result = issuesFor({ httpHeaderAuth: { id: 'c2', name: 'Duplicada' } });

		// Assert
		expect(result?.credentials).toBeUndefined();
	});
});
