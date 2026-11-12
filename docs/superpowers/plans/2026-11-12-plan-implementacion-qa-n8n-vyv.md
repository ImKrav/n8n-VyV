# Plan de implementación de QA — n8n-VyV (plan índice)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cumplir los 15 ítems de la rúbrica del proyecto final de VyV sobre el fork `ImKrav/n8n-VyV` (commit `2b1d836bac`, n8n 2.48.0), con evidencias reales y reproducibles, a más tardar el 17/11/2026.

**Architecture:** Todo artefacto de QA vive en `qa/` (fuera del workspace de pnpm, con un único `qa/package.json` gestionado con npm). Las pruebas unitarias van junto al código de `packages/cli`. GitHub Actions sustituye a Jenkins como motor de CI: compila la imagen del fork, la publica en GHCR y ejecuta el pipeline con SonarQube alojado en Dokploy. El VPS de Dokploy es también la máquina de trabajo y ejecuta la instancia bajo prueba local en `127.0.0.1:5678`.

**Tech Stack:** Node 26.13.1 (engines `>=24`), pnpm 12.4.2, Vitest + v8 coverage, Cypress, Postman/Newman, Serenity/JS + Cucumber + Playwright, @axe-core/playwright, Lighthouse, pa11y-ci, SonarQube Community, Semgrep, OWASP ZAP, Trivy, gitleaks, Playwright MCP, Python 3 + openpyxl/python-docx, GitHub Actions, Dokploy v0.31.1, GHCR.

**Spec:** `/root/.claude/uploads/87bc013c-bb0b-5a47-a6fc-b7bc1b3acefb/654911c1-PROMPT_PLAN_IMPLEMENTACION_QA.md`, con las decisiones del usuario del 12/11/2026 que lo modifican (sección "Decisiones que modifican la especificación"). Base de pruebas: `PLAN DE PRUEBAS.docx` v2.3 y las matrices de `Final VyV/MATRICES`.

## Archivos del plan

| Fase | Archivo | Ítems | Fecha límite |
|---|---|---|---|
| F0 | `2026-11-12-qa-f00-preparacion.md` | Preparación | 12/11/2026 |
| F1 | `2026-11-12-qa-f01-plan-pruebas.md` | 1 | 13/11/2026 |
| F2 | `2026-11-12-qa-f02-trazabilidad-base.md` | 2 (base) | 13/11/2026 |
| F3 | `2026-11-12-qa-f03-caja-blanca-negra.md` | 4 | 13/11/2026 |
| F4 | `2026-11-12-qa-f04-tdd-unitarias.md` | 5 | 14/11/2026 |
| F5 | `2026-11-12-qa-f05-cypress-api.md` | 6 | 14/11/2026 |
| F6 | `2026-11-12-qa-f06-bdd-screenplay.md` | 7 | 14/11/2026 |
| F7 | `2026-11-12-qa-f07-regresion-base.md` | 9 (línea base) | 14/11/2026 |
| F8 | `2026-11-12-qa-f08-pipeline.md` | 8 | 15/11/2026 |
| F9 ∥ | `2026-11-12-qa-f09-accesibilidad.md` | 10 | 15/11/2026 |
| F10 ∥ | `2026-11-12-qa-f10-usabilidad.md` | 11 | 15/11/2026 (datos humanos: 17/11/2026) |
| F11 ∥ | `2026-11-12-qa-f11-seguridad.md` | 12 | 15/11/2026 |
| F12 ∥ | `2026-11-12-qa-f12-ia.md` | 13 | 15/11/2026 |
| F13 | `2026-11-12-qa-f13-ejecucion.md` | 3 | 16/11/2026 |
| F14 | `2026-11-12-qa-f14-refactor-despliegue.md` | 14 y comparativa del 9 | 16/11/2026 |
| F15 | `2026-11-12-qa-f15-informe.md` | 15 y trazabilidad final | 17/11/2026 |

**∥ F9, F10, F11 y F12 son independientes entre sí.** Las cuatro dependen solo de F0, F5 y F8, y pueden despacharse en paralelo. El resto es secuencial en el orden de la tabla.

