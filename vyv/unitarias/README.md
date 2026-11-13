# VyV · Suite unitaria del editor · Módulos 1–4

Esta carpeta contiene la suite unitaria que ejecuta el **plan de pruebas de n8n-VyV** (carpeta «Final VyV»: `PLAN DE PRUEBAS.docx`, `CASOS Y ESCENARIOS DE PRUEBAS.xlsx` y `MATRIZ DE TRAZABILIDAD.xlsx`). El sistema bajo prueba es **n8n 2.47.0 (commit `01bd57cdd`)**, la versión que congela el plan.

**Resultado (n8n 2.47.0):** 91 archivos y **263 pruebas en verde**, más **21 `it.todo`** para los casos sin equivalente unitario. Los **142 casos** del plan (CP-WF-01-01 … CP-CO-05-08) aparecen en la suite: 122 con pruebas y 20 solo como `todo` con su motivo.

| | Pruebas |
| --- | ---: |
| Movidas desde el repositorio (quitadas de su archivo original) | 169 |
| Nuevas (no existían) | 94 |
| `it.todo` (sin equivalente unitario) | 21 |

## Estructura

```
vyv/unitarias/
├── README.md            este informe
├── run-tests.sh         ejecuta la suite
├── vitest.config.mts    extiende la config de Vitest de editor-ui; incluye solo vyv/unitarias/unit
├── suite.mts            módulos de producción medidos por la cobertura
├── unit/
│   ├── workflows/WF-01 … WF-05/        un archivo por archivo de origen, un describe por CP
│   ├── executions/EX-01 … EX-05/
│   ├── credentials/CR-01 … CR-05/
│   ├── core/CO-01 … CO-05/
│   └── <módulo>/sin-equivalente-unitario.test.ts   casos del plan que solo admiten E2E / integración
└── evidence/            salidas reales: ciclos TDD, ejecución completa y cobertura
```

Cada prueba está dentro de un `describe('CP-XX-NN-MM · <caso del plan>')`, así el informe de Vitest se lee como la matriz de trazabilidad.

## Cómo se construyó

- **Pruebas movidas.** Para cada caso se buscó la prueba de editor-ui que verifica la misma condición. Esa prueba se **movió** a `vyv/unitarias/` sin reescribirla, con la preparación que necesita (imports, `vi.mock`, `beforeEach` y helpers del archivo original), y se **borró de su archivo original**. La cabecera de cada archivo indica su origen (`Origen: …`). Dos archivos de origen quedaron vacíos y se borraron (`ScopesNotice.test.ts`, `StopManyExecutionsModal.test.ts`).
- **Pruebas nuevas.** Donde no existía prueba se escribió una nueva, con AAA, FIRST, aserciones fluidas y dobles de prueba (mock, stub, fake, spy, dummy). En los archivos mixtos, las nuevas van después del comentario «Pruebas nuevas (no existían en el repositorio)».
- **Sin equivalente unitario.** Rendimiento, reinicio del servidor, base de datos, OAuth con un proveedor real, permisos entre usuarios y análisis del CSV en el servidor quedan como `it.todo` con el motivo. Se cubren con las pruebas de sistema del plan.

## Cómo ejecutar

Requisitos: `pnpm install` y compilar las dependencias de editor-ui (`pnpm --filter 'n8n-editor-ui^...' run build`).

```bash
./vyv/unitarias/run-tests.sh
```

```bash
./vyv/unitarias/run-tests.sh --coverage.enabled --maxWorkers=2
```

```bash
./vyv/unitarias/run-tests.sh CO-05
```

El informe HTML de cobertura queda en `vyv/unitarias/coverage/index.html` (Git lo ignora). El script crea `vyv/unitarias/node_modules` como enlace a los paquetes de editor-ui y sube el heap de Node a 8 GB.

## TDD

Se hicieron dos ciclos rojo → verde → refactor con evidencia en `evidence/`:

| Caso | Defecto | Rojo | Verde / refactor |
| --- | --- | --- | --- |
| CP-EX-02-03 | Un rango de fechas invertido (fin antes que inicio) devolvía siempre una lista vacía. | `tdd-1-red.log`: 2 fallan | `executions.utils.ts` ordena el rango (`tdd-2-green.log`, `tdd-3-refactor.log`) |
| CP-CO-01-02 | Un nombre de data table con solo espacios habilitaba «Create» y Enter creaba la tabla. | `tdd-co01-1-red.log`: 2 fallan | `AddDataTableModal.vue` exige un nombre no vacío tras `trim()` (`tdd-co01-2-green.log`, `tdd-co01-3-refactor.log`) |

