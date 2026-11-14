# VyV · Plan de pruebas de n8n · Módulos 1–4

Esta carpeta contiene todas las pruebas automatizadas del **plan de pruebas de n8n-VyV** (carpeta «Final VyV»: plan, casos y escenarios, matriz de trazabilidad). El plan cubre 4 módulos con 5 funcionalidades cada uno y **142 casos** (CP-WF-01-01 … CP-CO-05-08). El sistema bajo prueba es **n8n 2.47.0 (commit `01bd57cdd`)**. **141 de los 142 casos tienen prueba automatizada**, entre `units/` y `e2e/`; CP-CR-03-05 necesita una cuenta real de un proveedor OAuth2 y se ejecuta de forma manual. Las **20 funcionalidades** tienen pruebas Cypress con escenarios de éxito, alternativos y de error, y la API de los 4 módulos tiene una colección Newman (ver la [matriz](#matriz-de-pruebas-automatizadas-por-funcionalidad)).

```
vyv/
├── README.md            este índice
├── run-tests.sh         ejecuta el plan: units, backend, e2e, api o all
├── vitest.config.mts    config de Vitest de la suite unitaria (extiende la de editor-ui)
├── suite.mts            módulos de producción medidos por la cobertura unitaria
├── units/               pruebas unitarias del editor (Vitest)
│   ├── workflows/WF-01 … WF-05/
│   ├── executions/EX-01 … EX-05/
│   ├── credentials/CR-01 … CR-05/
│   └── core/CO-01 … CO-05/
├── e2e/                 pruebas funcionales (Cypress): API, UI, Gherkin + Screenplay
│   ├── workflows/WF-01 … WF-05/              una spec por funcionalidad: éxito, alternativo y error
│   ├── executions/EX-01 … EX-05/
│   ├── credentials/CR-01 … CR-05/
│   ├── core/CO-01 … CO-05/                   *.api.cy.js, *.ui.cy.js, *.feature
│   ├── core/security/ core/accessibility/ core/regression/
│   └── support/ screenplay/ fixtures/ scripts/
├── api/                 colección Postman de la API de los 4 módulos (Newman)
├── ai/                  Stagehand, DeepEval y generador de casos con IA
└── evidence/
    ├── units/           ciclos TDD, ejecución completa y cobertura de la suite unitaria
    ├── e2e/             ejecuciones de Cypress «antes» (n8n 2.46.6) y «después» (2.47.0) y línea base de regresión
    └── api/             última ejecución de Newman (JUnit y consola)
```

| Carpeta | Qué contiene | Módulos | Herramienta |
| --- | --- | --- | --- |
| [`units/`](units/README.md) | Un `describe` por caso del plan, TDD, AAA, FIRST y dobles de prueba | 1 Workflows · 2 Ejecuciones · 3 Credenciales · 4 Core | Vitest |
| [`e2e/`](e2e/README.md) | Las 20 funcionalidades por API (`cy.request`), UI y Gherkin + Screenplay, con escenarios de éxito, alternativos y de error; seguridad (OWASP), accesibilidad (WCAG) y regresión | 1 · 2 · 3 · 4 | Cypress |
| [`api/`](api/README.md) | Flujos principales y errores de la API REST de los 4 módulos | 1 · 2 · 3 · 4 | Postman + Newman |
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
./vyv/run-tests.sh api
```

```bash
CYPRESS_ownerEmail='…' CYPRESS_ownerPassword='…' ./vyv/run-tests.sh all
```

| Parte | Qué ejecuta | Salida |
| --- | --- | --- |
| `units` | Vitest con `vitest.config.mts`, cobertura y dos workers; los argumentos siguientes pasan a Vitest | `vyv/coverage/index.html` |
| `backend` | `*.vyv.test.ts` de `@n8n/backend-module-data-table`, `@n8n/api-types` y `n8n` | consola |
| `e2e` | `npm run test:all` y `npm run report` en `e2e/` (n8n en `http://localhost:5678`, licencia community registrada) | `vyv/e2e/results/report/index.html` |
| `api` | `npm run test:newman` en `e2e/`: la colección de `api/` con el entorno local | consola, `vyv/e2e/results/newman/junit.xml` |

Sin la licencia community, las carpetas se pueden activar con el modo de pruebas de n8n: arranque n8n con `E2E_TESTS=true` y ejecute `curl -X PATCH -H 'content-type: application/json' -d '{"feature":"feat:folders","enabled":true}' http://localhost:5678/rest/e2e/feature`. Ese modo no envía la cabecera anti-clickjacking, así que la prueba de seguridad (BUG-018-06) se ejecuta sin él.

Cuatro casos necesitan una configuración extra. Sin ella, Cypress los marca como pendientes:

| Caso | Qué necesita | Cómo |
| --- | --- | --- |
| CP-WF-03-08 (reinicio) | Un comando que reinicie n8n y termine cuando n8n responda | `CYPRESS_restartCommand='docker restart n8n && until curl -sf http://localhost:5678/healthz/readiness; do sleep 2; done'` |
| CP-CR-01-07 (cifrado en la base) | La ruta del archivo SQLite de n8n | `CYPRESS_dbPath=~/.n8n/database.sqlite` |
| CP-EX-04-08 (cola de concurrencia) | n8n con límite de concurrencia | Arranque n8n con `N8N_CONCURRENCY_PRODUCTION_LIMIT=2` y ejecute `npx cypress run --spec executions/EX-04/*.cy.js` |
| CP-017-08 (límite de almacenamiento) | n8n con límite de 1 MB | `npm run n8n:storage-limit` y `npm run test:storage-limit` |

La prueba del límite de almacenamiento (CP-017-08) y la regresión antes/después tienen sus propios comandos. Consulte las secciones 4 y 5 de [`e2e/README.md`](e2e/README.md).

## Resultados

| Parte | Resultado | Fecha y versión |
| --- | --- | --- |
| `units` | 91 archivos, **264 pruebas en verde**, 21 `it.todo`; cobertura 52,6 % de líneas de los 74 módulos probados | 13/11/2026 · n8n 2.47.0 |
| `backend` | **64 pruebas en verde** (data-table 40, `folderNameSchema` 19, `FolderService.deleteFolder` 5) | 13/11/2026 · n8n 2.47.0 |
| `e2e` | **182 pruebas en Chromium: 180 aprobadas, 2 fallidas, 0 pendientes.** Las 2 fallidas son hallazgos: CP-CO-03-04 (separador «;») y CP-WF-01-08 (carga del lienzo de 100 nodos: mediana 3,57 s; la acción más lenta de zoom, 1 037 ms). Las 44 specs corrieron juntas con `CYPRESS_dbPath` y `CYPRESS_restartCommand`; después se repitieron aparte CP-EX-04-08 y CP-017-08, cada uno con su configuración de n8n, y sus resultados reemplazan a los de la corrida conjunta. Regresión frente a la línea base: 0 regresiones, 3 corregidas (CP-018-07, CP-018-08, BUG-018-05). Seguridad sin modo E2E: BUG-018-06 se confirma (no hay `X-Frame-Options` ni `frame-ancestors`). Evidencia: [`evidence/e2e/after/`](evidence/e2e/after/) | 14/11/2026 · n8n 2.47.0 desde esta rama, en modo `E2E_TESTS` con Folders activada; Chromium 1243 |
| `api` | **Newman: 40 peticiones y 62 aserciones, 0 fallidas.** Evidencia: [`evidence/api/`](evidence/api/) | 14/11/2026 · n8n 2.47.0 |
| `e2e` (antes) | 84 aprobadas, 3 fallidas (defectos reales), 1 pendiente. Evidencia: [`evidence/e2e/before/`](evidence/e2e/before/) | 08/11/2026 · n8n 2.46.6 publicado |

## Matriz de pruebas automatizadas por funcionalidad

Cada una de las 20 funcionalidades del plan tiene pruebas Cypress con escenarios de **éxito**, **alternativos** y de **error**, con aserciones sobre la respuesta, el estado guardado y la interfaz. La colección Newman ([`api/`](api/README.md)) repite por API los flujos principales de los 4 módulos. Las specs están en `e2e/<módulo>/<funcionalidad>/`; `.api` son pruebas de API con `cy.request`, `.ui` usan el navegador y `.feature` son Gherkin con Screenplay.

| Funcionalidad | Éxito | Alternativo | Error | Specs (`e2e/…`) | Newman |
| --- | --- | --- | --- | --- | --- |
| WF-01 Crear y editar | CP-WF-01-01, 01-07 | 01-02/01-05 eliminar y deshacer, 01-04 nodo desactivado, 01-08 100 nodos | workflow inexistente | `workflows/WF-01/canvas-edit.ui`, `large-workflow.ui` | 01-01 |
| WF-02 Ajustes | CP-WF-02-05/02-06 | 02-01 no guardar éxitos | 02-03 timeout, 02-04 workflow de error | `workflows/WF-02/settings.api` | — |
| WF-03 Publicar | CP-WF-03-02, 03-04 | 03-05 despublicar, 03-08 reinicio | 03-01 sin trigger, 03-03 ruta en conflicto | `workflows/WF-03/webhook-publish.api` | 03-01, 03-02 |
| WF-04 Historial | CP-WF-04-01, 04-03, 04-04/04-06 | 04-05 comparar versiones | 04-02 sin licencia (403), versión inexistente (404) | `workflows/WF-04/version-history.api` | 04-01, 04-02 |
| WF-05 Plantillas, importar y duplicar | CP-WF-05-03, 05-06 | 05-01 plantillas, 05-05 nombre de 128 y repetido | 05-04 URL inválida, 05-05 nombre vacío y de 129 | `workflows/WF-05/import-duplicate.api` | 05-04, 05-05 |
| EX-01 Lista de ejecuciones | CP-EX-01-01, 01-07 | 01-03 en espera, 01-04 en ejecución, 01-08 más de 1 000 | 01-02 nodo que falla | `executions/EX-01/execution-states.api`, `many-executions.api` | 01-01 |
| EX-02 Filtros | CP-EX-02-01, 02-02, 02-05 | 02-03 fechas límite, 02-04 filtros combinados | filtro mal formado, límite fuera de rango (400) | `executions/EX-02/filters.api` | 02-01 y errores |
| EX-03 Vista previa, reintento y eliminación | CP-EX-03-01, 03-03, 03-05 | 03-04 reintento original, 03-06 eliminar varias | 03-02 nodo con error, consultar una eliminada (hallazgo) | `executions/EX-03/preview-retry-delete.api` | 03-01, 03-05 |
| EX-04 Detener | CP-EX-04-02, 04-03 | 04-04 seleccionadas, 04-05 todas, 04-07/04-08 cola | detener una terminada (hallazgo) | `executions/EX-04/stop.api`, `concurrency-queue.api` | hallazgo |
| EX-05 Panel de logs | CP-EX-05-01, 05-02 | 05-04 ejecución hija | 05-03 nodo con error | `executions/EX-05/execution-log.api` | — |
| CR-01 Crear y probar | CP-CR-01-01, 01-03, 01-07 cifrado | 01-02 sin dato obligatorio, 01-06 nombre repetido | 01-04 clave incorrecta, 01-05 tipo inexistente, 01-08 nombre con HTML | `credentials/CR-01/create.api`, `html-name.ui`, `encryption-at-rest.api` | 01-01, 01-05 |
| CR-02 Editar y eliminar | CP-CR-02-01, 02-03/02-04, 02-05 | 02-07 eliminar sin uso | 02-08 eliminar en uso, credencial inexistente (404) | `credentials/CR-02/edit-delete.api`, `secret-exposure.api` | 02-03, 02-07 |
| CR-03 OAuth2 | CP-CR-03-01 | 03-04 scopes | 03-03 cancelar en el proveedor, credencial inexistente (404) | `credentials/CR-03/oauth2.api` | — |
| CR-04 Credenciales en nodos | CP-CR-04-01, 04-07, 04-08 | 04-02 solo el tipo requerido | 04-05 credencial inexistente, 04-06 sin credencial | `credentials/CR-04/node-credentials.api`, `credential-switch.api` | — |
| CR-05 Listado y permisos | CP-CR-05-01, 05-02, 05-03 | 05-01 término inexistente | 05-05 aislamiento (403), 05-06 sin licencia (403) | `credentials/CR-05/search-share.api`, `sort.ui`, `isolation.api` | 05-01, 05-06 |
| CO-01 Data tables | CP-016-01, 016-04, 016-06/07 | longitud 1 / 128, 016-05 nombres de columna válidos | 016-02 nombre vacío, 016-03 repetido (409), 129 caracteres, columna repetida | `core/CO-01/data-table-columns.api`, `data-tables.ui`, `create-data-table.feature` | CO-01-01, 01-03 |
| CO-02 Filas | CP-017-01, 017-06, 017-07, CO-02-08 nodo Data Table | 017-03 fechas ISO, 017-04 nulos | 017-02 tipo incompatible, 017-08 límite de almacenamiento | `core/CO-02/row-editing.api`, `data-table-rows.ui`, `data-table-node.api`, `storage-limit.api`, `row-editing.feature` | CO-02-01, 02-02 |
| CO-03 CSV | CP-018-01, 018-06, CO-03-05 10 000 filas | CO-03-04 BOM y tildes, sin encabezados | 018-02 no es CSV, 018-03 malformado, 018-04 tipos, 018-05 columnas, CO-03-04 «;» (hallazgo) | `core/CO-03/csv-import-export.api`, `csv-encoding-size.api`, `csv.ui`, `csv.feature` | CO-03-06 |
| CO-04 Carpetas | CP-019-01, 019-03, 019-04 | 019-05 migas de pan, 019-06 conteos | 019-02 nombres inválidos, 129 caracteres | `core/CO-04/folders-create-navigate.api`, `folders.ui`, `folders.feature` | CO-04-01, 04-03 |
| CO-05 Mover y eliminar | CP-020-01, 020-02, 020-04 | 020-05 eliminar sin transferir, carpeta vacía | 020-03 su propio padre, mover a un descendiente, transferir a sí misma | `core/CO-05/folders-move-delete.api`, `folders.ui`, `folders.feature` | CO-05-05 |

Además: seguridad OWASP (`core/security/owasp.cy.js`), accesibilidad WCAG (`core/accessibility/wcag.cy.js`) y regresión (`core/regression/regression-suite.cy.js`).

### Hallazgos de la ejecución del 14/11/2026

| Caso | Spec (`e2e/…`) | Resultado |
| --- | --- | --- |
| CP-WF-01-08 | `workflows/WF-01/large-workflow.ui.cy.js` | ❌ la carga del lienzo de 100 nodos tarda 3,57 s (mediana; límite 3 s) y la acción de zoom más lenta, 1 037 ms (límite 1 s). La referencia con 1 nodo tarda 2,73 s. Depende del equipo: repetir en el hardware del plan |
| CP-CO-03-04 | `core/CO-03/csv-encoding-size.api.cy.js` | ❌ un CSV con separador «;» (Excel en español) se importa en una sola columna, sin aviso |
| CP-EX-04 | `executions/EX-04/stop.api.cy.js` | ⚠️ detener una ejecución terminada responde 500 («Only running or waiting executions can be stopped»); lo esperado es un 4xx |
| CP-EX-03 | `executions/EX-03/preview-retry-delete.api.cy.js` | ⚠️ una ejecución eliminada o inexistente responde 200 con `{}`; lo esperado es 404 |
| CP-CR-01-02 | `credentials/CR-01/create.api.cy.js` | ℹ️ la API guarda una credencial sin sus campos obligatorios; solo el formulario los valida |
| CP-CR-02-08 | `credentials/CR-02/edit-delete.api.cy.js` | ✅ tras eliminar una credencial en uso, la ejecución falla con `CredentialNotFoundError` y n8n oculta el detalle (`credential_inaccessible`) |
| BUG-018-06 | `core/security/owasp.cy.js` (sin modo E2E) | ❌ no hay `X-Frame-Options` ni `frame-ancestors` |

**CP-CR-03-05 (manual).** Necesita una cuenta real de Google y la app OAuth2 de prueba, que no se pueden automatizar en el repositorio:

1. Cree una credencial Google Sheets OAuth2 y conéctela con la cuenta de prueba.
2. En la cuenta de Google: *Seguridad → Acceso de terceros*, quite la app de prueba.
3. Ejecute un workflow con el nodo Google Sheets que use esa credencial.
4. Resultado esperado: la ejecución falla y el error indica un problema de autorización o un token inválido. Guarde la captura del error como evidencia.

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
