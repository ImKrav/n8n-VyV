/**
 * WF-01 · Edición en el canvas — un nodo desactivado se muestra atenuado.
 * Origen: packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeDefault.test.ts
 */
import { createComponentRenderer } from '@/__tests__/render';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import {
	createCanvasNodeProvide,
	createCanvasProvide,
} from '@/features/workflows/canvas/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useTypeAvailabilityPoliciesStore } from '@n8n/frontend-module-type-availability-policies';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import { NodeConnectionTypes, type IPinData } from 'n8n-workflow';
import { computed, type ComputedRef } from 'vue';
import { setActivePinia } from 'pinia';
import type * as actualVueRouter from 'vue-router';
import { type RouteLocationNormalizedLoadedGeneric, useRoute } from 'vue-router';
import {
	CanvasConnectionMode,
	CanvasNodeRenderType,
	type CanvasConnectionPort,
} from '@/features/workflows/canvas/canvas.types';
import CanvasNodeDefault from '@/features/workflows/canvas/components/elements/nodes/render-types/CanvasNodeDefault.vue';

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...(actual as typeof actualVueRouter),
		useRoute: vi.fn(),
	};
});

const renderNodeInputsMap = new Map<string, ComputedRef<CanvasConnectionPort[]>>();
const renderNodeOutputsMap = new Map<string, ComputedRef<CanvasConnectionPort[]>>();
const pinnedDataByNodeName: IPinData = {};
const executionPinDataByNodeId = new Map<string, ComputedRef<IPinData[string] | undefined>>();
let isExecutionDataDisplayed = false;

vi.mock('@/features/workflows/canvas/canvas.utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@/features/workflows/canvas/canvas.utils')>();
	return {
		...actual,
		injectCanvasRenderData: vi.fn(() => ({
			value: actual.createEmptyCanvasRenderData({
				nodeInputsByNodeId: renderNodeInputsMap,
				nodeOutputsByNodeId: renderNodeOutputsMap,
				pinnedDataByNodeName,
				executionPinDataByNodeId,
				isExecutionDataDisplayed,
			}),
		})),
	};
});

vi.mock('@/features/resolvers/composables/useNodePrivateCredential', () => ({
	useNodePrivateCredential: vi.fn(),
}));

import { useNodePrivateCredential } from '@/features/resolvers/composables/useNodePrivateCredential';

const stubs = {
	NodeIcon: {
		template:
			'<node-icon-stub :data-badge-name="iconSource?.badge?.name" :data-badge-tooltip="iconSource?.badge?.tooltip" :icon-source="iconSource" :size="size" :shrink="shrink" :disabled="disabled"></node-icon-stub>',
		props: ['icon-source', 'size', 'shrink', 'disabled'],
	},
};

const renderComponent = createComponentRenderer(CanvasNodeDefault, {
	global: {
		stubs,
		provide: {
			...createCanvasProvide(),
		},
	},
});

let nodeTypesStore: MockedStore<typeof useNodeTypesStore>;
let typeAvailabilityPoliciesStore: MockedStore<typeof useTypeAvailabilityPoliciesStore>;
const mockedUseRoute = vi.mocked(useRoute);

beforeEach(() => {
	vi.clearAllMocks();
	renderNodeInputsMap.clear();
	renderNodeOutputsMap.clear();
	for (const key of Object.keys(pinnedDataByNodeName)) {
		delete pinnedDataByNodeName[key];
	}
	executionPinDataByNodeId.clear();
	isExecutionDataDisplayed = false;
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	nodeTypesStore = mockedStore(useNodeTypesStore);
	typeAvailabilityPoliciesStore = mockedStore(useTypeAvailabilityPoliciesStore);
	mockedUseRoute.mockReturnValue({} as RouteLocationNormalizedLoadedGeneric);
	vi.mocked(useNodePrivateCredential).mockReturnValue({
		hasPrivateCredential: computed(() => false),
		tooltipText: computed(() => ''),
	});
});

// Setup of describe('CanvasNodeDefault', (original top-level describe)

describe('CP-WF-01-04 · Nodo desactivado no se ejecuta', () => {
	describe('disabled', () => {
		it('should apply disabled class when node is disabled', () => {
			const { getByText } = renderComponent({
				global: {
					stubs,
					provide: {
						...createCanvasNodeProvide({
							data: {
								disabled: true,
							},
						}),
					},
				},
			});

			expect(getByText('Test Node').closest('.node')).toHaveClass('disabled');
			expect(getByText('(Deactivated)')).toBeVisible();
		});
	});
});
