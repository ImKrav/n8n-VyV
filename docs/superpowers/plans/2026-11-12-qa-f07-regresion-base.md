# F7 — Ítem 9: Suite de regresión y ejecución de línea base

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Definir la suite `@regresion` con su criterio de selección y ejecutarla contra la imagen `v-baseline`, **antes** de que F4.T1 o F14 integren cambios de producción en la imagen bajo prueba.

**Architecture:** La suite reúne lo etiquetado `@regresion` en Cypress (F5) y en BDD (F6), más las pruebas unitarias `*.vyv.test.ts`. Un script compara dos conjuntos de JUnit y genera la tabla comparativa que F14 completa.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-07-regresion`. **Fecha límite:** 14/11/2026.

> **Nota de orden:** F4.T1 cambia código de producción en la rama, pero la instancia de F7 usa la imagen `ghcr.io/imkrav/n8n-vyv:v-baseline`, compilada desde la etiqueta `v-baseline`. Por eso la línea base sigue siendo válida aunque F4 haya terminado.

---

### Task F7.T1 — Suite `@regresion`, línea base y comparador

| Campo | Valor |
|---|---|
| Ítem | 9 |
| Responsable | Líder de pruebas `[PENDIENTE]`; cada integrante valida la selección de su módulo |
| Modo / modelo | SDD / sonnet |
| Depende de | F5 y F6 |
| Evidencias | `EV-09-BASE-1` (JUnit de Cypress `@regresion`), `EV-09-BASE-2` (JUnit de BDD `@regresion`), `EV-09-BASE-3` (JUnit de las unitarias sobre el código de `v-baseline`), `EV-09-BASE-4` (`qa/09-regresion/linea-base.md`) |
| Destino Drive | `ENTREGABLES/09_Regresion/` |
| Aceptación | `seleccion.md` justifica cada caso según los criterios; la línea base se ejecutó con `N8N_IMAGE=ghcr.io/imkrav/n8n-vyv:v-baseline` (consta en la evidencia); `comparar.mjs` está probado y genera `linea-base.md`. |

**Files:**
- Create: `qa/09-regresion/seleccion.md`, `qa/09-regresion/comparar.mjs`, `qa/09-regresion/comparar.test.mjs`, `qa/09-regresion/fixtures/{a,b}/*.xml`, `qa/09-regresion/README.md`
- Modify: `qa/package.json` (script `test:regresion`, que ejecuta Cypress con `--env grepTags=@regresion` y después BDD con `--tags @regresion`)

**Interfaces:**
- Produces: `node qa/09-regresion/comparar.mjs --antes <dir-junit> --despues <dir-junit> --salida <md>`. Une los casos por el prefijo `CP-…` o `ES-…` del título y escribe la tabla `Caso | Antes | Después | Cambio`, con cambio `=`, `Corregido`, `Regresión`, `Nuevo` o `Retirado`, más los totales. Sale con código 1 si hay alguna `Regresión`. F14.T3 lo usa.

**Criterios de selección (se copian en `seleccion.md`):** (a) los CP de prioridad alta con automatización; (b) los escenarios ES-01…ES-06; (c) los CP relacionados con cada corrección de F4 y F14; (d) un caso de humo por módulo. Se excluyen los casos Blocked.

- [ ] **Step 1: Write the failing tests** in `comparar.test.mjs`:
  - `test('marca Regresión cuando pasa de passed a failed')`.
  - `test('marca Corregido cuando pasa de failed a passed')`.
  - `test('marca Nuevo cuando el caso no existe antes')`.
  - `test('sale con 1 si hay Regresión')`.
- [ ] **Step 2:** Run `node --test qa/09-regresion`. Expected: FAIL. Implement `comparar.mjs` (lee JUnit con una expresión regular sobre `<testcase name=…>` y `<failure`, sin dependencias). Run again. Expected: PASS.
- [ ] **Step 3:** Write `seleccion.md` from the `@regresion` tags in F5 and F6. Comprobar que todo CP de prioridad alta automatizado tiene la etiqueta: `grep` de los CP con etiqueta frente a la lista de prioridad alta de la matriz. Expected: ningún faltante, o un motivo escrito para cada uno.
- [ ] **Step 4:** Ejecutar la línea base: `N8N_IMAGE=ghcr.io/imkrav/n8n-vyv:v-baseline npm run sut:up --prefix qa`, luego `npm run test:regresion --prefix qa`. Las unitarias de la línea base se ejecutan en un `git worktree` de `v-baseline` más los archivos `*.vyv.test.ts`, para que prueben el código original. Guardar los JUnit en `qa/evidencias/09/base/`.
- [ ] **Step 5:** Write `linea-base.md` with the date, the image digest (`docker inspect --format '{{index .RepoDigests 0}}'`), the totals and the failures linked to their issues.
- [ ] **Step 6:** Commit `test(qa): add regression suite selection, comparer and baseline run`.
- [ ] **Step 7: Cierre de F7 (controlador):** matriz, Drive, PR draft y ledger.