Los logs TDD se generaron cuando la suite estaba en `qa/` (antes de unirla con `vyv/`), por eso muestran rutas `qa/unit/…`; la prueba de EX-02 estaba en `qa/unit/executions/EX-02.executionFilterToQueryFilter.test.ts` y hoy está en `vyv/unitarias/unit/executions/EX-02/executionFilterToQueryFilter.test.ts`. En CO-01, la corrección final es la equivalente que también hizo MarioFer299 (`trimmedName`, BUG-016-01 en `vyv/datatables-carpetas/`), y las pruebas la verifican.

## Matriz: 142 casos del plan

### 1. Workflows

| CP | Caso del plan | Movidas | Nuevas | Estado | Archivos (`vyv/unitarias/unit/…`) |
| --- | --- | ---: | ---: | --- | --- |
| CP-WF-01-01 | Añadir un trigger y un nodo y conectarlos | 2 | 0 | ✅ | `workflows/WF-01/useCanvasOperations.test.ts` |
| CP-WF-01-02 | Mover y eliminar nodos | 3 | 0 | ✅ | `workflows/WF-01/useCanvasOperations.test.ts` |
| CP-WF-01-03 | Rechazar conexión entre tipos incompatibles | 3 | 0 | ✅ | `workflows/WF-01/useCanvasOperations.test.ts` |
| CP-WF-01-04 | Nodo desactivado no se ejecuta | 3 | 0 | ✅ | `workflows/WF-01/CanvasNodeDefault.test.ts`, `workflows/WF-01/useCanvasOperations.test.ts` |
| CP-WF-01-05 | Deshacer y rehacer una secuencia de 10 acciones | 4 | 0 | ✅ | `workflows/WF-01/useHistoryHelper.test.ts` |
| CP-WF-01-06 | Copiar y pegar nodos entre workflows | 3 | 0 | ✅ | `workflows/WF-01/useCanvasOperations.test.ts` |
| CP-WF-01-07 | Nota adhesiva con color persistente | 2 | 0 | ✅ | `workflows/WF-01/CanvasNodeStickyColorSelector.test.ts`, `workflows/WF-01/CanvasNodeToolbar.test.ts` |
| CP-WF-01-08 | Rendimiento del lienzo con 100 nodos | 0 | 0 | ⏳ sin equivalente unitario | `workflows/sin-equivalente-unitario.test.ts` |
| CP-WF-02-01 | No guardar ejecuciones exitosas de producción | 0 | 2 | ✅ | `workflows/WF-02/WorkflowSettings.test.ts` |
| CP-WF-02-02 | No guardar ejecuciones manuales | 0 | 1 | ✅ | `workflows/WF-02/WorkflowSettings.test.ts` |
| CP-WF-02-03 | Timeout en sus valores límite | 0 | 5 | ✅ | `workflows/WF-02/WorkflowSettings.test.ts` |
| CP-WF-02-04 | Workflow de error se dispara ante un fallo | 2 | 0 | ✅ | `workflows/WF-02/WorkflowSettings.test.ts` |
| CP-WF-02-05 | Zona horaria del workflow | 0 | 1 | ✅ | `workflows/WF-02/WorkflowSettings.test.ts` |
| CP-WF-02-06 | Ajustes persisten tras recargar | 1 | 1 | ✅ | `workflows/WF-02/WorkflowSettings.test.ts` |
| CP-WF-03-01 | Publicar sin nodo trigger | 3 | 0 | ✅ | `workflows/WF-03/WorkflowHeaderDraftPublishActions.test.ts`, `workflows/WF-03/WorkflowPublishModal.test.ts` |
| CP-WF-03-02 | Publicar workflow con Webhook y responder en producción | 0 | 0 | ⏳ sin equivalente unitario | `workflows/sin-equivalente-unitario.test.ts` |
| CP-WF-03-03 | Conflicto de webhook con otro workflow activo | 2 | 0 | ✅ | `workflows/WF-03/WorkflowActivationConflictingWebhookModal.test.ts`, `workflows/WF-03/WorkflowPublishModal.test.ts` |
| CP-WF-03-04 | Mismo path con distinto método HTTP | 0 | 0 | ⏳ sin equivalente unitario | `workflows/sin-equivalente-unitario.test.ts` |
| CP-WF-03-05 | Despublicar detiene el trigger | 2 | 0 | ✅ | `workflows/WF-03/WorkflowCard.test.ts`, `workflows/WF-03/useWorkflowActivate.test.ts` |
| CP-WF-03-06 | Publicar con credencial inválida | 1 | 2 | ✅ | `workflows/WF-03/WorkflowActivationErrorMessage.test.ts`, `workflows/WF-03/WorkflowPublishModal.test.ts` |
| CP-WF-03-07 | Cambios posteriores a la publicación | 1 | 0 | ✅ | `workflows/WF-03/WorkflowHeaderDraftPublishActions.test.ts` |
| CP-WF-03-08 | Publicación persiste tras reiniciar la instancia | 0 | 0 | ⏳ sin equivalente unitario | `workflows/sin-equivalente-unitario.test.ts` |
| CP-WF-04-01 | Cada guardado genera una versión | 2 | 0 | ✅ | `workflows/WF-04/WorkflowHistoryList.test.ts`, `workflows/WF-04/workflowHistory.store.test.ts` |
| CP-WF-04-02 | Nombrar una versión | 4 | 0 | ✅ | `workflows/WF-04/WorkflowHistory.test.ts`, `workflows/WF-04/WorkflowVersionFormModal.test.ts`, `workflows/WF-04/workflowHistory.store.test.ts` |
| CP-WF-04-03 | Restaurar una versión anterior | 1 | 0 | ✅ | `workflows/WF-04/workflowHistory.store.test.ts` |
| CP-WF-04-04 | Clonar una versión a un workflow nuevo | 1 | 0 | ✅ | `workflows/WF-04/WorkflowHistory.test.ts` |
| CP-WF-04-05 | Comparar dos versiones (diff) | 3 | 0 | ✅ | `workflows/WF-04/useWorkflowDiff.test.ts` |
| CP-WF-04-06 | Descargar una versión como JSON importable | 1 | 0 | ✅ | `workflows/WF-04/WorkflowHistory.test.ts` |
| CP-WF-05-01 | Buscar y filtrar plantillas | 0 | 4 | ✅ | `workflows/WF-05/templates.store.test.ts` |
| CP-WF-05-02 | Configurar credenciales al usar una plantilla | 2 | 0 | ✅ | `workflows/WF-05/setupTemplate.store.test.ts` |
| CP-WF-05-03 | Importar workflow desde URL válida | 2 | 0 | ✅ | `workflows/WF-05/ImportWorkflowUrlModal.test.ts` |
| CP-WF-05-04 | Importar desde URL inválida o con JSON no válido | 2 | 0 | ✅ | `workflows/WF-05/ImportWorkflowUrlModal.test.ts`, `workflows/WF-05/useCanvasOperations.test.ts` |
| CP-WF-05-05 | Duplicar con nombre vacío, repetido y muy largo | 0 | 4 | ✅ | `workflows/WF-05/DuplicateWorkflowDialog.test.ts` |
| CP-WF-05-06 | El duplicado es independiente y conserva etiquetas | 0 | 2 | ✅ | `workflows/WF-05/DuplicateWorkflowDialog.test.ts` |

