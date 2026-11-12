# F3 — Ítem 4: Caja blanca y caja negra

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Para una función real por integrante: diagrama de flujo **del código**, grafo de flujo, V(G) por las tres fórmulas, caminos independientes y una prueba unitaria por camino. Para las 20 funcionalidades: particiones de equivalencia, valores límite y escenarios exitosos, alternativos y de error, ejecutados contra la instancia local y vinculados a los `CP-…`.

**Architecture:** Los diagramas se hacen en `.drawio`, con el estilo de los `.drawio` de Drive como referencia y el sistema visual de la skill `diagram-design`, y se exportan a PNG con el contenedor `rlespinasse/drawio-export`. Las pruebas por camino usan Vitest y `vitest-mock-extended` (ya presente en `packages/cli`). La caja negra se ejecuta por la API REST con `node:test` y `qa/shared/sut.mjs`.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-03-caja-blanca-negra`. **Fecha límite:** 13/11/2026.

**Preparación del controlador (INLINE, antes de despachar):**
- [ ] Instalar la skill: `npx skills add cathrynlavery/diagram-design`.
- [ ] Descargar de Drive `FLUJOS Y GRAFOS/FLUJO/Workflows/CP-WF-05-04.drawio` y su grafo homólogo a `qa/04-caja-blanca-negra/referencia/`.

---

### Plantilla común de F3.T1–F3.T4 (caja blanca)

Cada tarea T1–T4 aplica estos pasos a su función. La tabla de cada tarea fija los valores.

**Files (por tarea, con `<m>` = `workflows|ejecuciones|credenciales|core` y `<f>` = nombre de la función en kebab-case):**
- Create: `qa/04-caja-blanca-negra/<m>/<f>-flujo.drawio`, `<f>-grafo.drawio`, `<f>-flujo.png`, `<f>-grafo.png`
- Create: `qa/04-caja-blanca-negra/<m>/<f>.md` (análisis)
- Create: el archivo de prueba `*.vyv.test.ts` indicado en la tabla

**Interfaces:**
- Produces: describe `CB-<MÓDULO> <Clase>.<función>`, con un `it('camino <n>: <condiciones> → <resultado>')` por camino independiente. F4.T2 amplía estos archivos, no los reemplaza.
- Produces: en `<f>.md`, la tabla `Camino | Secuencia de nodos | Entradas | Resultado esperado | Prueba` y la sección `V(G)`.

- [ ] **Step 1:** Leer la función completa y las funciones privadas que llama y que deciden su flujo. Numerar los nodos sobre una copia del código en `<f>.md`; las condiciones compuestas (`&&`, `||`) se descomponen en un nodo por condición simple.
- [ ] **Step 2:** Dibujar `<f>-flujo.drawio` (diagrama de flujo del código: inicio, decisiones, procesos, fin) y `<f>-grafo.drawio` (grafo con los nodos numerados del paso 1 y las regiones etiquetadas R1…Rn). Exportar a PNG: `docker run --rm -v "$PWD/qa/04-caja-blanca-negra/<m>":/data rlespinasse/drawio-export -f png`.
- [ ] **Step 3:** Calcular V(G) = E − N + 2, V(G) = P + 1 y V(G) = número de regiones, mostrando E, N, P y las regiones. Expected: los tres valores coinciden; si no, corregir el grafo antes de seguir.
- [ ] **Step 4:** Listar exactamente V(G) caminos independientes. Cada uno añade al menos una arista nueva respecto a los anteriores.
- [ ] **Step 5: Write one test per path** in the test file. Patrón AAA comentado (`// Arrange`, `// Act`, `// Assert`), dependencias con `mock<T>()` de `vitest-mock-extended` y aserciones encadenadas (`expect(...).rejects.toThrow(...)`, `expect(spy).toHaveBeenCalledWith(...)`).
- [ ] **Step 6:** Run `pnpm --filter n8n test <ruta relativa a packages/cli> --maxWorkers=1 --reporter=default --reporter=junit --outputFile.junit=../../qa/evidencias/04/junit/<f>.xml`. Expected: PASS en todos los caminos. **Si un camino falla por un defecto real**, no se cambia la aserción: se abre un issue (`defecto.yml`, etiqueta del módulo) con `EV-04-<f>-<n>`, se anota en `<f>.md` y el caso se convierte en candidato de TDD para F4.T1.
- [ ] **Step 7:** Commit `test(<area>): add white-box path tests for <función>`.

---

### Task F3.T1 — Caja blanca de Workflows: `WebhookService._findWebhookConflicts`

