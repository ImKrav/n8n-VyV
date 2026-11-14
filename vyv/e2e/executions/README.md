# Módulo 2 · Ejecuciones · pruebas E2E

Una spec por funcionalidad, con escenarios de éxito, alternativos y de error. Los casos que no necesitan el servidor también tienen prueba unitaria en [`../../units/executions/`](../../units/executions/).

| Carpeta | Spec | Casos |
| --- | --- | --- |
| `EX-01/` | `execution-states.api.cy.js` | CP-EX-01-01 éxito · 01-02 error · 01-03 en espera · 01-04 en ejecución → éxito · 01-07 lista global y del workflow |
| `EX-01/` | `many-executions.api.cy.js` | CP-EX-01-08 · lista global con más de 1 000 ejecuciones |
| `EX-02/` | `filters.api.cy.js` | CP-EX-02-01 estado · 02-02 workflow · 02-03 fechas límite · 02-04 filtros combinados · 02-05 sin filtros · error: filtro mal formado |
| `EX-03/` | `preview-retry-delete.api.cy.js` | CP-EX-03-01 vista previa · 03-02 nodo con error · 03-03/03-04 reintentos · 03-05/03-06 eliminar · hallazgo: ejecución eliminada responde 200 |
| `EX-04/` | `stop.api.cy.js` | CP-EX-04-02 en curso · 04-03 en espera · 04-04 seleccionadas · 04-05 todas · hallazgo: detener una terminada responde 500 |
| `EX-04/` | `concurrency-queue.api.cy.js` | CP-EX-04-07/04-08 · cola con límite de concurrencia (n8n con `N8N_CONCURRENCY_PRODUCTION_LIMIT=2`) |
| `EX-05/` | `execution-log.api.cy.js` | CP-EX-05-01 orden y rama · 05-02 entrada y salida · 05-03 nodo con error · 05-04 ejecución hija |
