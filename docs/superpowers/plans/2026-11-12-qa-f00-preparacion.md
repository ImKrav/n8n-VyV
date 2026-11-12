# F0 — Preparación: repositorio, entorno, licencia, Dokploy y línea base

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar listo todo lo que necesitan las fases siguientes: ramas y etiquetas, el esqueleto de `qa/`, la imagen del fork en GHCR, la instancia local con licencia de CE registrada, los recursos de Dokploy y la línea base de las pruebas existentes.

**Architecture:** Ver el plan índice. Las Global Constraints y el Review Focus del índice aplican a cada tarea.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-00-preparacion` (desde `v-baseline`). **Fecha límite:** 12/11/2026.

---

### Task F0.T1 — Repositorio, etiquetas, ramas y gestión de defectos

| Campo | Valor |
|---|---|
| Ítem | Preparación (soporta los ítems 3 y 14) |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | — |
| Evidencias | `EV-00-REPO-1` (salida de `git tag -n` y `git branch -r`), `EV-00-REPO-2` (`gh label list`) |
| Destino Drive | `ENTREGABLES/00_Plan_de_implementacion/` |
| Aceptación | `git rev-parse v-baseline` = `2b1d836bace92dc009da8204d01e2939d3ba4a18`; existen `origin/qa/final-vyv` y `origin/qa/fase-00-preparacion`; `gh label list` muestra las 12 etiquetas; `defecto.yml` pasa la validación YAML. |

**Files:**
- Create: `.github/ISSUE_TEMPLATE/defecto.yml`
- Create: `docs/superpowers/plans/2026-11-12-qa-ledger.md`

**Interfaces:**
- Produces: etiquetas `defecto`, `severidad:crítica`, `severidad:alta`, `severidad:media`, `severidad:baja`, `prioridad:alta`, `prioridad:media`, `prioridad:baja`, `modulo:WF`, `modulo:EX`, `modulo:CR`, `modulo:CO`. Campos de `defecto.yml` (ids): `caso` (CP-…), `evidencia` (EV-…), `modulo`, `severidad`, `prioridad`, `entorno`, `pasos`, `esperado`, `obtenido`. Título por defecto `[CP-XX-NN-NN] `.

- [ ] **Step 1:** `gh repo set-default ImKrav/n8n-VyV`, then `git tag v-baseline 2b1d836bac && git push origin v-baseline`.
- [ ] **Step 2:** `git switch -c qa/final-vyv v-baseline && git push -u origin qa/final-vyv`, then `git switch -c qa/fase-00-preparacion`.
- [ ] **Step 3:** Create the 12 labels with `gh label create <nombre> --repo ImKrav/n8n-VyV --color <hex>` (rojo para crítica/alta, ámbar para media, gris para baja, azul para módulos).
- [ ] **Step 4:** Write `defecto.yml` (GitHub issue form) with the fields from Interfaces, `labels: [defecto]`, dropdowns for `modulo`, `severidad` and `prioridad` using the values from plan v2.3 numeral 13.2, and the 13.1 flow in its description (Nuevo → Asignado → En proceso → Corregido → Revalidado → Cerrado).
- [ ] **Step 5:** Validate: `python3 -c "import yaml,sys;yaml.safe_load(open('.github/ISSUE_TEMPLATE/defecto.yml'))"`. Expected: sin salida, código 0.
- [ ] **Step 6:** Create the ledger with columns `Fecha | Fase | Tarea | Brief | Commit | Revisión | Resumen`. Add the first row for F0.T1.
- [ ] **Step 7:** Commit `chore(qa): add defect issue form and QA ledger` and push.

---

### Task F0.T2 — Esqueleto de `qa/`, validador de fechas y búsqueda de secretos

| Campo | Valor |
|---|---|
| Ítem | Preparación (reglas 1, 4 y 6) |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T1 |
| Evidencias | `EV-00-QA-1` (salida de `npm test --prefix qa`), `EV-00-QA-2` (informe de gitleaks sin hallazgos) |
| Destino Drive | `ENTREGABLES/00_Plan_de_implementacion/` |
| Aceptación | `npm test --prefix qa` en verde; `node qa/scripts/validar-fechas.mjs qa` sale con código 0; `git check-ignore qa/.env` imprime la ruta. |

**Files:**
- Create: `qa/package.json`, `qa/README.md`, `qa/PENDIENTES.md`, `qa/.env.example`, `qa/evidencias/README.md`
- Create: las carpetas del árbol de la especificación (`01-plan/` … `15-informe/`), cada una con un `README.md` de una línea
- Create: `qa/scripts/validar-fechas.mjs`, `qa/scripts/validar-fechas.test.mjs`, `qa/scripts/gitleaks.sh`

**Interfaces:**
- Produces: `node qa/scripts/validar-fechas.mjs <ruta...>` sale con código 1 e imprime `archivo:línea:fecha` si encuentra una fecha `dd/mm/aaaa` posterior a `17/11/2026` o los marcadores `dd/mm/aaaa`, `por definir` o `TBD`. Recorre `.md`, `.json`, `.csv` y el texto extraído de `.docx`/`.xlsx` si `python3` con `openpyxl`/`python-docx` está disponible. Excluye `qa/scripts/`, `node_modules/`, `.venv/` y los archivos `*.test.*`, que contienen los marcadores como datos de prueba. No se ejecuta sobre `docs/superpowers/plans/`, porque el plan nombra los marcadores al describirlos.
- Produces: `bash qa/scripts/gitleaks.sh <ruta>` ejecuta `docker run --rm -v <ruta>:/scan zricethezav/gitleaks:<versión fijada> dir /scan --redact --report-path /scan/.gitleaks.json` y sale con código distinto de 0 si hay hallazgos.
- Produces: scripts npm de `qa/package.json`: `test` (`node --test`), `fechas`, `secretos`. Las fases posteriores añaden los suyos.
- Produces: variables de `qa/.env.example` (sin valores): `N8N_BASE_URL`, `N8N_OWNER_EMAIL`, `N8N_OWNER_PASSWORD`, `N8N_ENCRYPTION_KEY`, `N8N_LICENSE_ACTIVATION_KEY`, `N8N_MEMBER_EMAIL`, `N8N_MEMBER_PASSWORD`, `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `SONAR_HOST_URL`, `SONAR_TOKEN`.

