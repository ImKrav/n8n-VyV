# Módulo 1 · Workflows · pruebas E2E

Casos del plan que necesitan el servidor o un navegador real. Los demás casos del módulo están en [`../../units/workflows/`](../../units/workflows/).

| Carpeta | Spec | Casos |
| --- | --- | --- |
| `WF-01/` | `large-workflow.ui.cy.js` | CP-WF-01-08 · rendimiento del lienzo con 100 nodos |
| `WF-03/` | `webhook-publish.api.cy.js` | CP-WF-03-02, CP-WF-03-04, CP-WF-03-08 (reinicio con `CYPRESS_restartCommand`) |
