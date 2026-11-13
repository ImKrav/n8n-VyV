/**
 * CP-018-03 · BUG-018-05 – Un CSV malformado o un fileId con path traversal son errores del cliente.
 * Antes: el parser rechazaba con errores genéricos y la API respondía HTTP 500.
 * Después de la refactorización: FileUploadError → el controlador responde 400.
 * Doble de prueba: GlobalConfig simulado con un directorio temporal (sin base de datos).
 */
import type { GlobalConfig } from '@n8n/config';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { mock } from 'vitest-mock-extended';

import { CsvParserService } from '../csv-parser.service';
import { FileUploadError } from '../errors/data-table-file-upload.error';

describe('CsvParserService · errores de entrada (VyV)', () => {
	let dir: string;
	let svc: CsvParserService;

	beforeEach(() => {
		// Arrange común: directorio temporal propio por prueba (FIRST: independiente y repetible)
		dir = mkdtempSync(join(tmpdir(), 'vyv-csv-'));
		svc = new CsvParserService(mock<GlobalConfig>({ dataTable: { uploadDir: dir } }));
	});

	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	it('CSV con comilla sin cerrar → FileUploadError con el detalle del parser', async () => {
		writeFileSync(join(dir, 'malformado.csv'), 'nombre,edad\n"Ana,25\nLuis,32\n');

		const promesa = svc.parseFile('malformado.csv');

		await expect(promesa).rejects.toBeInstanceOf(FileUploadError);
		await expect(svc.parseFile('malformado.csv')).rejects.toThrow(/Invalid CSV file: .*Quote Not Closed/);
	});

	it('fileId con path traversal → FileUploadError (y conserva el mensaje original)', async () => {
		await expect(svc.parseFile('../../etc/passwd')).rejects.toBeInstanceOf(FileUploadError);
		await expect(svc.parseFile('../../etc/passwd')).rejects.toThrow('Path traversal detected');
	});

	it('archivo inexistente → FileUploadError', async () => {
		await expect(svc.parseFile('no-existe.csv')).rejects.toThrow('Uploaded file not found');
	});

	it('CSV válido sigue funcionando (regresión)', async () => {
		writeFileSync(join(dir, 'valido.csv'), 'nombre,edad\nAna,25\nLuis,32\n');

		const meta = await svc.parseFile('valido.csv');

		expect(meta).toMatchObject({ rowCount: 2, columnCount: 2 });
		expect(meta.columns.map((c) => c.type)).toEqual(['string', 'number']);
	});
});