- [ ] **Step 1: Write the failing tests** in `validar-fechas.test.mjs`:
  - `test('acepta 17/11/2026')`: un archivo temporal con `Fecha límite: 17/11/2026` → código 0.
  - `test('rechaza el día siguiente a la fecha límite')`: la fecha del día siguiente al límite, construida en tiempo de ejecución con `['18', '11', '2026'].join('/')` para que el propio archivo de prueba no contenga la fecha literal (si la contuviera, `npm run fechas` fallaría sobre `qa/`) → código 1 y la salida contiene `:1:` seguido de esa fecha.
  - `test('rechaza marcador dd/mm/aaaa')` → código 1.
  - `test('rechaza "por definir"')` → código 1.
- [ ] **Step 2:** Run `npm test --prefix qa`. Expected: FAIL, porque el módulo no existe.
- [ ] **Step 3:** Implement `validar-fechas.mjs`. Usa `fs.readdirSync(..., { recursive: true })`; comparar fechas con `Date.UTC`.
- [ ] **Step 4:** Run `npm test --prefix qa`. Expected: 4 PASS.
- [ ] **Step 5:** Write `gitleaks.sh`. Verify the Review Focus #3 check: plantar un token falso con forma de `ghp_…` en un archivo de un directorio temporal **fuera del repositorio**, ejecutar el script sobre ese directorio y esperar código distinto de 0. Ejecutarlo luego sobre `qa/` y esperar código 0. Borrar el directorio temporal.
- [ ] **Step 6:** Write `qa/README.md` (propósito, requisitos, `npm ci --prefix qa`, índice de carpetas), `qa/PENDIENTES.md` (tabla `ID | Pendiente | Responsable | Bloquea | Estado`, inicializada con la tabla de pendientes del plan índice) y `qa/evidencias/README.md` (convención `EV-<ítem>-<id>-<n>` y ruta `qa/evidencias/<ítem>/`).
- [ ] **Step 7:** Run `git check-ignore qa/.env` (expected: `qa/.env`), `npm run fechas --prefix qa` y `npm run secretos --prefix qa`. Expected: código 0 en todos.
- [ ] **Step 8:** Commit `chore(qa): scaffold isolated QA workspace and validators` and push.

---

### Task F0.T3 — Imagen Docker del fork en GHCR con GitHub Actions