**Justificación del orden.** F3 va antes de F4 porque la corrección TDD debe salir, si es posible, de un defecto hallado en caja blanca o negra. F7 va antes de F8 y de F14 porque la línea base de regresión tiene que ejecutarse antes de cualquier cambio en el código de producción. F13 consolida la ejecución cuando ya existen todas las suites.

## Decisiones que modifican la especificación (12/11/2026)

| N.º | Decisión del usuario | Efecto en el plan |
|---|---|---|
| D1 | La línea base pasa a ser `2b1d836bac` (último commit de `master` del fork), no `01bd57cd`. | `v-baseline` apunta a `2b1d836bac`. La versión del sistema es **2.48.0**. Plan, matrices y casos deben sustituir "2.47.0 / 01bd57cd". La imagen oficial `n8nio/n8n:2.47.0` ya no sirve como base: la imagen se compila desde el fork. |
| D2 | GitHub Actions es el motor de CI; Jenkins queda fuera. | El ítem 8 se implementa con GitHub Actions + Docker + SonarQube. Se documenta como diferencia entre lo planeado y lo ejecutado (ítem 3) y en el plan v3.0. |
| D3 | Se activa la clave gratuita de Community Edition registrada. | Los casos de las funciones que la clave desbloquee se ejecutan. Los que sigan bloqueados se marcan **Blocked (licencia)**, con evidencia de `/rest/settings`. |
| D4 | Stagehand y DeepEval se descartan por ahora. Herramienta de IA: Playwright MCP. | El ítem 13 se cubre con Playwright MCP por integrante. Stagehand y DeepEval quedan registrados como diferencia y en `qa/PENDIENTES.md`. |
| D5 | Herramienta de API recomendada: **Postman/Newman**. | Las colecciones se versionan en JSON y Newman las ejecuta sin interfaz en local y en Actions, con reportes JUnit y HTML. |
| D6 | No se usa el MCP de Dokploy. | Se usa la API REST de Dokploy con `x-api-key` leída de `qa/.env`, consultando antes el OpenAPI de la instancia. Lo que no cubra la API se hace como tarea INLINE en el panel. |
| D7 | Evaluación heurística y pruebas con usuarios: "luego nos encargamos". | F10 genera los instrumentos y el script de análisis. Los datos son tareas INLINE con marcadores `[PENDIENTE: …]`. |
| D8 | Las aprobaciones del usuario cubren `vm.max_map_count` y la distribución de recursos propuesta. | No hace falta volver a pedirlas. Siguen requiriendo confirmación: eliminar recursos, dominios y DNS, puertos públicos y merge a `master`. |

## Equipo y asignación

| Módulo | Funcionalidades | Integrante |
|---|---|---|
| Workflows | WF-01…WF-05 | Alejandro Bermudez Bedoya |
| Ejecuciones | EX-01…EX-05 | Santiago Restrepo Fonnegra |
| Credenciales | CR-01…CR-05 | Juan David Mosquera García |
| Core | CO-01…CO-05 | Mario Fernando Andrade Rojas |
| Transversal | Plan, trazabilidad consolidada, pipeline, informe | Líder de pruebas `[PENDIENTE: designar líder de pruebas]` |

## Global Constraints

