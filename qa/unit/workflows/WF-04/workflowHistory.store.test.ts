/**
 * WF-04 · Historial de versiones y diff — store del historial (listar, nombrar, restaurar).
 * Origen: packages/frontend/editor-ui/src/features/workflows/workflowHistory/workflowHistory.store.test.ts
 */
import { createPinia, setActivePinia } from 'pinia';
import type { FrontendSettings } from '@n8n/api-types';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { getNewWorkflow } from '@/app/api/workflows';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as whApi from '@n8n/rest-api-client/api/workflowHistory';
import * as instanceVersionHistoryApi from '@n8n/rest-api-client/api/instance-version-history';

const emptyCanvasGroupsEnabled = vi.hoisted(() => ({ value: false }));

vi.mock('@/features/workflows/canvas/composables/useEmptyCanvasGroupsFlag', () => ({
	useEmptyCanvasGroupsFlag: () => emptyCanvasGroupsEnabled,
}));
vi.mock('@/app/api/workflows', () => ({ getNewWorkflow: vi.fn() }));

vi.mock('@n8n/rest-api-client/api/workflowHistory');
vi.mock('@n8n/rest-api-client/api/instance-version-history');

// Setup of describe('Workflow history store', (original top-level describe)
beforeEach(() => {
	setActivePinia(createPinia());
	vi.clearAllMocks();
});

describe('CP-WF-04-01 · Cada guardado genera una versión', () => {
	describe('getPublishTimeline', () => {
		it('should call the API with the rest context, workflow id and page, and return its result', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const rootStore = useRootStore();
			const workflowId = 'workflow-123';
			const events = [
				{
					id: 1,
					workflowId,
					versionId: 'v1',
					event: 'activated' as const,
					createdAt: '2026-01-01T00:00:00Z',
					userId: null,
					user: null,
					versionName: 'Release 1',
				},
			];

			vi.mocked(whApi.getPublishTimeline).mockResolvedValue(events);

			const result = await workflowHistoryStore.getPublishTimeline(workflowId, {
				take: 100,
				skip: 0,
			});

			expect(whApi.getPublishTimeline).toHaveBeenCalledWith(rootStore.restApiContext, workflowId, {
				take: 100,
				skip: 0,
			});
			expect(result).toBe(events);
		});
	});
});

describe('CP-WF-04-02 · Nombrar una versión', () => {
	describe('updateWorkflowHistoryVersion', () => {
		it('should handle updating only name', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const rootStore = useRootStore();
			const workflowId = 'workflow-123';
			const versionId = 'version-456';
			const updateData = { name: 'Updated Version' };

			vi.mocked(whApi.updateWorkflowHistoryVersion).mockResolvedValue(undefined);

			await workflowHistoryStore.updateWorkflowHistoryVersion(workflowId, versionId, updateData);

			expect(whApi.updateWorkflowHistoryVersion).toHaveBeenCalledWith(
				rootStore.restApiContext,
				workflowId,
				versionId,
				updateData,
			);
		});
	});
});

describe('CP-WF-04-03 · Restaurar una versión anterior', () => {
	describe('restoreWorkflow', () => {
		it('sends the version it restores, so the server can keep its nodes', async () => {
			const workflowHistoryStore = useWorkflowHistoryStore();
			const workflowsStore = useWorkflowsStore();
			const nodes = [{ id: 'node-1', name: 'Call' }];
			vi.mocked(whApi.getWorkflowVersion).mockResolvedValue({
				nodes,
				connections: {},
				nodeGroups: [],
			} as unknown as Awaited<ReturnType<typeof whApi.getWorkflowVersion>>);
			const updateWorkflow = vi
				.spyOn(workflowsStore, 'updateWorkflow')
				.mockResolvedValue({} as Awaited<ReturnType<typeof workflowsStore.updateWorkflow>>);

			await workflowHistoryStore.restoreWorkflow('workflow-123', 'version-456');

			expect(updateWorkflow).toHaveBeenCalledWith(
				'workflow-123',
				expect.objectContaining({ nodes, restoredFromVersionId: 'version-456' }),
				true,
			);
		});
	});
});
