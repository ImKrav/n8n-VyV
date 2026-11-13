# QA · Pruebas unitarias y TDD · Módulos 1–4

Alcance: las 5 funcionalidades de cada uno de estos módulos del documento *«n8n-VyV — Funcionalidades por módulo para QA»*:

| # | Módulo | Funcionalidades |
| --- | --- | --- |
| 1 | Workflows | WF-01 … WF-05 |
| 2 | Ejecuciones | EX-01 … EX-05 |
| 3 | Credenciales | CR-01 … CR-05 |
| 4 | Core: Data tables y carpetas | CO-01 … CO-05 |

**Resultado:** 50 archivos de prueba y **1090 pruebas, todas en verde**. 43 archivos (1055 pruebas) son pruebas del repo **reutilizadas tal cual**. 7 archivos (35 pruebas) son **nuevos** y cubren los componentes que no tenían ninguna prueba. La cobertura total del código seleccionado es **76,9 % de líneas**.

## Contenido de la carpeta

```
qa/
├── README.md            este informe
├── run-tests.sh         ejecuta la suite (nuevas + reutilizadas)
├── vitest.config.mts    extiende la config de Vitest de editor-ui
├── suite.mts            mapa funcionalidad → pruebas reutilizadas, y archivos medidos por la cobertura
├── unit/                pruebas nuevas, una por hueco detectado
│   ├── workflows/       WF-03, WF-05
│   ├── executions/      EX-02 (TDD), EX-04
│   ├── credentials/     CR-02
│   └── core/            CO-01, CO-05
└── evidence/            salidas reales de las ejecuciones
    ├── tdd-1-red.log        fase RED
    ├── tdd-2-green.log      fase GREEN
    ├── tdd-3-refactor.log   fase REFACTOR
    ├── full-run.log         suite completa con cobertura
    └── coverage-summary.json
```

## Cómo ejecutar

Requisito: dependencias instaladas y paquetes de los que depende editor-ui compilados (`pnpm install` y `pnpm build`).

```bash
./qa/run-tests.sh
```

```bash
./qa/run-tests.sh --coverage.enabled --maxWorkers=2
```

```bash
./qa/run-tests.sh CO-05
```

- El script crea `qa/node_modules` como enlace a `packages/frontend/editor-ui/node_modules`. Así las pruebas de `qa/` resuelven los mismos paquetes que editor-ui. Git ignora ese enlace.
- La raíz de Vitest es `packages/frontend/editor-ui`. Por eso se reutilizan su `setup.ts`, sus alias `@/…` y su entorno jsdom sin copiar nada.
- El informe HTML de cobertura queda en `qa/coverage/index.html` (Git lo ignora; se regenera con el segundo comando).
- El script sube el heap de Node a 8 GB porque `WorkflowSettings.test.ts` (reutilizada) agota el heap por defecto, también cuando se ejecuta con la config original del repo.

## 1. Demostración de TDD · EX-02 Filtros de ejecuciones

**Defecto.** En la lista de ejecuciones el usuario puede elegir una fecha de fin anterior a la de inicio: los dos `ElDatePicker` no lo impiden. `executionFilterToQueryFilter()` enviaba entonces `startedAfter > startedBefore` a la API, y la lista salía **siempre vacía**, sin ningún aviso. Es el caso «fin anterior al inicio» que el documento pide probar en EX-02.

**Mejora.** La función normaliza el rango: el extremo menor siempre va a `startedAfter`. Se corrige en la función compartida (la usa `executions.store.ts`), no en el componente.

Prueba: [`unit/executions/EX-02.executionFilterToQueryFilter.test.ts`](unit/executions/EX-02.executionFilterToQueryFilter.test.ts)

### 🔴 RED: la prueba falla antes de tocar el código