- Repositorio único: `ImKrav/n8n-VyV`. Todo `gh pr create` lleva `--repo ImKrav/n8n-VyV --base qa/final-vyv --draft`. Nunca se abre un PR ni se hace push contra `n8n-io/n8n`. Antes del primer `gh` se ejecuta `gh repo set-default ImKrav/n8n-VyV`.
- Línea base `2b1d836bac` → etiqueta `v-baseline`; el cierre lleva `v-final`. Rama de integración `qa/final-vyv` (creada desde `v-baseline`). Ramas de fase `qa/fase-NN-<tema>`. El push a `qa/*` está autorizado. El merge a `master` requiere confirmación del usuario.
- Versión bajo prueba: **n8n 2.48.0, commit `2b1d836bac`**. Node `>=24` (VPS: v26.13.1). pnpm `12.4.2`, instalado con `npm i -g pnpm@12.4.2` (el Node del VPS no trae corepack).
- `qa/` está fuera de los globs de `pnpm-workspace.yaml`. Dentro de `qa/` se usa **npm** con un único `qa/package.json`, `"private": true` y dependencias con `--save-exact`. No se modifica el `package.json` raíz ni `pnpm-workspace.yaml`.
- Frameworks verificados: Vitest en `packages/cli` (`pnpm --filter n8n test`) y en `packages/frontend/editor-ui`. La suite Playwright existente está en `packages/quality/testing/playwright`.
- Pruebas unitarias nuevas: junto al código, con sufijo `.vyv.test.ts` en la carpeta `__tests__` del archivo probado, para que sean separables del código de n8n.
- Workflows propios: solo `.github/workflows/qa-*.yml`. Se disparan por `push`/`pull_request` en `qa/**` y por etiquetas `v-*`. No usan `workflow_dispatch`, porque exigiría el archivo en `master`. No se modifican ni se toman como dependencia los workflows heredados; sus resultados se ignoran.
- La instancia bajo prueba nunca corre con `E2E_TESTS=true` ni usa el controlador e2e: ese controlador simula licencias, y está prohibido simularlas. Toda instancia lleva `N8N_DIAGNOSTICS_ENABLED=false`, `GENERIC_TIMEZONE=America/Bogota` y un `N8N_ENCRYPTION_KEY` fijo tomado de `qa/.env`.
- Instancia local: `qa/docker-compose.sut.yml`, puerto `127.0.0.1:5678` (nunca público), `mem_limit: 1g`, volumen persistente (conserva la activación de la licencia). Se limpia borrando por API los objetos `VyV-`; no se borra el volumen.
- Presupuesto de memoria del VPS (2 vCPU, 7,8 GiB): instancia local 1 GiB, `n8n-pruebas` (Dokploy) 1 GiB, SonarQube + PostgreSQL 2,3 GiB **solo** durante F8, F11 y F14, ZAP 1 GiB solo en F11. `n8n-final` se crea en F14 y entonces se detiene `n8n-pruebas`. No se compila el monorepo completo en el VPS: la imagen se compila en GitHub Actions.
- Dokploy: todo recurso va en el proyecto `VyV-QA`. La API se consulta con `DOKPLOY_URL` y `DOKPLOY_API_KEY` de `qa/.env`. Antes de usar un endpoint se cita en `qa/08-pipeline/dokploy-endpoints.md`, tomado del OpenAPI de la instancia. Requieren confirmación: eliminar, tocar recursos fuera de `VyV-QA` (incluida la app `nodalix`), dominios, DNS, certificados y puertos públicos.
- Secretos solo en `qa/.env` (ignorado por git; verificado con `git check-ignore`) o en los *secrets* de GitHub Actions. Se versiona `qa/.env.example`. Nunca se imprime un secreto, ni se pasa como argumento de un comando (AGENTS.md: los argumentos de pnpm pueden registrarse), ni aparece en evidencias o documentos.
- Datos de prueba siempre con prefijo `VyV-`. Nunca datos ni cuentas personales reales.
- Identificadores invariables: RF `WF-01…CO-05`, RNF `RNF-01…RNF-05`, HU `HU-01…HU-20`, `ESC-<fid>`, `CON-<fid>-NN`, `CP-<fid>-NN` (142), `ES-01…ES-06`, evidencias `EV-<ítem 2 dígitos>-<id>-<n>`, por ejemplo `EV-06-CP-WF-01-01-1`.
- **Interfaz entre tareas:** el título de toda prueba automatizada empieza por su `CP-…` (por ejemplo `it('CP-WF-01-01 Añadir un trigger…')`) y los JUnit se guardan en `qa/evidencias/<ítem>/junit/`. La consolidación del ítem 3 depende de esta convención.
- Evidencias en `qa/evidencias/<ítem>/`. En Drive se suben a `Final VyV/ENTREGABLES/<NN_Nombre>/`.
- Prohibido fabricar resultados, métricas, tiempos, puntuaciones, participantes o hallazgos. Todo dato humano queda como `[PENDIENTE: …]` en `qa/PENDIENTES.md`.
- Una prueba que falla por un defecto real se registra como issue (plantilla `defecto.yml`, título `[CP-…] …`, cita `EV-…`) y no se debilita. Prohibidos `skip`, `only`, `xit`, `it.skip` y `retries` para obtener verde. Los casos bloqueados se marcan Blocked con su motivo.
- Hallazgos de seguridad: este repositorio es público. El issue usa un título neutro (AGENTS.md, "Security Fix Hygiene"). El detalle del vector va solo en el informe del ítem 12. Si un hallazgo confirmado afecta también a n8n original, se propone al usuario la divulgación responsable a n8n, sin abrir un issue público.
- Código de producción: solo cambios derivados de pruebas, siempre con TDD (commits `test: … (RED)`, `fix|feat: … (GREEN)`, `refactor: … (REFACTOR)`) y las reglas de AGENTS.md (sin `any`, sin `as` fuera de pruebas, errores `UserError`/`OperationalError`/`UnexpectedError`).
- Documentos: español, redacción impersonal, APA 7. Ninguna fecha posterior al **17/11/2026**. Los documentos registran fechas ocurridas (tomadas de git o del ledger) o la fecha límite 17/11/2026; nunca fechas estimadas.
- Drive: el conector no puede sobrescribir el contenido de un archivo existente (no hay herramienta para ello y `canEdit=false`). Para actualizar un documento vivo: (1) se sube la versión nueva con `create_file` en la misma carpeta y con el mismo nombre; (2) el archivo anterior se mueve con `update_file(parentId=…)` a `Final VyV/_RESPALDOS/`, renombrado `AAAA-MM-DD_<nombre>`. Nunca se elimina nada sin confirmación.
- Las subidas a Drive, el despacho de subagentes y el merge de los PR de fase en `qa/final-vyv` los hace el controlador. El merge en `qa/final-vyv` está autorizado; en `master`, no.
- Cierre de fase (regla 5): matriz actualizada (F2 en adelante), evidencias en `qa/evidencias/`, commit, PR draft a `qa/final-vyv`, entregables en `ENTREGABLES/<ítem>`, una línea en el ledger `docs/superpowers/plans/2026-11-12-qa-ledger.md`.
- Subagentes: siempre `model: "sonnet"`, tanto implementadores como revisores. La revisión final de la rama puede usar el modelo más capaz. Las tareas INLINE las ejecuta el controlador, porque dependen del usuario: autenticaciones, claves, permisos, personas o datos reales.
- Reproducibilidad: todo comando necesario queda en `qa/README.md` o en el README de su carpeta.

