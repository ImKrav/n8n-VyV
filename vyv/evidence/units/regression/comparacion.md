# Comparación de regresión

Antes: ../evidence/units/regression/antes · Después: ../evidence/units/regression/despues

**Pruebas: 349 · Regresiones: 0 · Corregidas: 20**

## Resumen por funcionalidad

Columnas «Antes» y «Después»: aprobadas / fallidas / pendientes.

| Módulo | Funcionalidad | Pruebas | Antes | Después | Regresiones | Corregidas | Resultado |
|---|---|---|---|---|---|---|---|
| 1 · Workflows | WF-01 | 21 | 20 / 0 / 1 | 20 / 0 / 1 | 0 | 0 | ✅ |
| 1 · Workflows | WF-02 | 13 | 13 / 0 / 0 | 13 / 0 / 0 | 0 | 0 | ✅ |
| 1 · Workflows | WF-03 | 14 | 11 / 0 / 3 | 11 / 0 / 3 | 0 | 0 | ✅ |
| 1 · Workflows | WF-04 | 12 | 12 / 0 / 0 | 12 / 0 / 0 | 0 | 0 | ✅ |
| 1 · Workflows | WF-05 | 16 | 16 / 0 / 0 | 16 / 0 / 0 | 0 | 0 | ✅ |
| 2 · Ejecuciones | EX-01 | 20 | 19 / 0 / 1 | 19 / 0 / 1 | 0 | 0 | ✅ |
| 2 · Ejecuciones | EX-02 | 19 | 17 / 2 / 0 | 19 / 0 / 0 | 0 | 2 | ✅ |
| 2 · Ejecuciones | EX-03 | 20 | 20 / 0 / 0 | 20 / 0 / 0 | 0 | 0 | ✅ |
| 2 · Ejecuciones | EX-04 | 17 | 16 / 0 / 1 | 16 / 0 / 1 | 0 | 0 | ✅ |
| 2 · Ejecuciones | EX-05 | 11 | 11 / 0 / 0 | 11 / 0 / 0 | 0 | 0 | ✅ |
| 3 · Credenciales | CR-01 | 10 | 9 / 0 / 1 | 9 / 0 / 1 | 0 | 0 | ✅ |
| 3 · Credenciales | CR-02 | 12 | 10 / 0 / 2 | 10 / 0 / 2 | 0 | 0 | ✅ |
| 3 · Credenciales | CR-03 | 11 | 10 / 0 / 1 | 10 / 0 / 1 | 0 | 0 | ✅ |
| 3 · Credenciales | CR-04 | 13 | 12 / 0 / 1 | 12 / 0 / 1 | 0 | 0 | ✅ |
| 3 · Credenciales | CR-05 | 8 | 6 / 0 / 2 | 6 / 0 / 2 | 0 | 0 | ✅ |
| 4 · Core | CO-01 | 20 | 15 / 3 / 2 | 18 / 0 / 2 | 0 | 3 | ✅ |
| 4 · Core | CO-02 | 12 | 10 / 0 / 2 | 10 / 0 / 2 | 0 | 0 | ✅ |
| 4 · Core | CO-03 | 48 | 30 / 15 / 3 | 45 / 0 / 3 | 0 | 15 | ✅ |
| 4 · Core | CO-04 | 32 | 32 / 0 / 0 | 32 / 0 / 0 | 0 | 0 | ✅ |
| 4 · Core | CO-05 | 20 | 19 / 0 / 1 | 19 / 0 / 1 | 0 | 0 | ✅ |

## Regresiones

- Ninguna

## Corregidas

