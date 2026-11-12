// Fails on dates after the deadline or on date placeholders in deliverable docs.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const LIMITE = Date.UTC(2026, 10, 17);
const TEXTO = new Set(['.md', '.json', '.csv']);
const OFFICE = new Set(['.docx', '.xlsx']);
const EXCLUIDOS = /(^|\/)(node_modules|\.venv|scripts)(\/|$)/;
const FECHA = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
const MARCADOR = /dd\/mm\/aaaa|por definir|\bTBD\b/i;

const PY = `
import sys
p=sys.argv[1]
if p.endswith('.docx'):
    import docx
    d=docx.Document(p)
    print('\\n'.join([x.text for x in d.paragraphs]+[c.text for t in d.tables for r in t.rows for c in r.cells]))
else:
    import openpyxl
    for ws in openpyxl.load_workbook(p).worksheets:
        for r in ws.iter_rows(values_only=True):
            print(' '.join(str(v) for v in r if v is not None))
`;

function listar(raiz) {
	if (!statSync(raiz).isDirectory()) return [raiz];
	return readdirSync(raiz, { recursive: true })
		.map((f) => join(raiz, f))
		.filter((f) => !EXCLUIDOS.test(relative(raiz, f).replaceAll('\\', '/')) && statSync(f).isFile());
}

function leer(f) {
	const ext = extname(f).toLowerCase();
	if (TEXTO.has(ext)) return readFileSync(f, 'utf8');
	if (OFFICE.has(ext)) {
		const r = spawnSync('python3', ['-c', PY, f], { encoding: 'utf8' });
		if (r.status === 0) return r.stdout;
		console.error(`omitido: ${f} (sin extractor)`);
	}
	return '';
}

let fallos = 0;
for (const raiz of process.argv.slice(2)) {
	for (const f of listar(raiz)) {
		if (/\.test\./.test(basename(f))) continue;
		leer(f)
			.split('\n')
			.forEach((linea, i) => {
				for (const [txt, d, m, a] of linea.matchAll(FECHA)) {
					const ms = Date.UTC(+a, +m - 1, +d);
					const valida = new Date(ms).getUTCDate() === +d && +m >= 1 && +m <= 12;
					if (valida && ms > LIMITE) {
						console.log(`${f}:${i + 1}:${txt}`);
						fallos++;
					}
				}
				const mk = linea.match(MARCADOR);
				if (mk) {
					console.log(`${f}:${i + 1}:${mk[0]}`);
					fallos++;
				}
			});
	}
}
process.exit(fallos ? 1 : 0);