```
FAIL  EX-02 … > normaliza un rango invertido (fin anterior al inicio)
AssertionError: expected '2026-01-31T23:59:59.000Z' to be '2026-01-01T00:00:00.000Z'
FAIL  EX-02 … > normaliza un rango invertido cuando el date picker entrega objetos Date
AssertionError: expected '2026-01-31T23:59:59.000Z' to be '2026-01-01T00:00:00.000Z'

Tests  2 failed | 3 passed (5)
```

Fallan las 2 pruebas del comportamiento nuevo, por la razón esperada (el rango se envía invertido). Las 3 que pasan fijan el comportamiento que ya existía y que no se debe romper (rango válido, un solo extremo, sin fechas). Salida completa: [`evidence/tdd-1-red.log`](evidence/tdd-1-red.log).

### 🟢 GREEN: el cambio mínimo que hace pasar la prueba

```ts
if (
	filter.startDate &&
	filter.endDate &&
	new Date(filter.startDate).getTime() > new Date(filter.endDate).getTime()
) {
	queryFilter.startedAfter = filter.endDate;
	queryFilter.startedBefore = filter.startDate;
}
```

Se añadió debajo de las asignaciones existentes. Resultado: `68 passed (68)`: las 5 nuevas y las 63 de `executions.utils.test.ts`. Salida: [`evidence/tdd-2-green.log`](evidence/tdd-2-green.log).

### 🔵 REFACTOR: sin asignar dos veces

La versión GREEN asignaba las fechas y luego las sobrescribía. El refactor calcula el rango ordenado una sola vez:

```diff
-	if (filter.startDate) {
-		queryFilter.startedAfter = filter.startDate;
+	// The date pickers do not stop an end date before the start date, so swap an inverted range
+	const [startedAfter, startedBefore] =
+		filter.startDate && filter.endDate && new Date(filter.startDate) > new Date(filter.endDate)
+			? [filter.endDate, filter.startDate]
+			: [filter.startDate, filter.endDate];
+
+	if (startedAfter) {
+		queryFilter.startedAfter = startedAfter;
 }
-	if (filter.endDate) {
-		queryFilter.startedBefore = filter.endDate;
+	if (startedBefore) {
+		queryFilter.startedBefore = startedBefore;
 }
```

Después del refactor siguen en verde las 5 pruebas nuevas, `executions.utils.test.ts` (63), `ExecutionsFilter.test.ts` (27) y `executions.store.test.ts` (17), que llama a la función. Salida: [`evidence/tdd-3-refactor.log`](evidence/tdd-3-refactor.log).

Archivo cambiado: `packages/frontend/editor-ui/src/features/execution/executions/executions.utils.ts`. Es el único cambio fuera de `qa/`.

## 2. Cómo se aplican AAA, FIRST, aserciones fluidas y Test Doubles

### AAA (Arrange · Act · Assert)

Cada prueba nueva marca las tres fases con comentarios. Cuando el «Act» es el propio render, se marca como `// Arrange / Act`. En CO-05 una prueba repite «Act / Assert» para mostrar que el botón sigue deshabilitado con un texto parecido y se habilita solo con el exacto.

### FIRST

| Principio | Cómo se cumple |
| --- | --- |
| **F**ast | Sin red, sin base de datos y sin backend. Las 35 pruebas nuevas tardan ≈ 2,4 s en total; la mayor parte es render de Vue. |
| **I**ndependent | Cada prueba crea su propia Pinia (`createTestingPinia()`) y su propio render. Los mocks se limpian en `beforeEach` (`mockClear` / `mockReset`) y la config global usa `restoreMocks: true`. |
| **R**epeatable | Fechas fijas (`2026-01-01…`), datos fijos y sin `Date.now()`. Las respuestas de la API vienen de stubs. |
| **S**elf-validating | Solo aserciones `expect`. Nada de `console.log` ni revisión manual. |
| **T**imely | EX-02 se escribió antes del código (ver §1). Las demás cubren huecos de código existente; se validaron por mutación (ver §5). |

### Aserciones fluidas

