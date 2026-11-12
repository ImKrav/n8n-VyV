# F5 — Ítem 6: Cypress por integrante y pruebas de API con Postman/Newman

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada integrante automatiza en Cypress los casos de sus cinco funcionalidades, con aserciones explícitas, escenarios exitosos, alternativos y de error, reportes JUnit y mochawesome, vídeos y capturas. Además, una colección de Postman ejecutada con Newman prueba `/rest` y los webhooks de los cuatro módulos.

**Architecture:** Cypress se instala aislado en `qa/` (n8n ya no lo incluye). Los selectores `data-testid` se toman de los *page objects* de `packages/quality/testing/playwright/pages/`. La sesión se abre por API (`cy.request('/rest/login')`) para no depender de la interfaz de autenticación, que está fuera del alcance. Newman se ejecuta desde un script Node para que las contraseñas viajen por variables de entorno y no por argumentos.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-05-cypress-api`. **Fecha límite:** 14/11/2026.

---

### Task F5.T1 — Andamiaje de Cypress

| Campo | Valor |
|---|---|
| Ítem | 6 |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T4 y F0.T5 |
| Evidencias | `EV-06-CY-0` (salida de la especificación de humo, con JUnit, mochawesome y vídeo) |
| Destino Drive | `ENTREGABLES/06_Cypress_API/` |
| Aceptación | `npm run test:cypress --prefix qa -- --spec qa/06-cypress/cypress/e2e/humo.cy.mjs` en verde y con los cuatro tipos de salida en `qa/evidencias/06/`. |

**Files:**
- Modify: `qa/package.json` (devDependencies exactas: `cypress`, `cypress-multi-reporters`, `mocha-junit-reporter`, `cypress-mochawesome-reporter`, `@cypress/grep`; scripts `test:cypress` y `test:cypress:regresion`)
- Create: `qa/06-cypress/cypress.config.mjs`, `qa/06-cypress/cypress/support/e2e.mjs`, `qa/06-cypress/cypress/support/commands.mjs`, `qa/06-cypress/cypress/e2e/humo.cy.mjs`, `qa/06-cypress/README.md`

**Interfaces:**
- Produces: `baseUrl` = `process.env.N8N_BASE_URL ?? 'http://127.0.0.1:5678'`; `video: true`; `screenshotOnRunFailure: true`; carpetas `qa/evidencias/06/{videos,screenshots,mochawesome,junit}`; JUnit `junit/cypress-[hash].xml` con `testsuitesTitle` igual al nombre del spec.
- Produces: comandos `cy.loginApi(role?: 'owner' | 'member')`, `cy.cleanupVyV()` (vía `cy.task`, que importa `qa/shared/sut.mjs`), `cy.requireLicense(feature)` y `cy.evidencia(cp: string, n: number)`, que hace una captura con nombre `EV-06-<cp>-<n>`.
- Produces: si `cy.requireLicense` detecta una licencia inactiva, el `before` falla con un mensaje que empieza por `ENTORNO:`. F13 clasifica esos fallos como Blocked (entorno) y no como Fail (Review Focus #5). No se usa `skip`.
- Produces: etiqueta `@regresion` con `@cypress/grep` (`it('CP-… …', { tags: ['@regresion'] }, …)`).

- [ ] **Step 1:** Install the Linux dependencies listed in the Cypress documentation for the VPS OS (leer `/etc/os-release` primero). Then `npm i -D --save-exact --prefix qa cypress cypress-multi-reporters mocha-junit-reporter cypress-mochawesome-reporter @cypress/grep` and `npx --prefix qa cypress verify`.
- [ ] **Step 2: Write the smoke spec** `humo.cy.mjs`: `it('HUMO abre el editor con sesión')`. `cy.loginApi()`, `cy.visit('/home/workflows')` y `cy.get('[data-test-id="resource-list-item"], [data-testid="resources-list-empty"]').should('exist')`. Verificar los `data-testid` reales en `packages/quality/testing/playwright/pages/`.
- [ ] **Step 3:** Run it. Expected: FAIL porque los comandos no existen. Implement config, support and commands. Run it again. Expected: PASS, con JUnit, HTML de mochawesome y vídeo.
- [ ] **Step 4:** Commit `test(qa): scaffold isolated Cypress suite`.

---

### Plantilla común de F5.T2–F5.T5 (Cypress por integrante)

**Files:** `qa/06-cypress/cypress/e2e/<m>/<fid>.cy.mjs` para las cinco funcionalidades del módulo; `qa/06-cypress/cypress/fixtures/<m>/*` con datos `VyV-` (JSON de workflows y CSV).

- [ ] **Step 1:** Lista de casos: extraer de `qa/02-trazabilidad/CASOS Y ESCENARIOS DE PRUEBAS.xlsx` los CP del módulo con `Automatizable = Sí`, más todo caso que pueda automatizarse por la interfaz sin servicios externos. Guardarla en `qa/06-cypress/<m>.casos.md` con la columna `Automatizado (Sí/No) | Motivo`.
- [ ] **Step 2:** Por cada CP de la lista, un `it('CP-<fid>-NN <título del caso>')`. Pasos y datos del detalle del caso en la matriz. **Al menos una aserción explícita por resultado esperado** (`should('have.text', …)`, `should('be.disabled')`, `its('status').should('eq', 400)`, etc.) y `cy.evidencia(cp, n)` en cada paso con resultado esperado. `beforeEach`: `cy.cleanupVyV()` y `cy.loginApi()`. Nombres con `uniqueName(cp)`.
- [ ] **Step 3:** Cada funcionalidad tiene al menos un escenario exitoso, uno alternativo y uno de error. Marcarlos en el título con `[éxito]`, `[alternativo]` o `[error]`.
- [ ] **Step 4:** Tag `@regresion` en todos los CP de prioridad alta del módulo.
- [ ] **Step 5:** Run `npm run test:cypress --prefix qa -- --spec 'qa/06-cypress/cypress/e2e/<m>/**'`. Expected: cada prueba pasa o falla por un **defecto real**. Ante un fallo, distinguir primero entre selector o tiempo de espera (corregir la prueba) y comportamiento del producto (issue `[CP-…]` con el vídeo y la captura como `EV-06-<cp>-<n>`). Nunca se usan `skip`, `only` ni `retries`.
- [ ] **Step 6:** Commit `test(qa): add Cypress suite for <módulo>`.

### Task F5.T2 — Cypress de Workflows (WF-01…WF-05)

| Campo | Valor |
|---|---|
| Ítem | 6 |
| Responsable | Alejandro Bermudez Bedoya |
| Modo / modelo | SDD / sonnet |
| Depende de | F5.T1 |
| Evidencias | `EV-06-CP-WF-*`, JUnit, mochawesome y vídeos de `e2e/workflows` |
| Destino Drive | `ENTREGABLES/06_Cypress_API/Workflows/` |
| Aceptación | Todo CP de `workflows.casos.md` marcado Sí tiene su `it`; cada WF tiene éxito, alternativo y error; cada fallo tiene issue. Para WF-05, las plantillas necesitan salida a internet: si `api.n8n.io` no responde, el `before` falla con `ENTORNO:`. |

### Task F5.T3 — Cypress de Ejecuciones (EX-01…EX-05)

| Campo | Valor |
|---|---|
| Ítem | 6 |
| Responsable | Santiago Restrepo Fonnegra |
| Modo / modelo | SDD / sonnet |
| Depende de | F5.T1 |
| Evidencias | `EV-06-CP-EX-*`, JUnit, mochawesome y vídeos de `e2e/ejecuciones` |
| Destino Drive | `ENTREGABLES/06_Cypress_API/Ejecuciones/` |
| Aceptación | Igual que F5.T2. Las ejecuciones de prueba se crean disparando por API workflows `VyV-` con Manual Trigger, Wait y Code. Para CP-EX-04-07 y CP-EX-04-08 la instancia se levanta con `N8N_CONCURRENCY_PRODUCTION_LIMIT=1` en un compose alternativo. |

### Task F5.T4 — Cypress de Credenciales (CR-01…CR-05)

| Campo | Valor |
|---|---|
| Ítem | 6 |
| Responsable | Juan David Mosquera García |
| Modo / modelo | SDD / sonnet |
| Depende de | F5.T1 |
| Evidencias | `EV-06-CP-CR-*`, JUnit, mochawesome y vídeos de `e2e/credenciales` |
| Destino Drive | `ENTREGABLES/06_Cypress_API/Credenciales/` |
| Aceptación | Igual que F5.T2. CR-03 usa el servicio `oauth2` del compose (`mock-oauth2-server`) con la credencial genérica *OAuth2 API*. CR-05 usa el usuario miembro de `qa/.env`. Las capturas no muestran secretos: los campos `password` se comprueban como enmascarados. |

### Task F5.T5 — Cypress de Core (CO-01…CO-05)

| Campo | Valor |
|---|---|
| Ítem | 6 |
| Responsable | Mario Fernando Andrade Rojas |
| Modo / modelo | SDD / sonnet |
| Depende de | F5.T1 |
| Evidencias | `EV-06-CP-CO-*`, JUnit, mochawesome y vídeos de `e2e/core` |
| Destino Drive | `ENTREGABLES/06_Cypress_API/Core/` |
| Aceptación | Igual que F5.T2. CO-04 y CO-05 empiezan con `cy.requireLicense('folders')`. Los CSV de CO-03 (válido, columnas desiguales, tipos incompatibles, BOM con `;` y tildes, 10 000 filas) se generan con un script en `fixtures/core/` y no se escriben a mano. |

---

### Task F5.T6 — Pruebas de API con Postman/Newman

| Campo | Valor |
|---|---|
| Ítem | 6 (otras herramientas) |
| Responsable | Cada integrante su carpeta de la colección |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T4 y F0.T5 |
| Evidencias | `EV-06-API-1` (JUnit de Newman), `EV-06-API-2` (HTML de htmlextra) |
| Destino Drive | `ENTREGABLES/06_Cypress_API/API/` |
| Aceptación | La colección tiene cuatro carpetas (WF, EX, CR, CO), con éxito, alternativo y error por funcionalidad; un webhook de prueba y uno de producción responden; las respuestas de credenciales no contienen el valor secreto enviado (aserción explícita, RNF-02); `npm run test:api --prefix qa` genera los dos reportes. |

**Files:**
- Create: `qa/06-api/n8n-vyv.postman_collection.json`, `qa/06-api/local.postman_environment.json` (sin secretos), `qa/06-api/run.mjs`, `qa/06-api/README.md`
- Modify: `qa/package.json` (devDependencies exactas `newman` y `newman-reporter-htmlextra`; script `test:api`)

**Interfaces:**
- Produces: `node qa/06-api/run.mjs [--env local|pruebas]` llama a `newman.run()` con `envVar` tomado de `process.env` (`N8N_BASE_URL`, `N8N_OWNER_EMAIL`, `N8N_OWNER_PASSWORD`). Reportes en `qa/evidencias/06/api/`. Nombres de las peticiones `CP-<fid>-NN <descripción>` o `API-<fid>-NN <descripción>` cuando no hay CP equivalente.

- [ ] **Step 1:** Verify each endpoint in its controller before using it: `workflows.controller.ts`, `executions.controller.ts`, `credentials.controller.ts`, `data-table.controller.ts`, `folder.controller.ts`, and the publication or activation route of 2.48.0. Write the endpoint table in the README.
- [ ] **Step 2:** Write the collection. Una petición `login` de nivel de colección (*pre-request*) guarda la cookie. Pruebas `pm.test('…', () => pm.expect(...))` con estado HTTP, esquema mínimo y valores. Para los webhooks: crear un workflow `VyV-` con nodo Webhook, llamar a `/webhook-test/<path>` (con escucha de prueba) y, tras publicarlo, a `/webhook/<path>`; después despublicarlo y comprobar el 404.
- [ ] **Step 3:** Write `run.mjs` and run `npm run test:api --prefix qa`. Expected: reportes generados; cada fallo se analiza como en F5.T2, Step 5.
- [ ] **Step 4:** Commit `test(qa): add Postman collection and Newman runner`.
- [ ] **Step 5: Cierre de F5 (controlador):** añadir los resultados de F5 a `resultados.json`, actualizar la matriz, subir los reportes y vídeos a `ENTREGABLES/06_Cypress_API/` por módulo, PR draft y ledger.
