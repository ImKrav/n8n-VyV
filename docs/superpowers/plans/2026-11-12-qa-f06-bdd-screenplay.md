# F6 — Ítem 7: Gherkin, BDD, E2E y Screenplay

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Escenarios Gherkin en español, vinculados a pruebas E2E ejecutables, implementados con el patrón Screenplay (actores, habilidades, tareas, interacciones y preguntas).

**Architecture:** Serenity/JS + Cucumber.js + Playwright. **Justificación:** Serenity/JS implementa Screenplay de forma nativa (`Actor`, `Ability`, `Task`, `Interaction`, `Question`), se integra con Cucumber y usa Playwright, que es el mismo motor de la suite oficial de n8n. Así se reutilizan los `data-testid` de sus *page objects*. Además, el adaptador de Serenity/JS para Cucumber produce reportes JUnit y *living documentation*. Los seis escenarios extremo a extremo ES-01…ES-06 del plan v2.3 son la base de las características.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-06-bdd`. **Fecha límite:** 14/11/2026.

---

### Task F6.T1 — Andamiaje Screenplay y característica de humo

| Campo | Valor |
|---|---|
| Ítem | 7 |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T4 y F0.T5 |
| Evidencias | `EV-07-BDD-0` (JUnit y reporte de Serenity del escenario de humo) |
| Destino Drive | `ENTREGABLES/07_BDD_Screenplay/` |
| Aceptación | `npm run test:bdd --prefix qa -- --tags @humo` en verde; el reporte muestra el actor, las tareas y las preguntas del escenario. |

**Files:**
- Modify: `qa/package.json` (devDependencies exactas `@cucumber/cucumber`, `@serenity-js/core`, `@serenity-js/cucumber`, `@serenity-js/playwright`, `@serenity-js/web`, `@serenity-js/rest`, `@serenity-js/assertions`, `@serenity-js/serenity-bdd`, `playwright`; scripts `test:bdd` y `test:bdd:regresion`)
- Create: `qa/07-bdd-screenplay/cucumber.mjs`, `qa/07-bdd-screenplay/features/humo.feature`, `qa/07-bdd-screenplay/src/support/parameters.ts`, `qa/07-bdd-screenplay/src/support/actors.ts`
- Create: `qa/07-bdd-screenplay/src/screenplay/{abilities,tasks,interactions,questions}/index.ts`, `qa/07-bdd-screenplay/README.md`

**Interfaces:**
- Produces: un `Cast` con los actores `Propietario` (habilidades `BrowseTheWebWithPlaywright` y `CallAnApi` sobre `N8N_BASE_URL`, con sesión iniciada por API) y `Miembro` (las mismas habilidades con la cuenta miembro).
- Produces: tareas exportadas `IniciarSesion.como(rol)`, `CrearWorkflow.llamado(nombre).con(nodos)`, `PublicarWorkflow.llamado(nombre)`, `EjecutarWorkflow.llamado(nombre)`, `CrearCredencial.deTipo(tipo).llamada(nombre)`, `CrearDataTable.llamada(nombre).conColumnas(cols)`, `ImportarCsv.en(tabla).desde(ruta)`, `CrearCarpeta.llamada(nombre).dentroDe(padre?)`, `EliminarCarpeta.llamada(nombre).transfiriendoA(destino)`, `DetenerEjecucion.de(workflow)`. Preguntas: `EstadoDeLaUltimaEjecucion.de(workflow)`, `NodosDelPanelDeLogs()`, `FilasDe(tabla)`, `WorkflowsEn(carpeta)`, `MensajeDeError()`.
- Produces: el texto de cada escenario empieza por el `ES-` o el `CP-` que verifica, y cada escenario lleva la etiqueta `@ES-0N`, `@regresion` o `@modulo-XX` correspondiente.

- [ ] **Step 1:** Install the dependencies with `--save-exact`, then run `npx --prefix qa playwright install chromium` (el VPS no trae navegadores).
- [ ] **Step 2: Write the failing feature** `humo.feature`:
  ```gherkin
  # language: es
  @humo
  Característica: Acceso al editor
    Escenario: El propietario abre la lista de workflows
      Dado que Propietario ha iniciado sesión
      Cuando Propietario abre la lista de workflows
      Entonces Propietario ve la lista de workflows
  ```
- [ ] **Step 3:** Run `npm run test:bdd --prefix qa -- --tags @humo`. Expected: FAIL con los pasos sin definir.
- [ ] **Step 4:** Implement the cast, the `IniciarSesion` task and the step definitions. Run again. Expected: PASS; JUnit en `qa/evidencias/07/junit/` y reporte de Serenity en `qa/evidencias/07/serenity/`.
- [ ] **Step 5:** Commit `test(qa): scaffold Serenity/JS Screenplay with Cucumber`.

---

### Task F6.T2 — Características ES-01…ES-06 por módulo

| Campo | Valor |
|---|---|
| Ítem | 7 |
| Responsable | WF: Alejandro (ES-01); EX: Santiago (ES-02 y ES-03); CR: Juan David (ES-06); CO: Mario (ES-04 y ES-05) |
| Modo / modelo | SDD / sonnet |
| Depende de | F6.T1 |
| Evidencias | `EV-07-ES-0N-<n>` (capturas de Serenity por paso), JUnit, reporte HTML |
| Destino Drive | `ENTREGABLES/07_BDD_Screenplay/` |
| Aceptación | Seis archivos `.feature` en español con *Antecedentes* cuando corresponda, al menos un *Esquema del escenario* con *Ejemplos* (partición de CO-01 o CR-01) y uno de error por característica; todos los pasos implementados con tareas, interacciones y preguntas, sin selectores dentro de las definiciones de pasos; ejecución real con su resultado. |

**Files:**
- Create: `qa/07-bdd-screenplay/features/ES-01-ciclo-de-vida.feature`, `ES-02-diagnostico-de-fallo.feature`, `ES-03-ejecucion-interrumpida.feature`, `ES-04-datos-internos.feature`, `ES-05-organizacion-y-limpieza.feature`, `ES-06-rotacion-de-credenciales.feature`
- Create: las definiciones de pasos en `qa/07-bdd-screenplay/src/steps/<modulo>.steps.ts` y las tareas y preguntas nuevas

- [ ] **Step 1:** Write each feature from the route of its ES in plan v2.3 (numeral 8.1, tabla de escenarios extremo a extremo). Ejemplo de estructura para ES-04:
  ```gherkin
  # language: es
  @ES-04 @modulo-CO @regresion
  Característica: Datos internos con data tables
    Antecedentes:
      Dado que Propietario ha iniciado sesión
    Escenario: ES-04 Importar, usar desde un workflow y exportar
      Dado que Propietario crea la data table "VyV-ES04" con columnas "nombre:string, edad:number"
      Cuando Propietario importa "fixtures/core/valido.csv" en "VyV-ES04"
      Y Propietario ejecuta un workflow que inserta una fila en "VyV-ES04"
      Entonces "VyV-ES04" tiene 101 filas
    Esquema del escenario: CP-CO-01-<cp> Nombre de tabla <clase>
      Cuando Propietario intenta crear la data table "<nombre>"
      Entonces Propietario ve el mensaje de error "<mensaje>"
      Ejemplos:
        | cp | clase | nombre | mensaje |
  ```
  Los valores de las tablas de *Ejemplos* salen de F3.T5 (límites reales); el mensaje esperado se toma de `packages/frontend/@n8n/i18n/src/locales/en.json`, porque la interfaz de la instancia está en inglés.
- [ ] **Step 2:** Run `npm run test:bdd --prefix qa -- --tags @ES-0N`. Expected: FAIL por pasos sin definir.
- [ ] **Step 3:** Implement the tasks and questions of the Interfaces block of F6.T1. Run again. Expected: PASS o fallo por defecto real, que se registra con issue como en F5.
- [ ] **Step 4:** Commit `test(qa): add BDD feature ES-0N with Screenplay`, uno por característica.
- [ ] **Step 5: Cierre de F6 (controlador):** matriz (los ES se registran en la columna Notas de sus CP), reportes a Drive, PR draft y ledger.
