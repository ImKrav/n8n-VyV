/**
 * Punto 14 · Herramienta de IA adicional: generación y análisis de pruebas con un LLM.
 *
 * 1. GENERA: a partir de las HU de CO-01..CO-05 pide al modelo
 *    (a) CSV de prueba con valores límite y casos de error para CO-03, y
 *    (b) escenarios Gherkin adicionales en español.
 * 2. ANALIZA: valida lo generado (columnas, filas, palabras clave Dado/Cuando/Entonces) y
 *    marca qué casos ya existen en la matriz para detectar duplicados.
 * 3. MANTIENE: guarda la salida en ai/generator/output/ para revisión humana antes de incorporarla.
 *
 * Funciona con cualquier API compatible con OpenAI (OpenAI, Groq, OpenRouter, Ollama local).
 *   LLM_BASE_URL=https://api.openai.com/v1  LLM_API_KEY=sk-...  LLM_MODEL=gpt-4.1-mini  node generar-casos-ia.mjs
 * Si en clase se trabajó otra herramienta (Copilot, Testim, Postman AI…), documentar su uso con el mismo formato.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1';
const KEY = process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
const MODEL = process.env.LLM_MODEL ?? 'gpt-4.1-mini';
if (!KEY && !BASE.includes('localhost')) { console.error('Falta LLM_API_KEY'); process.exit(1); }

const HU = `
CO-01 Crear data table (nombre 1-128, único) y columnas string/number/boolean/date (nombre ^[a-zA-Z][a-zA-Z0-9_]*$, máx 63, reservados id/createdAt/updatedAt).
CO-02 Editar filas: validar tipos, nulos, ordenar, filtrar (eq, gt, like, isEmpty), límite de almacenamiento.
CO-03 Importar CSV (solo .csv, inferencia de tipos, columnas desconocidas → error) y exportar CSV.
CO-04 Carpetas: nombre 1-128, sin [ ] ^ \\ / : * ? " < > |, no solo puntos, no empezar con punto; anidar; breadcrumbs.
CO-05 Mover carpetas (no a sí misma ni a un descendiente) y eliminar (transferir o archivar).`;

const chat = async (prompt) => {
  const r = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}) },
    body: JSON.stringify({ model: MODEL, temperature: 0.2, messages: [
      { role: 'system', content: 'Eres un ingeniero de pruebas ISTQB. Responde solo con el contenido pedido, sin explicaciones ni bloques de código.' },
      { role: 'user', content: prompt },
    ] }),
  });
  if (!r.ok) throw new Error(`LLM ${r.status}: ${await r.text()}`);
  return (await r.json()).choices[0].message.content.replace(/^```\w*\n?|```$/g, '').trim();
};

mkdirSync('output', { recursive: true });
const inicio = Date.now();

// (a) Datos de prueba CSV con valores límite
const csv = await chat(`Genera un CSV con encabezado nombre,edad,activo,fecha y 12 filas para probar la importación de
data tables de n8n. Incluye: valores límite de edad (0, -1, 2147483647), booleanos en mayúsculas, fechas imposibles
(2024-02-30), fechas bisiestas, celdas vacías, textos con comas entre comillas, emojis y una fórmula (=1+1).
Requisitos: ${HU}`);
writeFileSync('output/datos_limite_ia.csv', csv + '\n');

// (b) Escenarios Gherkin adicionales
const gherkin = await chat(`Escribe una Característica Gherkin en español (# language: es) con 6 escenarios NUEVOS
(exitosos, alternativos y de error) para estas funcionalidades, usando Dado/Cuando/Entonces y un Esquema del escenario
con Ejemplos para valores límite. Requisitos: ${HU}`);
writeFileSync('output/escenarios_ia.feature', gherkin + '\n');

// Análisis automático de lo generado
const filas = csv.split(/\r?\n/).filter(Boolean);
const analisis = {
  modelo: MODEL,
  segundos: Math.round((Date.now() - inicio) / 1000),
  csv: {
    encabezadoCorrecto: filas[0]?.replace(/\s/g, '') === 'nombre,edad,activo,fecha',
    filas: filas.length - 1,
    incluyeFechaImposible: /2024-02-30/.test(csv),
    incluyeFormula: /(^|,)"?(=|@|[+-][^\d,\n])/m.test(csv),
  },
  gherkin: {
    escenarios: (gherkin.match(/Escenario|Esquema del escenario/g) ?? []).length,
    usaDadoCuandoEntonces: /Dado/.test(gherkin) && /Cuando/.test(gherkin) && /Entonces/.test(gherkin),
    duplicadosConMatriz: ['duplicado', 'descendiente', 'solo puntos'].filter((k) => gherkin.toLowerCase().includes(k)),
  },
  revisionHumana: 'Pendiente: revisar, corregir y solo entonces copiar a e2e/fixtures y a la carpeta del caso en e2e/core/CO-0x.',
};
writeFileSync('output/analisis.json', JSON.stringify(analisis, null, 2));
console.log(analisis);
