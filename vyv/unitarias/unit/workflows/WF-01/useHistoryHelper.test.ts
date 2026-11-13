/**
 * WF-01 · Edición en el canvas — deshacer y rehacer con atajos de teclado.
 * Origen: packages/frontend/editor-ui/src/app/composables/useHistoryHelper.test.ts
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MAIN_HEADER_TABS } from '@/app/constants';
import { render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { useHistoryHelper } from '@/app/composables/useHistoryHelper';
import { defineComponent, ref, type PropType } from 'vue';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { mock } from 'vitest-mock-extended';
import { Command, BulkCommand } from '@/app/models/history';

// Create mock functions
const popUndoableToUndoMock = vi.fn();
const popUndoableToRedoMock = vi.fn();
const pushUndoableToRedoMock = vi.fn();
const pushCommandToUndoMock = vi.fn();
const pushBulkCommandToUndoMock = vi.fn();
const historyStoreMock = {
	popUndoableToUndo: popUndoableToUndoMock,
	popUndoableToRedo: popUndoableToRedoMock,
	pushUndoableToRedo: pushUndoableToRedoMock,
	pushCommandToUndo: pushCommandToUndoMock,
	pushBulkCommandToUndo: pushBulkCommandToUndoMock,
	bulkInProgress: false,
};
const markStateDirtyMock = vi.fn();

const uiStoreMock = {
	isAnyModalOpen: false,
	markStateDirty: markStateDirtyMock,
};

const telemetryTrackMock = vi.fn();

const mockNdvStoreValue = {
	activeNodeName: null,
	activeNode: {},
	isNDVOpen: false,
};

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: () => mockNdvStoreValue,
	injectNDVStore: () => ({ value: mockNdvStoreValue }),
}));

vi.mock('@/app/stores/history.store', () => ({
	useHistoryStore: () => historyStoreMock,
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => uiStoreMock,
}));

vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: telemetryTrackMock,
	}),
}));

vi.mock('vue-router', () => ({
	useRoute: () => ({}),
	RouterLink: vi.fn(),
}));

const TestComponent = defineComponent({
	props: {
		route: {
			type: Object as PropType<RouteLocationNormalizedLoaded>,
			required: true,
		},
	},
	setup(props) {
		useHistoryHelper(
			props.route,
			ref('wf@latest') as unknown as Parameters<typeof useHistoryHelper>[1],
		);
		return {};
	},
	template: '<div />',
});

const workflowRoute = mock<RouteLocationNormalizedLoaded>({
	name: MAIN_HEADER_TABS.WORKFLOW,
	meta: { nodeView: true },
});

// Setup of describe('useHistoryHelper', (original top-level describe)
beforeEach(() => {
	vi.clearAllMocks();
	historyStoreMock.bulkInProgress = false;
	markStateDirtyMock.mockClear();
});

describe('CP-WF-01-05 · Deshacer y rehacer una secuencia de 10 acciones', () => {
	describe('keyboard shortcuts', () => {
		it('should call undo when Ctrl+Z is pressed', async () => {
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}z');
			await userEvent.keyboard('{Control>}z');

			expect(popUndoableToUndoMock).toHaveBeenCalledTimes(2);
		});
	});

	describe('keyboard shortcuts', () => {
		it('should call redo when Ctrl+Shift+Z is pressed', async () => {
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}{Shift>}z');
			await userEvent.keyboard('{Control>}{Shift>}z');

			expect(popUndoableToRedoMock).toHaveBeenCalledTimes(2);
		});
	});

	describe('undo', () => {
		it('should revert a Command and push to redo stack', async () => {
			const mockCommand = mock<Command>();
			mockCommand.revert.mockResolvedValue(undefined);
			mockCommand.getReverseCommand.mockReturnValue(mock<Command>());
			// Make instanceof Command return true
			Object.setPrototypeOf(mockCommand, Command.prototype);

			popUndoableToUndoMock.mockReturnValue(mockCommand);
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}z');

			expect(mockCommand.revert).toHaveBeenCalled();
			expect(mockCommand.getReverseCommand).toHaveBeenCalled();
			expect(pushUndoableToRedoMock).toHaveBeenCalled();
			expect(markStateDirtyMock).toHaveBeenCalled();
			expect(telemetryTrackMock).toHaveBeenCalledWith('User hit undo', expect.any(Object));
		});
	});

	describe('redo', () => {
		it('should revert a Command and push to undo stack', async () => {
			const mockCommand = mock<Command>();
			mockCommand.revert.mockResolvedValue(undefined);
			mockCommand.getReverseCommand.mockReturnValue(mock<Command>());
			// Make instanceof Command return true
			Object.setPrototypeOf(mockCommand, Command.prototype);

			popUndoableToRedoMock.mockReturnValue(mockCommand);
			render(TestComponent, { props: { route: workflowRoute } });

			await userEvent.keyboard('{Control>}{Shift>}z');

			expect(mockCommand.revert).toHaveBeenCalled();
			expect(mockCommand.getReverseCommand).toHaveBeenCalled();
			expect(pushCommandToUndoMock).toHaveBeenCalledWith(expect.any(Object), false);
			expect(markStateDirtyMock).toHaveBeenCalled();
			expect(telemetryTrackMock).toHaveBeenCalledWith('User hit redo', expect.any(Object));
		});
	});
});
