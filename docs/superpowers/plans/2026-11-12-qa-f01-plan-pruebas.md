# F1 — Ítem 1: Plan de pruebas v3.0

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Producir el `PLAN DE PRUEBAS v3.0` (docx, PDF y fuente) a partir del v2.3. Debe cumplir los numerales 1–20 del `FORMATO PLAN DE PRUEBAS.pptx` e incorporar las estrategias y herramientas de los ítems 4–14 y las decisiones D1–D8.

**Architecture:** La fuente es Markdown (`qa/01-plan/plan-de-pruebas-v3.0.md`). Pandoc la convierte a docx usando el v2.3 como `--reference-doc`, para conservar sus estilos, y LibreOffice genera el PDF. Un script verifica los 20 numerales y las fechas.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md` (Global Constraints y Review Focus aplican).

**Rama:** `qa/fase-01-plan`. **Fecha límite:** 13/11/2026.

---

### Task F1.T1 — Fuente del plan v3.0

| Campo | Valor |
|---|---|
| Ítem | 1 |
| Responsable | Líder de pruebas `[PENDIENTE]`; cada integrante revisa las filas de su módulo |
| Modo / modelo | SDD / sonnet |
| Depende de | F0 (`qa/01-plan/licencia.md` y `qa/01-plan/entorno.md`) |
| Evidencias | `EV-01-PLAN-1` (salida de `npm run plan:verificar --prefix qa`) |
| Destino Drive | `ENTREGABLES/01_Plan/` |
| Aceptación | `plan:verificar` en verde: los encabezados 1–20 (y 1.1–1.3, 2.1–2.4, 5.1–5.4, 12.1–12.3, 13.1–13.3) están presentes y no hay fechas posteriores al 17/11/2026 ni marcadores; no queda ningún `2.47.0` ni `01bd57cd`, salvo en el historial de versiones. |

**Files:**
- Create: `qa/01-plan/fuente/PLAN DE PRUEBAS v2.3.docx` (descargado de Drive por el controlador antes del despacho)
- Create: `qa/01-plan/plan-de-pruebas-v3.0.md`
- Create: `qa/01-plan/verificar-plan.mjs`, `qa/01-plan/verificar-plan.test.mjs`
- Modify: `qa/package.json` (script `plan:verificar`)

**Interfaces:**
- Consumes: `qa/01-plan/licencia.md` y `qa/01-plan/entorno.md` (F0), `qa/scripts/validar-fechas.mjs` (F0.T2).
- Produces: `node qa/01-plan/verificar-plan.mjs <archivo.md>`, que sale con código 1 e imprime la lista de numerales faltantes.

- [ ] **Step 1: Write the failing tests** in `verificar-plan.test.mjs`:
  - `test('detecta numeral faltante')`: un Markdown sin `# 13. GESTIÓN DE DEFECTOS` → código 1 y la salida contiene `13`.
  - `test('acepta plan completo')`: un Markdown con los 20 numerales y sus subnumerales → código 0.
