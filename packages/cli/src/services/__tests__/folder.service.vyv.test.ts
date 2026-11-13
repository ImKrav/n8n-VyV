/**
 * CP-020-06 · Caja blanca de FolderService.deleteFolder con dobles de prueba (mocks)
 * (packages/cli/src/services/folder.service.ts)
 *
 * Grafo: D1 ¿existe la carpeta? · D2 ¿!transferToFolderId? · D3 ¿transfer === folderId?
 *        D4 ¿transfer !== PROJECT_ROOT?   →  V(G) = 4 + 1 = 5 caminos independientes.
 *
 * Test doubles:
 *  - mock<FolderRepository>, mock<WorkflowRepository>, mock<WorkflowService>, mock<EventService>
 *    (vitest-mock-extended) → se verifican interacciones (llamadas, argumentos, cantidad).
 *  - El EntityManager de la transacción es un stub que ejecuta el callback.
 */
import { EventService } from '@n8n/backend-services';
import type { User } from '@n8n/db';
import { FolderRepository, FolderTagMappingRepository, WorkflowRepository } from '@n8n/db';
import { UserError } from '@n8n/errors';
import { PROJECT_ROOT } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { FolderNotFoundError } from '@/errors/folder-not-found.error';
import { FolderService } from '@/services/folder.service';
import { WorkflowService } from '@/workflows/workflow.service';

describe('FolderService.deleteFolder (VyV, mocks)', () => {
	const usuario = mock<User>({ id: 'u1' });
	const PROYECTO = 'p1';

	let folderRepository: ReturnType<typeof mock<FolderRepository>>;
	let workflowRepository: ReturnType<typeof mock<WorkflowRepository>>;
	let workflowService: ReturnType<typeof mock<WorkflowService>>;
	let eventService: ReturnType<typeof mock<EventService>>;
	let tx: { delete: ReturnType<typeof vi.fn> };
	let servicio: FolderService;

	beforeEach(() => {
		// Arrange común: dobles nuevos por prueba (Independent)
		folderRepository = mock<FolderRepository>();
		workflowRepository = mock<WorkflowRepository>();
		workflowService = mock<WorkflowService>();
		eventService = mock<EventService>();
		tx = { delete: vi.fn() };
		// Stub de la transacción: ejecuta el callback con el EntityManager falso
		Object.defineProperty(folderRepository, 'manager', {
			value: { transaction: vi.fn(async (cb: (m: unknown) => Promise<void>) => await cb(tx)) },
		});
		folderRepository.findOneOrFailFolderInProject.mockResolvedValue({ id: 'A' } as never);
		servicio = new FolderService(
			folderRepository,
			mock<FolderTagMappingRepository>(),
			workflowRepository,
			workflowService,
			eventService,
		);
	});

	it('C1 · carpeta inexistente → FolderNotFoundError y no borra nada (D1 = F)', async () => {
		folderRepository.findOneOrFailFolderInProject.mockRejectedValue(new Error('no existe'));

		await expect(servicio.deleteFolder(usuario, 'X', PROYECTO, {})).rejects.toBeInstanceOf(FolderNotFoundError);

		expect(folderRepository.delete).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
	});

	it('C2 · sin transferencia → archiva los workflows, borra y emite evento (D2 = V)', async () => {
		// Arrange
		workflowRepository.getAllWorkflowIdsInHierarchy.mockResolvedValue(['w1', 'w2']);
		// Act
		await servicio.deleteFolder(usuario, 'A', PROYECTO, {});
		// Assert (interacciones con los mocks)
		expect(workflowService.archive).toHaveBeenCalledTimes(2);
		expect(workflowService.archive).toHaveBeenCalledWith(usuario, 'w1', { skipArchived: true });
		expect(workflowRepository.moveToFolder).toHaveBeenCalledWith(['w1', 'w2'], PROJECT_ROOT);
		expect(folderRepository.delete).toHaveBeenCalledWith({ id: 'A' });
		expect(eventService.emit).toHaveBeenCalledWith('folder-deleted', { folderId: 'A', projectId: PROYECTO });
	});

	it('C3 · transferir a la misma carpeta → UserError y no hay transacción (D3 = V)', async () => {
		await expect(
			servicio.deleteFolder(usuario, 'A', PROYECTO, { transferToFolderId: 'A' }),
		).rejects.toThrow(new UserError('Cannot transfer folder contents to the folder being deleted'));

		expect(folderRepository.manager.transaction).not.toHaveBeenCalled();
	});

	it('C4 · transferir a otra carpeta → valida destino y mueve en transacción (D4 = V)', async () => {
		await servicio.deleteFolder(usuario, 'A', PROYECTO, { transferToFolderId: 'C' });

		expect(folderRepository.findOneOrFailFolderInProject).toHaveBeenNthCalledWith(2, 'C', PROYECTO, undefined);
		expect(folderRepository.moveAllToFolder).toHaveBeenCalledWith('A', 'C', tx);
		expect(workflowRepository.moveAllToFolder).toHaveBeenCalledWith('A', 'C', tx);
		expect(tx.delete).toHaveBeenCalledTimes(1);
		expect(workflowService.archive).not.toHaveBeenCalled();
	});

	it('C5 · transferir a la raíz del proyecto → no busca carpeta destino (D4 = F)', async () => {
		await servicio.deleteFolder(usuario, 'A', PROYECTO, { transferToFolderId: PROJECT_ROOT });

		expect(folderRepository.findOneOrFailFolderInProject).toHaveBeenCalledTimes(1);
		expect(folderRepository.moveAllToFolder).toHaveBeenCalledWith('A', PROJECT_ROOT, tx);
	});
});