### 2. Ejecuciones

| CP | Caso del plan | Movidas | Nuevas | Estado | Archivos (`vyv/unitarias/unit/…`) |
| --- | --- | ---: | ---: | --- | --- |
| CP-EX-01-01 | Ejecución exitosa con estado y duración | 1 | 2 | ✅ | `executions/EX-01/GlobalExecutionsListItem.test.ts` |
| CP-EX-01-02 | Ejecución fallida | 0 | 2 | ✅ | `executions/EX-01/GlobalExecutionsListItem.test.ts` |
| CP-EX-01-03 | Ejecución en espera (Wait) | 1 | 1 | ✅ | `executions/EX-01/GlobalExecutionsListItem.test.ts` |
| CP-EX-01-04 | Ejecución en curso | 2 | 1 | ✅ | `executions/EX-01/GlobalExecutionsListItem.test.ts` |
| CP-EX-01-05 | Carga incremental con más de 50 ejecuciones | 5 | 0 | ✅ | `executions/EX-01/GlobalExecutionsList.test.ts`, `executions/EX-01/WorkflowExecutionsSidebar.test.ts`, `executions/EX-01/executions.store.test.ts` |
| CP-EX-01-06 | Actualización automática de la lista | 1 | 2 | ✅ | `executions/EX-01/executions.store.test.ts` |
| CP-EX-01-07 | Coherencia entre lista global y por workflow | 1 | 0 | ✅ | `executions/EX-01/executions.store.test.ts` |
| CP-EX-01-08 | Rendimiento con más de 1 000 ejecuciones | 0 | 0 | ⏳ sin equivalente unitario | `executions/sin-equivalente-unitario.test.ts` |
| CP-EX-02-01 | Filtrar por cada estado | 1 | 6 | ✅ | `executions/EX-02/executionFilterToQueryFilter.test.ts`, `executions/EX-02/executions.utils.test.ts` |
| CP-EX-02-02 | Filtrar por workflow | 0 | 2 | ✅ | `executions/EX-02/executionFilterToQueryFilter.test.ts` |
| CP-EX-02-03 | Rango de fechas: mismo día, invertido y futuro | 0 | 7 | ✅ | `executions/EX-02/executionFilterToQueryFilter.test.ts` |
| CP-EX-02-04 | Combinación de filtros | 0 | 1 | ✅ | `executions/EX-02/executionFilterToQueryFilter.test.ts` |
| CP-EX-02-05 | Limpiar filtros | 1 | 0 | ✅ | `executions/EX-02/ExecutionsFilter.test.ts` |
| CP-EX-02-06 | Filtro de fechas con zona horaria distinta a UTC | 0 | 1 | ✅ | `executions/EX-02/executionFilterToQueryFilter.test.ts` |
| CP-EX-03-01 | Vista previa de ejecución exitosa | 2 | 0 | ✅ | `executions/EX-03/ExecutionPreviewHost.test.ts` |
| CP-EX-03-02 | Vista previa de ejecución fallida | 2 | 0 | ✅ | `executions/EX-03/executions.utils.test.ts` |
| CP-EX-03-03 | Reintentar con la versión actual | 2 | 0 | ✅ | `executions/EX-03/GlobalExecutionsList.test.ts`, `executions/EX-03/GlobalExecutionsListItem.test.ts` |
| CP-EX-03-04 | Reintentar con la versión original | 1 | 0 | ✅ | `executions/EX-03/WorkflowExecutionsCard.test.ts` |
| CP-EX-03-05 | Eliminar una ejecución con confirmación | 1 | 2 | ✅ | `executions/EX-03/GlobalExecutionsList.test.ts`, `executions/EX-03/GlobalExecutionsListItem.test.ts` |
| CP-EX-03-06 | Eliminar varias ejecuciones seleccionadas | 2 | 1 | ✅ | `executions/EX-03/GlobalExecutionsList.test.ts`, `executions/EX-03/executions.store.test.ts` |
| CP-EX-03-07 | Depurar en el editor (con licencia) | 2 | 0 | ✅ | `executions/EX-03/useExecutionDebugging.test.ts` |
| CP-EX-03-08 | Depurar en el editor sin licencia | 5 | 0 | ✅ | `executions/EX-03/WorkflowExecutionsPreview.test.ts` |
| CP-EX-04-01 | Detener una ejecución desde el editor | 2 | 0 | ✅ | `executions/EX-04/NodeExecuteButton.test.ts`, `executions/EX-04/useExecutionCommands.test.ts` |
| CP-EX-04-02 | Detener una ejecución desde la lista | 1 | 0 | ✅ | `executions/EX-04/GlobalExecutionsListItem.test.ts` |
| CP-EX-04-03 | Detener una ejecución en espera | 0 | 2 | ✅ | `executions/EX-04/GlobalExecutionsListItem.test.ts` |
| CP-EX-04-04 | Detener varias ejecuciones seleccionadas | 2 | 0 | ✅ | `executions/EX-04/StopManyExecutionsModal.test.ts` |
| CP-EX-04-05 | Detener todas las ejecuciones en curso | 0 | 5 | ✅ | `executions/EX-04/ExecutionStopAllText.test.ts` |
| CP-EX-04-06 | Detener la espera de un webhook de prueba | 2 | 0 | ✅ | `executions/EX-04/NodeExecuteButton.test.ts`, `executions/EX-04/useNodeExecution.test.ts` |
| CP-EX-04-07 | Ejecuciones excedentes quedan en cola | 2 | 0 | ✅ | `executions/EX-04/ConcurrentExecutionsHeader.test.ts`, `executions/EX-04/GlobalExecutionsListItem.test.ts` |
| CP-EX-04-08 | La cola se procesa al liberar capacidad | 0 | 0 | ⏳ sin equivalente unitario | `executions/sin-equivalente-unitario.test.ts` |
| CP-EX-05-01 | Orden de los nodos en el árbol | 2 | 0 | ✅ | `executions/EX-05/LogsOverviewPanel.test.ts`, `executions/EX-05/logs.utils.test.ts` |
| CP-EX-05-02 | Detalle de entrada y salida de un nodo | 2 | 0 | ✅ | `executions/EX-05/LogDetailsPanel.test.ts`, `executions/EX-05/LogsPanel.test.ts` |
| CP-EX-05-03 | Detalle de un nodo con error | 2 | 0 | ✅ | `executions/EX-05/LogsViewRunData.test.ts`, `executions/EX-05/logs.utils.test.ts` |
| CP-EX-05-04 | Abrir una sub-ejecución | 2 | 0 | ✅ | `executions/EX-05/logs.utils.test.ts`, `executions/EX-05/useLogsExecutionData.test.ts` |
| CP-EX-05-05 | Atajos de teclado del panel | 2 | 0 | ✅ | `executions/EX-05/LogsPanel.test.ts` |
| CP-EX-05-06 | Conteo de tokens con un nodo de IA | 1 | 0 | ✅ | `executions/EX-05/logs.utils.test.ts` |

