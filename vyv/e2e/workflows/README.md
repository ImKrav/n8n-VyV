# Módulo 1 · Workflows · pruebas E2E

Una spec por funcionalidad, con escenarios de éxito, alternativos y de error. Los casos que no necesitan el servidor también tienen prueba unitaria en [`../../units/workflows/`](../../units/workflows/).

| Carpeta | Spec | Casos |
| --- | --- | --- |
| `WF-01/` | `canvas-edit.ui.cy.js` | CP-WF-01-01 nodos conectados tras recargar · 01-02/01-05 eliminar y deshacer · 01-04 nodo desactivado · 01-07 nota adhesiva · error: workflow inexistente |
| `WF-01/` | `large-workflow.ui.cy.js` | CP-WF-01-08 · rendimiento del lienzo con 100 nodos |
| `WF-01/` | `canvas-edit.feature` | Gherkin + Screenplay: 4 escenarios de éxito, alternativos y de error · CP-WF-01-01 · 01-02 · 01-04 · 01-05 |
| `WF-02/` | `manual-executions.ui.cy.js` | CP-WF-02-02 · no guardar ejecuciones manuales (y control con el valor por defecto) |
| `WF-02/` | `settings.api.cy.js` | CP-WF-02-05/02-06 ajustes persistentes · 02-01 no guardar éxitos · 02-03 timeout · 02-04 workflow de error |
| `WF-02/` | `settings.feature` | Gherkin + Screenplay: 4 escenarios de éxito, alternativos y de error · CP-WF-02-01 · 02-03 · 02-04 · 02-05 · 02-06 |
| `WF-03/` | `webhook-publish.api.cy.js` | CP-WF-03-01 sin trigger · 03-02 webhook de producción · 03-03 ruta en conflicto · 03-04 métodos distintos · 03-05 despublicar · 03-08 reinicio (`CYPRESS_restartCommand`) |
| `WF-03/` | `unpublished-changes.ui.cy.js` | CP-WF-03-07 · producción usa la versión publicada hasta publicar los cambios; indicador de cambios en la interfaz |
| `WF-03/` | `publish.feature` | Gherkin + Screenplay: 4 escenarios de éxito, alternativos y de error · CP-WF-03-01 · 03-02 · 03-03 · 03-05 |
| `WF-04/` | `version-history.api.cy.js` | CP-WF-04-01 versiones · 04-02 nombre sin licencia · 04-03 restaurar · 04-04/04-06 clonar e importar · 04-05 comparar · error: versión inexistente |
| `WF-04/` | `version-history.feature` | Gherkin + Screenplay: 4 escenarios de éxito, alternativos y de error · CP-WF-04-01 · 04-02 · 04-03 |
| `WF-05/` | `import-duplicate.api.cy.js` | CP-WF-05-01 plantillas · 05-03 importar desde URL · 05-04 URL inválida · 05-05 nombres límite · 05-06 duplicado con etiquetas |
| `WF-05/` | `import-duplicate.feature` | Gherkin + Screenplay: 8 escenarios de éxito, alternativos y de error · CP-WF-05-04 · 05-05 · 05-06 |