- EX-02 · vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro normaliza un rango invertido (fin anterior al inicio) (failed → passed)
- EX-02 · vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro normaliza un rango invertido cuando el date picker entrega objetos Date (failed → passed)
- CO-01 · vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-02 · Nombre vacío o solo espacios deshabilita «Create» con un nombre de solo espacios (failed → passed)
- CO-01 · vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-02 · Nombre vacío o solo espacios no crea la tabla al pulsar Enter con un nombre de solo espacios (failed → passed)
- CO-01 · vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-02 · Nombre vacío o solo espacios propone el nombre del CSV cuando el nombre tiene solo espacios (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.errors.vyv.test.ts › CsvParserService · errores de entrada (VyV) archivo inexistente → FileUploadError (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.errors.vyv.test.ts › CsvParserService · errores de entrada (VyV) CSV con comilla sin cerrar → FileUploadError con el detalle del parser (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.errors.vyv.test.ts › CsvParserService · errores de entrada (VyV) fileId con path traversal → FileUploadError (y conserva el mensaje original) (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) un literal no decimal (-Infinity) NO se infiere como number (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) un literal no decimal (0b101) NO se infiere como number (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) un literal no decimal (0x1A) NO se infiere como number (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) un literal no decimal (Infinity) NO se infiere como number (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) una fecha imposible (2023-02-29) NO se infiere como date (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) una fecha imposible (2024-02-30) NO se infiere como date (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) una fecha imposible (2024-02-31T10:00:00Z) NO se infiere como date (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) una fecha imposible (2024-04-31) NO se infiere como date (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Valores límite de fechas 29 de febrero solo es válido en año bisiesto (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Valores límite de fechas días 30/31 según el mes (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/data-table-csv-import.cleanup.vyv.test.ts › DataTableCsvImportService.cleanupFile (VyV) el error original del try sigue llegando al llamador cuando la limpieza va en finally (failed → passed)
- CO-03 · packages/modules/data-table/backend/src/__tests__/data-table-csv-import.cleanup.vyv.test.ts › DataTableCsvImportService.cleanupFile (VyV) no lanza si la limpieza falla (no enmascara el error original de la importación) (failed → passed)

## Detalle

| Funcionalidad | Prueba | Antes | Después | Cambio |
|---|---|---|---|---|
| WF-01 | vyv/units/workflows/sin-equivalente-unitario.test.ts › CP-WF-01-08 · Rendimiento del lienzo con 100 nodos Prueba de rendimiento en un navegador real. Cubierto en Cypress: e2e/workflows/WF-01/large-workflow.ui.cy.js. | pending | pending | igual |
| WF-01 | vyv/units/workflows/WF-01/CanvasNodeDefault.test.ts › CP-WF-01-04 · Nodo desactivado no se ejecuta disabled should apply disabled class when node is disabled | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/CanvasNodeStickyColorSelector.test.ts › CP-WF-01-07 · Nota adhesiva con color persistente should render all colors and apply selected color correctly | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/CanvasNodeToolbar.test.ts › CP-WF-01-07 · Nota adhesiva con color persistente should emit "update" when sticky note color is changed | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-01 · Añadir un trigger y un nodo y conectarlos addConnections should create connections between nodes | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-01 · Añadir un trigger y un nodo y conectarlos addNodes should add nodes at specified positions | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-02 · Mover y eliminar nodos deleteConnectionsByNodeId should delete all connections for a given node ID | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-02 · Mover y eliminar nodos deleteNode should delete node and track history | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-02 · Mover y eliminar nodos updateNodePosition should update node position | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-03 · Rechazar conexión entre tipos incompatibles isConnectionAllowed should return false if source node does not have connection type | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-03 · Rechazar conexión entre tipos incompatibles isConnectionAllowed should return false if target node does not have connection type | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-03 · Rechazar conexión entre tipos incompatibles isConnectionAllowed should return true if all conditions are met and no filter is set | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-04 · Nodo desactivado no se ejecuta revertToggleNodeDisabled re-enables a previously disabled node | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-04 · Nodo desactivado no se ejecuta toggleNodesDisabled disables nodes based on provided ids | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-06 · Copiar y pegar nodos entre workflows copyNodes drops stored credentials the current user cannot use when sharing is enabled | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-06 · Copiar y pegar nodos entre workflows copyNodes should copy nodes | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useCanvasOperations.test.ts › CP-WF-01-06 · Copiar y pegar nodos entre workflows importWorkflowData centers a pasted node in the viewport instead of using the last click | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useHistoryHelper.test.ts › CP-WF-01-05 · Deshacer y rehacer una secuencia de 10 acciones keyboard shortcuts should call redo when Ctrl+Shift+Z is pressed | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useHistoryHelper.test.ts › CP-WF-01-05 · Deshacer y rehacer una secuencia de 10 acciones keyboard shortcuts should call undo when Ctrl+Z is pressed | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useHistoryHelper.test.ts › CP-WF-01-05 · Deshacer y rehacer una secuencia de 10 acciones redo should revert a Command and push to undo stack | passed | passed | igual |
| WF-01 | vyv/units/workflows/WF-01/useHistoryHelper.test.ts › CP-WF-01-05 · Deshacer y rehacer una secuencia de 10 acciones undo should revert a Command and push to redo stack | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-01 · No guardar ejecuciones exitosas de producción envía saveDataSuccessExecution «none» al elegir «Do not save» | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-01 · No guardar ejecuciones exitosas de producción mantiene el guardado de ejecuciones fallidas al desactivar solo las exitosas | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-02 · No guardar ejecuciones manuales envía saveManualExecutions false al elegir «Do not save» | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-03 · Timeout en sus valores límite guarda el timeout en el valor intermedio (1 h) | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-03 · Timeout en sus valores límite guarda el timeout en el valor máximo permitido | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-03 · Timeout en sus valores límite guarda el timeout en el valor mínimo (1 s) | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-03 · Timeout en sus valores límite rechaza un timeout activado en 0 segundos | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-03 · Timeout en sus valores límite rechaza un timeout de máximo + 1 segundo e informa el máximo | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-04 · Workflow de error se dispara ante un fallo Error Workflow should save workflow with errorWorkflow when a specific workflow is selected | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-04 · Workflow de error se dispara ante un fallo Error Workflow should send DEFAULT value for errorWorkflow to backend when set to "No Workflow" | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-05 · Zona horaria del workflow guarda la zona horaria elegida | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-06 · Ajustes persisten tras recargar should save time saved per execution correctly | passed | passed | igual |
| WF-02 | vyv/units/workflows/WF-02/WorkflowSettings.test.ts › CP-WF-02-06 · Ajustes persisten tras recargar vuelve a enviar sin cambios los ajustes guardados al reabrir y guardar | passed | passed | igual |
| WF-03 | vyv/units/workflows/sin-equivalente-unitario.test.ts › CP-WF-03-02 · Publicar workflow con Webhook y responder en producción Necesita el servidor. Cubierto en Cypress: e2e/workflows/WF-03/webhook-publish.api.cy.js. | pending | pending | igual |
| WF-03 | vyv/units/workflows/sin-equivalente-unitario.test.ts › CP-WF-03-04 · Mismo path con distinto método HTTP Necesita el servidor. Cubierto en Cypress: e2e/workflows/WF-03/webhook-publish.api.cy.js. | pending | pending | igual |
| WF-03 | vyv/units/workflows/sin-equivalente-unitario.test.ts › CP-WF-03-08 · Publicación persiste tras reiniciar la instancia Necesita reiniciar el servidor. Cubierto en Cypress: e2e/workflows/WF-03/webhook-publish.api.cy.js (CYPRESS_restartCommand). | pending | pending | igual |
| WF-03 | vyv/units/workflows/WF-03/useWorkflowActivate.test.ts › CP-WF-03-05 · Despublicar detiene el trigger unpublishWorkflowFromHistory() unpublishes when the workflow is not in the list store cache | passed | passed | igual |
| WF-03 | vyv/units/workflows/WF-03/WorkflowActivationConflictingWebhookModal.test.ts › CP-WF-03-03 · Conflicto de webhook con otro workflow activo should render webhook conflict modal | passed | passed | igual |
| WF-03 | vyv/units/workflows/WF-03/WorkflowActivationErrorMessage.test.ts › CP-WF-03-06 · Publicar con credencial inválida escapa el HTML del mensaje del servidor en lugar de interpretarlo | passed | passed | igual |
| WF-03 | vyv/units/workflows/WF-03/WorkflowActivationErrorMessage.test.ts › CP-WF-03-06 · Publicar con credencial inválida muestra el texto genérico de error y el detalle devuelto por el servidor | passed | passed | igual |
| WF-03 | vyv/units/workflows/WF-03/WorkflowCard.test.ts › CP-WF-03-05 · Despublicar detiene el trigger Unpublish functionality should emit workflow:unpublished event when unpublish action is successful | passed | passed | igual |
| WF-03 | vyv/units/workflows/WF-03/WorkflowHeaderDraftPublishActions.test.ts › CP-WF-03-01 · Publicar sin nodo trigger Publish button state should show publish button disabled when there are no trigger nodes | passed | passed | igual |
| WF-03 | vyv/units/workflows/WF-03/WorkflowHeaderDraftPublishActions.test.ts › CP-WF-03-01 · Publicar sin nodo trigger Publish button state should show publish button disabled when trigger node is disabled | passed | passed | igual |
| WF-03 | vyv/units/workflows/WF-03/WorkflowHeaderDraftPublishActions.test.ts › CP-WF-03-07 · Cambios posteriores a la publicación Publish button state should show publish button enabled when there are unpublished changes (versionId mismatch) | passed | passed | igual |
| WF-03 | vyv/units/workflows/WF-03/WorkflowPublishModal.test.ts › CP-WF-03-01 · Publicar sin nodo trigger re-attempt (partial / failed publication) still blocks re-attempt when containsTrigger is false | passed | passed | igual |
| WF-03 | vyv/units/workflows/WF-03/WorkflowPublishModal.test.ts › CP-WF-03-03 · Conflicto de webhook con otro workflow activo handlePublish without conflicts should proceed to publish when there are no conflicting webhooks | passed | passed | igual |
| WF-03 | vyv/units/workflows/WF-03/WorkflowPublishModal.test.ts › CP-WF-03-06 · Publicar con credencial inválida publish never settles stops the spinner and reports the failure when publishWorkflow throws | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/useWorkflowDiff.test.ts › CP-WF-04-05 · Comparar dos versiones (diff) useWorkflowDiff composable should compute connectionsDiff correctly | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/useWorkflowDiff.test.ts › CP-WF-04-05 · Comparar dos versiones (diff) useWorkflowDiff composable should compute nodesDiff correctly | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/useWorkflowDiff.test.ts › CP-WF-04-05 · Comparar dos versiones (diff) useWorkflowDiff composable should handle workflows with different nodes | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/workflowHistory.store.test.ts › CP-WF-04-01 · Cada guardado genera una versión getPublishTimeline should call the API with the rest context, workflow id and page, and return its result | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/workflowHistory.store.test.ts › CP-WF-04-02 · Nombrar una versión updateWorkflowHistoryVersion should handle updating only name | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/workflowHistory.store.test.ts › CP-WF-04-03 · Restaurar una versión anterior restoreWorkflow sends the version it restores, so the server can keep its nodes | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/WorkflowHistory.test.ts › CP-WF-04-02 · Nombrar una versión should open name version modal when name action is triggered | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/WorkflowHistory.test.ts › CP-WF-04-04 · Clonar una versión a un workflow nuevo should clone workflow from version data | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/WorkflowHistory.test.ts › CP-WF-04-06 · Descargar una versión como JSON importable should download workflow version | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/WorkflowHistoryList.test.ts › CP-WF-04-01 · Cada guardado genera una versión should render list and delegate preview event | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/WorkflowVersionFormModal.test.ts › CP-WF-04-02 · Nombrar una versión should disable submit button when version name is empty | passed | passed | igual |
| WF-04 | vyv/units/workflows/WF-04/WorkflowVersionFormModal.test.ts › CP-WF-04-02 · Nombrar una versión should disable submit button when version name is only whitespace | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/DuplicateWorkflowDialog.test.ts › CP-WF-05-05 · Duplicar con nombre vacío, repetido y muy largo acepta un nombre en el límite de longitud y limita la entrada al máximo | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/DuplicateWorkflowDialog.test.ts › CP-WF-05-05 · Duplicar con nombre vacío, repetido y muy largo muestra el mensaje de permisos cuando la API responde 403 | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/DuplicateWorkflowDialog.test.ts › CP-WF-05-05 · Duplicar con nombre vacío, repetido y muy largo propone el nombre único que calcula el store para evitar un nombre repetido | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/DuplicateWorkflowDialog.test.ts › CP-WF-05-05 · Duplicar con nombre vacío, repetido y muy largo rechaza un nombre vacío o solo con espacios y no guarda nada | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/DuplicateWorkflowDialog.test.ts › CP-WF-05-06 · El duplicado es independiente y conserva etiquetas copia un workflow guardado sin su id, estado activo ni relación de carpeta | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/DuplicateWorkflowDialog.test.ts › CP-WF-05-06 · El duplicado es independiente y conserva etiquetas duplica con el nombre recortado, URLs de webhook nuevas y avisa al bus externo | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/ImportWorkflowUrlModal.test.ts › CP-WF-05-03 · Importar workflow desde URL válida should accept URLs without .json extension | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/ImportWorkflowUrlModal.test.ts › CP-WF-05-03 · Importar workflow desde URL válida should emit importWorkflowUrl event on confirm | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/ImportWorkflowUrlModal.test.ts › CP-WF-05-04 · Importar desde URL inválida o con JSON no válido should disable confirm button for invalid URL | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/setupTemplate.store.test.ts › CP-WF-05-02 · Configurar credenciales al usar una plantilla setInitialCredentialsSelection should select credential when there's only one | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/setupTemplate.store.test.ts › CP-WF-05-02 · Configurar credenciales al usar una plantilla setInitialCredentialsSelection should select no credentials when there isn't any available | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/templates.store.test.ts › CP-WF-05-01 · Buscar y filtrar plantillas devuelve las plantillas que coinciden con un término existente | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/templates.store.test.ts › CP-WF-05-01 · Buscar y filtrar plantillas devuelve un resultado vacío para un término inexistente | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/templates.store.test.ts › CP-WF-05-01 · Buscar y filtrar plantillas envía las categorías elegidas como filtro de la búsqueda | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/templates.store.test.ts › CP-WF-05-01 · Buscar y filtrar plantillas reutiliza los resultados de la misma búsqueda aunque cambie el orden de las categorías | passed | passed | igual |
| WF-05 | vyv/units/workflows/WF-05/useCanvasOperations.test.ts › CP-WF-05-04 · Importar desde URL inválida o con JSON no válido importWorkflowData should show an error and import nothing when data is not a valid workflow | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/executions.store.test.ts › CP-EX-01-05 · Carga incremental con más de 50 ejecuciones pagination should allow loading more when the first page is full | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/executions.store.test.ts › CP-EX-01-05 · Carga incremental con más de 50 ejecuciones pagination should not request a page once the list has ended | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/executions.store.test.ts › CP-EX-01-05 · Carga incremental con más de 50 ejecuciones pagination should stop allowing more once a paginated page comes back partial | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/executions.store.test.ts › CP-EX-01-06 · Actualización automática de la lista no vuelve a pedir la lista después de detener el refresco | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/executions.store.test.ts › CP-EX-01-06 · Actualización automática de la lista pagination moves an execution from the current list to the completed list | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/executions.store.test.ts › CP-EX-01-06 · Actualización automática de la lista vuelve a pedir la lista cada 4 segundos sin recargar la página | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/executions.store.test.ts › CP-EX-01-07 · Coherencia entre lista global y por workflow pagination resets the continuation and rows when the workflow filter changes | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsList.test.ts › CP-EX-01-05 · Carga incremental con más de 50 ejecuciones should stop offering "load more" once all executions are shown, even on a large instance | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsListItem.test.ts › CP-EX-01-01 · Ejecución exitosa con est… muestra el estado «Success» para una ejecución «success» | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsListItem.test.ts › CP-EX-01-01 · Ejecución exitosa con estado y duración muestra la duración calculada entre el inicio y el fin | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsListItem.test.ts › CP-EX-01-01 · Ejecución exitosa con estado y duración should show formatted start date | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsListItem.test.ts › CP-EX-01-02 · Ejecución fallida muestra el estado «Error» para una ejecución «crashed» | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsListItem.test.ts › CP-EX-01-02 · Ejecución fallida muestra el estado «Error» para una ejecución «error» | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsListItem.test.ts › CP-EX-01-03 · Ejecución en espera (Wait) muestra el estado «Waiting» para una ejecución «waiting» | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsListItem.test.ts › CP-EX-01-03 · Ejecución en espera (Wait) should render queued tooltip for an indefinitely waiting execution | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsListItem.test.ts › CP-EX-01-04 · Ejecución en curso muestra el estado «Running» para una ejecución «running» | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsListItem.test.ts › CP-EX-01-04 · Ejecución en curso should render the status text for an execution | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/GlobalExecutionsListItem.test.ts › CP-EX-01-04 · Ejecución en curso uses `createdAt` to calculate running time if `startedAt` is undefined | passed | passed | igual |
| EX-01 | vyv/units/executions/EX-01/WorkflowExecutionsSidebar.test.ts › CP-EX-01-05 · Carga incremental con más de 50 ejecuciones infinite scroll sentinel should observe the sentinel when executions are present and more pages exist | passed | passed | igual |
| EX-01 | vyv/units/executions/sin-equivalente-unitario.test.ts › CP-EX-01-08 · Rendimiento con más de 1 000 ejecuciones Prueba de rendimiento en una instancia real. Cubierto en Cypress: e2e/executions/EX-01/many-executions.api.cy.js. | pending | pending | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-01 · Filtrar por cada estado «all» no filtra por estado | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-01 · Filtrar por cada estado el estado «canceled» consulta [ 'canceled' ] | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-01 · Filtrar por cada estado el estado «error» consulta [ 'crashed', 'error' ] | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-01 · Filtrar por cada estado el estado «running» consulta [ 'running', 'new' ] | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-01 · Filtrar por cada estado el estado «success» consulta [ 'success' ] | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-01 · Filtrar por cada estado el estado «waiting» consulta [ 'waiting' ] | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-02 · Filtrar por workflow «all» no filtra por workflow | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-02 · Filtrar por workflow envía el id del workflow elegido | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro acepta un rango dentro del mismo día | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro acepta un solo extremo del rango sin inventar el otro | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro envía un rango futuro tal cual (la API responde vacío) | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro mantiene un rango válido sin cambios | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro no añade fechas cuando el filtro no tiene rango | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro normaliza un rango invertido (fin anterior al inicio) | failed | passed | 🟢 corregido |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-03 · Rango de fechas: mismo día, invertido y futuro normaliza un rango invertido cuando el date picker entrega objetos Date | failed | passed | 🟢 corregido |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-04 · Combinación de filtros combina estado, workflow y rango de fechas en una sola consulta | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executionFilterToQueryFilter.test.ts › CP-EX-02-06 · Filtro de fechas con zona horaria distinta a UTC conserva el instante exacto de una fecha local de America/Bogota (UTC-5) cerca de medianoche | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/executions.utils.test.ts › CP-EX-02-01 · Filtrar por cada estado adds "new" to the filter | passed | passed | igual |
| EX-02 | vyv/units/executions/EX-02/ExecutionsFilter.test.ts › CP-EX-02-05 · Limpiar filtros state change | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/ExecutionPreviewHost.test.ts › CP-EX-03-01 · Vista previa de ejecución exitosa loads the execution on mount and renders the scoped subtree | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/ExecutionPreviewHost.test.ts › CP-EX-03-01 · Vista previa de ejecución exitosa renders the read-only logs panel once execution data is present | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/executions.store.test.ts › CP-EX-03-06 · Eliminar varias ejecuciones seleccionadas deleteExecutions should delete executions by ID | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/executions.store.test.ts › CP-EX-03-06 · Eliminar varias ejecuciones seleccionadas deleteExecutions should delete executions started before given date | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/executions.utils.test.ts › CP-EX-03-02 · Vista previa de ejecución fallida includes node.name if error.node is an object | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/executions.utils.test.ts › CP-EX-03-02 · Vista previa de ejecución fallida returns error.message when lastNodeExecuted and error are present | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/GlobalExecutionsList.test.ts › CP-EX-03-03 · Reintentar con la versión actual should show "retry" data when appropriate | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/GlobalExecutionsList.test.ts › CP-EX-03-05 · Eliminar una ejecución con confirmación no borra nada si el usuario cancela la confirmación | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/GlobalExecutionsList.test.ts › CP-EX-03-05 · Eliminar una ejecución con confirmación pide confirmación y borra la ejecución elegida al aceptar | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/GlobalExecutionsList.test.ts › CP-EX-03-06 · Eliminar varias ejecuciones seleccionadas borra solo las ejecuciones seleccionadas | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/GlobalExecutionsListItem.test.ts › CP-EX-03-03 · Reintentar con la versión actual should emit retry events on retry original and retry saved dropdown items click | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/GlobalExecutionsListItem.test.ts › CP-EX-03-05 · Eliminar una ejecución con confirmación should emit delete event on delete dropdown item click | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/useExecutionDebugging.test.ts › CP-EX-03-07 · Depurar en el editor (con licencia) should applyExecutionData | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/useExecutionDebugging.test.ts › CP-EX-03-07 · Depurar en el editor (con licencia) should mark workflow as dirty after pinning imported execution data | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/WorkflowExecutionsCard.test.ts › CP-EX-03-04 · Reintentar con la versión original aligns the retry menu and explains both retry options | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/WorkflowExecutionsPreview.test.ts › CP-EX-03-08 · Depurar en el editor sin licencia when debug enterprise feature is false with workflow scopes  it should handle debug link click accordingly | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/WorkflowExecutionsPreview.test.ts › CP-EX-03-08 · Depurar en el editor sin licencia when debug enterprise feature is false with workflow scopes workflow:update it should handle debug link click accordingly | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/WorkflowExecutionsPreview.test.ts › CP-EX-03-08 · Depurar en el editor sin licencia when debug enterprise feature is true with workflow scopes  it should handle debug link click accordingly | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/WorkflowExecutionsPreview.test.ts › CP-EX-03-08 · Depurar en el editor sin licencia when debug enterprise feature is true with workflow scopes workflow:read it should handle debug link click accordingly | passed | passed | igual |
| EX-03 | vyv/units/executions/EX-03/WorkflowExecutionsPreview.test.ts › CP-EX-03-08 · Depurar en el editor sin licencia when debug enterprise feature is true with workflow scopes workflow:update it should handle debug link click accordingly | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/ConcurrentExecutionsHeader.test.ts › CP-EX-04-07 · Ejecuciones excedentes quedan en cola shows the concurrency header for a settled empty result | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/ExecutionStopAllText.test.ts › CP-EX-04-05 · Detener todas las ejecuciones en curso abre el modal de detención múltiple y registra telemetría al hacer clic | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/ExecutionStopAllText.test.ts › CP-EX-04-05 · Detener todas las ejecuciones en curso no se muestra si ninguna ejecución se puede detener | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/ExecutionStopAllText.test.ts › CP-EX-04-05 · Detener todas las ejecuciones en curso se muestra si hay una ejecución en estado «new» | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/ExecutionStopAllText.test.ts › CP-EX-04-05 · Detener todas las ejecuciones en curso se muestra si hay una ejecución en estado «running» | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/ExecutionStopAllText.test.ts › CP-EX-04-05 · Detener todas las ejecuciones en curso se muestra si hay una ejecución en estado «waiting» | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/GlobalExecutionsListItem.test.ts › CP-EX-04-02 · Detener una ejecución desde la lista should emit stop event on stop button click for a running execution | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/GlobalExecutionsListItem.test.ts › CP-EX-04-03 · Detener una ejecución en espera no ofrece detener una ejecución terminada | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/GlobalExecutionsListItem.test.ts › CP-EX-04-03 · Detener una ejecución en espera ofrece detener una ejecución en espera (Wait) aunque ya tenga hora de parada | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/GlobalExecutionsListItem.test.ts › CP-EX-04-07 · Ejecuciones excedentes quedan en cola should render queued tooltip for a new execution | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/NodeExecuteButton.test.ts › CP-EX-04-01 · Detener una ejecución desde el editor stops execution when clicking button while workflow is running | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/NodeExecuteButton.test.ts › CP-EX-04-06 · Detener la espera de un webhook de prueba stops webhook when clicking button while listening for events | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/StopManyExecutionsModal.test.ts › CP-EX-04-04 · Detener varias ejecuciones seleccionadas should disable submit button if no boxes are checked | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/StopManyExecutionsModal.test.ts › CP-EX-04-04 · Detener varias ejecuciones seleccionadas should render modal | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/useExecutionCommands.test.ts › CP-EX-04-01 · Detener una ejecución desde el editor stop execution command should call stopCurrentExecution when handler is called | passed | passed | igual |
| EX-04 | vyv/units/executions/EX-04/useNodeExecution.test.ts › CP-EX-04-06 · Detener la espera de un webhook de prueba execute should stop webhook when listening | passed | passed | igual |
| EX-04 | vyv/units/executions/sin-equivalente-unitario.test.ts › CP-EX-04-08 · La cola se procesa al liberar capacidad La cola la procesa el backend. Cubierto en Cypress: e2e/executions/EX-04/concurrency-queue.api.cy.js. | pending | pending | igual |
| EX-05 | vyv/units/executions/EX-05/LogDetailsPanel.test.ts › CP-EX-05-02 · Detalle de entrada y salida de un nodo should show name, run status, input, and output of the node | passed | passed | igual |
| EX-05 | vyv/units/executions/EX-05/logs.utils.test.ts › CP-EX-05-01 · Orden de los nodos en el árbol createLogTree should return root node log entries in ascending order of executionIndex | passed | passed | igual |
| EX-05 | vyv/units/executions/EX-05/logs.utils.test.ts › CP-EX-05-03 · Detalle de un nodo con error findSelectedLogEntry when execution is finished and log is not manually selected should return first log entry with error | passed | passed | igual |
| EX-05 | vyv/units/executions/EX-05/logs.utils.test.ts › CP-EX-05-04 · Abrir una sub-ejecución createLogTree should include runs of a sub execution | passed | passed | igual |
| EX-05 | vyv/units/executions/EX-05/logs.utils.test.ts › CP-EX-05-06 · Conteo de tokens con un nodo de IA createLogTree with canvas groups sums member tokens once for a group | passed | passed | igual |
| EX-05 | vyv/units/executions/EX-05/LogsOverviewPanel.test.ts › CP-EX-05-01 · Orden de los nodos en el árbol should render summary text and executed nodes if there is an execution | passed | passed | igual |
| EX-05 | vyv/units/executions/EX-05/LogsPanel.test.ts › CP-EX-05-02 · Detalle de entrada y salida de un nodo should render only output panel of selected node by default | passed | passed | igual |
| EX-05 | vyv/units/executions/EX-05/LogsPanel.test.ts › CP-EX-05-05 · Atajos de teclado del panel selection should allow to select previous and next row via keyboard shortcut | passed | passed | igual |
| EX-05 | vyv/units/executions/EX-05/LogsPanel.test.ts › CP-EX-05-05 · Atajos de teclado del panel selection should handle arrow navigation without bubbling to canvas shortcuts | passed | passed | igual |
| EX-05 | vyv/units/executions/EX-05/LogsViewRunData.test.ts › CP-EX-05-03 · Detalle de un nodo con error should display input data even when the root node finished with an error | passed | passed | igual |
| EX-05 | vyv/units/executions/EX-05/useLogsExecutionData.test.ts › CP-EX-05-04 · Abrir una sub-ejecución loadSubExecution should add runs from sub execution to the entries | passed | passed | igual |
| CR-01 | vyv/units/credentials/CR-01/CredentialCard.test.ts › CP-CR-01-08 · Nombre con HTML no se ejecuta muestra como texto un nombre que contiene una etiqueta script | passed | passed | igual |
| CR-01 | vyv/units/credentials/CR-01/CredentialCard.test.ts › CP-CR-01-08 · Nombre con HTML no se ejecuta should render name and home project name | passed | passed | igual |
| CR-01 | vyv/units/credentials/CR-01/CredentialConfig.test.ts › CP-CR-01-02 · Campo obligatorio vacío Connect banner gating hides the connect banner while required properties are not filled | passed | passed | igual |
| CR-01 | vyv/units/credentials/CR-01/CredentialEdit.test.ts › CP-CR-01-01 · Crear credencial Header Auth válida saving credentials calls onCredentialCreated with the newly created credential | passed | passed | igual |
| CR-01 | vyv/units/credentials/CR-01/CredentialEdit.test.ts › CP-CR-01-03 · Prueba de conexión exitosa saving credentials closes the modal after saving credentials with a successful connection test when closeOnSave is enabled | passed | passed | igual |
| CR-01 | vyv/units/credentials/CR-01/CredentialEdit.test.ts › CP-CR-01-04 · Prueba de conexión fallida saving credentials keeps the modal open when the connection test fails after saving | passed | passed | igual |
| CR-01 | vyv/units/credentials/CR-01/CredentialInputs.test.ts › CP-CR-01-02 · Campo obligatorio vacío preserves multiline private keys and validates required fields only after submission | passed | passed | igual |
| CR-01 | vyv/units/credentials/CR-01/CredentialsSelectModal.test.ts › CP-CR-01-05 · Búsqueda de tipo sin resultados muestra solo los tipos que coinciden con un término parcial | passed | passed | igual |
| CR-01 | vyv/units/credentials/CR-01/CredentialsSelectModal.test.ts › CP-CR-01-05 · Búsqueda de tipo sin resultados no muestra opciones para un tipo inexistente y no permite continuar | passed | passed | igual |
| CR-01 | vyv/units/credentials/sin-equivalente-unitario.test.ts › CP-CR-01-07 · Secretos cifrados en la base de datos Necesita la base de datos. Cubierto en Cypress: e2e/credentials/CR-01/encryption-at-rest.api.cy.js (CYPRESS_dbPath). | pending | pending | igual |
| CR-02 | vyv/units/credentials/CR-02/CredentialEdit.test.ts › CP-CR-02-01 · Editar un valor sin romper los workflows saving credentials does not call onCredentialCreated when updating a credential | passed | passed | igual |
| CR-02 | vyv/units/credentials/CR-02/NodeCredentials.test.ts › CP-CR-02-05 · Renombrar una credencial should refetch credentials when the dropdown opens so a rename from another tab shows up | passed | passed | igual |
| CR-02 | vyv/units/credentials/CR-02/TemplatedAuthSimpleView.test.ts › CP-CR-02-02 · Secretos no visibles al reabrir displays the stored redacted sentinel as a full-length mask, like native credential fields | passed | passed | igual |
| CR-02 | vyv/units/credentials/CR-02/TemplatedAuthSimpleView.test.ts › CP-CR-02-02 · Secretos no visibles al reabrir keeps the untouched `***` sentinel — not the display mask — when composing | passed | passed | igual |
| CR-02 | vyv/units/credentials/CR-02/TypeToConfirmDialog.test.ts › CP-CR-02-06 · Eliminar con texto de confirmación incorrecto deshabilita el botón de confirmar mientras no se escribe la palabra clave | passed | passed | igual |
| CR-02 | vyv/units/credentials/CR-02/TypeToConfirmDialog.test.ts › CP-CR-02-06 · Eliminar con texto de confirmación incorrecto mantiene el botón deshabilitado con una palabra distinta | passed | passed | igual |
| CR-02 | vyv/units/credentials/CR-02/TypeToConfirmDialog.test.ts › CP-CR-02-07 · Eliminar con texto de confirmación correcto confirma también con la tecla Enter | passed | passed | igual |
| CR-02 | vyv/units/credentials/CR-02/TypeToConfirmDialog.test.ts › CP-CR-02-07 · Eliminar con texto de confirmación correcto emite «confirm» al escribir la palabra exacta (con espacios alrededor) y pulsar el botón | passed | passed | igual |
| CR-02 | vyv/units/credentials/CR-02/TypeToConfirmDialog.test.ts › CP-CR-02-07 · Eliminar con texto de confirmación correcto no emite «confirm» mientras está cargando | passed | passed | igual |
| CR-02 | vyv/units/credentials/CR-02/TypeToConfirmDialog.test.ts › CP-CR-02-07 · Eliminar con texto de confirmación correcto pide cerrar el diálogo al cancelar | passed | passed | igual |
| CR-02 | vyv/units/credentials/sin-equivalente-unitario.test.ts › CP-CR-02-03 · Secretos no expuestos por la API Necesita la API. Cubierto en Cypress: e2e/credentials/CR-02/secret-exposure.api.cy.js. | pending | pending | igual |
| CR-02 | vyv/units/credentials/sin-equivalente-unitario.test.ts › CP-CR-02-04 · Exportar un workflow no incluye secretos Necesita la API. Cubierto en Cypress: e2e/credentials/CR-02/secret-exposure.api.cy.js. | pending | pending | igual |
| CR-03 | vyv/units/credentials/CR-03/CredentialCard.test.ts › CP-CR-03-02 · Autorización exitosa private credentials connect flow should call authorize with the credential and emit "connected" on success | passed | passed | igual |
| CR-03 | vyv/units/credentials/CR-03/CredentialCard.test.ts › CP-CR-03-03 · Cancelar el consentimiento private credentials connect flow should not emit "connected" if authorize fails | passed | passed | igual |
| CR-03 | vyv/units/credentials/CR-03/CredentialConfig.test.ts › CP-CR-03-01 · URL de redirección correcta OAuth Redirect URL should not show redirect URL for non-OAuth credentials | passed | passed | igual |
| CR-03 | vyv/units/credentials/CR-03/CredentialConfig.test.ts › CP-CR-03-01 · URL de redirección correcta OAuth Redirect URL should show redirect URL for OAuth credentials without managed OAuth | passed | passed | igual |
| CR-03 | vyv/units/credentials/CR-03/ScopesNotice.test.ts › CP-CR-03-04 · Scopes mostrados coinciden con los solicitados al expandir muestra cada scope solicitado (la última parte de una URL de scope) | passed | passed | igual |
| CR-03 | vyv/units/credentials/CR-03/ScopesNotice.test.ts › CP-CR-03-04 · Scopes mostrados coinciden con los solicitados resume 1 scope(s) para el tipo de credencial | passed | passed | igual |
| CR-03 | vyv/units/credentials/CR-03/ScopesNotice.test.ts › CP-CR-03-04 · Scopes mostrados coinciden con los solicitados resume 2 scope(s) para el tipo de credencial | passed | passed | igual |
| CR-03 | vyv/units/credentials/CR-03/useCredentialOAuth.test.ts › CP-CR-03-03 · Cancelar el consentimiento authorize should return false and close the popup when API call fails | passed | passed | igual |
| CR-03 | vyv/units/credentials/CR-03/useCredentialOAuth.test.ts › CP-CR-03-03 · Cancelar el consentimiento createAndAuthorize should delete a newly created credential when authorization fails | passed | passed | igual |
| CR-03 | vyv/units/credentials/CR-03/useCredentialOAuth.test.ts › CP-CR-03-06 · Reconectar tras revocación authorize should not treat a pre-existing token as success when reconnecting | passed | passed | igual |
| CR-03 | vyv/units/credentials/sin-equivalente-unitario.test.ts › CP-CR-03-05 · Token revocado produce error al ejecutar Necesita un proveedor OAuth2 real: prueba manual (procedimiento en vyv/README.md). | pending | pending | igual |
| CR-04 | vyv/units/credentials/CR-04/CredentialPicker.test.ts › CP-CR-04-02 · Solo se listan credenciales compatibles should only render personal credentials of the specified type | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/CredentialPicker.test.ts › CP-CR-04-02 · Solo se listan credenciales compatibles should render all credentials of the specified type | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/NodeCredentials.test.ts › CP-CR-04-01 · Seleccionar una credencial existente onCredentialSelected should call assignCredentialToMatchingNodes after selecting credentials | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/NodeCredentials.test.ts › CP-CR-04-03 · Crear credencial desde el nodo should open the new credential modal when clicked | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/NodeCredentials.test.ts › CP-CR-04-04 · Asignación automática de la única credencial AI Gateway toggle (onAiGatewaySelector) should auto-select an own credential when one is available | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/NodeCredentials.test.ts › CP-CR-04-07 · Cambiar la credencial de un nodo onCredentialSelected should drop credentials the node no longer uses when selecting a credential | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/useNodeHelpers.test.ts › CP-CR-01-06 · Nombre de credencial duplicado distingue las dos credenciales por su id | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/useNodeHelpers.test.ts › CP-CR-01-06 · Nombre de credencial duplicado pide elegir la credencial cuando dos tienen el mismo nombre y el nodo no guarda el id | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/useNodeHelpers.test.ts › CP-CR-02-08 · Eliminar una credencial en uso el nodo señala el problema cuando su credencial ya no existe | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/useNodeHelpers.test.ts › CP-CR-04-05 · Importar workflow con credencial inexistente advierte que la credencial referenciada no existe en la instancia | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/useNodeHelpers.test.ts › CP-CR-04-05 · Importar workflow con credencial inexistente no avisa cuando la credencial referenciada existe | passed | passed | igual |
| CR-04 | vyv/units/credentials/CR-04/useNodeHelpers.test.ts › CP-CR-04-06 · Ejecutar un nodo sin credencial asignada credential issues with AI Gateway should report credential issue when required credential is not set | passed | passed | igual |
| CR-04 | vyv/units/credentials/sin-equivalente-unitario.test.ts › CP-CR-04-08 · La ejecución usa la credencial nueva Necesita ejecutar el workflow. Cubierto en Cypress: e2e/credentials/CR-04/credential-switch.api.cy.js. | pending | pending | igual |
| CR-05 | vyv/units/credentials/CR-05/CredentialSharing.ee.test.ts › CP-CR-05-04 · Compartir con un miembro (con licencia) IAM-1435: projects used in but not shared with shares the project when the Share action is clicked | passed | passed | igual |
| CR-05 | vyv/units/credentials/CR-05/CredentialSharing.ee.test.ts › CP-CR-05-06 · Aviso de pago al compartir sin licencia projects filtering should show upgrade action box when sharing is not enabled | passed | passed | igual |
| CR-05 | vyv/units/credentials/CR-05/CredentialsView.test.ts › CP-CR-05-01 · Buscar credenciales por nombre un término inexistente no lista ninguna credencial | passed | passed | igual |
| CR-05 | vyv/units/credentials/CR-05/CredentialsView.test.ts › CP-CR-05-01 · Buscar credenciales por nombre un término parcial devuelve solo las coincidencias | passed | passed | igual |
| CR-05 | vyv/units/credentials/CR-05/CredentialsView.test.ts › CP-CR-05-02 · Ordenar por nombre y fecha el desplegable de orden se cubre en Cypress: e2e/credentials/CR-05/sort.ui.cy.js | pending | pending | igual |
| CR-05 | vyv/units/credentials/CR-05/CredentialsView.test.ts › CP-CR-05-02 · Ordenar por nombre y fecha lista primero la credencial actualizada más recientemente (orden por defecto) | passed | passed | igual |
| CR-05 | vyv/units/credentials/CR-05/CredentialsView.test.ts › CP-CR-05-03 · Filtrar por tipo filters should filter by type | passed | passed | igual |
| CR-05 | vyv/units/credentials/sin-equivalente-unitario.test.ts › CP-CR-05-05 · Miembro no ve credenciales no compartidas Necesita los permisos de la API. Cubierto en Cypress: e2e/credentials/CR-05/isolation.api.cy.js. | pending | pending | igual |
| CO-01 | vyv/units/core/CO-01/AddColumnButton.test.ts › CP-CO-01-05 · Añadir columnas de los cuatro tipos should allow selecting different column types | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/AddColumnButton.test.ts › CP-CO-01-05 · Añadir columnas de los cuatro tipos should call addColumn with correct payload | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/AddColumnButton.test.ts › CP-CO-01-05 · Añadir columnas de los cuatro tipos should display all column type options | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/AddColumnButton.test.ts › CP-CO-01-07 · Nombre de columna con caracteres no permitidos should allow valid column names | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/AddColumnButton.test.ts › CP-CO-01-07 · Nombre de columna con caracteres no permitidos should show error for invalid column names | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-01 · Crear data table con nombre válido crea la tabla al pulsar Enter en el campo de nombre | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-01 · Crear data table con nombre válido crea la tabla desde cero en el proyecto actual y abre su detalle | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-01 · Crear data table con nombre válido vuelve a la lista de data tables al cancelar | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-02 · Nombre vacío o solo espacios deshabilita «Create» con un nombre de solo espacios | failed | passed | 🟢 corregido |
| CO-01 | vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-02 · Nombre vacío o solo espacios deshabilita «Create» mientras el nombre está vacío | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-02 · Nombre vacío o solo espacios no crea la tabla al pulsar Enter con un nombre de solo espacios | failed | passed | 🟢 corregido |
| CO-01 | vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-02 · Nombre vacío o solo espacios propone el nombre del CSV cuando el nombre tiene solo espacios | failed | passed | 🟢 corregido |
| CO-01 | vyv/units/core/CO-01/AddDataTableModal.test.ts › CP-CO-01-03 · Nombre duplicado en el proyecto muestra el error del servidor (p. ej. nombre duplicado) y no cierra ni navega | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/ColumnHeader.test.ts › CP-CO-01-08 · Renombrar y eliminar una columna con datos calls onDelete with the column id when delete is selected | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/ColumnHeader.test.ts › CP-CO-01-08 · Renombrar y eliminar una columna con datos onNameSubmit should call onRename when valid new name is provided | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/dataTable.store.columns.test.ts › CP-CO-01-08 · Renombrar y eliminar una columna con datos deleteDataTableColumn should delete column from data table | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/dataTable.store.columns.test.ts › CP-CO-01-08 · Renombrar y eliminar una columna con datos renameDataTableColumn should rename column in data table | passed | passed | igual |
| CO-01 | vyv/units/core/CO-01/dataTable.store.test.ts › CP-CO-01-01 · Crear data table con nombre válido createDataTable should create data table and update state | passed | passed | igual |
| CO-01 | vyv/units/core/sin-equivalente-unitario.test.ts › CP-CO-01-04 · Nombre en el límite de longitud La API valida el límite (el modal no limita la entrada). Cubierto en Cypress: co01 API «valores límite de la longitud del nombre». | pending | pending | igual |
| CO-01 | vyv/units/core/sin-equivalente-unitario.test.ts › CP-CO-01-06 · Nombre de columna duplicado La API rechaza el duplicado (el botón no lo comprueba). Cubierto en Cypress: co01 API «rechaza columna duplicada (409)». | pending | pending | igual |
| CO-02 | vyv/units/core/CO-02/columnUtils.test.ts › CP-CO-02-04 · Nulo frente a cadena vacía createValueGetter should return null for null values | passed | passed | igual |
| CO-02 | vyv/units/core/CO-02/columnUtils.test.ts › CP-CO-02-04 · Nulo frente a cadena vacía createValueGetter should return null for undefined values | passed | passed | igual |
| CO-02 | vyv/units/core/CO-02/columnUtils.test.ts › CP-CO-02-05 · Celda de más de 10 000 caracteres createCellClass should return "oversized-cell" for oversized values | passed | passed | igual |
| CO-02 | vyv/units/core/CO-02/columnUtils.test.ts › CP-CO-02-05 · Celda de más de 10 000 caracteres isOversizedValue should return true for strings exceeding max length | passed | passed | igual |
| CO-02 | vyv/units/core/CO-02/dataTable.store.test.ts › CP-CO-02-01 · Añadir fila con valores válidos insertRow should insert a row with the given data | passed | passed | igual |
| CO-02 | vyv/units/core/CO-02/useAgGrid.test.ts › CP-CO-02-06 · Ordenar por columna onSortChanged should update sort state when column is sorted | passed | passed | igual |
| CO-02 | vyv/units/core/CO-02/useDataTableColumnFilters.test.ts › CP-CO-02-07 · Filtrar por columna multiple filters should process multiple filters from different columns | passed | passed | igual |
| CO-02 | vyv/units/core/CO-02/useDataTableColumnFilters.test.ts › CP-CO-02-07 · Filtrar por columna text filters should process contains filter | passed | passed | igual |
| CO-02 | vyv/units/core/CO-02/useDataTableOperations.test.ts › CP-CO-02-01 · Añadir fila con valores válidos onCellValueChanged should update cell value successfully | passed | passed | igual |
| CO-02 | vyv/units/core/CO-02/useDataTableOperations.test.ts › CP-CO-02-02 · Texto en una columna number onCellValueChanged should revert cell value when update fails | passed | passed | igual |
| CO-02 | vyv/units/core/sin-equivalente-unitario.test.ts › CP-CO-02-03 · Fecha inválida La celda usa un selector de fecha. Cubierto en Cypress: CP-017-02 (la API rechaza «no-es-fecha» con 400). | pending | pending | igual |
| CO-02 | vyv/units/core/sin-equivalente-unitario.test.ts › CP-CO-02-08 · Leer y escribir filas desde el nodo Data Table Necesita ejecutar un workflow en el servidor. Cubierto en Cypress: e2e/core/CO-02/data-table-node.api.cy.js. | pending | pending | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) isFormulaLike detecta los disparadores y descarta el vacío | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) Neutralización de fórmulas (OWASP A03 / CWE-1236) -2+3 se exporta como texto | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) Neutralización de fórmulas (OWASP A03 / CWE-1236) @SUM(1+1) se exporta como texto | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) Neutralización de fórmulas (OWASP A03 / CWE-1236) +1+1 se exporta como texto | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) Neutralización de fórmulas (OWASP A03 / CWE-1236) =1+1 se exporta como texto | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) Neutralización de fórmulas (OWASP A03 / CWE-1236) =HYPERLINK("https://example.com";"clic") se exporta como texto | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) Neutralización de fórmulas (OWASP A03 / CWE-1236) no modifica valores que no son fórmulas | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) Neutralización de fórmulas (OWASP A03 / CWE-1236) sin la opción conserva el valor (columnas numéricas: -5 sigue siendo -5) | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) RFC 4180 (comportamiento previo, regresión) booleano | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) RFC 4180 (comportamiento previo, regresión) coma | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) RFC 4180 (comportamiento previo, regresión) comillas dobles | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) RFC 4180 (comportamiento previo, regresión) espacio inicial | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) RFC 4180 (comportamiento previo, regresión) número | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) RFC 4180 (comportamiento previo, regresión) salto de línea | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-escape.vyv.test.ts › escapeCsvValue (VyV) RFC 4180 (comportamiento previo, regresión) texto simple | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.errors.vyv.test.ts › CsvParserService · errores de entrada (VyV) archivo inexistente → FileUploadError | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.errors.vyv.test.ts › CsvParserService · errores de entrada (VyV) CSV con comilla sin cerrar → FileUploadError con el detalle del parser | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.errors.vyv.test.ts › CsvParserService · errores de entrada (VyV) CSV válido sigue funcionando (regresión) | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.errors.vyv.test.ts › CsvParserService · errores de entrada (VyV) fileId con path traversal → FileUploadError (y conserva el mensaje original) | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Caminos independientes del grafo (V(G) = 5) C1 solo espacios → string | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Caminos independientes del grafo (V(G) = 5) C1 vacío/undefined → string | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Caminos independientes del grafo (V(G) = 5) C2 booleano (sin distinguir mayúsculas) → boolean | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Caminos independientes del grafo (V(G) = 5) C3 número decimal → number | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Caminos independientes del grafo (V(G) = 5) C4 fecha ISO válida → date | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Caminos independientes del grafo (V(G) = 5) C4 fecha-hora ISO → date | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Caminos independientes del grafo (V(G) = 5) C5 texto → string | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) un literal no decimal (-Infinity) NO se infiere como number | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) un literal no decimal (0b101) NO se infiere como number | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) un literal no decimal (0x1A) NO se infiere como number | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) un literal no decimal (Infinity) NO se infiere como number | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) una fecha imposible (2023-02-29) NO se infiere como date | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) una fecha imposible (2024-02-30) NO se infiere como date | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) una fecha imposible (2024-02-31T10:00:00Z) NO se infiere como date | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Defecto encontrado (deben fallar antes del parche TDD) una fecha imposible (2024-04-31) NO se infiere como date | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Valores límite de fechas 29 de febrero solo es válido en año bisiesto | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Valores límite de fechas días 30/31 según el mes | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/csv-parser.infer-type.vyv.test.ts › CsvParserService.inferColumnType (VyV) Valores límite de fechas mes 13 se rechaza | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/data-table-csv-import.cleanup.vyv.test.ts › DataTableCsvImportService.cleanupFile (VyV) con un fileId válido delega la eliminación (regresión) | passed | passed | igual |
| CO-03 | packages/modules/data-table/backend/src/__tests__/data-table-csv-import.cleanup.vyv.test.ts › DataTableCsvImportService.cleanupFile (VyV) el error original del try sigue llegando al llamador cuando la limpieza va en finally | failed | passed | 🟢 corregido |
| CO-03 | packages/modules/data-table/backend/src/__tests__/data-table-csv-import.cleanup.vyv.test.ts › DataTableCsvImportService.cleanupFile (VyV) no lanza si la limpieza falla (no enmascara el error original de la importación) | failed | passed | 🟢 corregido |
| CO-03 | vyv/units/core/CO-03/dataTable.store.test.ts › CP-CO-03-01 · Importar un CSV válido createDataTable should create data table with CSV import parameters | passed | passed | igual |
| CO-03 | vyv/units/core/CO-03/DownloadDataTableModal.test.ts › CP-CO-03-06 · Exportar y comparar con el origen should emit confirm with false when clicking confirm without toggling checkbox | passed | passed | igual |
| CO-03 | vyv/units/core/CO-03/DownloadDataTableModal.test.ts › CP-CO-03-06 · Exportar y comparar con el origen should emit confirm with true when checkbox is checked then confirm is clicked | passed | passed | igual |
| CO-03 | vyv/units/core/CO-03/ImportCsvModal.test.ts › CP-CO-03-01 · Importar un CSV válido should import the completed upload | passed | passed | igual |
| CO-03 | vyv/units/core/CO-03/ImportCsvModal.test.ts › CP-CO-03-02 · CSV con columnas desiguales should clear loading and report the current upload failure | passed | passed | igual |
| CO-03 | vyv/units/core/sin-equivalente-unitario.test.ts › CP-CO-03-03 · CSV con tipos incompatibles El servidor infiere los tipos. Cubierto en Cypress CP-018-04 y en la prueba unitaria backend CP-018-07. | pending | pending | igual |
| CO-03 | vyv/units/core/sin-equivalente-unitario.test.ts › CP-CO-03-04 · CSV con BOM, separador ’;’ y tildes El servidor analiza el CSV. Cubierto en Cypress: e2e/core/CO-03/csv-encoding-size.api.cy.js (hallazgo con «;»). | pending | pending | igual |
| CO-03 | vyv/units/core/sin-equivalente-unitario.test.ts › CP-CO-03-05 · Importar un archivo grande Prueba de rendimiento en una instancia real. Cubierto en Cypress: e2e/core/CO-03/csv-encoding-size.api.cy.js. | pending | pending | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C1 · nombre vacío tras trim → "Folder name cannot be empty" (D1 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal : → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal ? → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal " → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal [ → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal ] → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal * → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal / → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal \ → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal ^ → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal < → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal > → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C2 · carácter ilegal \| → "contains invalid characters" (D1 = F, D2 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C3 · solo puntos → "cannot consist of dots only" (D3 = V) y NO evalúa D4 | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C4 · empieza por punto → "cannot start with a dot" (D3 = F, D4 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C5 · longitud 129 → "cannot be longer than 128" (D1..D4 = F, D5 = V) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) C6 · nombre válido en el límite (128) y con espacios externos → se acepta recortado | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) Límite: el recorte ocurre antes de medir (128 + espacios sigue siendo válido) | passed | passed | igual |
| CO-04 | packages/@n8n/api-types/src/schemas/__tests__/folder-name.schema.vyv.test.ts › folderNameSchema · caminos independientes (VyV) Punto en medio o al final es válido (no es "empieza por punto") | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/FolderBreadcrumbs.test.ts › CP-CO-04-02 · Anidar carpetas en varios niveles should render 2 levels of breadcrumbs | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/FolderBreadcrumbs.test.ts › CP-CO-04-05 · Navegar con las migas de pan should render folder breadcrumbs with actions | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/FolderCard.test.ts › CP-CO-04-05 · Navegar con las migas de pan navigation base-path handling renders the parent-folder breadcrumb link | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/folders.store.test.ts › CP-CO-04-01 · Crear carpeta en la raíz crea la carpeta en la raíz del proyecto cuando no hay carpeta padre | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/folders.store.test.ts › CP-CO-04-01 · Crear carpeta en la raíz crea una subcarpeta dentro de la carpeta padre indicada | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/folders.store.test.ts › CP-CO-04-02 · Anidar carpetas en varios niveles fetchFoldersAvailableForMove should cache the results on breadcrumbs cache | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/folders.store.test.ts › CP-CO-04-04 · Renombrar una carpeta envía el nombre nuevo de la carpeta a la API del proyecto | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/folders.store.test.ts › CP-CO-04-04 · Renombrar una carpeta propaga el error de la API (por ejemplo, nombre duplicado en el mismo nivel) | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/useFolders.test.ts › CP-CO-04-03 · Nombre vacío o duplicado en el mismo nivel validateFolderName Edge cases should handle empty string input | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/useFolders.test.ts › CP-CO-04-03 · Nombre vacío o duplicado en el mismo nivel validateFolderName should reject folder names longer than the maximum length | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/WorkflowsView.test.ts › CP-CO-04-01 · Crear carpeta en la raíz Folders refreshes the current project after a folder is created | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/WorkflowsView.test.ts › CP-CO-04-06 · Buscar workflows dentro de carpetas Folders entering a folder from search results should clear the search when opening a folder from search results | passed | passed | igual |
| CO-04 | vyv/units/core/CO-04/WorkflowsView.test.ts › CP-CO-04-06 · Buscar workflows dentro de carpetas WorkflowsView filters should set search filter based on query parameters | passed | passed | igual |
| CO-05 | packages/cli/src/services/__tests__/folder.service.vyv.test.ts › FolderService.deleteFolder (VyV, mocks) C1 · carpeta inexistente → FolderNotFoundError y no borra nada (D1 = F) | passed | passed | igual |
| CO-05 | packages/cli/src/services/__tests__/folder.service.vyv.test.ts › FolderService.deleteFolder (VyV, mocks) C2 · sin transferencia → archiva los workflows, borra y emite evento (D2 = V) | passed | passed | igual |
| CO-05 | packages/cli/src/services/__tests__/folder.service.vyv.test.ts › FolderService.deleteFolder (VyV, mocks) C3 · transferir a la misma carpeta → UserError y no hay transacción (D3 = V) | passed | passed | igual |
| CO-05 | packages/cli/src/services/__tests__/folder.service.vyv.test.ts › FolderService.deleteFolder (VyV, mocks) C4 · transferir a otra carpeta → valida destino y mueve en transacción (D4 = V) | passed | passed | igual |
| CO-05 | packages/cli/src/services/__tests__/folder.service.vyv.test.ts › FolderService.deleteFolder (VyV, mocks) C5 · transferir a la raíz del proyecto → no busca carpeta destino (D4 = F) | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/DeleteFolderModal.test.ts › CP-CO-05-06 · Eliminar carpeta con contenido transfiriendo transfiere el contenido a la raíz del proyecto | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/DeleteFolderModal.test.ts › CP-CO-05-06 · Eliminar carpeta con contenido transfiriendo transfiere el contenido a otra carpeta | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/DeleteFolderModal.test.ts › CP-CO-05-07 · Eliminar carpeta con contenido borrando borra la carpeta sin destino y notifica a la lista con los conteos | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/DeleteFolderModal.test.ts › CP-CO-05-07 · Eliminar carpeta con contenido borrando exige escribir «delete <nombre>» exacto para borrar el contenido | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/DeleteFolderModal.test.ts › CP-CO-05-07 · Eliminar carpeta con contenido borrando muestra el error y no notifica a la lista si la API falla | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/DeleteFolderModal.test.ts › CP-CO-05-07 · Eliminar carpeta con contenido borrando muestra el nombre de la carpeta y cuánto contenido tiene | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/DeleteFolderModal.test.ts › CP-CO-05-07 · Eliminar carpeta con contenido borrando no permite eliminar mientras no se elige qué hacer con el contenido | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/FolderCard.test.ts › CP-CO-05-05 · Eliminar una carpeta vacía should emit action event when action is clicked | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/folders.store.test.ts › CP-CO-05-04 · Impedir mover una carpeta dentro de sí misma o de una hija fetchFoldersAvailableForMove should fetch folders in a single page, empty filter | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/MoveToFolderModal.test.ts › CP-CO-05-01 · Mover un workflow a una carpeta should move selected workflow on submit | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/MoveToFolderModal.test.ts › CP-CO-05-02 · Mover un workflow de vuelta a la raíz should reset to project root when switching projects | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/MoveToFolderModal.test.ts › CP-CO-05-03 · Mover una carpeta con contenido should move selected folder on submit | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/MoveToFolderModal.test.ts › CP-CO-05-03 · Mover una carpeta con contenido should render for folder resource with workflows and subfolders | passed | passed | igual |
| CO-05 | vyv/units/core/CO-05/useFolders.test.ts › CP-CO-05-04 · Impedir mover una carpeta dentro de sí misma o de una hija handleDrop should not allow dropping a folder onto itself | passed | passed | igual |
| CO-05 | vyv/units/core/sin-equivalente-unitario.test.ts › CP-CO-05-08 · Sin workflows huérfanos tras eliminar Necesita la base de datos. Cubierto en parte: CP-020-05 (Cypress) y CP-020-06 (FolderService.deleteFolder con mocks). | pending | pending | igual |
