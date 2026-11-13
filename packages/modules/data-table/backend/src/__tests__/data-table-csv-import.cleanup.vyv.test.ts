/**
 * CP-018-03 · BUG-018-05 (segunda parte) – fileId con path traversal al crear una tabla desde CSV.
 * Hallazgo de la ejecución "después": el parser ya lanzaba FileUploadError (400), pero la limpieza del
 * archivo en el `finally` volvía a lanzar "Path traversal detected" y ese error reemplazaba al 400 → 500.
 * Corrección: cleanupFile es de mejor esfuerzo (registra el problema y no lanza).
 * Dobles de prueba: mocks de CsvParserService, DataTableFileCleanupService y Logger.
 */
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { CsvParserService } from '../csv-parser.service';
import { DataTableCsvImportService } from '../data-table-csv-import.service';
import type { DataTableFileCleanupService } from '../data-table-file-cleanup.service';

describe('DataTableCsvImportService.cleanupFile (VyV)', () => {
	const crear = () => {
		const cleanup = mock<DataTableFileCleanupService>();
		const logger = mock<Logger>();
		logger.scoped.mockReturnValue(logger);
		const svc = new DataTableCsvImportService(mock<CsvParserService>(), cleanup, logger);
		return { svc, cleanup, logger };
	};

	it('no lanza si la limpieza falla (no enmascara el error original de la importación)', async () => {
		// Arrange
		const { svc, cleanup, logger } = crear();
		cleanup.deleteFile.mockRejectedValue(new Error('Path traversal detected, refusing to join paths'));
		// Act
		const resultado = svc.cleanupFile('../../etc/passwd');
		// Assert
		await expect(resultado).resolves.toBeUndefined();
		expect(logger.warn).toHaveBeenCalledWith(
			'Could not clean up uploaded CSV file',
			expect.objectContaining({ fileId: '../../etc/passwd', error: expect.stringContaining('Path traversal') }),
		);
	});

	it('el error original del try sigue llegando al llamador cuando la limpieza va en finally', async () => {
		const { svc, cleanup } = crear();
		cleanup.deleteFile.mockRejectedValue(new Error('Path traversal detected'));
		const original = new Error('Error uploading file: Invalid file id');

		const flujo = async () => {
			try {
				throw original;
			} finally {
				await svc.cleanupFile('../../etc/passwd');
			}
		};

		await expect(flujo()).rejects.toBe(original);
	});

	it('con un fileId válido delega la eliminación (regresión)', async () => {
		const { svc, cleanup } = crear();
		cleanup.deleteFile.mockResolvedValue(undefined);

		await svc.cleanupFile('archivo.csv');

		expect(cleanup.deleteFile).toHaveBeenCalledWith('archivo.csv');
	});
});
