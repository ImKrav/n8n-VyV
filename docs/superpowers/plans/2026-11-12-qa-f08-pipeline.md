# F8 — Ítem 8: Pipeline con GitHub Actions, Docker y SonarQube

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un pipeline reproducible con las etapas de la especificación, en GitHub Actions en lugar de Jenkins (decisión D2): checkout, instancia efímera de n8n del fork en Docker, instalación, unitarias con cobertura, Cypress, BDD y API, publicación de reportes JUnit y HTML, análisis de SonarQube, Quality Gate que aborta el pipeline y despliegue opcional en Dokploy. Además, un `docker-compose.yml` equivalente para montar el entorno en local.

**Architecture:** `.github/workflows/qa-pipeline.yml` corre en *runners* alojados en GitHub (gratuitos en repositorios públicos). Usa la imagen de GHCR de F0.T3 y SonarQube de Dokploy, al que llega por HTTPS con `SONAR_TOKEN`. La acción `sonarqube-quality-gate-action` sustituye a `waitForQualityGate abortPipeline: true`: espera el resultado del análisis y falla el job si el gate no pasa, y el despliegue depende de ese job. El webhook Sonar → Jenkins ya no aplica; se documenta como diferencia.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-08-pipeline`. **Fecha límite:** 15/11/2026. **Ventana de memoria:** SonarQube encendido; `n8n-pruebas` puede detenerse durante la ejecución local del compose.

---

### Task F8.T1 — Workflow `qa-pipeline.yml` y configuración de SonarQube

| Campo | Valor |
|---|---|
| Ítem | 8 |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T3, F0.T6, F4, F5, F6 |
| Evidencias | `EV-08-PIPE-1` (URL de una ejecución completa), `EV-08-PIPE-2` (captura del resumen con las etapas), `EV-08-PIPE-3` (captura del proyecto en SonarQube con el Quality Gate), `EV-08-PIPE-4` (ejecución en la que el gate falla a propósito y el despliegue no se ejecuta) |
| Destino Drive | `ENTREGABLES/08_Pipeline/` |
| Aceptación | Una ejecución en `qa/final-vyv` completa todas las etapas y publica JUnit y HTML; `EV-08-PIPE-4` demuestra el aborto: en una rama temporal `qa/fase-08-gate-demo` se baja la cobertura quitando una prueba, el job del gate falla, el despliegue se omite y la rama se borra después; `actionlint` sin errores. |

**Files:**
- Create: `.github/workflows/qa-pipeline.yml`
- Create: `sonar-project.properties` (raíz del repositorio)
- Create: `qa/08-pipeline/quality-gate.json`, `qa/08-pipeline/aplicar-quality-gate.sh`, `qa/08-pipeline/README.md`

**Interfaces:**
- Consumes: `qa/docker-compose.sut.yml` y `qa/shared/sut.mjs` (F0.T4); los scripts npm `test:cypress`, `test:bdd`, `test:api` y `secretos` (F0, F5, F6); `qa/05-tdd-unitarias/funciones.json` y `cobertura-funciones.mjs` (F4.T2).
- Produces, en `sonar-project.properties`: `sonar.projectKey=n8n-vyv`; `sonar.projectName=n8n-VyV QA`; `sonar.sources` = los cinco archivos de `funciones.json`; `sonar.tests` = sus `*.vyv.test.ts`; `sonar.test.inclusions=**/*.vyv.test.ts`; `sonar.javascript.lcov.reportPaths=coverage/lcov.info`; `sonar.sourceEncoding=UTF-8`. `sonar.projectVersion` lo pasa el workflow: nombre de la etiqueta o `sha-<7>`.
- Produces, en `quality-gate.json`, el gate `VyV-QA` sobre el código total (Community no tiene análisis de ramas): `coverage < 80` → error; `duplicated_lines_density > 3` → error; `reliability_rating`, `security_rating` y `sqale_rating` peores que A → error.
- Produces: jobs de `qa-pipeline.yml` en este orden de dependencias: `checkout-instalacion` → `unitarias` → (`e2e` ∥ `sonar`) → `quality-gate` → `reportes` → `despliegue` (opcional).

- [ ] **Step 1:** Write `aplicar-quality-gate.sh`. Comprueba con `GET /api/webservices/list` de la instancia que existen los endpoints `api/qualitygates/create`, `create_condition` y `select` antes de llamarlos; crea el gate `VyV-QA` desde `quality-gate.json`, lo asocia a `n8n-vyv` y es idempotente. El token se lee de `SONAR_TOKEN` (cabecera `Authorization: Bearer`). Run it against Dokploy's SonarQube. Expected: el gate aparece en la interfaz con sus cinco condiciones (`EV-08-PIPE-3`).
- [ ] **Step 2:** Write `qa-pipeline.yml`:
  - **Disparadores:** `push` a `qa/**` y `pull_request` hacia `qa/final-vyv`; `concurrency` por rama con cancelación de la ejecución anterior.
  - **`unitarias`:** `actions/setup-node` con Node 24; `npm i -g pnpm@12.4.2`; `pnpm install --frozen-lockfile`; el comando de compilación de dependencias que F0.T7 determinó; el comando de cobertura de F4.T2 con `--coverage.reportsDirectory=coverage`; `cobertura-funciones.mjs --umbral 80`; artefactos `coverage/` y JUnit.
  - **`e2e`:** elige la imagen `ghcr.io/imkrav/n8n-vyv:sha-<7>` si existe y, si no, `v-baseline` (registra cuál usó en el resumen); levanta `qa/docker-compose.sut.yml` con las variables de los *secrets*; `ensureOwner`; `npm ci --prefix qa`; `npx --prefix qa playwright install --with-deps chromium`; Cypress, BDD y Newman con `continue-on-error: false`; `npm run secretos --prefix qa` sobre `qa/evidencias` (Review Focus #3); artefactos de evidencias.
  - **`sonar`:** descarga `coverage/`; `SonarSource/sonarqube-scan-action` con `SONAR_HOST_URL` y `SONAR_TOKEN` y `-Dsonar.projectVersion=…`.
  - **`quality-gate`:** `SonarSource/sonarqube-quality-gate-action` con `timeout-minutes: 10`; si el gate no pasa, el job falla y el pipeline se detiene.
  - **`reportes`:** `if: always()`; publica los JUnit con una acción de reporte de pruebas y sube como artefactos los HTML de mochawesome, htmlextra, Serenity y cobertura; escribe un resumen en `$GITHUB_STEP_SUMMARY` con los totales por suite.
  - **`despliegue`:** solo con la etiqueta `v-final`, con el gate aprobado y con los *secrets* `DOKPLOY_URL` y `DOKPLOY_API_KEY` definidos; llama al endpoint de redespliegue documentado en `qa/08-pipeline/dokploy-endpoints.md` para la aplicación `n8n-final`.
  - **Permisos:** `contents: read`, `packages: read`, `checks: write`. Acciones fijadas por versión mayor publicada.
- [ ] **Step 3:** Run `docker run --rm -v "$PWD":/repo -w /repo rhysd/actionlint:latest -color .github/workflows/qa-pipeline.yml`. Expected: sin errores.
- [ ] **Step 4:** Commit `ci(qa): add QA pipeline with SonarQube quality gate`, push and watch the run (`gh run watch --repo ImKrav/n8n-VyV`). Expected: todas las etapas en verde o fallos de pruebas que correspondan a defectos con issue. Un fallo de infraestructura se depura y se corrige.
- [ ] **Step 5:** Demostración del aborto (`EV-08-PIPE-4`) en la rama temporal `qa/fase-08-gate-demo`. Al terminar, borrar la rama remota: el borrado de una rama temporal creada en esta misma tarea no requiere confirmación, pero se registra en el ledger.
- [ ] **Step 6:** Write `qa/08-pipeline/README.md` with the stage diagram (mermaid), the required secrets (names only), how to rerun and the Jenkins → Actions deviation. Commit `docs(qa): document QA pipeline`.

---

### Task F8.T2 — *Secrets* de GitHub Actions (INLINE)

| Campo | Valor |
|---|---|
| Ítem | 8 |
| Responsable | Usuario + controlador |
| Modo / modelo | INLINE / controlador |
| Depende de | F0.T5 y F0.T6 |
| Evidencias | `EV-08-SEC-1` (salida de `gh secret list --repo ImKrav/n8n-VyV`, que muestra solo nombres) |
| Destino Drive | `ENTREGABLES/08_Pipeline/` |
| Aceptación | Existen `SONAR_HOST_URL`, `SONAR_TOKEN`, `N8N_OWNER_EMAIL`, `N8N_OWNER_PASSWORD`, `N8N_ENCRYPTION_KEY` y, si F0.T5 lo validó, `N8N_LICENSE_ACTIVATION_KEY`. `DOKPLOY_URL` y `DOKPLOY_API_KEY` solo si el usuario autoriza el despliegue desde Actions y el panel es accesible desde internet. |

- [ ] **Step 1:** Por cada nombre, el controlador carga el valor desde `qa/.env` en una variable de entorno del proceso y lo pasa por tubería a `gh secret set <NOMBRE> --repo ImKrav/n8n-VyV`. Nunca se pasa como argumento `--body` ni se imprime.
- [ ] **Step 2:** `gh secret list --repo ImKrav/n8n-VyV` → `EV-08-SEC-1`.

---

### Task F8.T3 — `docker-compose.yml` equivalente para ejecución local

| Campo | Valor |
|---|---|
| Ítem | 8 |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F8.T1 |
| Evidencias | `EV-08-LOCAL-1` (salida de `pipeline-local.sh` con las etapas y su resultado) |
| Destino Drive | `ENTREGABLES/08_Pipeline/` |
| Aceptación | `docker compose -f qa/08-pipeline/docker-compose.yml --env-file qa/.env up` levanta SonarQube, su PostgreSQL y la instancia de n8n; `pipeline-local.sh` ejecuta las mismas etapas que el workflow, incluido el escáner (`sonarsource/sonar-scanner-cli`) contra el SonarQube local, y la comprobación del gate por API (`api/qualitygates/project_status`), que sale con código 1 si el estado es `ERROR`. |

**Files:**
- Create: `qa/08-pipeline/docker-compose.yml`, `qa/08-pipeline/pipeline-local.sh`

- [ ] **Step 1:** Write the compose with `mem_limit` (SonarQube 2 GiB, PostgreSQL 300 MiB, n8n 1 GiB), puertos solo en `127.0.0.1` y la imagen de n8n de `N8N_IMAGE`.
- [ ] **Step 2:** Write `pipeline-local.sh`, reusing the npm scripts. Detener `n8n-pruebas` en Dokploy durante la ejecución y volver a arrancarlo al terminar (los dos pasos se anotan en el ledger).
- [ ] **Step 3:** Run it once. Expected: todas las etapas con su resultado real en `EV-08-LOCAL-1`.
- [ ] **Step 4:** Commit `ci(qa): add local compose equivalent of the QA pipeline`.
- [ ] **Step 5: Cierre de F8 (controlador):** detener SonarQube en Dokploy si F9–F12 no lo necesitan (F11 sí); matriz; Drive; PR draft; ledger.