## Review Focus

1. **Evidencia citada pero inexistente.** Un caso marcado Pass o Fail cuyo `EV-…` no existe en `qa/evidencias/` o en Drive debe hacer fallar el validador de la matriz. La prueba `test_evidencia_inexistente_falla` va en F2.T1.
2. **Fechas posteriores al 17/11/2026 o marcadores de fecha** (`dd/mm/aaaa`, "por definir") en los documentos entregables deben hacer fallar `qa/scripts/validar-fechas.mjs`. Prueba en F0.T2; se ejecuta en el cierre de cada fase.
3. **Secretos en las evidencias:** cookies `n8n-auth`, `N8N_ENCRYPTION_KEY`, tokens de Sonar o Dokploy en HAR, logs o capturas. gitleaks sobre `qa/` se ejecuta en cada cierre de fase y en el pipeline; las HAR se guardan sin cabeceras `cookie`/`authorization`. Prueba en F0.T2 (gitleaks detecta un secreto plantado en un archivo temporal fuera del repositorio) y paso en F8.T1.
4. **Contaminación entre ejecuciones:** objetos `VyV-` de una corrida anterior que producen falsos Pass o falsos Fail. Cada suite llama a `cleanupVyV()` en `before` y usa nombres con sufijo único `VyV-<CP>-<timestamp>`. Prueba de `cleanupVyV` en F0.T4.
5. **Licencia no activa en una instancia** (instancia nueva, CI o `n8n-final`): los casos de carpetas fallarían como "defecto" cuando el problema es de entorno. Toda suite de CO-04, CO-05 y de funciones licenciadas comprueba primero `assertLicensed()` y, si falla, marca Blocked (licencia) en vez de Fail. `assertLicensed` se crea en F0.T4 y se verifica contra el estado real en F0.T5; lo usan `cy.requireLicense` (F5.T1) y la regla `ENTORNO:` del consolidador (F13.T1, que tiene su prueba `Blocked (entorno) con fallo ENTORNO:`).

