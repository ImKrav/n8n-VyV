/**
 * Copia todas las capturas reales de evidencias/screenshots a evidencias/por-caso/<CP-xxx-yy>/,
 * según el ID de caso que aparece en el nombre del archivo, y genera un índice por caso.
 * Uso: npm run evidencias
 */
import { readdirSync, statSync, mkdirSync, copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const ORIGEN = 'evidencias/screenshots';
const DESTINO = 'evidencias/por-caso';
mkdirSync(DESTINO, { recursive: true });
const archivos = [];
const recorrer = (dir) => {
  if (!existsSync(dir)) return;
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) recorrer(p);
    else if (n.endsWith('.png')) archivos.push(p);
  }
};
recorrer(ORIGEN);

const indice = {};
for (const a of archivos) {
  const ids = [...new Set((basename(a).match(/CP-\d{3}-\d{2}/g) ?? []))];
  // "CP-017-0607" (nombres con barra eliminada por Windows) → CP-017-06 y CP-017-07
  const combinado = /CP-(\d{3})-(\d{2})(\d{2})/.exec(basename(a));
  if (combinado) ids.push(`CP-${combinado[1]}-${combinado[2]}`, `CP-${combinado[1]}-${combinado[3]}`);
  for (const cp of new Set(ids)) {
    const dir = join(DESTINO, cp);
    mkdirSync(dir, { recursive: true });
    const spec = basename(join(a, '..'));
    const destino = join(dir, `${spec.replace(/\.cy\.js$/, '')}__${basename(a)}`);
    copyFileSync(a, destino);
    (indice[cp] ??= []).push(destino.replace(/\\/g, '/'));
  }
}
const ordenado = Object.fromEntries(Object.entries(indice).sort());
writeFileSync(join(DESTINO, 'indice.json'), JSON.stringify(ordenado, null, 2));
if (!archivos.length) console.log(`No se encontraron capturas en ${ORIGEN}: ejecuta primero las pruebas (npm run test:api, test:ui…).`);
console.log(`Casos con evidencia: ${Object.keys(ordenado).length} · Imágenes copiadas: ${Object.values(ordenado).flat().length}`);
console.log(`Carpeta: ${DESTINO}`);
