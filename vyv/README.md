# VyV · Plan de pruebas de n8n · Módulos 1–4

Esta carpeta contiene todas las pruebas automatizadas del **plan de pruebas de n8n-VyV** (carpeta «Final VyV»: plan, casos y escenarios, matriz de trazabilidad). El plan cubre 4 módulos con 5 funcionalidades cada uno y **142 casos** (CP-WF-01-01 … CP-CO-05-08). El sistema bajo prueba es **n8n 2.47.0 (commit `01bd57cdd`)**.

```
vyv/
├── README.md            este índice
├── run-tests.sh         ejecuta el plan: units, backend, e2e o all
├── vitest.config.mts    config de Vitest de la suite unitaria (extiende la de editor-ui)
├── suite.mts            módulos de producción medidos por la cobertura unitaria
├── units/               pruebas unitarias del editor (Vitest)
│   ├── workflows/WF-01 … WF-05/
│   ├── executions/EX-01 … EX-05/
│   ├── credentials/CR-01 … CR-05/
│   └── core/CO-01 … CO-05/
├── e2e/                 pruebas funcionales (Cypress): API, UI, Gherkin + Screenplay
│   ├── workflows/ executions/ credentials/   sin pruebas Cypress todavía
│   ├── core/CO-01 … CO-05/                   *.api.cy.js, *.ui.cy.js, *.feature
│   ├── core/security/ core/accessibility/ core/regression/
│   └── support/ screenplay/ fixtures/ scripts/
├── ai/                  Stagehand, DeepEval y generador de casos con IA
└── evidence/
    ├── units/           ciclos TDD, ejecución completa y cobertura de la suite unitaria
    └── e2e/             ejecuciones de Cypress «antes» (n8n 2.46.6) y «después» (2.47.0) y línea base de regresión
```

