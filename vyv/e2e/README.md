# VyV · Core: Data tables y carpetas (ESC-016 a ESC-020)

**Responsable:** Mario Andrade · **Carpeta:** `vyv/e2e/` (antes `vyv/datatables-carpetas/`, rama `vyv/mario-datatables-carpetas`)
**Sistema bajo prueba:** n8n (este fork) · rutas `/home/datatables` y vista de workflows

| ID | Funcionalidad | Escenario | Casos |
|---|---|---|---|
| CO-01 | Crear data table y columnas | ESC-016 | CP-016-01 a 07 |
| CO-02 | Edición de filas | ESC-017 | CP-017-01 a 08 |
| CO-03 | Importar y exportar CSV | ESC-018 | CP-018-01 a 08 |
| CO-04 | Crear y navegar carpetas | ESC-019 | CP-019-01 a 07 |
| CO-05 | Mover y eliminar carpetas | ESC-020 | CP-020-01 a 06 |

Los IDs de las pruebas son los mismos de la matriz de casos y de la RTM (que van en el informe, no en el repositorio). La equivalencia con los IDs del plan (CP-CO-01-01 …) está en [`../README.md`](../README.md).

---

## 1. Qué hay en el repositorio y qué va en el informe

| Punto de la rúbrica | En el repositorio (código) | En el informe (PDF) |
|---|---|---|
| 1–3. Presentación, plan, matriz de trazabilidad | — | Presentación, plan, Excel de HU/requisitos/casos/RTM |
| 4. Ejecución | Scripts de ejecución y reportes (`scripts/`, `../run-tests.sh`) | Resultados, métricas y evidencias |
| 5. Caja blanca / caja negra | Pruebas unitarias en `packages/…/__tests__/*.vyv.test.ts` · pruebas de API Cypress (particiones y valores límite) | Grafos, V(G) y caminos independientes |
| 6. TDD, AAA, FIRST, mocks | Pruebas unitarias + **commits rojo → verde → refactor** | Explicación del ciclo y cobertura |
| 7. Cypress (UI + API) | `core/CO-0x/*.ui.cy.js`, `core/CO-0x/*.api.cy.js` | Resultados por caso |
| 8. Gherkin + Screenplay | `core/CO-0x/*.feature`, `screenplay/` | — |
| 9. Jenkins, Docker, SonarQube | — (a cargo de otro integrante; ver sección 8) | — |
| 10. Regresión | `core/regression/`, `scripts/compare-regression.mjs` | Comparación antes / después |
| 11. Accesibilidad | `core/accessibility/` (axe-core + teclado) | Hallazgos WCAG y revisión manual |
| 12. Usabilidad (Nielsen, SUS) | — | Tareas, SUS y hallazgos |
| 13. Seguridad | `core/security/` (OWASP Top 10) | Hallazgos, severidad, recomendaciones |
| 14. IA | `../ai/stagehand`, `../ai/deepeval`, `../ai/generator` | Configuración, resultados y límites |
| 15. Refactorización | **Cambios en el código de n8n** (sección 3) | Comparación de versiones y pruebas posteriores |

---

## 2. Estructura

```
vyv/e2e/                    ← pruebas funcionales (esta carpeta)
  workflows/ executions/ credentials/   módulos 1–3: casos que necesitan servidor, base de datos o navegador (ver su README)
  core/
    CO-01/ … CO-05/         una carpeta por funcionalidad del plan:
                              *.api.cy.js  por API (caja negra)
                              *.ui.cy.js   por interfaz
                              *.feature    Gherkin en español (Dado/Cuando/Entonces)
    security/               OWASP Top 10
    accessibility/          WCAG 2.1 AA con axe-core
    regression/             suite de regresión
  screenplay/               Actor, habilidades, interacciones, tareas, preguntas
  support/                  comandos, cliente de la API de n8n, pasos de Gherkin
  fixtures/                 CSV y usuarios de prueba
  scripts/                  reportes, comparación de regresión, evidencias por caso
  results/                  salida de cada ejecución (Git la ignora)
vyv/ai/                     Stagehand, DeepEval, generador de casos con IA
vyv/evidence/e2e/           evidencias de la ejecución «antes» (n8n 2.46.6) y línea base de regresión

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

> Guía paso a paso con todos los comandos de instalación y ejecución: **INSTALL.md**.

## 4. Ejecutar las pruebas funcionales (Cypress)

Requisitos: Node 24, Chrome. n8n en `http://localhost:5678` con el propietario creado y la licencia
community registrada (Settings → Usage and plan), que habilita las carpetas.

