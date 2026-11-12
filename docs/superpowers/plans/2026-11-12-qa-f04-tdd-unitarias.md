# F4 — Ítem 5: TDD y pruebas unitarias automatizadas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Production-code tasks REQUIRE superpowers:test-driven-development.

**Goal:** Una corrección hecha con TDD y visible en el historial de commits (RED → GREEN → REFACTOR), y pruebas unitarias del código seleccionado con AAA, FIRST, aserciones fluidas, los cinco tipos de dobles de prueba y una cobertura medida con v8 de al menos 80 % de líneas y de ramas por función.

**Architecture:** Vitest en `packages/cli`, con `@vitest/coverage-v8` 5.0.1 (ya está en el catálogo del monorepo). Un script de `qa/` calcula la cobertura **por función** a partir de `lcov.info`, porque los archivos seleccionados son mucho más grandes que las funciones.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-04-tdd`. **Fecha límite:** 14/11/2026.

---

### Task F4.T1 — Corrección con TDD

| Campo | Valor |
|---|---|
| Ítem | 5 (y aporta al 14) |
| Responsable | Integrante del módulo del defecto elegido |
| Modo / modelo | SDD / sonnet, con `superpowers:test-driven-development` |
| Depende de | F3 |
| Evidencias | `EV-05-TDD-1` (salida de la prueba en RED), `EV-05-TDD-2` (salida en GREEN), `EV-05-TDD-3` (salida tras REFACTOR), `EV-05-TDD-4` (`git log --oneline` con los tres commits) |
| Destino Drive | `ENTREGABLES/05_TDD_Unitarias/` |
| Aceptación | En `git log` aparecen, en este orden, `test: … (RED)`, `fix: … (GREEN)` y `refactor: … (REFACTOR)`; `EV-05-TDD-1` muestra la prueba fallando por la aserción, no por un error de compilación; el issue del defecto queda en estado Corregido y cita los tres SHA. |

**Selección del defecto (el controlador decide antes de despachar):**
1. El defecto confirmado de F3 con mayor severidad cuya corrección cabe en una función de `packages/cli` o de `editor-ui`.
2. Hipótesis que F3.T4 y F3.T5 deben confirmar o descartar: en `FolderService.deleteFolder` (`packages/cli/src/services/folder.service.ts:182`), transferir el contenido a una **subcarpeta** de la carpeta eliminada no se valida. `FolderRepository.moveAllToFolder` (`packages/@n8n/db/src/repositories/folder.repository.ts:320`) asignaría a esa subcarpeta su propio identificador como padre. Si se confirma con una prueba de caja negra contra la API (CO-05), es el candidato.
3. Si F3 no confirma ningún defecto, el controlador propone al usuario una mejora concreta y espera su elección. No se inventa un defecto.

**Files:** los que exija la corrección; la prueba va en el `*.vyv.test.ts` del archivo corregido.

- [ ] **Step 1 (RED):** Write the test that reproduces the defect, named after the expected behavior (lenguaje neutro si es de seguridad). Run `pnpm --filter n8n test <archivo> --maxWorkers=1 > qa/evidencias/05/tdd-red.txt 2>&1`. Expected: FAIL por la aserción.
- [ ] **Step 2:** Commit only the test: `test(<area>): <comportamiento> (RED)`, cuerpo `Refs #<issue>`.
- [ ] **Step 3 (GREEN):** Write the minimum production code that makes it pass. Respetar AGENTS.md: `UserError` para entradas inválidas, sin `any` y sin `as`; si toca la interfaz, textos en `@n8n/i18n`.
- [ ] **Step 4:** Run the test and all `*.test.ts` of the same folder. Save the output in `tdd-green.txt`. Expected: PASS.
- [ ] **Step 5:** Commit `fix(<area>): <qué hace ahora el código> (GREEN)`.
- [ ] **Step 6 (REFACTOR):** Refactor without changing behavior (por ejemplo, extraer la validación a un método privado con nombre). Run the same tests and save `tdd-refactor.txt`. Expected: PASS. Run `pnpm exec biome format` and `pnpm exec eslint` on the changed files only.
- [ ] **Step 7:** Commit `refactor(<area>): <cambio> (REFACTOR)`. Guardar `git log --oneline -3` como `EV-05-TDD-4` y comentar en el issue los tres SHA.

---

### Task F4.T2 — Pruebas unitarias del código seleccionado, dobles de prueba y cobertura

