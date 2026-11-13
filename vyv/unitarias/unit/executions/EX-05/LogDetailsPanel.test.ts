/**
 * EX-05 · Panel de logs — detalle de entrada y salida de un nodo.
 * Origen: packages/frontend/editor-ui/src/features/execution/logs/components/LogDetailsPanel.test.ts
 */
import { fireEvent, waitFor, within } from '@testing-library/vue';
import { renderComponent } from '@/__tests__/render';
import { moveResize, startResize } from '@/__tests__/resize';
import LogDetailsPanel from '@/features/execution/logs/components/LogDetailsPanel.vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createTestingPinia, type TestingPinia } from '@pinia/testing';
import { computed, h } from 'vue';
import {
	createMockNodeTypes,
	createTestNode,
	createTestTaskData,
	createTestWorkflow,
	createTestWorkflowExecutionResponse,
	createTestWorkflowObject,
	defaultNodeTypes,
	mockLoadedNodeType,
} from '@/__tests__/mocks';
import { LOG_DETAILS_PANEL_STATE } from '@/features/execution/logs/logs.constants';
import {
	type GroupLogEntry,
	type NodeLogEntry,
	isGroupLog,
} from '@/features/execution/logs/logs.types';
import { createTestLogEntry } from '@/features/execution/logs/__test__/mocks';
import { createLogTree } from '@/features/execution/logs/logs.utils';
import { createRunExecutionData, NodeConnectionTypes, type RedactionInfo } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { HTML_NODE_TYPE } from '@/app/constants';
import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants/nodeTypes';
import { AGENT_SESSION_DETAIL_VIEW } from '@/features/agents/constants';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';

const redactionState = vi.hoisted(() => ({
	isRedacted: false,
	canReveal: true,
	reason: undefined as RedactionInfo['reason'] | undefined,
}));
vi.mock('@/features/execution/executions/composables/useExecutionRedaction', () => ({
	useExecutionRedaction: () => ({
		...redactionState,
		revealData: vi.fn(),
	}),
}));

// Setup of describe('LogDetailsPanel', (original top-level describe)
let pinia: TestingPinia;

const aiNode = createTestNode({ name: 'AI Agent' });
const workflowData = createTestWorkflow({
	nodes: [createTestNode({ name: 'Chat Trigger' }), aiNode],
	connections: { 'Chat Trigger': { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] } },
});
const chatNodeRunData = createTestTaskData({
	executionStatus: 'success',
	executionTime: 0,
	data: { main: [[{ json: { response: 'hey' } }]] },
});
const aiNodeRunData = createTestTaskData({
	executionStatus: 'success',
	executionTime: 10,
	data: { main: [[{ json: { response: 'Hello!' } }]] },
	source: [{ previousNode: 'Chat Trigger' }],
});

function createLogEntry(data: Partial<NodeLogEntry> = {}) {
	return createTestLogEntry({
		workflow: createTestWorkflowObject(workflowData),
		execution: createRunExecutionData({
			resultData: {
				runData: {
					'Chat Trigger': [chatNodeRunData],
					'AI Agent': [aiNodeRunData],
				},
			},
		}),
		...data,
	});
}

function render(props: InstanceType<typeof LogDetailsPanel>['$props']) {
	const rendered = renderComponent(LogDetailsPanel, {
		props,
		global: {
			provide: {
				[WorkflowIdKey as unknown as string]: computed(() => 'test-workflow-id'),
			},
			plugins: [
				createRouter({
					history: createWebHistory(),
					routes: [
						{ path: '/', component: () => h('div') },
						{
							name: AGENT_SESSION_DETAIL_VIEW,
							path: '/projects/:projectId/agents/:agentId/sessions/:threadId',
							component: () => h('div'),
						},
					],
				}),
				pinia,
			],
		},
	});
	const container = rendered.getByTestId('log-details');

	Object.defineProperty(container, 'offsetWidth', {
		configurable: true,
		get() {
			return 1000;
		},
	});
	vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
		x: 0,
		width: 1000,
	} as DOMRect);

	return rendered;
}

beforeEach(() => {
	pinia = createTestingPinia({ stubActions: false, fakeApp: true });
	redactionState.isRedacted = false;
	redactionState.canReveal = true;
	redactionState.reason = undefined;
});

describe('CP-EX-05-02 · Detalle de entrada y salida de un nodo', () => {
	it('should show name, run status, input, and output of the node', async () => {
		const rendered = render({
			isOpen: true,
			logEntry: createLogEntry({ node: aiNode, runIndex: 0, runData: aiNodeRunData }),
			panels: LOG_DETAILS_PANEL_STATE.BOTH,
			collapsingInputTableColumnName: null,
			collapsingOutputTableColumnName: null,
			isHeaderClickable: true,
		});

		const header = within(rendered.getByTestId('log-details-header'));
		const inputPanel = within(rendered.getByTestId('log-details-input'));
		const outputPanel = within(rendered.getByTestId('log-details-output'));

		expect(header.getByText('AI Agent')).toBeInTheDocument();
		expect(header.getByText('Success in 10ms')).toBeInTheDocument();
		expect(await inputPanel.findByText('hey')).toBeInTheDocument();
		expect(await outputPanel.findByText('Hello!')).toBeInTheDocument();
	});
});