Se usan los matchers encadenables de Vitest y de `@testing-library/jest-dom`, que se leen como frases:

```ts
expect(confirmButton()).toBeDisabled();
expect(query).not.toHaveProperty('startedAfter');
expect(uiStore.openModal).toHaveBeenCalledExactlyOnceWith(STOP_MANY_EXECUTIONS_MODAL_KEY);
expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
expect(container).toHaveTextContent('What should we do with the 2 folders and the 3 workflows in this folder?');
```

### Test Doubles

| Tipo | Dónde | Qué hace |
| --- | --- | --- |
| **Mock** | `useTelemetry` (EX-04, WF-05, CO-01), `useToast` (WF-05, CO-01, CO-05), `useWorkflowSaving` (WF-05), `vue-router` (CO-01) | `vi.mock` reemplaza el módulo. La prueba **verifica la interacción**: argumentos y número de llamadas (`toHaveBeenCalledExactlyOnceWith`). |
| **Stub** | Stores de Pinia con `createTestingPinia` (todas las de componentes) | Las acciones no ejecutan su lógica. Se les da una respuesta fija (`mockResolvedValue`, `mockRejectedValue`) para simular éxito, error 403 o nombre duplicado sin red. |
| **Stub** | Componente `Modal` (WF-05, CO-01, CO-05), `useRoute` (CO-01, CO-05) | `Modal` solo expone sus slots, sin teleport ni animaciones. `useRoute` entrega un `projectId` fijo. |
| **Fake** | `MoveToFolderDropdown` (CO-05) | Un botón que emite `location:selected` con la carpeta destino. Reemplaza un buscador real que necesitaría la API. |
| **Spy** | `vi.spyOn(eventBus, 'emit')` (WF-05, CO-05), `emitted()` del componente (CR-02) | Usan el objeto real y registran las llamadas para verificarlas. |
| **Dummy** | `execution(status)` en EX-04 | Ejecuciones mínimas: solo importa su `status`. |
| **Sin dobles** | EX-02, WF-03 | Función pura y componente de presentación: no hace falta ningún doble. |

## 3. Matriz de trazabilidad (20 funcionalidades)

Se reutilizaron las pruebas que ya existían junto al código, sin copiarlas ni reescribirlas (lista en [`suite.mts`](suite.mts)). Solo se escribieron pruebas nuevas donde el componente indicado en el documento no tenía ninguna.