| Campo | Valor |
|---|---|
| Ítem | 4 |
| Responsable | Alejandro Bermudez Bedoya |
| Modo / modelo | SDD / sonnet |
| Depende de | F0 |
| Código | `packages/cli/src/webhooks/webhook.service.ts:524` (privada; se ejerce mediante `findWebhookConflicts`, línea 585). Regla RN-02 y casos CP-WF-03-03 y CP-WF-03-04 |
| Prueba | `packages/cli/src/webhooks/__tests__/webhook.service.vyv.test.ts` |
| Evidencias | `EV-04-find-webhook-conflicts-1` (PNG del flujo), `-2` (PNG del grafo), `-3` (JUnit) |
| Destino Drive | `ENTREGABLES/04_Caja_Blanca_Negra/Workflows/` y `FLUJOS Y GRAFOS/{FLUJO,GRAFOS}/Workflows/` (archivos nuevos `CB-…`) |
| Aceptación | Los tres V(G) coinciden; hay tantas pruebas como caminos; JUnit sin fallos o fallos con issue. Los caminos cubren como mínimo: sin webhooks, conflicto local (mismo método y ruta en dos nodos), conflicto con otro workflow, coincidencia en el mismo workflow (no es conflicto) y sin coincidencia. |

`getNodeWebhooks` y `findWebhook` se sustituyen con `vi.spyOn(webhookService, …)`; el resto de dependencias, con `mock()`, como en `webhook.service.test.ts`.

---

### Task F3.T2 — Caja blanca de Ejecuciones: `ExecutionService.stop`

| Campo | Valor |
|---|---|
| Ítem | 4 |
| Responsable | Santiago Restrepo Fonnegra |
| Modo / modelo | SDD / sonnet |
| Depende de | F0 |
| Código | `packages/cli/src/executions/execution.service.ts:534` (`stop`, que incluye `assertStoppable` en la línea 593). Casos CP-EX-04-01…CP-EX-04-05 |
| Prueba | `packages/cli/src/executions/__tests__/execution.service.vyv.test.ts` |
| Evidencias | `EV-04-execution-stop-1`, `-2`, `-3` |
| Destino Drive | `ENTREGABLES/04_Caja_Blanca_Negra/Ejecuciones/` y `FLUJOS Y GRAFOS/{FLUJO,GRAFOS}/Ejecuciones/` |
| Aceptación | Los caminos cubren: identificador v2, ejecución inexistente (`MissingExecutionStopError`), estado no detenible (`WorkflowOperationError` con el estado en el mensaje), modo `regular`, modo de escalado y `stoppedAt` presente y ausente. |

`stopInRegularMode`, `stopInScalingMode` y `stopEngineV2Execution` se sustituyen con `vi.spyOn`; `globalConfig.executions.mode` se fija por caso.

---

### Task F3.T3 — Caja blanca de Credenciales: `CredentialsService.redact`

| Campo | Valor |
|---|---|
| Ítem | 4 |
| Responsable | Juan David Mosquera García |
| Modo / modelo | SDD / sonnet |
| Depende de | F0 |
| Código | `packages/cli/src/credentials/credentials.service.ts:1756` (`redact`, que incluye `getExtendedProps` y la privada `redactValues`). Regla RN-05, RNF-02 y casos CP-CR-02-02 y CP-CR-02-03 |
| Prueba | `packages/cli/src/credentials/__tests__/credentials.service.vyv.test.ts` |
| Evidencias | `EV-04-credentials-redact-1`, `-2`, `-3` |
| Destino Drive | `ENTREGABLES/04_Caja_Blanca_Negra/Credenciales/` y `FLUJOS Y GRAFOS/{FLUJO,GRAFOS}/Credenciales/` |
| Aceptación | Los caminos cubren: tipo de credencial desconocido (devuelve los datos sin cambios), tipo que hereda (`extends`), claves `oauthTokenData` y `csrfSecret`, propiedad de tipo `password` y propiedad no secreta. Una aserción comprueba que el objeto de entrada no se modifica, porque `redact` trabaja sobre `deepCopy`. |

`credentialTypes.getByName` es un *stub* con tipos de credencial mínimos definidos en la prueba.

---

### Task F3.T4 — Caja blanca de Core: `FolderService.deleteFolder`