```bash
cd vyv/e2e
npm install
# credenciales del propietario de tu n8n (PowerShell: $env:CYPRESS_ownerEmail = '...')
export CYPRESS_ownerEmail='tu-correo' CYPRESS_ownerPassword='tu-clave'

npm run test:api          # 36 casos por API
npm run test:ui           # interfaz
npm run test:bdd          # Gherkin + Screenplay
npm run test:security     # OWASP
npm run test:a11y         # WCAG
npm run test:all          # todo lo anterior (lo que ejecuta ../run-tests.sh e2e)
npm run report            # results/report/index.html
npm run evidence          # results/by-case/<CP-xxx-yy>/
```

### Antes y después de la refactorización (puntos 10 y 15)

1. **Antes** – n8n publicado: `npx n8n@2.46.6` y `npm run test:regression && npm run report`,
   luego `cp results/report/consolidado.json ../evidence/e2e/regression-before.json`
   (la línea base de la entrega ya está en ese archivo).
   Resultado esperado: fallan CP-016-02, CP-018-07, CP-018-08 y la complementaria BUG-018-05.
2. **Después** – n8n compilado desde esta rama (raíz del repositorio):
   ```bash
   pnpm install && pnpm build && pnpm start
   ```
   y repetir: `npm run test:regression && npm run test:refactor && npm run report`,
   luego `cp results/report/consolidado.json results/regression-after.json`.
3. `npm run regression:compare` → `results/regression-comparison.md` (corregidos y regresiones).

---

## 5. Pruebas unitarias (caja blanca y TDD)

Desde la raíz del repositorio (Node 24, pnpm 12). `./vyv/run-tests.sh backend` ejecuta las tres:

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
cd vyv/ai/stagehand && npm install && npm run preparar   # instala Chromium para Playwright
cp .env.example .env                                # OPENAI_API_KEY o GOOGLE_API_KEY + credenciales de n8n
npm test                                            # results.json + screenshots/

# DeepEval (evalúa el workflow "Asistente de Data Tables"; ver vyv/ai/deepeval/README.md)
cd vyv/ai/deepeval && python -m venv .venv && .venv/Scripts/activate && pip install -r requirements.txt
deepeval test run test_asistente_datatables.py      # sin API key o sin el workflow: se omite con un mensaje claro

# Generador de casos con IA (cualquier API compatible con OpenAI)
cd vyv/ai/generator && LLM_API_KEY=... node generar-casos-ia.mjs   # output/ con CSV, Gherkin y análisis
```

## 7. Verificación realizada

| Qué | Resultado |
|---|---|
| Pruebas unitarias VyV en Vitest dentro de n8n | CP-019-07 19/19 · CP-018-03/07/08 37/37 · CP-020-06 5/5 |
| TDD rojo (commit "TDD rojo") | 13 pruebas fallan antes de la corrección |
| Regresión con las pruebas originales de n8n del módulo data-table | 97/97 (75 originales + 22 VyV del parser, importación CSV, servicio y subidas); 222 pruebas unitarias del módulo en verde |
| Cypress contra n8n 2.46.6 (08/11/2026) | 84 aprobadas, 3 fallidas (defectos reales), 1 pendiente |
| Cypress contra n8n 2.47.0 de esta rama, Chromium (13/11/2026) | 94 pruebas: 92 aprobadas, 1 fallida (hallazgo CP-CO-03-04), 1 pendiente; CP-017-08 aprobado aparte con el límite de 1 MB; 0 regresiones y 3 corregidas frente a la línea base |
| Cypress contra n8n 2.47.0 de esta rama, Chromium (14/11/2026) · 44 specs de los 4 módulos | 182 pruebas: 180 aprobadas, 2 fallidas (hallazgos CP-CO-03-04 y CP-WF-01-08), 0 pendientes; 0 regresiones y 3 corregidas frente a la línea base |
| Newman, colección `../api/` (14/11/2026) | 40 peticiones y 62 aserciones, 0 fallidas |
| Scripts `report`, `regression:compare`, `evidence` | Probados con los reportes reales |
| IA | Stagehand 2.5 carga y arranca (falta navegador/API key); DeepEval 3.9 crea las 3 métricas; generador probado con un servidor que imita la API |

## 8. Integración con Jenkins y SonarQube (a cargo de otro integrante)

- **Reportes Cypress:** `vyv/e2e/results/mochawesome/*.json` y `results/report/index.html`
  (generado con `npm run report`); videos y capturas en `results/`.
- **Cobertura para SonarQube:** el comando con `--coverage` de la sección 5 genera
  `packages/modules/data-table/backend/coverage/lcov.info` (propiedad `sonar.javascript.lcov.reportPaths`).
- La carpeta `results/` no se versiona (está en `vyv/.gitignore`). Las evidencias que sí se versionan están en `vyv/evidence/e2e/`.