| ID | Funcionalidad | Pruebas reutilizadas (`src/features/…`) | Pruebas nuevas (`qa/unit/…`) | Total |
| --- | --- | --- | --- | --- |
| WF-01 | Edición en el canvas | `Canvas` (94), `CanvasNode` (8), `CanvasEdgeToolbar` (9), `CanvasNodeStickyNote` (5) | — | 116 |
| WF-02 | Configuración del workflow | `WorkflowSettings` (109) | — | 109 |
| WF-03 | Publicar / activar | `WorkflowPublishModal` (11), `WorkflowActivationConflictingWebhookModal` (4) | `WF-03.WorkflowActivationErrorMessage` (2) | 17 |
| WF-04 | Historial y diff | `workflowHistory/utils` (18), `useWorkflowHistoryVersionOptions` (2), `useWorkflowDiff` (20) | — | 40 |
| WF-05 | Plantillas, importación y duplicado | `ImportWorkflowUrlModal` (6), `templateActions` (2), `templateTransforms` (8) | `WF-05.DuplicateWorkflowDialog` (5) | 21 |
| EX-01 | Lista de ejecuciones | `GlobalExecutionsList` (5), `WorkflowExecutionsSidebar` (7) | — | 12 |
| EX-02 | Filtros de ejecuciones | `ExecutionsFilter` (27), `executions.utils` (63) | `EX-02.executionFilterToQueryFilter` (5) · **TDD** | 95 |
| EX-03 | Vista previa, reintento y borrado | `WorkflowExecutionsPreview` (30) | — | 30 |
| EX-04 | Detener ejecuciones | `StopManyExecutionsModal` (2), `ConcurrentExecutionsHeader` (8) | `EX-04.ExecutionStopAllText` (5) | 15 |
| EX-05 | Panel de logs | `LogsPanel` (30), `LogDetailsPanel` (19) | — | 49 |
| CR-01 | Crear credencial | `CredentialTypeSelector` (5), `CredentialConfig` (52), `CredentialInputs` (10) | — | 67 |
| CR-02 | Editar, renombrar y eliminar | `CredentialEdit` (83) | `CR-02.TypeToConfirmDialog` (6) | 89 |
| CR-03 | OAuth2 | `ScopesNotice` (4), `useQuickConnect` (53) | — | 57 |
| CR-04 | Uso desde un nodo | `NodeCredentials` (138), `CredentialsSelect` (21), `CredentialPicker` (5) | — | 164 |
| CR-05 | Listado y compartir | `CredentialsView` (20), `CredentialCard` (36), `CredentialSharing.ee` (31) | — | 87 |
| CO-01 | Crear data table y columnas | `AddColumnButton` (19), `ColumnHeader` (9) | `CO-01.AddDataTableModal` (5) | 33 |
| CO-02 | Edición de filas | `DataTableTable` (11), `AddRowButton` (1) | — | 12 |
| CO-03 | Importar y exportar CSV | `ImportCsvModal` (15), `DownloadDataTableModal` (4) | — | 19 |
| CO-04 | Crear y navegar carpetas | `FolderCard` (10), `FolderBreadcrumbs` (6) | — | 16 |
| CO-05 | Mover y eliminar carpetas | `MoveToFolderModal` (35) | `CO-05.DeleteFolderModal` (7) | 42 |
| | **Total** | **43 archivos · 1055 pruebas** | **7 archivos · 35 pruebas** | **1090** |

### Casos de las pruebas nuevas

| Archivo | Casos |
| --- | --- |
| `EX-02` | rango válido sin cambios · rango invertido (strings) · rango invertido (`Date` del date picker) · solo fecha de fin · sin fechas |
| `EX-04` | oculto si nada se puede detener · visible con `running`, `waiting` o `new` · el clic abre el modal y registra telemetría |
| `CR-02` | botón deshabilitado sin texto · palabra con otras mayúsculas · palabra exacta con espacios · tecla Enter · sin confirmar mientras carga · cancelar |
| `WF-03` | texto genérico + detalle del servidor · el HTML del servidor se escapa |
| `WF-05` | propone un nombre único (nombre repetido) · rechaza nombre vacío o con solo espacios · duplica con el nombre recortado y webhooks nuevos · copia un workflow guardado sin `id`, `active` ni `parentFolder` · error 403 |
| `CO-01` | «Create» deshabilitado con nombre vacío · crea desde cero y navega al detalle · crea con Enter · error del servidor (nombre duplicado) sin cerrar ni navegar · cancelar |
| `CO-05` | título y conteo de contenido · deshabilitado sin elegir acción · texto «delete <nombre>» exacto · borrar y notificar a la lista · transferir a otra carpeta · transferir a la raíz del proyecto · error de la API |

## 4. Resultados

Ejecución final (`./qa/run-tests.sh --coverage.enabled --maxWorkers=2`, salida completa en [`evidence/full-run.log`](evidence/full-run.log)):

```
Test Files  50 passed (50)
     Tests  1090 passed (1090)
```

## 5. Cobertura del código seleccionado

El «código seleccionado» son los 38 archivos de producción que el documento indica para estas 20 funcionalidades (lista `selectedSources` en [`suite.mts`](suite.mts)). Proveedor: V8.

| Total | Sentencias | Ramas | Funciones | Líneas |
| --- | --- | --- | --- | --- |
| **38 archivos** | **76,24 %** (3857/5059) | **68,93 %** (2434/3531) | **71,19 %** (1152/1618) | **76,89 %** (3625/4714) |

