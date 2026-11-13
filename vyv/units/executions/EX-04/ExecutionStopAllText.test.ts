/**
 * EX-04 · Detener ejecuciones — enlace «Stop all».
 * Hueco: `ExecutionStopAllText.vue` no tenía prueba en el repo.
 *
 * Dobles de prueba:
 * - Mock  `useTelemetry` (vi.mock): se verifica la interacción `track(...)`.
 * - Stub  store de UI de Pinia (createTestingPinia): `openModal` es un spy sin efecto real.
 * - Dummy ejecuciones mínimas: solo importa su `status`.
 */
import { createComponentRenderer } from '@/__tests__/render';
import { STOP_MANY_EXECUTIONS_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import ExecutionStopAllText from '@/features/execution/executions/components/ExecutionStopAllText.vue';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import type { ExecutionStatus, ExecutionSummary } from 'n8n-workflow';

const telemetryTrack = vi.fn();
vi.mock('@n8n/composables/useTelemetry', () => ({
	useTelemetry: () => ({ track: telemetryTrack }),
}));

const execution = (status: ExecutionStatus) => ({ id: status, status }) as ExecutionSummary;

const renderComponent = createComponentRenderer(ExecutionStopAllText);

describe('CP-EX-04-05 · Detener todas las ejecuciones en curso', () => {
	beforeEach(() => {
		telemetryTrack.mockClear();
	});

	it('no se muestra si ninguna ejecución se puede detener', () => {
		// Arrange
		const executions = [execution('success'), execution('error'), execution('canceled')];

		// Act
		const { queryByText } = renderComponent({
			pinia: createTestingPinia(),
			props: { executions },
		});

		// Assert
		expect(queryByText('Stop all')).not.toBeInTheDocument();
	});

	it.each<ExecutionStatus>(['running', 'waiting', 'new'])(
		'se muestra si hay una ejecución en estado «%s»',
		(status) => {
			// Arrange
			const executions = [execution('success'), execution(status)];

			// Act
			const { getByText } = renderComponent({
				pinia: createTestingPinia(),
				props: { executions },
			});

			// Assert
			expect(getByText('Stop all')).toBeVisible();
		},
	);

	it('abre el modal de detención múltiple y registra telemetría al hacer clic', async () => {
		// Arrange
		const pinia = createTestingPinia();
		const uiStore = useUIStore();
		const { getByText } = renderComponent({
			pinia,
			props: { executions: [execution('running')] },
		});

		// Act
		await userEvent.click(getByText('Stop all'));

		// Assert
		expect(uiStore.openModal).toHaveBeenCalledExactlyOnceWith(STOP_MANY_EXECUTIONS_MODAL_KEY);
		expect(telemetryTrack).toHaveBeenCalledExactlyOnceWith('User initiated stop many executions');
	});
});
