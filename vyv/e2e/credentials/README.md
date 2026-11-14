# Módulo 3 · Credenciales · pruebas E2E

Una spec por funcionalidad, con escenarios de éxito, alternativos y de error. Los casos que no necesitan el servidor también tienen prueba unitaria en [`../../units/credentials/`](../../units/credentials/).

| Carpeta | Spec | Casos |
| --- | --- | --- |
| `CR-01/` | `create.api.cy.js` | CP-CR-01-01 Header Auth · 01-02 sin dato obligatorio · 01-03/01-04 prueba de conexión · 01-05 tipo inexistente · 01-06 nombre repetido |
| `CR-01/` | `html-name.ui.cy.js` | CP-CR-01-08 · nombre con HTML se muestra como texto |
| `CR-01/` | `encryption-at-rest.api.cy.js` | CP-CR-01-07 · secreto cifrado en SQLite (`CYPRESS_dbPath`) |
| `CR-02/` | `edit-delete.api.cy.js` | CP-CR-02-01 valor nuevo en uso · 02-05 renombrar · 02-07 eliminar sin uso · 02-08 eliminar en uso · error: credencial inexistente |
| `CR-02/` | `secret-exposure.api.cy.js` | CP-CR-02-03, CP-CR-02-04 · el secreto no sale por la API ni en el JSON del workflow |
| `CR-03/` | `oauth2.api.cy.js` | CP-CR-03-01 URL de redirección · 03-03 cancelar en el proveedor · 03-04 scopes · error: credencial inexistente |
| `CR-04/` | `node-credentials.api.cy.js` | CP-CR-04-01 credencial asignada · 04-02 solo el tipo requerido · 04-05 credencial inexistente · 04-06 sin credencial · 04-07 sustituir |
| `CR-04/` | `credential-switch.api.cy.js` | CP-CR-04-08 · la ejecución usa la credencial nueva |
| `CR-05/` | `search-share.api.cy.js` | CP-CR-05-01 búsqueda · 05-03 filtro por tipo · 05-06 compartir sin licencia |
| `CR-05/` | `isolation.api.cy.js`, `sort.ui.cy.js` | CP-CR-05-05 · aislamiento entre usuarios · CP-CR-05-02 · orden del listado |

CP-CR-03-02 y 03-06 (conectar y reconectar con un proveedor real) tienen prueba unitaria con dobles de prueba en `../../units/credentials/CR-03/`. CP-CR-03-05 (revocar el acceso en la cuenta del proveedor) es manual: ver [`../../README.md`](../../README.md).
