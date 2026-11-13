/**
 * WF-01 · Edición en el canvas — selector de color de la nota adhesiva.
 * Origen: packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/toolbar/CanvasNodeStickyColorSelector.test.ts
 */
import { fireEvent, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import CanvasNodeStickyColorSelector from '@/features/workflows/canvas/components/elements/nodes/toolbar/CanvasNodeStickyColorSelector.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createCanvasNodeProvide } from '@/features/workflows/canvas/__tests__/utils';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';

const renderComponent = createComponentRenderer(CanvasNodeStickyColorSelector);

// Setup of describe('CanvasNodeStickyColorSelector', (original top-level describe)

describe('CP-WF-01-07 · Nota adhesiva con color persistente', () => {
	it('should render all colors and apply selected color correctly', async () => {
		const { getByTestId, emitted } = renderComponent({
			global: {
				provide: {
					...createCanvasNodeProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('change-sticky-color'));

		// Use screen queries for teleported popover content
		await waitFor(() => {
			expect(screen.getAllByTestId('color')).toHaveLength(7);
		});

		await userEvent.click(screen.getAllByTestId('color')[2]);

		expect(emitted()).toHaveProperty('update');
		expect(emitted().update[0]).toEqual([3]);
	});
});