| Campo | Valor |
|---|---|
| Ítem | 8 y 14 (imagen desplegable) |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T1 |
| Evidencias | `EV-08-IMG-1` (URL de la ejecución de Actions), `EV-08-IMG-2` (salida de `docker manifest inspect ghcr.io/imkrav/n8n-vyv:v-baseline`) |
| Destino Drive | `ENTREGABLES/08_Pipeline/` |
| Aceptación | Existen `ghcr.io/imkrav/n8n-vyv:v-baseline` y `:sha-<head>`; `docker run --rm ghcr.io/imkrav/n8n-vyv:v-baseline n8n --version` imprime `2.48.0`. |

**Files:**
- Create: `.github/workflows/qa-build-image.yml`

**Interfaces:**
- Produces: imágenes `ghcr.io/imkrav/n8n-vyv:v-baseline` (fuente: etiqueta `v-baseline`), `ghcr.io/imkrav/n8n-vyv:sha-<7>` (cada push a `qa/final-vyv`) y `ghcr.io/imkrav/n8n-vyv:v-final` (push de la etiqueta `v-final`).

- [ ] **Step 1:** Read `scripts/build-n8n.mjs`, `scripts/dockerize-n8n.mjs` and `docker/images/n8n/Dockerfile` to find the image name and tag that `dockerize-n8n.mjs` produces and the env vars it reads. Record them in a comment at the top of the workflow.
- [ ] **Step 2:** Write `qa-build-image.yml`. Triggers: `push` a `qa/final-vyv` y etiquetas `v-final`. Permissions: `contents: read`, `packages: write`. Jobs:
  - `baseline`: se omite si `docker manifest inspect ghcr.io/imkrav/n8n-vyv:v-baseline` ya tiene éxito. Si no, hace checkout de `ref: v-baseline`, ejecuta `npm i -g pnpm@12.4.2`, `pnpm install --frozen-lockfile` y `pnpm build:docker`, etiqueta la imagen como `v-baseline` y la publica.
  - `head`: checkout del commit del evento; mismo build; etiqueta `sha-<7>` y, si el evento es una etiqueta, también el nombre de la etiqueta.
  - Login con `docker/login-action` y `GITHUB_TOKEN`. Acciones fijadas por versión mayor publicada.
- [ ] **Step 3:** Commit `ci(qa): build fork image and push to GHCR` on `qa/fase-00-preparacion`, push, and open the draft PR to `qa/final-vyv`. Mirror the headings of `.github/pull_request_template.md`.
- [ ] **Step 4:** Merge the PR into `qa/final-vyv` (`gh pr merge --squash --repo ImKrav/n8n-VyV`). El merge en `qa/final-vyv` está autorizado; en `master` no.
- [ ] **Step 5:** Watch the run with `gh run watch --repo ImKrav/n8n-VyV`. Expected: los dos jobs terminan en `success`. Si fallan, depurar con `superpowers:systematic-debugging` sin modificar los workflows heredados.
- [ ] **Step 6:** Run the two acceptance commands and save their output as `EV-08-IMG-2`.

---

### Task F0.T4 — Instancia local bajo prueba y helper compartido `sut.mjs`

| Campo | Valor |
|---|---|
| Ítem | Preparación (lo usan los ítems 3, 6, 7, 9, 10, 11, 12 y 14) |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T2, F0.T3 |
| Evidencias | `EV-00-SUT-1` (`docker compose ps`), `EV-00-SUT-2` (salida de `npm run test:sut --prefix qa`) |
| Destino Drive | `ENTREGABLES/00_Plan_de_implementacion/` |
| Aceptación | `curl -fsS http://127.0.0.1:5678/healthz` devuelve 200; `ss -ltn` muestra el puerto 5678 solo en `127.0.0.1`; `npm run test:sut --prefix qa` en verde. |

**Files:**
- Create: `qa/docker-compose.sut.yml`, `qa/shared/sut.mjs`, `qa/shared/sut.test.mjs`
- Modify: `qa/package.json` (scripts `sut:up`, `sut:down`, `sut:logs`, `test:sut`)

