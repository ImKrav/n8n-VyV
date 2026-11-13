# Módulo 3 · Credenciales · pruebas E2E

Casos del plan que necesitan el servidor, la base de datos o un navegador real. Los demás casos del módulo están en [`../../units/credentials/`](../../units/credentials/).

| Carpeta | Spec | Casos |
| --- | --- | --- |
| `CR-01/` | `encryption-at-rest.api.cy.js` | CP-CR-01-07 · secreto cifrado en SQLite (`CYPRESS_dbPath`) |
| `CR-02/` | `secret-exposure.api.cy.js` | CP-CR-02-03, CP-CR-02-04 · el secreto no sale por la API ni en el JSON del workflow |
| `CR-04/` | `credential-switch.api.cy.js` | CP-CR-04-08 · la ejecución usa la credencial nueva |
| `CR-05/` | `isolation.api.cy.js`, `sort.ui.cy.js` | CP-CR-05-05 · aislamiento entre usuarios · CP-CR-05-02 · orden del listado |

CP-CR-03-05 (revocar el acceso en la cuenta del proveedor OAuth2) es manual: ver [`../../README.md`](../../README.md).
