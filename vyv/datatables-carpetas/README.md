# VyV · Core: Data tables y carpetas (ESC-016 a ESC-020)

**Responsable:** Mario Andrade · **Rama:** `vyv/mario-datatables-carpetas`
**Sistema bajo prueba:** n8n (este fork) · rutas `/home/datatables` y vista de workflows

| ID | Funcionalidad | Escenario | Casos |
|---|---|---|---|
| CO-01 | Crear data table y columnas | ESC-016 | CP-016-01 a 07 |
| CO-02 | Edición de filas | ESC-017 | CP-017-01 a 08 |
| CO-03 | Importar y exportar CSV | ESC-018 | CP-018-01 a 08 |
| CO-04 | Crear y navegar carpetas | ESC-019 | CP-019-01 a 07 |
| CO-05 | Mover y eliminar carpetas | ESC-020 | CP-020-01 a 06 |

Los IDs de las pruebas son los mismos de la matriz de casos y de la RTM (que van en el informe, no en el repositorio).

---

## 1. Qué hay en el repositorio y qué va en el informe

| Punto de la rúbrica | En el repositorio (código) | En el informe (PDF) |
|---|---|---|
| 1–3. Presentación, plan, matriz de trazabilidad | — | Presentación, plan, Excel de HU/requisitos/casos/RTM |
| 4. Ejecución | Scripts de ejecución y reportes (`scripts/`) | Resultados, métricas y evidencias |
| 5. Caja blanca / caja negra | Pruebas unitarias en `packages/…/__tests__/*.vyv.test.ts` · pruebas de API Cypress (particiones y valores límite) | Grafos, V(G) y caminos independientes |
| 6. TDD, AAA, FIRST, mocks | Pruebas unitarias + **commits rojo → verde → refactor** | Explicación del ciclo y cobertura |
| 7. Cypress (UI + API) | `cypress/e2e/ui`, `cypress/e2e/api` | Resultados por caso |
| 8. Gherkin + Screenplay | `cypress/e2e/features`, `cypress/screenplay` | — |
| 9. Jenkins, Docker, SonarQube | — (a cargo de otro integrante; ver sección 8) | — |
| 10. Regresión | `cypress/e2e/regresion`, `scripts/comparar-regresion.mjs` | Comparación antes / después |
| 11. Accesibilidad | `cypress/e2e/accesibilidad` (axe-core + teclado) | Hallazgos WCAG y revisión manual |
| 12. Usabilidad (Nielsen, SUS) | — | Tareas, SUS y hallazgos |
| 13. Seguridad | `cypress/e2e/seguridad` (OWASP Top 10) | Hallazgos, severidad, recomendaciones |
| 14. IA | `ia/stagehand`, `ia/deepeval`, `ia/generador` | Configuración, resultados y límites |
| 15. Refactorización | **Cambios en el código de n8n** (sección 3) | Comparación de versiones y pruebas posteriores |

---

## 2. Estructura

```
vyv/datatables-carpetas/                ← pruebas funcionales (esta carpeta)
  cypress/e2e/api/          CO-01..CO-05 por API (caja negra)
  cypress/e2e/ui/           CO-01..CO-05 por interfaz
  cypress/e2e/features/     Gherkin en español (Dado/Cuando/Entonces)
  cypress/screenplay/       Actor, habilidades, interacciones, tareas, preguntas
  cypress/e2e/seguridad/    OWASP Top 10
  cypress/e2e/accesibilidad/ WCAG 2.1 AA con axe-core
  cypress/e2e/regresion/    suite de regresión
  ia/                       Stagehand, DeepEval, generador de casos con IA
  scripts/                  reportes, comparación de regresión, evidencias por caso

packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts       (CP-019-07)
packages/cli/src/services/__tests__/folder.service.vyv.test.ts                      (CP-020-06, mocks)
packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts (CP-018-07, TDD)
packages/modules/data-table/backend/src/__tests__/csv-parser.errors.vyv.test.ts     (CP-018-03, TDD)
packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts            (CP-018-08, TDD)
```

---

## 3. Refactorización (punto 15): defectos encontrados por las pruebas y corregidos

| Defecto | Archivo modificado | Cambio | Prueba que lo verifica |
|---|---|---|---|
| BUG-018-01 / 02 · `2024-02-30`, `Infinity`, `0x1A` inferidos como fecha/número | `modules/data-table/backend/src/csv-parser.service.ts` | `isValidCalendarDate()` e `isDecimalNumber()` | `csv-parser.infer-type.vyv.test.ts` · CP-018-07 |
| BUG-018-03 · el comentario decía soportar DD/MM/AAAA | `csv-parser.service.ts` | Comentarios corregidos (solo MM/DD) | Revisión de código |
| BUG-018-05 · CSV malformado y `fileId` con `../` respondían **500** | `csv-parser.service.ts`, `data-table-uploads.controller.ts` | `resolveUploadPath()` y errores del parser como `FileUploadError` → **400** | `csv-parser.errors.vyv.test.ts` · prueba Cypress "BUG-018-05" |
| BUG-018-04 · el CSV exportado no neutralizaba fórmulas (OWASP A03) | `utils/csv-escape.ts` (nuevo), `data-table.service.ts` | Se extrajo `escapeCsvValue()` a una utilidad y se neutralizan `= + - @` en columnas de texto | `csv-escape.vyv.test.ts` · CP-018-08 |
| BUG-016-01 · el botón Create se habilitaba con un nombre de solo espacios | `frontend/editor-ui/…/AddDataTableModal.vue` | `trimmedName` (nombre recortado) para habilitar el botón y para crear la tabla | CP-016-02 (Cypress UI) |

