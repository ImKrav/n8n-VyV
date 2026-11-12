# F14 — Ítem 14: Refactorización, comparación `v-baseline` / `v-final` y despliegue final (más la comparativa del ítem 9)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Production-code tasks REQUIRE superpowers:test-driven-development.

**Goal:** Aplicar con TDD las correcciones y refactorizaciones que salieron de las pruebas, etiquetar `v-final`, comparar `v-baseline` con `v-final` (diff, issues de Sonar, cobertura, complejidad y resultados de las pruebas), desplegar la imagen `v-final` en `n8n-final` (Dokploy) y ejecutar regresión y humo contra la URL desplegada.

**Architecture:** Cada cambio de producción sigue el ciclo de F4.T1 y queda enlazado a su issue. SonarQube analiza las dos versiones con `sonar.projectVersion` = `v-baseline` y `v-final`; la comparación se toma de `api/measures/search_history`. La imagen `v-final` la compila `qa-build-image.yml` al publicar la etiqueta.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-14-refactor`. **Fecha límite:** 16/11/2026. **Ventana de memoria:** SonarQube encendido; `n8n-pruebas` detenido al crear `n8n-final`.

---

### Task F14.T1 — Correcciones y refactorizaciones con TDD

| Campo | Valor |
|---|---|
| Ítem | 14 (frontend, backend y código fuente) |
| Responsable | Integrante del módulo de cada defecto |
| Modo / modelo | SDD / sonnet, con `superpowers:test-driven-development`; un subagente por defecto, en secuencia |
| Depende de | F13 (lista de defectos abiertos) |
| Evidencias | `EV-14-TDD-<issue>-{1,2,3}` (salidas en RED, GREEN y REFACTOR) |
| Destino Drive | `ENTREGABLES/14_Refactorizacion/` |
| Aceptación | Cada defecto corregido tiene sus tres commits (RED, GREEN, REFACTOR) y su issue en Corregido con el re-test aprobado; los defectos que no se corrigen siguen abiertos con su motivo en el issue. Los cuatro archivos de caja blanca no empeoran sus métricas de Sonar. |

**Selección:** el controlador ordena los defectos abiertos por severidad y prioridad y despacha primero los de severidad crítica o alta que se puedan corregir el 16/11/2026. Las refactorizaciones sin defecto (por ejemplo, *code smells* que Sonar señale en las funciones de F3) solo se hacen con las pruebas de F3 y F4 en verde antes y después, en commits `refactor: … (REFACTOR)`.

- [ ] **Step 1–7:** Los mismos de F4.T1 (RED → commit → GREEN → commit → REFACTOR → commit → comentario en el issue). Además, si el cambio está en `editor-ui`, se ejecuta la prueba del componente con `pnpm --filter n8n-editor-ui test <archivo> --maxWorkers=1` y los textos nuevos van a `@n8n/i18n`.
- [ ] **Step 8:** Re-test: ejecutar el CP que detectó el defecto (Cypress, BDD o asistido) contra una imagen construida desde la rama, y adjuntar el JUnit al issue.

---

### Task F14.T2 — Etiqueta `v-final`, imagen y comparativa `v-baseline` / `v-final`

| Campo | Valor |
|---|---|
| Ítem | 14 |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F14.T1 integrada en `qa/final-vyv` |
| Evidencias | `EV-14-DIFF-1` (`git diff --stat v-baseline..v-final -- packages/`), `EV-14-SONAR-1` (`search_history` en JSON), `EV-14-COV-1` (cobertura por función en las dos versiones), `EV-14-CC-1` (V(G) recalculado de las funciones modificadas), `EV-14-IMG-1` (manifiesto de `ghcr.io/imkrav/n8n-vyv:v-final`) |
| Destino Drive | `ENTREGABLES/14_Refactorizacion/` |
| Aceptación | `comparativa.md` tiene las cuatro tablas (diff de producción, issues de Sonar por tipo y severidad, cobertura y complejidad, resultados de las pruebas), cada cifra con su evidencia; la imagen `v-final` existe e imprime `2.48.0`. |

**Files:**
- Create: `qa/14-refactorizacion/comparativa.md`, `qa/14-refactorizacion/sonar-historial.sh`

- [ ] **Step 1:** `git tag v-final <HEAD de qa/final-vyv> && git push origin v-final`. Watch `qa-build-image.yml` and `qa-pipeline.yml`. Expected: `success` en ambos (o un gate fallido documentado, que impide el despliegue automático).
- [ ] **Step 2:** Análisis de Sonar de `v-baseline`: en un `git worktree` de `v-baseline` con los `*.vyv.test.ts` (los de F7), generar la cobertura y ejecutar `sonarsource/sonar-scanner-cli` con `-Dsonar.projectVersion=v-baseline`. El análisis de `v-final` lo hace el pipeline del Step 1. Si el orden cronológico de los análisis no coincide con el de las versiones, se documenta.
- [ ] **Step 3:** `sonar-historial.sh`: `GET /api/measures/search_history?component=n8n-vyv&metrics=bugs,vulnerabilities,code_smells,security_hotspots,coverage,branch_coverage,complexity,cognitive_complexity,duplicated_lines_density` → `EV-14-SONAR-1`.
- [ ] **Step 4:** `cobertura-funciones.mjs` sobre las dos `lcov.info`; recalcular V(G) de las funciones modificadas con el método de F3.
- [ ] **Step 5:** Write `comparativa.md`; el diff excluye `qa/`, `docs/` y `.github/`. Commit `docs(qa): compare v-baseline and v-final`.

---

### Task F14.T3 — Despliegue de `n8n-final` en Dokploy y regresión posterior

| Campo | Valor |
|---|---|
| Ítem | 14 y 9 (ejecución posterior y comparativa) |
| Responsable | Líder de pruebas `[PENDIENTE]` + usuario (dominio) |
| Modo / modelo | INLINE / controlador (dominio, cuenta propietaria y clave CE en una instancia pública) + SDD / sonnet (ejecución de suites y comparativa) |
| Depende de | F14.T2 y F7 (línea base) |
| Evidencias | `EV-14-DEP-1` (estado de la aplicación por API), `EV-14-DEP-2` (captura de `https://<n8n-final>` con la versión), `EV-09-POST-1` (JUnit de `@regresion` contra la URL desplegada), `EV-09-POST-2` (JUnit de humo), `EV-09-COMP-1` (`qa/09-regresion/comparativa.md`) |
| Destino Drive | `ENTREGABLES/14_Refactorizacion/` y `ENTREGABLES/09_Regresion/` |
| Aceptación | `n8n-final` sirve la imagen `v-final` por HTTPS; la cuenta propietaria se creó y la clave CE se activó antes de exponer el dominio; `comparar.mjs` ejecutado con la línea base de F7 y la ejecución posterior produce la tabla, y toda `Regresión` tiene issue. |

