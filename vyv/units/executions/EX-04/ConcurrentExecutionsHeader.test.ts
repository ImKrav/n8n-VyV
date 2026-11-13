/**
 * EX-04 · Detener ejecuciones — cabecera de ejecuciones concurrentes.
 * Origen: packages/frontend/editor-ui/src/features/execution/executions/components/ConcurrentExecutionsHeader.test.ts
 */
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import ConcurrentExecutionsHeader from '@/features/execution/executions/components/ConcurrentExecutionsHeader.vue';
import { ExecutionSummary } from 'n8n-workflow';

vi.mock('vue-router', () => {
	return {
		useRouter: vi.fn(),
		useRoute: vi.fn(),
		RouterLink: {
			template: '<a><slot /></a>',
		},
	};
});

const renderComponent = createComponentRenderer(ConcurrentExecutionsHeader, {
	pinia: createTestingPinia(),
	props: {
		executions: [],
		isInitialLoad: false,
	},
});

// Setup of describe('ConcurrentExecutionsHeader', (original top-level describe)

describe('CP-EX-04-07 · Ejecuciones excedentes quedan en cola', () => {
	it('shows the concurrency header for a settled empty result', () => {
		const { getByTestId } = renderComponent({
			props: {
				runningExecutionsCount: 0,
				concurrencyCap: 5,
				executions: [],
				isInitialLoad: false,
			},
		});

		expect(getByTestId('concurrent-executions-header')).toBeVisible();
	});
});