- [ ] **Step 2:** Run `npm run plan:verificar --prefix qa -- qa/01-plan/plan-de-pruebas-v3.0.md`. Expected: FAIL (archivo inexistente).
- [ ] **Step 3:** Implement `verificar-plan.mjs`: lista fija de numerales del formato; llama a `validar-fechas.mjs`.
- [ ] **Step 4:** Write `plan-de-pruebas-v3.0.md` from the v2.3 text (`pandoc "qa/01-plan/fuente/PLAN DE PRUEBAS v2.3.docx" -t gfm`). Change only what follows and keep the rest:
  - **Portada:** versión 3.0; fecha 13/11/2026 (o la fecha real de la entrega, si es anterior); equipo con los cuatro nombres y el líder.
  - **1.1 y 2.1:** fork en n8n 2.48.0, commit `2b1d836bac`, etiqueta `v-baseline`.
  - **2.2 y 5.3:** Community Edition con la clave gratuita registrada; tabla de `licencia.md`; el cliente OAuth2 de Google se sustituye por un servidor OAuth2 simulado (`mock-oauth2-server`) con la credencial genérica *OAuth2 API*, y Google queda como opción; el segundo usuario miembro se crea por invitación.
  - **6:** filas nuevas por cada estrategia de los ítems 4–14: caja blanca sobre las cuatro funciones de F3 (`WebhookService._findWebhookConflicts`, `ExecutionService.stop`, `CredentialsService.redact`, `FolderService.deleteFolder`); TDD; Cypress; Postman/Newman; BDD con Serenity/JS y Screenplay; regresión `@regresion`; pipeline en GitHub Actions con SonarQube; accesibilidad WCAG 2.2 AA; usabilidad con Nielsen y SUS; seguridad con OWASP Top 10:2025, SAST, DAST, SCA y secretos; IA con Playwright MCP.
  - **7:** las pruebas unitarias ya no son "solo existentes": se añaden pruebas por camino (F3) y TDD (F4).
  - **8.2:** se añade la fila de seguridad con OWASP Top 10:2025 y se amplía accesibilidad a WCAG 2.2 AA.
  - **10:** entorno real de `entorno.md`: VPS de 2 vCPU y 7,8 GiB, Docker, `127.0.0.1:5678`, `n8n-pruebas` en Dokploy y herramientas exactas con versiones.
  - **12.2:** umbral de cobertura del código seleccionado ≥ 80 % de líneas y de ramas, y Quality Gate de SonarQube aprobado.
  - **13.3:** GitHub Issues con la plantilla `defecto.yml` y las etiquetas de F0.T1.
  - **14:** R08 se actualiza con el estado de la clave CE; R09 se mitiga compilando en GitHub Actions; nuevos R13 (memoria del VPS compartida con Dokploy), R14 (los workflows heredados consumen Actions en el fork) y R15 (datos humanos del ítem 11 no disponibles a tiempo).
  - **15:** responsables con nombres; el líder se mantiene como `[PENDIENTE]` hasta que el usuario lo designe.
  - **16:** cronograma con las fases F0–F15 y su fecha límite dentro del ciclo (12/11/2026 a 17/11/2026), responsable por fase; sin fechas posteriores al 17/11/2026.
  - **17:** métricas de ejecución, aprobación y fallo, densidad de defectos, cobertura de requisitos y de código.
  - **18:** entregables por ítem de la rúbrica con su carpeta de `ENTREGABLES`.
  - **20.1:** versión 3.0 con la descripción de los cambios. **20.2:** las decisiones D1–D8 como solicitudes de cambio aprobadas.
  - Referencias APA 7 nuevas: OWASP Top 10:2025, WCAG 2.2 (W3C, 2023), Brooke (1996) para SUS, Nielsen (1994) para heurísticas, McCabe (1976) para V(G) y la documentación de las herramientas usadas.
- [ ] **Step 5:** Run `npm run plan:verificar --prefix qa -- qa/01-plan/plan-de-pruebas-v3.0.md`. Expected: PASS. Run `grep -n -E "2\.47\.0|01bd57cd" qa/01-plan/plan-de-pruebas-v3.0.md`. Expected: solo líneas de la sección 20.1.
- [ ] **Step 6:** Commit `docs(qa): write test plan v3.0 source`.

---

### Task F1.T2 — Documento docx y PDF del plan v3.0

| Campo | Valor |
|---|---|
| Ítem | 1 |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet (la subida a Drive la hace el controlador) |
| Depende de | F1.T1 |
| Evidencias | `EV-01-PLAN-2` (PDF generado), `EV-01-PLAN-3` (captura de las páginas 1 y 16 del PDF: portada y cronograma) |
| Destino Drive | `ENTREGABLES/01_Plan/` (docx y PDF) y `Final VyV/` (documento vivo `PLAN DE PRUEBAS.docx`, que se reemplaza según la regla de Drive) |
| Aceptación | El docx abre en LibreOffice sin errores; el PDF tiene tabla de contenidos, tablas legibles y referencias con sangría francesa; el texto extraído del PDF pasa `validar-fechas.mjs`. |

**Files:**
- Create: `qa/01-plan/build.sh`
- Create (generados): `qa/01-plan/PLAN DE PRUEBAS v3.0.docx`, `qa/01-plan/PLAN DE PRUEBAS v3.0.pdf`

- [ ] **Step 1:** `apt-get install -y pandoc libreoffice-writer-nogui` (una vez; se documenta en `qa/README.md`).
- [ ] **Step 2:** Write `build.sh`: `pandoc plan-de-pruebas-v3.0.md --reference-doc "fuente/PLAN DE PRUEBAS v2.3.docx" --toc -o "PLAN DE PRUEBAS v3.0.docx"`, then `soffice --headless --convert-to pdf …`.
- [ ] **Step 3:** Run `bash qa/01-plan/build.sh`. Expected: los dos archivos existen y pesan más de 0 bytes.
- [ ] **Step 4:** Render the PDF pages with `pdftoppm -r 60` and inspect the cover, a table and the references. Si una tabla se corta, ajustar el Markdown (anchos con `pandoc` *pipe tables*) y repetir.
- [ ] **Step 5:** Commit `docs(qa): build test plan v3.0 docx and pdf`.
- [ ] **Step 6: Cierre de F1 (controlador):** `npm run fechas --prefix qa` y `npm run secretos --prefix qa`; PR draft; subir docx y PDF a `ENTREGABLES/01_Plan/`; reemplazar el documento vivo `PLAN DE PRUEBAS.docx` (crear el nuevo y mover el v2.3 a `_RESPALDOS/2026-11-13_PLAN DE PRUEBAS.docx`); escribir la línea en el ledger.