### Archivos que cubren las pruebas nuevas (antes: sin ninguna prueba)

| Archivo | Líneas | Ramas |
| --- | --- | --- |
| `execution/executions/components/ExecutionStopAllText.vue` | 100 % | 100 % |
| `workflows/components/WorkflowActivationErrorMessage.vue` | 100 % | 100 % |
| `core/folders/components/DeleteFolderModal.vue` | 93,3 % | 71,9 % |
| `workflows/components/DuplicateWorkflowDialog.vue` | 89,4 % | 52,9 % |
| `credentials/components/CredentialEdit/TypeToConfirmDialog.vue` | 88,9 % | 80,0 % |
| `core/dataTable/components/AddDataTableModal.vue` | 46,8 % | 15,9 % |
| `execution/executions/executions.utils.ts` (TDD; las pruebas recorren las dos ramas del bloque cambiado) | 78,4 % | 73,5 % |

`AddDataTableModal.vue` queda bajo porque las pruebas nuevas cubren solo «crear desde cero» (CO-01). La rama «importar CSV» de ese modal pertenece a CO-03.

### Detalle por archivo

| Archivo (`src/features/…`) | Sent. % | Ramas % | Func. % | Líneas % |
| --- | --- | --- | --- | --- |
| workflows/canvas/components/Canvas.vue | 60,22 | 57,04 | 50,56 | 61,25 |
| workflows/canvas/components/elements/nodes/CanvasNode.vue | 76,59 | 61,70 | 54,76 | 75,00 |
| workflows/canvas/components/elements/edges/CanvasEdgeToolbar.vue | 93,33 | 100 | 83,33 | 92,85 |
| workflows/canvas/components/elements/nodes/render-types/CanvasNodeStickyNote.vue | 78,26 | 37,50 | 66,66 | 80,00 |
| workflows/components/WorkflowSettings/WorkflowSettings.vue | 80,86 | 76,29 | 72,68 | 80,83 |
| workflows/components/WorkflowPublishModal.vue | 78,21 | 72,46 | 75,75 | 78,12 |
| workflows/components/WorkflowActivationConflictingWebhookModal.vue | 96,66 | 100 | 91,66 | 96,66 |
| workflows/components/WorkflowActivationErrorMessage.vue | 100 | 100 | 100 | 100 |
| workflows/workflowHistory/utils.ts | 80,00 | 46,15 | 66,66 | 78,57 |
| workflows/workflowDiff/useWorkflowDiff.ts | 97,91 | 90,62 | 100 | 98,92 |
| workflows/components/ImportWorkflowUrlModal.vue | 90,00 | 83,33 | 88,88 | 90,00 |
| workflows/components/DuplicateWorkflowDialog.vue | 89,39 | 52,94 | 61,53 | 89,39 |
| execution/executions/components/global/GlobalExecutionsList.vue | 53,54 | 50,68 | 64,10 | 54,03 |
| execution/executions/components/workflow/WorkflowExecutionsSidebar.vue | 60,31 | 55,81 | 57,69 | 58,33 |
| execution/executions/components/ExecutionsFilter.vue | 86,72 | 92,30 | 77,19 | 86,11 |
| execution/executions/executions.utils.ts | 79,61 | 73,48 | 91,66 | 78,37 |
| execution/executions/components/workflow/WorkflowExecutionsPreview.vue | 69,62 | 62,38 | 70,00 | 71,54 |
| execution/executions/components/StopManyExecutionsModal.vue | 66,00 | 51,72 | 77,77 | 66,00 |
| execution/executions/components/ExecutionStopAllText.vue | 100 | 100 | 100 | 100 |
| execution/logs/components/LogsPanel.vue | 83,87 | 54,28 | 66,66 | 82,75 |
| execution/logs/components/LogDetailsPanel.vue | 87,14 | 90,47 | 78,04 | 85,48 |
| credentials/components/CredentialEdit/CredentialTypeSelector.vue | 87,50 | 85,71 | 80,00 | 85,71 |
| credentials/components/CredentialEdit/CredentialEdit.vue | 77,28 | 72,62 | 85,84 | 78,60 |
| credentials/components/CredentialEdit/TypeToConfirmDialog.vue | 86,36 | 80,00 | 83,33 | 88,88 |
| credentials/components/ScopesNotice.vue | 100 | 50,00 | 100 | 100 |
| credentials/components/NodeCredentials.vue | 85,69 | 79,05 | 87,35 | 86,66 |
| credentials/components/CredentialsSelect.vue | 86,20 | 78,00 | 78,57 | 85,71 |
| credentials/views/CredentialsView.vue | 81,61 | 60,46 | 69,76 | 81,60 |
| credentials/components/CredentialCard.vue | 86,74 | 81,13 | 92,59 | 87,17 |
| core/dataTable/components/AddDataTableModal.vue | 42,78 | 15,87 | 24,52 | 46,78 |
| core/dataTable/components/dataGrid/AddColumnButton.vue | 88,46 | 77,19 | 92,59 | 89,18 |
| core/dataTable/components/dataGrid/DataTableTable.vue | 63,76 | 45,45 | 34,61 | 63,07 |
| core/dataTable/components/ImportCsvModal.vue | 90,29 | 75,92 | 82,75 | 92,47 |
| core/dataTable/components/DownloadDataTableModal.vue | 100 | 100 | 100 | 100 |
| core/folders/components/FolderCard.vue | 72,28 | 50,98 | 77,14 | 72,15 |
| core/folders/components/FolderBreadcrumbs.vue | 62,02 | 48,33 | 50,00 | 61,84 |
| core/folders/components/MoveToFolderModal.vue | 95,40 | 83,82 | 91,07 | 95,32 |
| core/folders/components/DeleteFolderModal.vue | 92,30 | 71,92 | 91,66 | 93,33 |

