/**
 * WF-01 · Edición en el canvas — cambiar el color de una nota adhesiva.
 * Origen: packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/CanvasNodeToolbar.test.ts
 */
import { ref, shallowRef } from 'vue';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import CanvasNodeToolbar from '@/features/workflows/canvas/components/elements/nodes/CanvasNodeToolbar.vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger, mockedStore } from '@/__tests__/utils';
import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { EditorEnabledFeaturesKey, WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useFocusedNodesStore } from '@/features/ai/assistant/focusedNodes.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>();
	return {
		...actual,
		injectCanvasRenderData: vi.fn(() => ({ value: actual.createEmptyCanvasRenderData() })),
	};
});

const renderComponent = createComponentRenderer(CanvasNodeToolbar);

// Setup of describe('CanvasNodeToolbar', (original top-level describe)
let pinia: Pinia;

beforeEach(() => {
	pinia = createPinia();
	setActivePinia(pinia);
});

// ADO-5556: All icon-only node hover actions (except "Add to n8n AI") lack an
// explanatory tooltip. They only carry a native `title`/`aria-label`, so no
// styled tooltip appears on hover to label the control.

describe('CP-WF-01-07 · Nota adhesiva con color persistente', () => {
	it('should emit "update" when sticky note color is changed', async () => {
		const { getByTestId, emitted } = renderComponent({
			pinia,
			global: {
				provide: {
					...createCanvasNodeProvide({
						data: {
							render: {
								type: CanvasNodeRenderType.StickyNote,
								options: { color: 3 },
							},
						},
					}),
					...createCanvasProvide(),
				},
			},
		});

		await userEvent.click(getByTestId('change-sticky-color'));

		// Use screen queries for teleported popover content
		await waitFor(() => {
			expect(screen.getAllByTestId('color')).toHaveLength(7);
		});

		await userEvent.click(screen.getAllByTestId('color')[0]);

		expect(emitted('update')[0]).toEqual([{ color: 1 }]);
	});
});