### 3. Credenciales

| CP | Caso del plan | Movidas | Nuevas | Estado | Archivos (`vyv/unitarias/unit/…`) |
| --- | --- | ---: | ---: | --- | --- |
| CP-CR-01-01 | Crear credencial Header Auth válida | 1 | 0 | ✅ | `credentials/CR-01/CredentialEdit.test.ts` |
| CP-CR-01-02 | Campo obligatorio vacío | 2 | 0 | ✅ | `credentials/CR-01/CredentialConfig.test.ts`, `credentials/CR-01/CredentialInputs.test.ts` |
| CP-CR-01-03 | Prueba de conexión exitosa | 1 | 0 | ✅ | `credentials/CR-01/CredentialEdit.test.ts` |
| CP-CR-01-04 | Prueba de conexión fallida | 1 | 0 | ✅ | `credentials/CR-01/CredentialEdit.test.ts` |
| CP-CR-01-05 | Búsqueda de tipo sin resultados | 0 | 2 | ✅ | `credentials/CR-01/CredentialsSelectModal.test.ts` |
| CP-CR-01-06 | Nombre de credencial duplicado | 0 | 2 | ✅ | `credentials/CR-04/useNodeHelpers.test.ts` |
| CP-CR-01-07 | Secretos cifrados en la base de datos | 0 | 0 | ⏳ sin equivalente unitario | `credentials/sin-equivalente-unitario.test.ts` |
| CP-CR-01-08 | Nombre con HTML no se ejecuta | 2 | 0 | ✅ | `credentials/CR-01/CredentialCard.test.ts` |
| CP-CR-02-01 | Editar un valor sin romper los workflows | 1 | 0 | ✅ | `credentials/CR-02/CredentialEdit.test.ts` |
| CP-CR-02-02 | Secretos no visibles al reabrir | 2 | 0 | ✅ | `credentials/CR-02/TemplatedAuthSimpleView.test.ts` |
| CP-CR-02-03 | Secretos no expuestos por la API | 0 | 0 | ⏳ sin equivalente unitario | `credentials/sin-equivalente-unitario.test.ts` |
| CP-CR-02-04 | Exportar un workflow no incluye secretos | 0 | 0 | ⏳ sin equivalente unitario | `credentials/sin-equivalente-unitario.test.ts` |
| CP-CR-02-05 | Renombrar una credencial | 1 | 0 | ✅ | `credentials/CR-02/NodeCredentials.test.ts` |
| CP-CR-02-06 | Eliminar con texto de confirmación incorrecto | 0 | 2 | ✅ | `credentials/CR-02/TypeToConfirmDialog.test.ts` |
| CP-CR-02-07 | Eliminar con texto de confirmación correcto | 0 | 4 | ✅ | `credentials/CR-02/TypeToConfirmDialog.test.ts` |
| CP-CR-02-08 | Eliminar una credencial en uso | 0 | 1 | ✅ | `credentials/CR-04/useNodeHelpers.test.ts` |
| CP-CR-03-01 | URL de redirección correcta | 2 | 0 | ✅ | `credentials/CR-03/CredentialConfig.test.ts` |
| CP-CR-03-02 | Autorización exitosa | 1 | 0 | ✅ | `credentials/CR-03/CredentialCard.test.ts` |
| CP-CR-03-03 | Cancelar el consentimiento | 3 | 0 | ✅ | `credentials/CR-03/CredentialCard.test.ts`, `credentials/CR-03/useCredentialOAuth.test.ts` |
| CP-CR-03-04 | Scopes mostrados coinciden con los solicitados | 0 | 3 | ✅ | `credentials/CR-03/ScopesNotice.test.ts` |
| CP-CR-03-05 | Token revocado produce error al ejecutar | 0 | 0 | ⏳ sin equivalente unitario | `credentials/sin-equivalente-unitario.test.ts` |
| CP-CR-03-06 | Reconectar tras revocación | 1 | 0 | ✅ | `credentials/CR-03/useCredentialOAuth.test.ts` |
| CP-CR-04-01 | Seleccionar una credencial existente | 1 | 0 | ✅ | `credentials/CR-04/NodeCredentials.test.ts` |
| CP-CR-04-02 | Solo se listan credenciales compatibles | 2 | 0 | ✅ | `credentials/CR-04/CredentialPicker.test.ts` |
| CP-CR-04-03 | Crear credencial desde el nodo | 1 | 0 | ✅ | `credentials/CR-04/NodeCredentials.test.ts` |
| CP-CR-04-04 | Asignación automática de la única credencial | 1 | 0 | ✅ | `credentials/CR-04/NodeCredentials.test.ts` |
| CP-CR-04-05 | Importar workflow con credencial inexistente | 0 | 2 | ✅ | `credentials/CR-04/useNodeHelpers.test.ts` |
| CP-CR-04-06 | Ejecutar un nodo sin credencial asignada | 1 | 0 | ✅ | `credentials/CR-04/useNodeHelpers.test.ts` |
| CP-CR-04-07 | Cambiar la credencial de un nodo | 1 | 0 | ✅ | `credentials/CR-04/NodeCredentials.test.ts` |
| CP-CR-04-08 | La ejecución usa la credencial nueva | 0 | 0 | ⏳ sin equivalente unitario | `credentials/sin-equivalente-unitario.test.ts` |
| CP-CR-05-01 | Buscar credenciales por nombre | 0 | 2 | ✅ | `credentials/CR-05/CredentialsView.test.ts` |
| CP-CR-05-02 | Ordenar por nombre y fecha | 0 | 1 | ✅ + ⏳ parcial | `credentials/CR-05/CredentialsView.test.ts` |
| CP-CR-05-03 | Filtrar por tipo | 1 | 0 | ✅ | `credentials/CR-05/CredentialsView.test.ts` |
| CP-CR-05-04 | Compartir con un miembro (con licencia) | 1 | 0 | ✅ | `credentials/CR-05/CredentialSharing.ee.test.ts` |
| CP-CR-05-05 | Miembro no ve credenciales no compartidas | 0 | 0 | ⏳ sin equivalente unitario | `credentials/sin-equivalente-unitario.test.ts` |
| CP-CR-05-06 | Aviso de pago al compartir sin licencia | 1 | 0 | ✅ | `credentials/CR-05/CredentialSharing.ee.test.ts` |

