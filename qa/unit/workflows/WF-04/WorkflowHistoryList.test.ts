/**
 * WF-04 · Historial de versiones y diff — lista de versiones.
 * Origen: packages/frontend/editor-ui/src/features/workflows/workflowHistory/components/WorkflowHistoryList.test.ts
 */
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createPinia, setActivePinia } from 'pinia';
import { faker } from '@faker-js/faker';
import type { UserAction } from '@n8n/design-system';
import { createComponentRenderer } from '@/__tests__/render';
import WorkflowHistoryList from '@/features/workflows/workflowHistory/components/WorkflowHistoryList.vue';
import type {
	WorkflowHistory,
	WorkflowHistoryActionTypes,
} from '@n8n/rest-api-client/api/workflowHistory';
import { workflowHistoryDataFactory } from '@/features/workflows/workflowHistory/__tests__/utils';
import type { IUser } from 'n8n-workflow';

const namedWorkflowHistoryDataFactory = (): WorkflowHistory => ({
	...workflowHistoryDataFactory(),
	name: faker.lorem.words(2),
});

const unnamedWorkflowHistoryDataFactory = (): WorkflowHistory => ({
	...workflowHistoryDataFactory(),
	name: '',
});

vi.stubGlobal(
	'IntersectionObserver',
	class {
		disconnect = vi.fn();

		observe = vi.fn();

		takeRecords = vi.fn();

		unobserve = vi.fn();
	},
);

const actionTypes: WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];
const actions: Array<UserAction<IUser>> = actionTypes.map((value) => ({
	label: value,
	disabled: false,
	value,
}));

// N8nTooltip registers pointer-event listeners on each list item (via Element Plus).
// userEvent.click dispatches ~10 pointer/mouse events per click, and with up to 50
// items rendered, processing all those tooltip listeners caused intermittent timeouts
// under parallel test load. Stubbing it to a passthrough slot fixes the flakiness
// without affecting any test logic — no test here asserts on tooltip behaviour.
const renderComponent = createComponentRenderer(WorkflowHistoryList, {
	global: {
		stubs: {
			N8nTooltip: { template: '<slot />' },
		},
	},
});

let pinia: ReturnType<typeof createPinia>;

// Setup of describe('WorkflowHistoryList', (original top-level describe)
beforeAll(() => {
	Element.prototype.scrollTo = vi.fn(() => {});
});

beforeEach(() => {
	pinia = createPinia();
	setActivePinia(pinia);
});

describe('CP-WF-04-01 · Cada guardado genera una versión', () => {
	it('should render list and delegate preview event', async () => {
		const numberOfItems = faker.number.int({ min: 10, max: 50 });
		const items = Array.from({ length: numberOfItems }, namedWorkflowHistoryDataFactory);

		const { getAllByTestId, emitted, queryByRole } = renderComponent({
			pinia,
			props: {
				items,
				actions,
				selectedItem: null,
				requestNumberOfItems: 20,
				lastReceivedItemsLength: 20,
				evaluatedPruneTimeInHours: -1,
			},
		});

		expect(queryByRole('link', { name: /upgrade/i })).not.toBeInTheDocument();

		const listItems = getAllByTestId('workflow-history-list-item');
		const listItem = listItems[items.length - 1];
		await userEvent.click(listItem);
		expect(emitted().preview).toEqual([
			[
				{
					id: items[items.length - 1].versionId,
					event: expect.any(MouseEvent),
				},
			],
		]);

		expect(listItems).toHaveLength(numberOfItems);
	});
});