| Campo | Valor |
|---|---|
| Ítem | 5 |
| Responsable | Cada integrante su archivo de F3 |
| Modo / modelo | SDD / sonnet |
| Depende de | F3.T1–F3.T4 y F4.T1 |
| Evidencias | `EV-05-COV-1` (HTML de cobertura), `EV-05-COV-2` (`lcov.info`), `EV-05-COV-3` (tabla de cobertura por función), `EV-05-FIRST-1` (dos ejecuciones con `--sequence.shuffle` y semillas distintas, ambas en verde) |
| Destino Drive | `ENTREGABLES/05_TDD_Unitarias/` |
| Aceptación | `cobertura-funciones.mjs` informa ≥ 80 % de líneas y ≥ 80 % de ramas en las cuatro funciones (más la función de F4.T1); los cinco tipos de doble aparecen al menos una vez y están catalogados en el README; todas las pruebas están en verde con orden aleatorio. |

**Files:**
- Modify: los cuatro `*.vyv.test.ts` de F3
- Create: `qa/05-tdd-unitarias/README.md` (catálogo `Prueba | Patrón AAA | Dobles usados | Principio FIRST que garantiza`)
- Create: `qa/05-tdd-unitarias/funciones.json`, `qa/05-tdd-unitarias/cobertura-funciones.mjs`, `qa/05-tdd-unitarias/cobertura-funciones.test.mjs`, `qa/05-tdd-unitarias/fixtures/lcov-ejemplo.info`

**Interfaces:**
- Produces: `funciones.json` = `[{ "archivo": "packages/cli/src/webhooks/webhook.service.ts", "inicio": "private async _findWebhookConflicts(" }, …]`, con las cuatro funciones de F3 y la de F4.T1.
- Produces: `node qa/05-tdd-unitarias/cobertura-funciones.mjs --lcov <ruta> --funciones qa/05-tdd-unitarias/funciones.json --umbral 80`. Localiza el rango de cada función desde la línea que contiene `inicio` hasta la llave de cierre del mismo nivel, calcula líneas (`DA`) y ramas (`BRDA`) dentro del rango, imprime una tabla Markdown y sale con código 1 si alguna queda bajo el umbral. Las fases F8 y F14 reutilizan este script.

- [ ] **Step 1: Write the failing tests** of the script in `cobertura-funciones.test.mjs`, sobre `lcov-ejemplo.info` y un archivo fuente de ejemplo:
  - `test('calcula 100 % cuando todas las líneas del rango tienen DA>0')`.
  - `test('sale con 1 si las ramas quedan bajo el umbral')`.
  - `test('ignora líneas fuera del rango de la función')`.
- [ ] **Step 2:** Run `node --test qa/05-tdd-unitarias`. Expected: FAIL. Then implement the script and run it again. Expected: PASS.
- [ ] **Step 3:** Complete the test doubles in the `*.vyv.test.ts` files so that each type appears at least once:
  - **Dummy:** `mock<User>()` pasado y no usado en `deleteFolder`.
  - **Stub:** `credentialTypes.getByName` con respuesta fija.
  - **Spy:** `vi.spyOn(eventService, 'emit')`.
  - **Mock con expectativas:** `mock<FolderRepository>()` con `toHaveBeenCalledWith`.
  - **Fake:** `FakeFolderRepository`, en memoria sobre un `Map`, que implementa solo `findOneBy`, `delete` y `moveAllToFolder`, usado en al menos un camino de `deleteFolder`.
  
  Fechas deterministas con `vi.useFakeTimers()` y `vi.resetAllMocks()` en `beforeEach`.
- [ ] **Step 4:** Run with coverage:
  `pnpm --filter n8n test <los 4 archivos .vyv.test.ts> --maxWorkers=1 --coverage.enabled --coverage.provider=v8 --coverage.reporter=lcov --coverage.reporter=html --coverage.include=<los 4 archivos fuente y el de F4.T1> --coverage.reportsDirectory=../../qa/evidencias/05/coverage`
  Expected: PASS y `qa/evidencias/05/coverage/lcov.info` existe.
- [ ] **Step 5:** Run `node qa/05-tdd-unitarias/cobertura-funciones.mjs --lcov qa/evidencias/05/coverage/lcov.info --funciones qa/05-tdd-unitarias/funciones.json --umbral 80 > qa/evidencias/05/cobertura-funciones.md`. Expected: código 0. Si una función queda bajo el umbral, añadir pruebas de los caminos o condiciones que faltan; nunca bajar el umbral.
- [ ] **Step 6:** Run the tests twice with `--sequence.shuffle --sequence.seed=1` and `--sequence.seed=2` (`EV-05-FIRST-1`). Expected: PASS en las dos.
- [ ] **Step 7:** Write the README catalogue. Commit `test(qa): complete unit test doubles and per-function coverage`.
- [ ] **Step 8: Cierre de F4 (controlador):** matriz, evidencias, PR draft, Drive y ledger.