### 4. Core: data tables y carpetas

| CP | Caso del plan | Movidas | Nuevas | Estado | Archivos (`vyv/unitarias/unit/…`) |
| --- | --- | ---: | ---: | --- | --- |
| CP-CO-01-01 | Crear data table con nombre válido | 1 | 3 | ✅ | `core/CO-01/AddDataTableModal.test.ts`, `core/CO-01/dataTable.store.test.ts` |
| CP-CO-01-02 | Nombre vacío o solo espacios | 0 | 3 | ✅ | `core/CO-01/AddDataTableModal.test.ts` |
| CP-CO-01-03 | Nombre duplicado en el proyecto | 0 | 1 | ✅ | `core/CO-01/AddDataTableModal.test.ts` |
| CP-CO-01-04 | Nombre en el límite de longitud | 0 | 0 | ⏳ sin equivalente unitario | `core/sin-equivalente-unitario.test.ts` |
| CP-CO-01-05 | Añadir columnas de los cuatro tipos | 3 | 0 | ✅ | `core/CO-01/AddColumnButton.test.ts` |
| CP-CO-01-06 | Nombre de columna duplicado | 0 | 0 | ⏳ sin equivalente unitario | `core/sin-equivalente-unitario.test.ts` |
| CP-CO-01-07 | Nombre de columna con caracteres no permitidos | 2 | 0 | ✅ | `core/CO-01/AddColumnButton.test.ts` |
| CP-CO-01-08 | Renombrar y eliminar una columna con datos | 4 | 0 | ✅ | `core/CO-01/ColumnHeader.test.ts`, `core/CO-01/dataTable.store.columns.test.ts` |
| CP-CO-02-01 | Añadir fila con valores válidos | 2 | 0 | ✅ | `core/CO-02/dataTable.store.test.ts`, `core/CO-02/useDataTableOperations.test.ts` |
| CP-CO-02-02 | Texto en una columna number | 1 | 0 | ✅ | `core/CO-02/useDataTableOperations.test.ts` |
| CP-CO-02-03 | Fecha inválida | 0 | 0 | ⏳ sin equivalente unitario | `core/sin-equivalente-unitario.test.ts` |
| CP-CO-02-04 | Nulo frente a cadena vacía | 2 | 0 | ✅ | `core/CO-02/columnUtils.test.ts` |
| CP-CO-02-05 | Celda de más de 10 000 caracteres | 2 | 0 | ✅ | `core/CO-02/columnUtils.test.ts` |
| CP-CO-02-06 | Ordenar por columna | 1 | 0 | ✅ | `core/CO-02/useAgGrid.test.ts` |
| CP-CO-02-07 | Filtrar por columna | 2 | 0 | ✅ | `core/CO-02/useDataTableColumnFilters.test.ts` |
| CP-CO-02-08 | Leer y escribir filas desde el nodo Data Table | 0 | 0 | ⏳ sin equivalente unitario | `core/sin-equivalente-unitario.test.ts` |
| CP-CO-03-01 | Importar un CSV válido | 2 | 0 | ✅ | `core/CO-03/ImportCsvModal.test.ts`, `core/CO-03/dataTable.store.test.ts` |
| CP-CO-03-02 | CSV con columnas desiguales | 1 | 0 | ✅ | `core/CO-03/ImportCsvModal.test.ts` |
| CP-CO-03-03 | CSV con tipos incompatibles | 0 | 0 | ⏳ sin equivalente unitario | `core/sin-equivalente-unitario.test.ts` |
| CP-CO-03-04 | CSV con BOM, separador ’;’ y tildes | 0 | 0 | ⏳ sin equivalente unitario | `core/sin-equivalente-unitario.test.ts` |
| CP-CO-03-05 | Importar un archivo grande | 0 | 0 | ⏳ sin equivalente unitario | `core/sin-equivalente-unitario.test.ts` |
| CP-CO-03-06 | Exportar y comparar con el origen | 2 | 0 | ✅ | `core/CO-03/DownloadDataTableModal.test.ts` |
| CP-CO-04-01 | Crear carpeta en la raíz | 1 | 2 | ✅ | `core/CO-04/WorkflowsView.test.ts`, `core/CO-04/folders.store.test.ts` |
| CP-CO-04-02 | Anidar carpetas en varios niveles | 2 | 0 | ✅ | `core/CO-04/FolderBreadcrumbs.test.ts`, `core/CO-04/folders.store.test.ts` |
| CP-CO-04-03 | Nombre vacío o duplicado en el mismo nivel | 2 | 0 | ✅ | `core/CO-04/useFolders.test.ts` |
| CP-CO-04-04 | Renombrar una carpeta | 0 | 2 | ✅ | `core/CO-04/folders.store.test.ts` |
| CP-CO-04-05 | Navegar con las migas de pan | 2 | 0 | ✅ | `core/CO-04/FolderBreadcrumbs.test.ts`, `core/CO-04/FolderCard.test.ts` |
| CP-CO-04-06 | Buscar workflows dentro de carpetas | 2 | 0 | ✅ | `core/CO-04/WorkflowsView.test.ts` |
| CP-CO-05-01 | Mover un workflow a una carpeta | 1 | 0 | ✅ | `core/CO-05/MoveToFolderModal.test.ts` |
| CP-CO-05-02 | Mover un workflow de vuelta a la raíz | 1 | 0 | ✅ | `core/CO-05/MoveToFolderModal.test.ts` |
| CP-CO-05-03 | Mover una carpeta con contenido | 2 | 0 | ✅ | `core/CO-05/MoveToFolderModal.test.ts` |
| CP-CO-05-04 | Impedir mover una carpeta dentro de sí misma o de una hija | 2 | 0 | ✅ | `core/CO-05/folders.store.test.ts`, `core/CO-05/useFolders.test.ts` |
| CP-CO-05-05 | Eliminar una carpeta vacía | 1 | 0 | ✅ | `core/CO-05/FolderCard.test.ts` |
| CP-CO-05-06 | Eliminar carpeta con contenido transfiriendo | 0 | 2 | ✅ | `core/CO-05/DeleteFolderModal.test.ts` |
| CP-CO-05-07 | Eliminar carpeta con contenido borrando | 0 | 5 | ✅ | `core/CO-05/DeleteFolderModal.test.ts` |
| CP-CO-05-08 | Sin workflows huérfanos tras eliminar | 0 | 0 | ⏳ sin equivalente unitario | `core/sin-equivalente-unitario.test.ts` |