| Campo | Valor |
|---|---|
| Ítem | 4 |
| Responsable | Mario Fernando Andrade Rojas |
| Modo / modelo | SDD / sonnet |
| Depende de | F0 |
| Código | `packages/cli/src/services/folder.service.ts:182`. Regla RN-07 y casos CP-CO-05-05…CP-CO-05-08 |
| Prueba | `packages/cli/src/services/__tests__/folder.service.vyv.test.ts` |
| Evidencias | `EV-04-folder-delete-1`, `-2`, `-3` |
| Destino Drive | `ENTREGABLES/04_Caja_Blanca_Negra/Core/` y `FLUJOS Y GRAFOS/{FLUJO,GRAFOS}/Core/` |
| Aceptación | Los caminos cubren: carpeta inexistente, borrar sin destino (`flattenAndArchive` y evento `folder-deleted`), transferir a la misma carpeta (`UserError`), transferir a `PROJECT_ROOT` (no valida el destino) y transferir a otra carpeta (valida el destino y mueve carpetas y workflows dentro de una transacción). |

`folderRepository.manager.transaction` es un *stub* que ejecuta el *callback* con un `tx` simulado.

---

### Task F3.T5 — Caja negra de las 20 funcionalidades

| Campo | Valor |
|---|---|
| Ítem | 4 |
| Responsable | Cada integrante su módulo (Alejandro: WF; Santiago: EX; Juan David: CR; Mario: CO) |
| Modo / modelo | SDD / sonnet; un subagente por módulo, que pueden ir en paralelo |
| Depende de | F0.T4 y F0.T5 (instancia local con propietario y licencia) |
| Evidencias | `EV-04-CN-<fid>-<n>` (JUnit y respuestas de API sin cabeceras de sesión) |
| Destino Drive | `ENTREGABLES/04_Caja_Blanca_Negra/Caja_Negra/` |
| Aceptación | Las 20 funcionalidades tienen las tres tablas. Cada límite cita el archivo y la línea del código o del DTO de donde sale. Cada fila con entrada de API tiene resultado **obtenido** de una ejecución real. Toda discrepancia entre lo esperado y lo obtenido tiene un issue. |

**Files:**
- Create: `qa/04-caja-blanca-negra/caja-negra/{workflows,ejecuciones,credenciales,core}.md`
- Create: `qa/04-caja-blanca-negra/caja-negra/{workflows,ejecuciones,credenciales,core}.test.mjs`
- Modify: `qa/package.json` (script `test:caja-negra`)

**Interfaces:**
- Consumes: `login`, `cleanupVyV`, `uniqueName` y `assertLicensed` de `qa/shared/sut.mjs`.
- Produces: títulos de prueba `CP-<fid>-NN [PE|VL] <clase o valor>`. Los resultados se añaden a `qa/03-ejecucion/resultados.json` solo como evidencia complementaria; no cambian el estado del CP.

- [ ] **Step 1:** Por funcionalidad, extraer los límites reales del código: DTO de `packages/@n8n/api-types/src/dto/**`, validaciones de los controladores y del frontend (`packages/frontend/editor-ui/src/features/**`), y `executions.maxTimeout` en `@n8n/config`.
- [ ] **Step 2:** Write the tables in `<m>.md`:
  - **PE:** clase, válida o inválida, representante, CP.
  - **VL:** mínimo, mínimo − 1, nominal, máximo, máximo + 1; con valor, esperado, obtenido y CP.
  - **Escenarios:** exitoso, alternativo y de error, con CP.
- [ ] **Step 3: Write the tests** in `<m>.test.mjs`, one per PE or VL row that can be exercised through `/rest` (por ejemplo, el nombre de una data table con longitud máxima y máxima + 1, o el timeout del workflow en 0, 1, máximo y máximo + 1). `before`: `cleanupVyV`. Las filas que solo se pueden ejercer en la interfaz se marcan `UI → F5` y su resultado lo aporta la suite de Cypress.
- [ ] **Step 4:** Run `npm run test:caja-negra --prefix qa -- --test-reporter=junit --test-reporter-destination=qa/evidencias/04/junit/caja-negra-<m>.xml`. Copiar el resultado obtenido de cada fila a la tabla. Abrir un issue por cada discrepancia.
- [ ] **Step 5:** Commit `test(qa): add black-box partitions and boundaries for <módulo>`.
- [ ] **Step 6: Cierre de F3 (controlador):** actualizar la matriz (regla de cierre de F2); subir los `.drawio` y PNG a Drive como archivos nuevos `CB-<f>-flujo.drawio` y `CB-<f>-grafo.drawio` en las carpetas de su módulo, y copiarlos a `ENTREGABLES/04_Caja_Blanca_Negra/`; PR draft; ledger.