No se modifican en código (recomendaciones del informe): BUG-016-02 (accesibilidad WCAG del sistema de diseño) y
BUG-018-06 (cabecera anti-clickjacking, configuración del despliegue).

El historial de la rama muestra el ciclo TDD:

```
test(vyv): caja blanca de folderNameSchema y deleteFolder con mocks
test(vyv): TDD rojo – inferencia de tipos y errores de entrada del parser CSV
fix(data-table): TDD verde – fechas imposibles y números no decimales (BUG-018-01/02/03)
fix(data-table): CSV malformado y fileId inválido responden 400 (BUG-018-05)
test(vyv): TDD rojo – neutralización de fórmulas en el CSV exportado
refactor(data-table): extraer escapeCsvValue y neutralizar fórmulas (BUG-018-04)
fix(editor): el botón Create ignora nombres de solo espacios (BUG-016-01)
test(vyv): pruebas Cypress, BDD/Screenplay, seguridad, accesibilidad, regresión e IA
```

---

> Guía paso a paso con todos los comandos de instalación y ejecución: **GUIA-INSTALACION.md**.

## 4. Ejecutar las pruebas funcionales (Cypress)

Requisitos: Node 24, Chrome. n8n en `http://localhost:5678` con el propietario creado y la licencia
community registrada (Settings → Usage and plan), que habilita las carpetas.

```bash
cd vyv/datatables-carpetas
npm install
# credenciales del propietario de tu n8n (PowerShell: $env:CYPRESS_ownerEmail = '...')
export CYPRESS_ownerEmail='tu-correo' CYPRESS_ownerPassword='tu-clave'

npm run test:api          # 36 casos por API
npm run test:ui           # interfaz
npm run test:bdd          # Gherkin + Screenplay
npm run test:seguridad    # OWASP
npm run test:a11y         # WCAG
npm run reporte           # evidencias/reporte/index.html
npm run evidencias        # evidencias/por-caso/<CP-xxx-yy>/
```

### Antes y después de la refactorización (puntos 10 y 15)

1. **Antes** – n8n publicado: `npx n8n@2.46.6` y `npm run test:regresion && npm run reporte`,
   luego `cp evidencias/reporte/consolidado.json evidencias/regresion-antes.json`.
   Resultado esperado: fallan CP-016-02, CP-018-07, CP-018-08 y la complementaria BUG-018-05.
2. **Después** – n8n compilado desde esta rama (raíz del repositorio):
   ```bash
   pnpm install && pnpm build && pnpm start
   ```
   y repetir: `npm run test:regresion && npm run test:refactor && npm run reporte`,
   luego `cp evidencias/reporte/consolidado.json evidencias/regresion-despues.json`.
3. `npm run regresion:comparar` → `evidencias/regresion-comparacion.md` (corregidos y regresiones).

---

## 5. Pruebas unitarias (caja blanca y TDD)

Desde la raíz del repositorio (Node 24, pnpm 12):

```bash
pnpm install
pnpm --filter @n8n/backend-module-data-table test vyv -- --coverage   # CP-018-03, 07 y 08
pnpm --filter @n8n/api-types test folder-name.schema.vyv               # CP-019-07
pnpm --filter n8n test folder.service.vyv                              # CP-020-06 (mocks)
```

Para ver el **rojo** del TDD: `git checkout <commit "TDD rojo">` y ejecutar las mismas pruebas.

---

## 6. Inteligencia artificial (punto 14)

```bash
# Stagehand (automatiza flujos con lenguaje natural)
cd ia/stagehand && npm install && npm run preparar   # instala Chromium para Playwright
cp .env.example .env                                # OPENAI_API_KEY o GOOGLE_API_KEY + credenciales de n8n
npm test                                            # resultados.json + capturas/

# DeepEval (evalúa el workflow "Asistente de Data Tables"; ver ia/deepeval/README.md)
cd ia/deepeval && python -m venv .venv && .venv/Scripts/activate && pip install -r requirements.txt
deepeval test run test_asistente_datatables.py      # sin API key o sin el workflow: se omite con un mensaje claro

# Generador de casos con IA (cualquier API compatible con OpenAI)
cd ia/generador && LLM_API_KEY=... node generar-casos-ia.mjs   # salida/ con CSV, Gherkin y análisis
```

## 7. Verificación realizada

| Qué | Resultado |
|---|---|
| Pruebas unitarias VyV en Vitest dentro de n8n | CP-019-07 19/19 · CP-018-03/07/08 37/37 · CP-020-06 5/5 |
| TDD rojo (commit "TDD rojo") | 13 pruebas fallan antes de la corrección |
| Regresión con las pruebas originales de n8n del módulo data-table | 97/97 (75 originales + 22 VyV del parser, importación CSV, servicio y subidas); 222 pruebas unitarias del módulo en verde |
| Cypress contra n8n 2.46.6 (08/11/2026) | 84 aprobadas, 3 fallidas (defectos reales), 1 pendiente |
| Scripts `reporte`, `regresion:comparar`, `evidencias` | Probados con los reportes reales |
| IA | Stagehand 2.5 carga y arranca (falta navegador/API key); DeepEval 3.9 crea las 3 métricas; generador probado con un servidor que imita la API |

## 8. Integración con Jenkins y SonarQube (a cargo de otro integrante)

- **Reportes Cypress:** `vyv/datatables-carpetas/evidencias/mochawesome/*.json` y `evidencias/reporte/index.html`
  (generado con `npm run reporte`); videos y capturas en `evidencias/`.
- **Cobertura para SonarQube:** el comando con `--coverage` de la sección 5 genera
  `packages/modules/data-table/backend/coverage/lcov.info` (propiedad `sonar.javascript.lcov.reportPaths`).
- La carpeta `evidencias/` no se versiona (está en `.gitignore`).
