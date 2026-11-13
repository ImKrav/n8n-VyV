// Single source of truth for the QA suite scope: modules 1–4, five features each.
// Paths are relative to packages/frontend/editor-ui (the Vitest root).
const f = (path: string) => `src/features/${path}`;

/** Existing repo tests reused as-is, grouped by feature ID. */
export const reusedTestsByFeature: Record<string, string[]> = {
	'WF-01': [
		'workflows/canvas/components/Canvas.test.ts',
		'workflows/canvas/components/elements/nodes/CanvasNode.test.ts',
		'workflows/canvas/components/elements/edges/CanvasEdgeToolbar.test.ts',
		'workflows/canvas/components/elements/nodes/render-types/CanvasNodeStickyNote.test.ts',
	],
	'WF-02': ['workflows/components/WorkflowSettings/WorkflowSettings.test.ts'],
	'WF-03': [
		'workflows/components/WorkflowPublishModal.test.ts',
		'workflows/components/WorkflowActivationConflictingWebhookModal.test.ts',
	],
	'WF-04': [
		'workflows/workflowHistory/utils.test.ts',
		'workflows/workflowHistory/useWorkflowHistoryVersionOptions.test.ts',
		'workflows/workflowDiff/useWorkflowDiff.test.ts',
	],
	'WF-05': [
		'workflows/components/ImportWorkflowUrlModal.test.ts',
		'workflows/templates/utils/templateActions.test.ts',
		'workflows/templates/utils/templateTransforms.test.ts',
	],
	'EX-01': [
		'execution/executions/components/global/GlobalExecutionsList.test.ts',
		'execution/executions/components/workflow/WorkflowExecutionsSidebar.test.ts',
	],
	'EX-02': [
		'execution/executions/components/ExecutionsFilter.test.ts',
		'execution/executions/executions.utils.test.ts',
	],
	'EX-03': ['execution/executions/components/workflow/WorkflowExecutionsPreview.test.ts'],
	'EX-04': [
		'execution/executions/components/StopManyExecutionsModal.test.ts',
		'execution/executions/components/ConcurrentExecutionsHeader.test.ts',
	],
	'EX-05': [
		'execution/logs/components/LogsPanel.test.ts',
		'execution/logs/components/LogDetailsPanel.test.ts',
	],
	'CR-01': [
		'credentials/components/CredentialEdit/CredentialTypeSelector.test.ts',
		'credentials/components/CredentialEdit/CredentialConfig.test.ts',
		'credentials/components/CredentialEdit/CredentialInputs.test.ts',
	],
	'CR-02': ['credentials/components/CredentialEdit/CredentialEdit.test.ts'],
	'CR-03': [
		'credentials/components/ScopesNotice.test.ts',
		'credentials/quickConnect/composables/useQuickConnect.test.ts',
	],
	'CR-04': [
		'credentials/components/NodeCredentials.test.ts',
		'credentials/components/CredentialsSelect.test.ts',
		'credentials/components/CredentialPicker/CredentialPicker.test.ts',
	],
	'CR-05': [
		'credentials/views/CredentialsView.test.ts',
		'credentials/components/CredentialCard.test.ts',
		'credentials/components/CredentialEdit/CredentialSharing.ee.test.ts',
	],
	'CO-01': [
		'core/dataTable/components/dataGrid/AddColumnButton.test.ts',
		'core/dataTable/components/dataGrid/ColumnHeader.test.ts',
	],
	'CO-02': [
		'core/dataTable/components/dataGrid/DataTableTable.test.ts',
		'core/dataTable/components/dataGrid/AddRowButton.test.ts',
	],
	'CO-03': [
		'core/dataTable/components/ImportCsvModal.test.ts',
		'core/dataTable/components/DownloadDataTableModal.test.ts',
	],
	'CO-04': [
		'core/folders/components/FolderCard.test.ts',
		'core/folders/components/FolderBreadcrumbs.test.ts',
	],
	'CO-05': ['core/folders/components/MoveToFolderModal.test.ts'],
};

export const reusedTests = Object.values(reusedTestsByFeature).flat().map(f);

/** Production files measured by the coverage report (the "selected code"). */
export const selectedSources = [
	'workflows/canvas/components/Canvas.vue',
	'workflows/canvas/components/elements/nodes/CanvasNode.vue',
	'workflows/canvas/components/elements/edges/CanvasEdgeToolbar.vue',
	'workflows/canvas/components/elements/nodes/render-types/CanvasNodeStickyNote.vue',
	'workflows/components/WorkflowSettings/WorkflowSettings.vue',
	'workflows/components/WorkflowPublishModal.vue',
	'workflows/components/WorkflowActivationConflictingWebhookModal.vue',
	'workflows/components/WorkflowActivationErrorMessage.vue',
	'workflows/workflowHistory/utils.ts',
	'workflows/workflowDiff/useWorkflowDiff.ts',
	'workflows/components/ImportWorkflowUrlModal.vue',
	'workflows/components/DuplicateWorkflowDialog.vue',
	'execution/executions/components/global/GlobalExecutionsList.vue',
	'execution/executions/components/workflow/WorkflowExecutionsSidebar.vue',
	'execution/executions/components/ExecutionsFilter.vue',
	'execution/executions/executions.utils.ts',
	'execution/executions/components/workflow/WorkflowExecutionsPreview.vue',
	'execution/executions/components/StopManyExecutionsModal.vue',
	'execution/executions/components/ExecutionStopAllText.vue',
	'execution/logs/components/LogsPanel.vue',
	'execution/logs/components/LogDetailsPanel.vue',
	'credentials/components/CredentialEdit/CredentialTypeSelector.vue',
	'credentials/components/CredentialEdit/CredentialEdit.vue',
	'credentials/components/CredentialEdit/TypeToConfirmDialog.vue',
	'credentials/components/ScopesNotice.vue',
	'credentials/components/NodeCredentials.vue',
	'credentials/components/CredentialsSelect.vue',
	'credentials/views/CredentialsView.vue',
	'credentials/components/CredentialCard.vue',
	'core/dataTable/components/AddDataTableModal.vue',
	'core/dataTable/components/dataGrid/AddColumnButton.vue',
	'core/dataTable/components/dataGrid/DataTableTable.vue',
	'core/dataTable/components/ImportCsvModal.vue',
	'core/dataTable/components/DownloadDataTableModal.vue',
	'core/folders/components/FolderCard.vue',
	'core/folders/components/FolderBreadcrumbs.vue',
	'core/folders/components/MoveToFolderModal.vue',
	'core/folders/components/DeleteFolderModal.vue',
].map(f);