**Interfaces:**
- Produces: servicio `n8n` con imagen `${N8N_IMAGE:-ghcr.io/imkrav/n8n-vyv:v-baseline}`, puerto `127.0.0.1:5678:5678`, `mem_limit: 1g`, volumen `vyv_n8n_data`, variables de las Global Constraints y `N8N_LICENSE_ACTIVATION_KEY` desde `qa/.env`. Servicio `oauth2` (`ghcr.io/navikt/mock-oauth2-server`, versión fijada) en `127.0.0.1:8080` para CR-03.
- Produces, en `qa/shared/sut.mjs` (ESM, sin dependencias; usa `fetch`):
  - `export const BASE_URL: string` (de `N8N_BASE_URL`, por defecto `http://127.0.0.1:5678`)
  - `export async function ensureOwner(): Promise<'created' | 'exists'>`: `POST /rest/owner/setup` si la instancia no tiene propietario.
  - `export async function login(role?: 'owner' | 'member'): Promise<string>`: `POST /rest/login` con `{ emailOrLdapLoginId, password }` (DTO verificado en `packages/@n8n/api-types/src/dto/auth/login-request.dto.ts`). Devuelve la cabecera `cookie`.
  - `export async function getSettings(cookie: string): Promise<Record<string, unknown>>`: `GET /rest/settings`.
  - `export async function assertLicensed(cookie: string, feature: 'folders' | 'namedVersions' | 'workflowDiffs' | 'debugInEditor' | 'advancedExecutionFilters' | 'sharing'): Promise<boolean>`: lee `settings.folders.enabled` para `folders` y `settings.enterprise[feature]` para el resto.
  - `export async function cleanupVyV(cookie: string): Promise<{ workflows: number; credentials: number; dataTables: number; folders: number }>`: borra por API solo los objetos cuyo nombre empieza por `VyV-`. Los workflows se archivan antes de borrarlos, si la API lo exige.
  - `export function uniqueName(cp: string): string`: devuelve `VyV-<cp>-<Date.now()>`.
- Para cada endpoint de `cleanupVyV`, la ruta se verifica en el controlador correspondiente: `packages/cli/src/workflows/workflows.controller.ts`, `packages/cli/src/credentials/credentials.controller.ts`, `packages/modules/data-table/backend/src/data-table.controller.ts` y `packages/cli/src/controllers/folder.controller.ts`.