## Tabla de cobertura ítem → tareas

| Ítem | Tareas |
|---|---|
| 1 Plan de pruebas | F1.T1, F1.T2, F15.T2 (versión final) |
| 2 Matriz de trazabilidad | F2.T1, F2.T2, cierre de cada fase, F15.T1 |
| 3 Desarrollo y ejecución | F13.T1, F13.T2, F13.T3 |
| 4 Caja blanca y caja negra | F3.T1–F3.T4 (blanca, una por integrante), F3.T5 (negra) |
| 5 TDD y unitarias | F4.T1 (TDD), F4.T2 (unitarias, dobles de prueba y cobertura) |
| 6 Cypress y API | F5.T1 (andamiaje), F5.T2–F5.T5 (Cypress por integrante), F5.T6 (Newman) |
| 7 Gherkin, BDD y Screenplay | F6.T1, F6.T2 |
| 8 Pipeline | F0.T3 (imagen), F0.T6 (SonarQube), F8.T1, F8.T2, F8.T3 |
| 9 Regresión | F7.T1 (suite y línea base), F14.T3 (ejecución posterior y comparativa) |
| 10 Accesibilidad | F9.T1, F9.T2 |
| 11 Usabilidad y UX | F10.T1, F10.T2 (INLINE) |
| 12 Seguridad | F11.T1, F11.T2, F11.T3 |
| 13 IA aplicada | F12.T1 (INLINE, configuración), F12.T2 (sesiones por integrante) |
| 14 Refactorización y despliegue | F14.T1, F14.T2, F14.T3, F14.T4 |
| 15 Informe y sustentación | F15.T2, F15.T3 |

## Pendientes del usuario que bloquean tareas

| Pendiente | Bloquea | Tarea INLINE |
|---|---|---|
| Designar al líder de pruebas | Responsable de las tareas transversales | F0.T1 |
| Credenciales de la cuenta propietaria y del miembro de n8n (en `qa/.env`) | F0.T4 en adelante | F0.T5 |
| Registro y clave gratuita de Community Edition | Casos licenciados | F0.T5 |
| `DOKPLOY_URL` y `DOKPLOY_API_KEY` en `qa/.env` | F0.T6, F8, F14 | F0.T6 |
| Dominios HTTPS para `n8n-pruebas`, `sonarqube` y `n8n-final` (requiere confirmación) | Acceso del equipo y SonarQube desde Actions | F0.T6 |
| Visibilidad del paquete GHCR o token `read:packages` para Dokploy | Despliegues desde GHCR | F0.T6 |
| Secretos de Actions: `SONAR_TOKEN`, `SONAR_HOST_URL`, `N8N_OWNER_*`, `N8N_LICENSE_ACTIVATION_KEY`, opcional `DOKPLOY_*` | F8 | F8.T2 |
| Evaluadores heurísticos y 5 participantes | Datos del ítem 11 | F10.T2 |
| Ejecución de Playwright MCP por integrante | Ítem 13 | F12.T2 |

## Ledger

El controlador mantiene `docs/superpowers/plans/2026-11-12-qa-ledger.md` según `superpowers:subagent-driven-development`. Por cada tarea registra la brief despachada, el SHA del commit, el veredicto del revisor y una línea de resumen. Al cerrar cada fase añade la línea de cierre.
