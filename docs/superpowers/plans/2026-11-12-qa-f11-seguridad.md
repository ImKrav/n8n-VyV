# F11 — Ítem 12: Seguridad (OWASP Top 10:2025)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pruebas de seguridad basadas en OWASP Top 10:2025 sobre los cuatro módulos: análisis estático (SonarQube y Semgrep), dinámico (OWASP ZAP contra la instancia local), de dependencias (`pnpm audit` y Trivy) y de secretos (gitleaks). Cada hallazgo lleva evidencia, CVSS v3.1, validación de verdadero o falso positivo y recomendación.

**Architecture:** Las herramientas corren en contenedores Docker con la versión fijada (`semgrep/semgrep`, `zaproxy/zap-stable`, `aquasec/trivy`, `zricethezav/gitleaks`), para no instalar nada en el VPS. ZAP **solo** ataca `127.0.0.1:5678` (instancia local propia), nunca el panel de Dokploy, `nodalix` ni sistemas de terceros. Las comprobaciones manuales de OWASP se automatizan con `node:test` sobre la API cuando es posible.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-11-seguridad`. **Paralela a F9, F10 y F12.** **Fecha límite:** 15/11/2026. **Ventana de memoria:** SonarQube encendido y ZAP con `-Xmx1g`; `n8n-pruebas` detenido mientras corre ZAP.

> **Higiene (Global Constraints):** los issues de seguridad usan títulos neutros (por ejemplo, `[CP-CR-02-03] Revisar la respuesta del endpoint de credenciales`). El vector concreto solo aparece en `qa/12-seguridad/informe.md`. Si un hallazgo confirmado también afecta a n8n original, el controlador lo informa al usuario y no lo publica.

---

### Task F11.T1 — Análisis estático, dependencias y secretos

| Campo | Valor |
|---|---|
| Ítem | 12 |
| Responsable | Juan David Mosquera García (coordina); cada integrante valida los hallazgos de su módulo |
| Modo / modelo | SDD / sonnet |
| Depende de | F0 y F8 (proyecto de SonarQube analizado) |
| Evidencias | `EV-12-SAST-1` (SARIF de Semgrep), `EV-12-SONAR-1` (exportación de issues y *security hotspots* de `n8n-vyv` por API), `EV-12-SCA-1` (`pnpm audit --json`), `EV-12-SCA-2` (JSON de Trivy de la imagen `v-baseline`), `EV-12-SEC-1` (informe de gitleaks) |
| Destino Drive | `ENTREGABLES/12_Seguridad/` |
| Aceptación | Las cinco evidencias existen; `hallazgos.csv` tiene una fila por hallazgo único (deduplicado) con las columnas de Interfaces; ningún hallazgo queda sin el campo `validacion`. |

**Files:**
- Create: `qa/12-seguridad/sast.sh`, `qa/12-seguridad/sca.sh`, `qa/12-seguridad/secretos.sh`, `qa/12-seguridad/exportar-sonar.sh`
- Create: `qa/12-seguridad/hallazgos.csv`, `qa/12-seguridad/README.md`

**Interfaces:**
- Produces: `hallazgos.csv` con las columnas `id (SEC-NN), herramienta, owasp_2025 (A01…A10), cwe, modulo, ubicacion, descripcion, evidencia (EV-…), cvss_vector, cvss_puntaje, severidad, validacion (VP|FP|Por validar), justificacion_validacion, recomendacion, issue`. F11.T3 y F15 lo consumen.

- [ ] **Step 1:** `sast.sh`: Semgrep con `p/owasp-top-ten`, `p/typescript` y `p/nodejsscan` sobre las rutas de los cuatro módulos: `packages/cli/src/{workflows,webhooks,executions,credentials,services/folder.service.ts}`, `packages/modules/data-table` y `packages/frontend/editor-ui/src/features/{workflows,execution,credentials,core}`. Salida SARIF y JSON.
- [ ] **Step 2:** `exportar-sonar.sh`: `GET /api/issues/search?componentKeys=n8n-vyv&types=VULNERABILITY,BUG` y `GET /api/hotspots/search?projectKey=n8n-vyv`, después de comprobar ambos endpoints en `api/webservices/list`.
- [ ] **Step 3:** `sca.sh`: `pnpm audit --json --prod > …` (en la raíz; registrar los totales por severidad) y `trivy image --format json ghcr.io/imkrav/n8n-vyv:v-baseline`.
- [ ] **Step 4:** `secretos.sh`: gitleaks `git` sobre el rango `v-baseline..HEAD` y `dir` sobre `qa/`; el historial completo de n8n no se escanea por su tamaño, y esa limitación se declara en el informe.
- [ ] **Step 5:** Run the four scripts and consolidate into `hallazgos.csv`. **Validación:** cada hallazgo se revisa en el código y se clasifica VP o FP, con una justificación de una frase que cita archivo y línea (por ejemplo, una dependencia vulnerable que solo se usa en desarrollo, o una ruta no alcanzable). El CVSS v3.1 se calcula para cada VP; para las CVE se toma el de la base de datos y se cita.
- [ ] **Step 6:** Commit `test(qa): add static, dependency and secret scans`.

---

### Task F11.T2 — Análisis dinámico con OWASP ZAP

| Campo | Valor |
|---|---|
| Ítem | 12 |
| Responsable | Santiago Restrepo Fonnegra (coordina) |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T4 y F0.T5 |
| Evidencias | `EV-12-DAST-1` (HTML y JSON de ZAP *baseline*), `EV-12-DAST-2` (HTML y JSON de ZAP *full scan* autenticado, limitado a `/rest`) |
| Destino Drive | `ENTREGABLES/12_Seguridad/` |
| Aceptación | Los dos informes existen; el objetivo registrado en ambos es `http://127.0.0.1:5678`; los hallazgos de ZAP están en `hallazgos.csv` validados; la instancia se limpia después con `cleanupVyV`. |

