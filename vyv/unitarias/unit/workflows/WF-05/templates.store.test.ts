/**
 * WF-05 · Plantillas, importación y duplicado — búsqueda y filtro de plantillas (prueba nueva).
 * Hueco: la búsqueda de `templates.store.ts` no tenía prueba en el repositorio.
 *
 * Dobles de prueba:
 * - Mock  `@n8n/rest-api-client/api/templates`: `getWorkflows` responde sin red y se verifica
 *         la consulta (término, categorías, página).
 */
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import * as templatesApi from '@n8n/rest-api-client/api/templates';
import type { ITemplatesWorkflow } from '@n8n/rest-api-client/api/templates';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@n8n/rest-api-client/api/templates', () => ({
	getWorkflows: vi.fn(),
}));

const template = (id: number, name: string) => ({ id, name }) as unknown as ITemplatesWorkflow;

describe('CP-WF-05-01 · Buscar y filtrar plantillas', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(templatesApi.getWorkflows).mockReset();
	});

	it('devuelve las plantillas que coinciden con un término existente', async () => {
		// Arrange
		vi.mocked(templatesApi.getWorkflows).mockResolvedValue({
			totalWorkflows: 2,
			workflows: [template(1, 'Slack alerts'), template(2, 'Slack digest')],
		});
		const store = useTemplatesStore();
		const query = { search: 'slack', categories: [] };

		// Act
		const result = await store.getWorkflows(query);

		// Assert
		expect(result.map((w) => w.name)).toEqual(['Slack alerts', 'Slack digest']);
		expect(store.getSearchedWorkflowsTotal(query)).toBe(2);
		expect(templatesApi.getWorkflows).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ search: 'slack', page: 1 }),
			expect.anything(),
		);
	});

	it('devuelve un resultado vacío para un término inexistente', async () => {
		// Arrange
		vi.mocked(templatesApi.getWorkflows).mockResolvedValue({ totalWorkflows: 0, workflows: [] });
		const store = useTemplatesStore();
		const query = { search: 'zzz-no-existe', categories: [] };

		// Act
		const result = await store.getWorkflows(query);

		// Assert
		expect(result).toEqual([]);
		expect(store.getSearchedWorkflowsTotal(query)).toBe(0);
		expect(store.isSearchFinished(query)).toBe(true);
	});

	it('envía las categorías elegidas como filtro de la búsqueda', async () => {
		// Arrange
		vi.mocked(templatesApi.getWorkflows).mockResolvedValue({
			totalWorkflows: 1,
			workflows: [template(3, 'Lead scoring')],
		});
		const store = useTemplatesStore();

		// Act
		await store.getWorkflows({ search: '', categories: ['Sales'] });

		// Assert
		expect(templatesApi.getWorkflows).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ categories: ['Sales'] }),
			expect.anything(),
		);
	});

	it('reutiliza los resultados de la misma búsqueda aunque cambie el orden de las categorías', async () => {
		// Arrange
		vi.mocked(templatesApi.getWorkflows).mockResolvedValue({
			totalWorkflows: 1,
			workflows: [template(4, 'CRM sync')],
		});
		const store = useTemplatesStore();
		await store.getWorkflows({ search: 'crm', categories: ['Sales', 'Marketing'] });

		// Act
		const cached = await store.getWorkflows({ search: 'crm', categories: ['Marketing', 'Sales'] });

		// Assert
		expect(cached.map((w) => w.name)).toEqual(['CRM sync']);
		expect(templatesApi.getWorkflows).toHaveBeenCalledOnce();
	});
});