### Las pruebas nuevas detectan fallos (prueba de mutación)

Para comprobar que las pruebas escritas sobre código existente no pasan «por casualidad», se rompió el código a propósito y luego se revirtió:

| Mutación en `DuplicateWorkflowDialog.vue` | Resultado |
| --- | --- |
| Quitar `.trim()` del nombre y poner `resetWebhookUrls: false` | 2 pruebas fallan: «rechaza un nombre vacío…» y «duplica con el nombre recortado…» |

## 6. Hallazgos para el equipo

| # | Funcionalidad | Hallazgo | Estado |
| --- | --- | --- | --- |
| 1 | EX-02 | Un rango de fechas invertido devolvía siempre una lista vacía. | **Corregido con TDD** (§1). |
| 2 | CO-01 | `AddDataTableModal` acepta un nombre con solo espacios: la guarda es `!dataTableName` y `"   "` no es vacío. No se probó si el backend lo rechaza. | Abierto. Candidato para el próximo ciclo TDD. |
| 3 | CO-05 | `DeleteFolderModal` pone `data-test-id="delete-data-input"` en el `div` y también en el campo. `getByTestId` encuentra dos elementos. | Abierto. La prueba usa un selector CSS como solución. |
| 4 | WF-02 | `WorkflowSettings.test.ts` (existente) agota el heap por defecto de Node a las ~95 de 109 pruebas, también con la config original. Con 8 GB pasan las 109. | Abierto. `run-tests.sh` sube el heap. |

## 7. Limitaciones

- Son pruebas unitarias y de componente (Vitest + jsdom). No sustituyen las E2E de `packages/quality/testing/playwright/`.
- Las funciones 🔑 (compartir credenciales, filtros avanzados, etc.) se prueban con stores simulados, no con una licencia real.
- La cobertura mide solo los 38 archivos seleccionados, no todo editor-ui.