## Resultados

```
Test Files  91 passed | 4 skipped (95)     ← los 4 «skipped» solo tienen it.todo
     Tests  263 passed | 21 todo (284)
```

Salida completa: [`evidence/full-run.log`](evidence/full-run.log). Los 64 archivos de origen de los que se movieron pruebas siguen en verde (2003 pruebas) y pasan ESLint.

## Cobertura

Cobertura V8 de los 74 módulos de producción que prueba la suite (lista en [`suite.mts`](suite.mts)). Es la cobertura que aporta **solo** esta suite: los archivos grandes (por ejemplo `useCanvasOperations.ts`) tienen muchas más funciones que las que el plan prueba.

| Área (`src/…`) | Archivos | Líneas | Ramas | Funciones |
| --- | ---: | ---: | ---: | ---: |
| app/components | 3 | 50,1 % | 28,9 % | 45,3 % |
| app/composables | 5 | 37,2 % | 29,5 % | 40,2 % |
| app/views | 1 | 40,9 % | 26,6 % | 30,2 % |
| features/core/dataTable | 10 | 49,4 % | 30,4 % | 41,8 % |
| features/core/folders | 6 | 66,6 % | 48,8 % | 62,8 % |
| features/credentials | 13 | 54,0 % | 41,5 % | 52,2 % |
| features/execution/executions | 13 | 59,1 % | 46,8 % | 55,6 % |
| features/execution/logs | 6 | 65,1 % | 51,6 % | 62,6 % |
| features/shared | 1 | 54,1 % | 28,8 % | 43,5 % |
| features/workflows | 16 | 64,6 % | 49,5 % | 57,8 % |
| **Total** | **74** | **52,4 %** | **38,59 %** | **50,95 %** |

## Hallazgos

| # | Caso | Hallazgo | Estado |
| --- | --- | --- | --- |
| 1 | CP-EX-02-03 | Rango de fechas invertido = lista vacía. | Corregido (TDD). |
| 2 | CP-CO-01-02 | Nombre de data table con solo espacios aceptado. | Corregido (TDD). |
| 3 | CP-CO-01-02 | La misma guarda en el modo «importar CSV» (`isCreateDisabled`) no se cubrió con prueba. | Revisar. |
| 4 | CP-CR-04-05 / CP-CR-02-08 | El aviso «la credencial no existe» solo aparece a usuarios sin permiso `credential:read`; un propietario o administrador no lo ve. | Verificar en E2E. |
| 5 | CP-CO-05-07 | `DeleteFolderModal` usa el mismo `data-test-id` en dos elementos. | Abierto. |
| 6 | CP-CR-05-02 | El orden con el desplegable de la vista de credenciales no se puede probar en jsdom. | `todo`, cubrir en E2E. |