| Carpeta | Qué contiene | Módulos | Herramienta |
| --- | --- | --- | --- |
| [`units/`](units/README.md) | Un `describe` por caso del plan, TDD, AAA, FIRST y dobles de prueba | 1 Workflows · 2 Ejecuciones · 3 Credenciales · 4 Core | Vitest |
| [`e2e/`](e2e/README.md) | Data tables y carpetas por API, UI y Gherkin + Screenplay; seguridad (OWASP), accesibilidad (WCAG) y regresión | 4 Core | Cypress |
| [`ai/`](e2e/README.md#6-inteligencia-artificial-punto-14) | Flujos en lenguaje natural, evaluación de un asistente y generación de casos | 4 Core | Stagehand, DeepEval, LLM |

Las pruebas unitarias de backend de data tables y carpetas (`*.vyv.test.ts`) están junto al código que verifican, en `packages/` (ver la sección 5 de [`e2e/README.md`](e2e/README.md)). `run-tests.sh` también las ejecuta.

## Cómo ejecutar el plan

Requisitos: `pnpm install` y compilar las dependencias (`pnpm build > build.log 2>&1`, o solo las de editor-ui y del backend que se prueba).

```bash
./vyv/run-tests.sh
```

Sin argumento, el script ejecuta las dos partes que no necesitan un n8n en marcha. Para ejecutar una sola parte o todo el plan:

```bash
./vyv/run-tests.sh units
```

```bash
./vyv/run-tests.sh units CO-05
```

```bash
./vyv/run-tests.sh backend
```

```bash
CYPRESS_ownerEmail='…' CYPRESS_ownerPassword='…' ./vyv/run-tests.sh e2e
```

```bash
CYPRESS_ownerEmail='…' CYPRESS_ownerPassword='…' ./vyv/run-tests.sh all
```

| Parte | Qué ejecuta | Salida |
| --- | --- | --- |
| `units` | Vitest con `vitest.config.mts`, cobertura y dos workers; los argumentos siguientes pasan a Vitest | `vyv/coverage/index.html` |
| `backend` | `*.vyv.test.ts` de `@n8n/backend-module-data-table`, `@n8n/api-types` y `n8n` | consola |
| `e2e` | `npm run test:all` y `npm run report` en `e2e/` (n8n en `http://localhost:5678`, licencia community registrada) | `vyv/e2e/results/report/index.html` |

Sin la licencia community, las carpetas se pueden activar con el modo de pruebas de n8n: arranque n8n con `E2E_TESTS=true` y ejecute `curl -X PATCH -H 'content-type: application/json' -d '{"feature":"feat:folders","enabled":true}' http://localhost:5678/rest/e2e/feature`. Ese modo no envía la cabecera anti-clickjacking, así que la prueba de seguridad (BUG-018-06) se ejecuta sin él.

La prueba del límite de almacenamiento (CP-017-08) y la regresión antes/después tienen sus propios comandos. Consulte las secciones 4 y 5 de [`e2e/README.md`](e2e/README.md).

## Resultados

| Parte | Resultado | Fecha y versión |
| --- | --- | --- |
| `units` | 91 archivos, **264 pruebas en verde**, 21 `it.todo`; cobertura 52,6 % de líneas de los 74 módulos probados | 13/11/2026 · n8n 2.47.0 |
| `backend` | **64 pruebas en verde** (data-table 40, `folderNameSchema` 19, `FolderService.deleteFolder` 5) | 13/11/2026 · n8n 2.47.0 |
| `e2e` | **94 pruebas en Chromium: 92 aprobadas, 1 fallida (hallazgo CP-CO-03-04, separador «;»), 1 pendiente** (CP-017-08, que pasa aparte con el límite de 1 MB). Regresión frente a la línea base: 0 regresiones, 3 corregidas (CP-018-07, CP-018-08, BUG-018-05). Seguridad sin modo E2E: BUG-018-06 se confirma (no hay `X-Frame-Options` ni `frame-ancestors`). Evidencia: [`evidence/e2e/after/`](evidence/e2e/after/) | 13/11/2026 · n8n 2.47.0 desde esta rama, en modo `E2E_TESTS` con Folders activada; Chromium 1243 |
| `e2e` (antes) | 84 aprobadas, 3 fallidas (defectos reales), 1 pendiente. Evidencia: [`evidence/e2e/before/`](evidence/e2e/before/) | 08/11/2026 · n8n 2.46.6 publicado |

## Equivalencia de IDs en el módulo Core

`e2e/` usa los IDs de escenario ESC-016 … ESC-020, uno por funcionalidad de Core en el orden del plan, con sus propios números de caso (CP-016-01 …). La tabla relaciona esos IDs con los casos del plan (CP-CO-…). «Complementaria» es una prueba de `e2e/` sin número de caso propio.

| Caso del plan | Caso | `units/` | `e2e/` (`core/CO-0x/`) |
| --- | --- | --- | --- |
| CP-CO-01-01 | Crear data table con nombre válido | ✅ | CP-016-01 (API, UI, BDD) |
| CP-CO-01-02 | Nombre vacío o solo espacios | ✅ TDD | CP-016-02 (API, UI) · BUG-016-01 |
| CP-CO-01-03 | Nombre duplicado en el proyecto | ✅ | CP-016-03 (API, BDD) |
| CP-CO-01-04 | Nombre en el límite de longitud | ⏳ todo | Complementaria: longitud 1 / 128 / 129 (API) |
| CP-CO-01-05 | Añadir columnas de los cuatro tipos | ✅ | CP-016-04 (API, UI) |
| CP-CO-01-06 | Nombre de columna duplicado | ⏳ todo | Complementaria: columna duplicada 409 (API) |
| CP-CO-01-07 | Nombre de columna con caracteres no permitidos | ✅ | CP-016-05 (API, UI) |
| CP-CO-01-08 | Renombrar y eliminar una columna con datos | ✅ | CP-016-06, CP-016-07 (API) |
| CP-CO-02-01 | Añadir fila con valores válidos | ✅ | CP-017-01 (API, UI) |
| CP-CO-02-02 | Texto en una columna number | ✅ | CP-017-02 (API, BDD) |
| CP-CO-02-03 | Fecha inválida | ⏳ todo | CP-017-02 (fecha inválida → 400), CP-017-03 (API) |
| CP-CO-02-04 | Nulo frente a cadena vacía | ✅ | CP-017-04 (API) |
| CP-CO-02-05 | Celda de más de 10 000 caracteres | ✅ | CP-017-05 (API) |
| CP-CO-02-06 | Ordenar por columna | ✅ | CP-017-06 (API, UI) |
| CP-CO-02-07 | Filtrar por columna | ✅ | CP-017-07 (API, UI, BDD) |
| CP-CO-02-08 | Leer y escribir filas desde el nodo Data Table | ⏳ todo | CP-CO-02-08 (`CO-02/data-table-node.api.cy.js`: workflows con Webhook y nodo Data Table) |
| CP-CO-03-01 | Importar un CSV válido | ✅ | CP-018-01 (API, UI, BDD) |
| CP-CO-03-02 | CSV con columnas desiguales | ✅ | CP-018-03 (API) · unitaria backend CP-018-03 |
| CP-CO-03-03 | CSV con tipos incompatibles | ⏳ todo | CP-018-04 (API) · unitaria backend CP-018-07 (TDD) |
| CP-CO-03-04 | CSV con BOM, separador «;» y tildes | ⏳ todo | CP-CO-03-04 (`CO-03/csv-encoding-size.api.cy.js`): BOM y tildes ✅ · **hallazgo**: el separador «;» falla |
| CP-CO-03-05 | Importar un archivo grande | ⏳ todo | CP-CO-03-05 (`CO-03/csv-encoding-size.api.cy.js`: 10 000 filas en menos de 30 s) |
| CP-CO-03-06 | Exportar y comparar con el origen | ✅ | CP-018-06 (API, UI) |
| CP-CO-04-01 | Crear carpeta en la raíz | ✅ | CP-019-01 (API, UI) |
| CP-CO-04-02 | Anidar carpetas en varios niveles | ✅ | CP-019-04 (API, BDD) |
| CP-CO-04-03 | Nombre vacío o duplicado en el mismo nivel | ✅ | CP-019-02 (API; nombres inválidos, sin duplicados) · unitaria backend CP-019-07 |
| CP-CO-04-04 | Renombrar una carpeta | ✅ | CP-019-03 (API, UI) |
| CP-CO-04-05 | Navegar con las migas de pan | ✅ | CP-019-05 (UI) |
| CP-CO-04-06 | Buscar workflows dentro de carpetas | ✅ | CP-019-06 (API, UI; conteos de la carpeta) |
| CP-CO-05-01 | Mover un workflow a una carpeta | ✅ | CP-020-01 (API) |
| CP-CO-05-02 | Mover un workflow de vuelta a la raíz | ✅ | — |
| CP-CO-05-03 | Mover una carpeta con contenido | ✅ | CP-020-02 (API, UI) |
| CP-CO-05-04 | Impedir mover una carpeta dentro de sí misma o de una hija | ✅ | CP-020-03 + Complementaria descendiente (API, BDD) |
| CP-CO-05-05 | Eliminar una carpeta vacía | ✅ | Complementaria: elimina carpeta vacía (API) |
| CP-CO-05-06 | Eliminar carpeta con contenido transfiriendo | ✅ | CP-020-04 (API, UI, BDD) |
| CP-CO-05-07 | Eliminar carpeta con contenido borrando | ✅ | CP-020-05 (API) |
| CP-CO-05-08 | Sin workflows huérfanos tras eliminar | ⏳ todo | CP-020-05 (API) · unitaria backend CP-020-06 (mocks), en parte |

`e2e/` tiene casos sin equivalente en el plan: CP-017-08 (límite de almacenamiento), CP-018-02 (archivo que no es CSV), CP-018-05 (columnas desconocidas), CP-018-07 (inferencia de fechas imposibles) y CP-018-08 (inyección de fórmulas al exportar).

Con las dos carpetas, todos los casos del plan de Core tienen prueba automatizada. Las pruebas nuevas de `e2e/` usan los IDs del plan (CP-CO-…).

**Hallazgo CP-CO-03-04 (abierto).** Un CSV exportado desde Excel en español usa «;» como separador. n8n no lo separa ni informa que no lo admite: crea una sola columna `nombre;ciudad`, que además es un nombre de columna inválido, así que la tabla no se puede crear sin renombrarla. El parser (`csv-parser.service.ts`) solo acepta la coma. El BOM se quita y las tildes se conservan. El defecto queda abierto a propósito para el informe: la prueba falla hasta que n8n detecte el separador o informe que no lo admite.

## Defectos corregidos con TDD

| Defecto | Corrección | Pruebas |
| --- | --- | --- |
| Rango de fechas invertido en el filtro de ejecuciones devolvía una lista vacía (CP-EX-02-03) | `executions.utils.ts` | `units/executions/EX-02` |
| Nombre de data table con solo espacios habilitaba «Create» (CP-CO-01-02 / BUG-016-01) | `AddDataTableModal.vue` (`trimmedName`) | `units/core/CO-01` · Cypress CP-016-02 |
| Con un nombre de solo espacios, el modal no proponía el nombre del CSV elegido (CP-CO-01-02) | `AddDataTableModal.vue` (`handleFileChange`) | `units/core/CO-01` · logs `evidence/units/tdd-co01-import-*` |
| Fechas imposibles y números no decimales inferidos en el CSV (BUG-018-01/02/03) | `csv-parser.service.ts` | unitaria backend CP-018-07 |
| CSV malformado y `fileId` inválido respondían 500 (BUG-018-05) | `csv-parser.service.ts`, `data-table-uploads.controller.ts` | unitaria backend CP-018-03 · Cypress BUG-018-05 |
| El CSV exportado no neutralizaba fórmulas (BUG-018-04) | `utils/csv-escape.ts`, `data-table.service.ts` | unitaria backend CP-018-08 |

El detalle de cada ciclo rojo → verde → refactor está en [`units/README.md`](units/README.md) (sección TDD) y en [`e2e/README.md`](e2e/README.md) (sección 3).
