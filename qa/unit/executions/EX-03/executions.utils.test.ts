/**
 * EX-03 · Vista previa, reintento y borrado — mensaje del nodo con error.
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/executions.utils.test.ts
 */
import type { MockInstance } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	displayForm,
	executionFilterToQueryFilter,
	hasCancellableExecutions,
	waitingNodeTooltip,
	getExecutionErrorMessage,
	getExecutionErrorToastConfiguration,
	findTriggerNodeToAutoSelect,
	buildExecutionResponseFromSchema,
	generatePlaceholderValue,
	generateFakeDataFromSchema,
} from '@/features/execution/executions/executions.utils';
import type {
	ExecutionError,
	INodeTypeDescription,
	Workflow,
	ExecutionSummary,
} from 'n8n-workflow';
import { EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { type INodeUi, type IWorkflowDb } from '@/Interface';
import {
	CORE_NODES_CATEGORY,
	FORM_TRIGGER_NODE_TYPE,
	GITHUB_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
} from '@/app/constants';
import { createTestNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import type { VNode } from 'vue';

// `restoreMocks` restores spies before each test, so this is (re)established in beforeEach.
let windowOpenSpy: MockInstance;

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		formWaitingUrl: 'http://localhost:5678/form-waiting',
		webhookWaitingUrl: 'http://localhost:5678/webhook-waiting',
	}),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: () => ({
		workflowId: 'test-workflow',
	}),
}));

vi.mock('@/app/stores/workflowExecutionState.store', () => ({
	useWorkflowExecutionStateStore: () => ({
		activeExecutionId: '123',
	}),
}));

vi.mock('@n8n/i18n', () => ({
	i18n: {
		baseText: (key: string, options?: { interpolate?: { error?: string; details?: string } }) => {
			const texts: { [key: string]: string } = {
				'pushConnection.executionError': `Execution error${options?.interpolate?.error}`,
				'pushConnection.executionError.details': `Details: ${options?.interpolate?.details}`,
			};
			return texts[key] || key;
		},
	},
}));

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (type: string) => {
			const nodeTypes: Record<string, { waitingNodeTooltip?: string }> = {
				'n8n-nodes-base.wait': {
					waitingNodeTooltip:
						'={{$node.parameters.resume === "form" ? "Waiting for form submission: <a href=\\"" + $execution.resumeFormUrl + "\\" target=\\"_blank\\">" + $execution.resumeFormUrl + "</a>" : $node.parameters.resume === "webhook" ? "Waiting for webhook call: <a href=\\"" + $execution.resumeUrl + "\\" target=\\"_blank\\">" + $execution.resumeUrl + "</a>" : "Waiting for execution to resume..."}}',
				},
				'n8n-nodes-base.form': {
					waitingNodeTooltip:
						'Waiting for form submission: <a href="{{$execution.resumeFormUrl}}" target="_blank">{{$execution.resumeFormUrl}}</a>',
				},
				'n8n-nodes-base.sendWait': {
					waitingNodeTooltip: 'Waiting for approval...',
				},
				[GITHUB_NODE_TYPE]: {
					waitingNodeTooltip:
						'Waiting for webhook call: <a href="{{$execution.resumeUrl}}" target="_blank">{{$execution.resumeUrl}}</a>',
				},
			};
			return nodeTypes[type] || null;
		},
	}),
}));

const executionErrorFactory = (error: Record<string, unknown>) =>
	error as unknown as ExecutionError;

// Setup of describe('getExecutionErrorMessage', (original top-level describe)

describe('CP-EX-03-02 · Vista previa de ejecución fallida', () => {
	it('returns error.message when lastNodeExecuted and error are present', () => {
		const result = getExecutionErrorMessage({
			error: executionErrorFactory({ message: 'Node failed' }),
			lastNodeExecuted: 'Node1',
		});
		expect(result).toBe('Node failed');
	});

	it('includes node.name if error.node is an object', () => {
		const result = getExecutionErrorMessage({
			error: executionErrorFactory({ message: 'Crashed', node: { name: 'Step1' } }),
		});
		expect(result).toBe('Execution error.Details: Step1: Crashed');
	});
});
