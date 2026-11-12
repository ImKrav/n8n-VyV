import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = new URL('./validar-fechas.mjs', import.meta.url).pathname;

function run(contenido) {
	const dir = mkdtempSync(join(tmpdir(), 'fechas-'));
	try {
		writeFileSync(join(dir, 'doc.md'), contenido);
		return spawnSync('node', [script, dir], { encoding: 'utf8' });
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
}

test('acepta 17/11/2026', () => {
	assert.equal(run('Fecha límite: 17/11/2026').status, 0);
});

test('rechaza el día siguiente a la fecha límite', () => {
	const fecha = ['18', '11', '2026'].join('/');
	const r = run(`Entrega: ${fecha}`);
	assert.equal(r.status, 1);
	assert.ok(r.stdout.includes(`:1:${fecha}`));
});

test('rechaza marcador dd/mm/aaaa', () => {
	assert.equal(run(['dd', 'mm', 'aaaa'].join('/')).status, 1);
});

test('rechaza "por definir"', () => {
	assert.equal(run(['por', 'definir'].join(' ')).status, 1);
});
