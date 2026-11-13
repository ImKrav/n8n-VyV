# Módulo 2 · Ejecuciones · pruebas E2E

Casos del plan que necesitan el servidor. Los demás casos del módulo están en [`../../units/executions/`](../../units/executions/).

| Carpeta | Spec | Casos |
| --- | --- | --- |
| `EX-01/` | `many-executions.api.cy.js` | CP-EX-01-08 · lista global con más de 1 000 ejecuciones |
| `EX-04/` | `concurrency-queue.api.cy.js` | CP-EX-04-08 · cola con límite de concurrencia (n8n con `N8N_CONCURRENCY_PRODUCTION_LIMIT=2`) |