**Files:**
- Create: `qa/12-seguridad/dast.sh`, `qa/12-seguridad/zap-contexto.yaml` (plan de automatización de ZAP)

- [ ] **Step 1:** Write `dast.sh`. Antes de lanzar, aserta que el objetivo es exactamente `http://127.0.0.1:5678` y aborta con cualquier otro valor. Ejecuta `docker run --network host zaproxy/zap-stable zap-baseline.py -t http://127.0.0.1:5678 …` y después el plan de `zap-contexto.yaml`: sesión por cabecera `Cookie` obtenida con `login()` e inyectada con la variable `ZAP_AUTH_HEADER_VALUE`, alcance `^http://127\.0\.0\.1:5678/rest/.*`, exclusión de `/rest/logout`, `/rest/owner/setup` y de cualquier endpoint que borre todos los datos.
- [ ] **Step 2:** Run it. Expected: informes en `qa/evidencias/12/zap/`. Añadir los hallazgos a `hallazgos.csv` y validarlos como en F11.T1, Step 5.
- [ ] **Step 3:** Commit `test(qa): add DAST against local instance`.

---

### Task F11.T3 — Pruebas OWASP Top 10:2025 dirigidas e informe

| Campo | Valor |
|---|---|
| Ítem | 12 |
| Responsable | Cada integrante las pruebas de su módulo |
| Modo / modelo | SDD / sonnet |
| Depende de | F11.T1 y F11.T2 |
| Evidencias | `EV-12-OWASP-<A0N>-<n>` (JUnit y respuestas de API sin cabeceras de sesión) |
| Destino Drive | `ENTREGABLES/12_Seguridad/` |
| Aceptación | `informe.md` tiene una fila por categoría A01–A10 con las pruebas aplicadas o el motivo de "No aplica"; cada hallazgo de `hallazgos.csv` aparece con evidencia, CVSS, validación y recomendación; las pruebas dirigidas tienen resultado real. |

**Files:**
- Create: `qa/12-seguridad/owasp.test.mjs`, `qa/12-seguridad/informe.md`
- Modify: `qa/package.json` (script `test:owasp`)

- [ ] **Step 1: Write the tests** (`node:test`), cada una con su categoría en el título:
  - `A01 miembro no lee una credencial no compartida` (CP-CR-05-05): `GET /rest/credentials/:id` con la sesión del miembro → 403 o 404.
  - `A01 miembro no borra una carpeta del propietario`.
  - `A02/A04 la API no devuelve el secreto de una credencial` (CP-CR-02-03): crear una credencial con el valor `VyV-secreto-<ts>` y comprobar que ninguna respuesta de `/rest/credentials` lo contiene.
  - `A04 el secreto está cifrado en la base de datos` (CP-CR-01-07): leer la tabla `credentials_entity` del SQLite del volumen con `sqlite3` en un contenedor temporal de solo lectura y comprobar que el valor no aparece en claro.
  - `A05 nombres con HTML no se ejecutan` (CP-CR-01-08): con el nombre `<img src=x onerror=…>` en un workflow, una credencial, una data table y una carpeta, comprobar en Playwright que no se dispara ningún diálogo y que el texto se muestra escapado.
  - `A05 CSV con fórmulas`: importar en CO-03 una celda `=HYPERLINK(...)` y verificar cómo se exporta; el resultado se documenta.
  - `A07 las cabeceras de seguridad de la respuesta del editor` se comparan con la recomendación de OWASP.
  - `A10 el manejo de errores no filtra trazas` en respuestas 4xx y 5xx de `/rest`.
- [ ] **Step 2:** Run `npm run test:owasp --prefix qa`. Registrar los resultados y añadir los hallazgos a `hallazgos.csv`.
- [ ] **Step 3:** Write `informe.md`: metodología, herramientas y versiones, alcance y exclusiones (panel de Dokploy y terceros), tabla A01–A10, tabla de hallazgos por severidad y recomendaciones. Commit `docs(qa): add security report`.
- [ ] **Step 4: Cierre de F11 (controlador):** detener ZAP y, si F14 no está próxima, SonarQube; matriz (RNF-02 y los CP de seguridad); Drive; PR draft; ledger.
