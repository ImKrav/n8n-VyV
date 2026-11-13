/**
 * EX-04 · Detener ejecuciones — comando «detener» de la barra de comandos.
 * Origen: packages/frontend/editor-ui/src/features/shared/commandBar/composables/useExecutionCommands.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExecutionCommands } from '@/features/shared/commandBar/composables/useExecutionCommands';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { getResourcePermissions } from '@n8n/permissions';
import { setActivePinia } from 'pinia';
import type { ExecutionSummary } from 'n8n-workflow';
import { EnterpriseEditionFeature, MODAL_CONFIRM, VIEWS } from '@/app/constants';

const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
vi.mock('vue-router', () => ({
	useRouter: () => ({
		push: routerPushMock,
		replace: routerReplaceMock,
	}),
	useRoute: () => ({
		name: VIEWS.EXECUTION_PREVIEW,
		params: { workflowId: 'workflow-1', executionId: 'exec-1' },
	}),
	RouterLink: vi.fn(),
}));

vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (opts?.interpolate) {
				let result = key;
				for (const [k, v] of Object.entries(opts.interpolate)) {
					result = result.replace(`{${k}}`, v);
				}
				return result;
			}
			return key;
		},
	}),
}));

const mockToastShowMessage = vi.fn();
const mockToastShowError = vi.fn();
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({
		showMessage: mockToastShowMessage,
		showError: mockToastShowError,
	}),
}));

const mockMessageConfirm = vi.fn();
vi.mock('@/app/composables/useMessage', () => ({
	useMessage: () => ({
		confirm: mockMessageConfirm,
	}),
}));

const mockTelemetryTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTelemetryTrack,
	}),
}));

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/permissions')>()),
	getResourcePermissions: vi.fn(() => ({
		workflow: {
			update: true,
			execute: true,
		},
		execution: {
			delete: true,
		},
	})),
}));

vi.mock('@/features/execution/executions/executions.utils', async (importOriginal) => ({
	...(await importOriginal()),
	executionRetryMessage: vi.fn((status: string) => ({
		title: `Execution ${status}`,
		type: 'info' as const,
	})),
}));

// Setup of describe('useExecutionCommands', (original top-level describe)
let mockExecutionsStore: ReturnType<typeof useExecutionsStore>;
let mockWorkflowsStore: ReturnType<typeof useWorkflowsStore>;
let mockSettingsStore: ReturnType<typeof useSettingsStore>;
let mockGetResourcePermissions: ReturnType<typeof vi.fn>;

const createMockExecution = (
	id: string,
	status: ExecutionSummary['status'],
	workflowId = 'workflow-1',
	annotation?: ExecutionSummary['annotation'],
): ExecutionSummary => ({
	id,
	workflowId,
	mode: 'manual',
	status,
	createdAt: new Date(),
	startedAt: new Date(),
	stoppedAt: status === 'running' ? undefined : new Date(),
	annotation,
});

beforeEach(() => {
	setActivePinia(createTestingPinia());

	mockExecutionsStore = useExecutionsStore();
	mockWorkflowsStore = useWorkflowsStore();
	mockSettingsStore = useSettingsStore();

	mockGetResourcePermissions = vi.mocked(getResourcePermissions);

	Object.defineProperty(mockExecutionsStore, 'activeExecution', {
		value: null,
	});

	Object.defineProperty(mockExecutionsStore, 'currentExecutionsByWorkflowId', {
		value: {},
	});

	Object.defineProperty(mockExecutionsStore, 'executionsByWorkflowId', {
		value: {},
	});

	Object.defineProperty(mockExecutionsStore, 'deleteExecutions', {
		value: vi.fn().mockResolvedValue(undefined),
	});

	Object.defineProperty(mockExecutionsStore, 'retryExecution', {
		value: vi.fn().mockResolvedValue(createMockExecution('exec-retry', 'success')),
	});

	Object.defineProperty(mockExecutionsStore, 'stopCurrentExecution', {
		value: vi.fn().mockResolvedValue(undefined),
	});

	Object.defineProperty(mockExecutionsStore, 'annotateExecution', {
		value: vi.fn().mockResolvedValue(undefined),
	});

	Object.defineProperty(mockWorkflowsStore, 'getWorkflowById', {
		value: vi.fn().mockReturnValue({
			id: 'workflow-1',
			name: 'Test Workflow',
			scopes: [],
		}),
	});

	Object.defineProperty(mockSettingsStore, 'isEnterpriseFeatureEnabled', {
		value: {
			[EnterpriseEditionFeature.AdvancedExecutionFilters]: false,
		},
	});

	mockGetResourcePermissions.mockReturnValue({
		workflow: {
			update: true,
			execute: true,
		},
		execution: {
			delete: true,
		},
	});

	vi.clearAllMocks();
});

describe('CP-EX-04-01 · Detener una ejecución desde el editor', () => {
	describe('stop execution command', () => {
		it('should call stopCurrentExecution when handler is called', async () => {
			mockExecutionsStore.activeExecution = createMockExecution('exec-1', 'running');

			const { commands } = useExecutionCommands();

			const stopCommand = commands.value.find((cmd) => cmd.id === 'stop-execution');
			await stopCommand?.handler?.();

			expect(mockExecutionsStore.stopCurrentExecution).toHaveBeenCalledWith('exec-1');
			expect(mockToastShowMessage).toHaveBeenCalled();
		});
	});
});