- [ ] **Step 1:** Write `docker-compose.sut.yml`. Run `docker compose -f qa/docker-compose.sut.yml --env-file qa/.env up -d` and wait for `/healthz`.
- [ ] **Step 2: Write the failing tests** in `sut.test.mjs` (`node:test`, contra la instancia local):
  - `ensureOwner es idempotente`: dos llamadas; la segunda devuelve `'exists'`.
  - `login devuelve cookie n8n-auth`: `assert.match(cookie, /n8n-auth=/)`.
  - `cleanupVyV borra solo objetos VyV-` (Review Focus #4): crear `VyV-sut-<ts>` y `Control-sut-<ts>`, ejecutar `cleanupVyV` y comprobar que el primero ya no existe y el segundo sí. Al final se borra el de control, que es un objeto creado por la propia prueba.
  - `uniqueName incluye el CP`: `assert.match(uniqueName('CP-WF-01-01'), /^VyV-CP-WF-01-01-\d+$/)`.
- [ ] **Step 3:** Run `npm run test:sut --prefix qa`. Expected: FAIL, porque las funciones no existen.
- [ ] **Step 4:** Implement `sut.mjs` with the signatures in Interfaces.
- [ ] **Step 5:** Run `npm run test:sut --prefix qa`. Expected: PASS. Si `ensureOwner` no puede actuar porque faltan `N8N_OWNER_*` en `qa/.env`, parar y avisar al controlador (dependencia INLINE F0.T5).
- [ ] **Step 6:** Commit `test(qa): add local SUT compose and shared SUT helper` and push.

---

### Task F0.T5 — Cuenta propietaria y clave gratuita de Community Edition (INLINE)

| Campo | Valor |
|---|---|
| Ítem | Preparación (regla 3: licencias) |
| Responsable | Usuario + controlador |
| Modo / modelo | INLINE / controlador |
| Depende de | F0.T4 (instancia levantada) |
| Evidencias | `EV-00-LIC-1` (captura de *Settings → Usage* con la clave activa y el correo oculto), `EV-00-LIC-2` (`GET /rest/settings` filtrado a `folders` y `enterprise`, sin secretos) |
| Destino Drive | `ENTREGABLES/00_Plan_de_implementacion/` |
| Aceptación | `qa/01-plan/licencia.md` lista cada función de `enterprise` con su valor real y la lista de casos **Blocked (licencia)** derivada. |

- [ ] **Step 1:** El usuario escribe en `qa/.env` `N8N_OWNER_EMAIL`, `N8N_OWNER_PASSWORD` (cuenta de prueba, no personal), `N8N_MEMBER_EMAIL`, `N8N_MEMBER_PASSWORD` y `N8N_ENCRYPTION_KEY`. El controlador ejecuta `ensureOwner()` y no imprime los valores.
- [ ] **Step 2:** El usuario registra la Community Edition en `http://127.0.0.1:5678` (*Settings → Usage*; endpoint `POST /rest/license/enterprise/community-registered`). Recibe la clave por correo y la activa en la interfaz. Desde fuera del VPS, la interfaz se abre con un túnel SSH: `ssh -L 5678:127.0.0.1:5678 <vps>`.
- [ ] **Step 3:** El usuario guarda la clave como `N8N_LICENSE_ACTIVATION_KEY` en `qa/.env`. El controlador comprueba si n8n acepta la activación por variable de entorno: recrea la instancia con un volumen temporal `vyv_n8n_lic_test`, consulta `/rest/settings` y borra ese volumen. Anota el resultado en `licencia.md`, porque decide si CI puede ejecutar los casos licenciados (Review Focus #5).
- [ ] **Step 4:** El controlador guarda `EV-00-LIC-2` con `getSettings()` filtrado a `folders.enabled` y `enterprise.*`. Escribe `qa/01-plan/licencia.md` con la tabla `Función | Valor | Casos afectados | Estado`, cruzando como mínimo: `folders` → CO-04 y CO-05; `namedVersions` → CP-WF-04-02; `workflowDiffs` → CP-WF-04-05; `debugInEditor` → CP-EX-03-07; `advancedExecutionFilters` → EX-02 (anotaciones y metadatos); `sharing` → CP-CR-05-04. Los casos que verifican el comportamiento sin licencia (CP-EX-03-08, CP-CR-05-06) se ejecutan si la función sigue bloqueada, o se reformulan como Blocked con su motivo si la clave la desbloquea.
- [ ] **Step 5:** Commit `docs(qa): record license state and blocked cases`.

---

### Task F0.T6 — Recursos en Dokploy: proyecto `VyV-QA`, `n8n-pruebas` y SonarQube

| Campo | Valor |
|---|---|
| Ítem | 8, 12 y 14 (infraestructura) |
| Responsable | Líder de pruebas `[PENDIENTE]` + usuario |
| Modo / modelo | INLINE / controlador (incluye pasos que dependen de dominios, tokens y confirmaciones) |
| Depende de | F0.T3 |
| Evidencias | `EV-00-DOK-1` (`free -h`, `nproc` y `df -h` antes del despliegue), `EV-00-DOK-2` (listado de aplicaciones de `VyV-QA` por API, sin secretos), `EV-00-DOK-3` (captura de `https://<sonar>/api/system/status` con `UP`) |
| Destino Drive | `ENTREGABLES/08_Pipeline/` |
| Aceptación | `n8n-pruebas` responde por HTTPS con la cuenta propietaria ya creada y la clave CE activa; SonarQube responde `UP` por HTTPS con contraseña propia; ningún recurso nuevo fuera de `VyV-QA`. |

**Files:**
- Create: `qa/08-pipeline/dokploy-endpoints.md` (cada endpoint usado, citado del OpenAPI de la instancia)
- Create: `qa/08-pipeline/sonarqube.compose.yml` (SonarQube Community + PostgreSQL 16, `mem_limit` de 2 GiB y 300 MiB)

- [ ] **Step 1:** El usuario escribe `DOKPLOY_URL` y `DOKPLOY_API_KEY` en `qa/.env`. El controlador localiza el documento OpenAPI de la instancia (Swagger del panel de Dokploy v0.31.1), lo guarda fuera del repositorio y anota en `dokploy-endpoints.md` los endpoints de proyectos, aplicaciones, compose, dominios, despliegue y logs que usará. No supone ningún nombre de endpoint.
- [ ] **Step 2:** Medir con `free -h`, `nproc` y `df -h` (`EV-00-DOK-1`). Confirmar que el presupuesto de memoria del índice sigue siendo válido.
- [ ] **Step 3:** Crear por API el proyecto `VyV-QA` y la aplicación `n8n-pruebas` (imagen `ghcr.io/imkrav/n8n-vyv:v-baseline`, límite de 1 GiB, variables de las Global Constraints, volumen propio). **Confirmación del usuario:** el dominio HTTPS y, si el paquete de GHCR es privado, el token `read:packages` para el registro en Dokploy.
- [ ] **Step 4:** Antes de exponer el dominio, crear la cuenta propietaria de `n8n-pruebas` desde el VPS (`N8N_BASE_URL` interno) y activar la clave CE en esa instancia.
- [ ] **Step 5:** Aplicar `sysctl -w vm.max_map_count=524288` y persistirlo en `/etc/sysctl.d/99-sonarqube.conf` (aprobado por el usuario en D8). Desplegar `sonarqube.compose.yml` como *compose* en `VyV-QA`. Cambiar la contraseña de `admin` por una propia en la primera entrada. Crear el token `SONAR_TOKEN` y guardarlo en `qa/.env`. **Confirmación del usuario:** el dominio HTTPS de SonarQube, necesario para que GitHub Actions lo alcance.
- [ ] **Step 6:** Detener SonarQube hasta F8 para liberar memoria. Commit `docs(qa): document Dokploy resources and endpoints`.

---

### Task F0.T7 — Línea base de las pruebas existentes y registro del entorno

| Campo | Valor |
|---|---|
| Ítem | Preparación (plan v2.3, numeral 7: pruebas unitarias existentes como línea base) |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T2 |
| Evidencias | `EV-00-BASE-1` (JUnit de las pruebas existentes de los cuatro archivos de caja blanca), `EV-00-BASE-2` (JUnit de las pruebas Vitest de `editor-ui` en `src/features/{workflows,execution,credentials,core}`), `EV-00-BASE-3` (tiempos y memoria pico) |
| Destino Drive | `ENTREGABLES/00_Plan_de_implementacion/` |
| Aceptación | `qa/01-plan/entorno.md` registra versiones reales (SO, Node, pnpm, Docker y navegadores), los comandos y los resultados de la línea base. Cualquier prueba existente que falle queda registrada tal cual, sin ocultarla. |

**Files:**
- Create: `qa/01-plan/entorno.md`

- [ ] **Step 1:** `npm i -g pnpm@12.4.2`, then `pnpm agent:setup install > qa/evidencias/00/install.log 2>&1`. Expected: `.agent-setup/summary.json` con `install` en `ok`.
- [ ] **Step 2:** Run the existing backend tests of the four white-box files, one worker:
  `pnpm --filter n8n test src/webhooks/__tests__/webhook.service.test.ts src/executions/__tests__/execution.service.test.ts src/credentials/__tests__/credentials.service.test.ts --maxWorkers=1 --reporter=junit --outputFile=../../qa/evidencias/00/junit/cli-base.xml`
  Expected: PASS. Si falla porque faltan builds de dependencias, compilar solo las dependencias de `n8n` (`pnpm turbo run build --filter=n8n^... --concurrency=1`), registrar tiempo y memoria y repetir.
- [ ] **Step 3:** Locate the existing tests of `FolderService` with `git grep -l "FolderService" -- 'packages/cli/**/*.test.ts'` and run them the same way.
- [ ] **Step 4:** Run the editor tests of the four modules: `pnpm --filter n8n-editor-ui test src/features/workflows src/features/execution src/features/credentials src/features/core --maxWorkers=1 --reporter=junit --outputFile=…/editor-base.xml`. Medir con `/usr/bin/time -v`.
- [ ] **Step 5:** Write `entorno.md` (hardware, SO, versiones, URL, base de datos, comandos y resultados) and commit `docs(qa): record environment and baseline test run`.
- [ ] **Step 6: Cierre de F0:** `npm run fechas --prefix qa`, `npm run secretos --prefix qa`, PR draft a `qa/final-vyv`, crear en Drive `Final VyV/ENTREGABLES/` con sus subcarpetas `00_Plan_de_implementacion` … `15_Informe` y `Final VyV/_RESPALDOS/`, subir las evidencias de F0 y escribir la línea de cierre en el ledger.
