# F13 — Ítem 3: Desarrollo y ejecución del plan (consolidación de los 142 casos)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ejecutar los 142 casos sobre el alcance definido, unir los resultados de todas las suites por `CP-…` y documentar entorno, datos, procedimientos, resultados, defectos, cobertura, métricas y las diferencias entre lo planeado y lo ejecutado.

**Architecture:** Un consolidador lee todos los JUnit de `qa/evidencias/*/junit/`, la lista de licencias de F0 y los issues de GitHub, y escribe `qa/03-ejecucion/resultados.json` (esquema de F2.T1). Los casos que ninguna suite cubrió se ejecutan con "procedimientos asistidos": pruebas Playwright que siguen paso a paso el detalle del caso en la matriz y guardan una captura por paso. Un script calcula las métricas a partir de `resultados.json`.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-13-ejecucion`. **Fecha límite:** 16/11/2026.

---

### Task F13.T1 — Consolidador de resultados

| Campo | Valor |
|---|---|
| Ítem | 3 |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F5, F6, F7, F9, F11 y F12 (sus JUnit) |
| Evidencias | `EV-03-CONS-1` (salida de las pruebas del consolidador), `EV-03-CONS-2` (`resultados.json` y la lista de faltantes) |
| Destino Drive | `ENTREGABLES/03_Ejecucion/` |
| Aceptación | Las pruebas pasan; `resultados.json` tiene exactamente las 142 claves; `--faltantes` lista los CP en `Not Run`. |

**Files:**
- Create: `qa/03-ejecucion/consolidar.mjs`, `qa/03-ejecucion/consolidar.test.mjs`, `qa/03-ejecucion/fixtures/`

**Interfaces:**
- Consumes: la convención de títulos `CP-…` (Global Constraints), `qa/01-plan/licencia.md`, la lista de 142 CP de la matriz (exportada a `qa/03-ejecucion/casos.json` desde `qa/02-trazabilidad/CASOS Y ESCENARIOS DE PRUEBAS.xlsx` con un paso del script de F2) y `gh issue list --repo ImKrav/n8n-VyV --label defecto --state all --json number,title,state,labels`.
- Produces: `node qa/03-ejecucion/consolidar.mjs [--faltantes]`. Reglas de estado por CP:
  - **Blocked (licencia):** el CP está en `licencia.md`.
  - **Blocked (entorno):** todos sus fallos empiezan por `ENTORNO:`.
  - **Fail:** al menos una prueba falla por otro motivo.
  - **Pass:** todas sus pruebas pasan.
  - **Not Run:** no hay ninguna prueba.
  
  `evidencias` = los archivos `qa/evidencias/**/EV-*-<CP>-*`; `issue` = el issue cuyo título empieza por `[<CP>]`.

- [ ] **Step 1: Write the failing tests** with JUnit fixtures:
  - `test('Pass cuando todas las pruebas del CP pasan')`.
  - `test('Fail cuando una prueba del CP falla')`.
  - `test('Blocked (entorno) con fallo ENTORNO:')`.
  - `test('Blocked (licencia) prevalece sobre Not Run')`.
  - `test('asocia el issue por prefijo de título')`.
  - `test('produce exactamente las 142 claves')`.
- [ ] **Step 2:** Run `node --test qa/03-ejecucion`. Expected: FAIL. Implement. Run again. Expected: PASS.
- [ ] **Step 3:** Run `node qa/03-ejecucion/consolidar.mjs --faltantes > qa/03-ejecucion/faltantes.txt`. Commit `test(qa): add execution results consolidator`.

---

### Task F13.T2 — Ejecución de los casos faltantes (procedimientos asistidos), rendimiento y compatibilidad

| Campo | Valor |
|---|---|
| Ítem | 3 |
| Responsable | Cada integrante los faltantes de su módulo |
| Modo / modelo | SDD / sonnet; un subagente por módulo, que pueden ir en paralelo |
| Depende de | F13.T1 |
| Evidencias | `EV-03-<CP>-<paso>` (captura por paso), JUnit en `qa/evidencias/03/junit/`, `EV-03-RNF01-<n>` (tiempos medidos), `EV-03-RNF04-<n>` (BDD en Firefox) |
| Destino Drive | `ENTREGABLES/03_Ejecucion/<módulo>/` |
| Aceptación | Tras volver a ejecutar el consolidador, ningún CP queda en `Not Run`, o el que quede tiene escrito por qué no se pudo ejecutar; los tiempos de RNF-01 se midieron y se compararon con sus umbrales (3 s, 3 s y 30 s), sin redondear a favor. |

**Files:**
- Create: `qa/03-ejecucion/asistidos/<m>.spec.mjs`, `qa/03-ejecucion/playwright.config.mjs`, `qa/03-ejecucion/rendimiento.spec.mjs`

- [ ] **Step 1:** Por cada CP de `faltantes.txt`, un test `CP-… <título>` que reproduce los pasos del detalle del caso (acción, datos y resultado esperado por paso), con `expect` explícito por resultado esperado y `page.screenshot({ path: …EV-03-<CP>-<paso>.png })` en cada paso. Los datos de rendimiento (workflow de 100 nodos, más de 1 000 ejecuciones, CSV de 10 000 filas) se generan por API con prefijo `VyV-`.
- [ ] **Step 2:** `rendimiento.spec.mjs`: mide CP-WF-01-08, CP-EX-01-08 y CP-CO-03-05 con `performance.now()` alrededor de la acción hasta que el elemento esperado es visible; 5 repeticiones; registra mediana y máximo en `EV-03-RNF01-<n>.json`. El caso pasa solo si la mediana cumple el umbral de RNF-01.
- [ ] **Step 3:** Compatibilidad (RNF-04): ejecutar `npm run test:bdd --prefix qa -- --tags @regresion` con el navegador `firefox` (parámetro de Serenity/JS) y guardar el JUnit `EV-03-RNF04-1`. Edge no está disponible en el VPS; se declara como diferencia.
- [ ] **Step 4:** Run everything, then the consolidator again. Expected: la lista de faltantes queda vacía o justificada. Commit `test(qa): execute remaining cases with assisted procedures`.

---

### Task F13.T3 — Métricas, informe de ejecución y matriz consolidada

| Campo | Valor |
|---|---|
| Ítem | 3 (y 2) |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F13.T2 |
| Evidencias | `EV-03-MET-1` (salida de `metricas.mjs`), `EV-03-RTM-1` (salida de `validar_rtm.py --modo final`) |
| Destino Drive | `ENTREGABLES/03_Ejecucion/` y la matriz viva de `Final VyV/MATRICES/` |
| Aceptación | Todas las cifras de `informe-ejecucion.md` salen de `metricas.mjs` (se cita la salida); `validar_rtm.py --modo final` sale con código 0; existe la sección "Diferencias entre lo planeado y lo ejecutado". |

**Files:**
- Create: `qa/03-ejecucion/metricas.mjs`, `qa/03-ejecucion/metricas.test.mjs`, `qa/03-ejecucion/informe-ejecucion.md`

**Interfaces:**
- Produces: `node qa/03-ejecucion/metricas.mjs --resultados qa/03-ejecucion/resultados.json --issues <json> --cobertura qa/evidencias/05/cobertura-funciones.md`. Imprime en JSON y Markdown: casos totales; ejecutados (Pass + Fail); porcentaje de ejecución (ejecutados / 142); porcentaje de aprobación (Pass / ejecutados); porcentaje de fallo (Fail / ejecutados); Blocked por motivo; defectos por severidad, prioridad y módulo; densidad de defectos (defectos / 5 funcionalidades por módulo, como en el numeral 17 del plan); cobertura de requisitos (funcionalidades con al menos un CP ejecutado / 20); cobertura de código (de F4); tiempo medio de resolución (cierre − apertura de los issues cerrados).

- [ ] **Step 1: Write the failing tests** in `metricas.test.mjs`, with a fixture of 10 CP (6 Pass, 2 Fail, 1 Blocked y 1 Not Run): ejecución 80 %, aprobación 75 %, fallo 25 %.
- [ ] **Step 2:** Run them (FAIL), implement `metricas.mjs`, run them again (PASS).
- [ ] **Step 3:** Run `metricas.mjs` on the real results. Write `informe-ejecucion.md`:
  - entorno, de `qa/01-plan/entorno.md`, con las versiones de cada imagen;
  - datos de prueba;
  - procedimientos (qué suite ejecutó qué CP);
  - resultados por módulo y por funcionalidad;
  - defectos (tabla de issues);
  - cobertura de requisitos y de código;
  - métricas;
  - **diferencias entre lo planeado y lo ejecutado:** D1–D8, casos Blocked y su impacto, Jenkins → GitHub Actions, Google OAuth → servidor OAuth2 simulado, Stagehand y DeepEval fuera, datos de usabilidad (llegaron o quedan pendientes), Edge no probado y cualquier otra desviación del ledger.
- [ ] **Step 4:** Run `actualizar_rtm.py` with the final `resultados.json`, then `validar_rtm.py --modo final`. Expected: código 0. Si hay casos que no cumplen, se corrige el dato (evidencia faltante o issue sin enlazar); nunca se cambia el estado para pasar la validación.
- [ ] **Step 5:** Commit `docs(qa): add execution report and final traceability`.
- [ ] **Step 6: Cierre de F13 (controlador):** reemplazar la matriz viva en Drive; subir el informe y las evidencias a `ENTREGABLES/03_Ejecucion/`; PR draft; ledger.