- [ ] **Step 1:** Detener `n8n-pruebas` en Dokploy (presupuesto de memoria). Crear por API la aplicación `n8n-final` en `VyV-QA` con la imagen `ghcr.io/imkrav/n8n-vyv:v-final`, el mismo límite y las mismas variables, y un volumen nuevo.
- [ ] **Step 2 (INLINE):** Crear la cuenta propietaria y activar la clave CE desde el VPS; después asignar el dominio HTTPS confirmado por el usuario.
- [ ] **Step 3:** `N8N_BASE_URL=https://<n8n-final> npm run test:regresion --prefix qa` y la especificación de humo de F5. Guardar los JUnit en `qa/evidencias/09/post/`. Limpiar con `cleanupVyV`.
- [ ] **Step 4:** Run `node qa/09-regresion/comparar.mjs --antes qa/evidencias/09/base --despues qa/evidencias/09/post --salida qa/09-regresion/comparativa.md`. Añadir el criterio de selección, las dos fechas, las dos imágenes y la interpretación.
- [ ] **Step 5:** Commit `test(qa): run post-change regression against final deployment`.

---

### Task F14.T4 — Explicación de las mejoras

| Campo | Valor |
|---|---|
| Ítem | 14 |
| Responsable | Cada integrante los cambios de su módulo |
| Modo / modelo | SDD / sonnet |
| Depende de | F14.T2 y F14.T3 |
| Evidencias | Las de F14.T1–T3, citadas |
| Destino Drive | `ENTREGABLES/14_Refactorizacion/` |
| Aceptación | `mejoras.md` tiene una sección por cambio con: problema, prueba que lo detectó (CP, EV e issue), cambio realizado (SHA), efecto medido (antes y después en tests, Sonar y complejidad) y riesgo residual. |

- [ ] **Step 1:** Write `qa/14-refactorizacion/mejoras.md` only from the evidence of T1–T3. Commit `docs(qa): explain improvements`.
- [ ] **Step 2: Cierre de F14 (controlador):** matriz, Drive, PR draft y ledger. Proponer al usuario el merge de `qa/final-vyv` a `master` y esperar su confirmación.
