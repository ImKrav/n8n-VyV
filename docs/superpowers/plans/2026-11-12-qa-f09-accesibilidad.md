# F9 — Ítem 10: Accesibilidad (WCAG 2.2 AA)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evaluar con herramientas automáticas y comprobaciones guiadas las cinco interfaces (lienzo del editor, lista de ejecuciones, modal de credenciales, data tables y carpetas) frente a WCAG 2.2 AA, y entregar las barreras con su severidad y sus recomendaciones.

**Architecture:** `@axe-core/playwright` con las etiquetas `wcag2a`, `wcag2aa`, `wcag21aa` y `wcag22aa`; Lighthouse CLI (categoría accesibilidad) y `pa11y-ci`, ambos con el Chromium que instala Playwright. Las comprobaciones manuales se hacen con scripts de Playwright que registran la evidencia: orden del foco con capturas por tabulación, zoom al 200 % y *reflow* a 320 px de ancho. Un integrante confirma lo que requiere juicio humano.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-09-accesibilidad`. **Paralela a F10–F12.** **Fecha límite:** 15/11/2026.

---

### Task F9.T1 — Evaluación automática con axe, Lighthouse y pa11y

| Campo | Valor |
|---|---|
| Ítem | 10 |
| Responsable | Cada integrante su interfaz: lienzo (Alejandro), lista de ejecuciones (Santiago), modal de credenciales (Juan David), data tables y carpetas (Mario) |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T4, F0.T5 y F5.T1 |
| Evidencias | `EV-10-AXE-<interfaz>-1` (JSON de axe), `EV-10-LH-<interfaz>-1` (HTML de Lighthouse), `EV-10-PA11Y-1` (JSON de pa11y-ci) |
| Destino Drive | `ENTREGABLES/10_Accesibilidad/` |
| Aceptación | Las cinco interfaces tienen resultados de las tres herramientas; cada violación de axe se registra en `barreras.md` con su criterio WCAG; las violaciones `critical` o `serious` tienen issue. |

**Files:**
- Modify: `qa/package.json` (devDependencies exactas `@axe-core/playwright`, `lighthouse`, `pa11y-ci`; script `test:a11y`)
- Create: `qa/10-accesibilidad/axe.spec.mjs`, `qa/10-accesibilidad/lighthouse.mjs`, `qa/10-accesibilidad/.pa11yci.json`, `qa/10-accesibilidad/interfaces.mjs`

**Interfaces:**
- Produces: `interfaces.mjs` exporta `[{ id: 'lienzo', ruta: '/workflow/<id>', preparar: async (page) => … }, …]` para las cinco interfaces. Los datos `VyV-` se crean por API con `sut.mjs`. Lo reutilizan F9.T2 y F10.

- [ ] **Step 1:** Write `interfaces.mjs` and `axe.spec.mjs`: un test por interfaz, `CP-A11Y-<id> axe WCAG 2.2 AA`, que guarda el JSON completo de `AxeBuilder.withTags([...]).analyze()` y aserta `violations.filter(v => ['critical','serious'].includes(v.impact))` igual a `[]`. Si la aserción falla, es un hallazgo y no se relaja.
- [ ] **Step 2:** Run `npm run test:a11y --prefix qa`. Expected: JSON por interfaz en `qa/evidencias/10/axe/`.
- [ ] **Step 3:** Write `lighthouse.mjs`: usa la cookie de `login()` como cabecera extra, `--only-categories=accessibility` y `CHROME_PATH` del Chromium de Playwright. Write `.pa11yci.json` with the five URLs, `standard: "WCAG2AA"` and the session cookie injected through `headers`. Run both.
- [ ] **Step 4:** Commit `test(qa): add automated accessibility checks`.

---

### Task F9.T2 — Comprobaciones manuales guiadas e informe

| Campo | Valor |
|---|---|
| Ítem | 10 |
| Responsable | Los mismos de F9.T1 |
| Modo / modelo | SDD / sonnet (scripts y capturas) + INLINE (confirmación humana de foco visible, mensajes y comportamiento con lector de pantalla, si se usa) |
| Depende de | F9.T1 |
| Evidencias | `EV-10-TECLADO-<interfaz>-<n>` (captura por tabulación), `EV-10-ZOOM-<interfaz>-1`, `EV-10-REFLOW-<interfaz>-1` |
| Destino Drive | `ENTREGABLES/10_Accesibilidad/` |
| Aceptación | `qa/10-accesibilidad/informe.md` incluye la tabla de criterios WCAG 2.2 AA evaluados (como mínimo 1.1.1, 1.3.1, 1.4.3, 1.4.4, 1.4.10, 1.4.11, 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11, 2.5.8, 3.3.1, 3.3.2, 4.1.2 y 4.1.3) con su resultado (Cumple, No cumple o No aplica) y su evidencia; la tabla de barreras con severidad (Crítica, Alta, Media o Baja), criterio, interfaz, evidencia y recomendación; y una línea por comprobación humana confirmada o `[PENDIENTE]`. |

**Files:**
- Create: `qa/10-accesibilidad/manual.spec.mjs`, `qa/10-accesibilidad/informe.md`, `qa/10-accesibilidad/barreras.md`

- [ ] **Step 1:** Write `manual.spec.mjs`:
  - **Teclado:** 25 pulsaciones de `Tab` por interfaz; tras cada una se guarda una captura y `document.activeElement` (rol, nombre accesible y `outerHTML` truncado) en `teclado-<interfaz>.json`. Se detectan trampas de foco (el mismo elemento tres veces seguidas sin escape) y elementos con foco sin indicador visible (`outline-style: none` y sin `box-shadow`).
  - **Zoom al 200 %:** viewport de 1280 × 800 con `document.documentElement.style.zoom = '2'`; se comprueba que no aparece desplazamiento horizontal (`scrollWidth <= clientWidth`) y se guarda la captura.
  - **Reflow a 320 px:** viewport de 320 × 640; misma comprobación.
  - **Mensajes de error y estado:** provocar un error de validación por interfaz (por ejemplo, el nombre vacío de una data table) y comprobar que el mensaje tiene `role="alert"` o `aria-live` o está asociado con `aria-describedby`.
- [ ] **Step 2:** Run it. Expected: evidencias generadas; los resultados entran en el informe tal cual.
- [ ] **Step 3 (INLINE):** El integrante de cada interfaz revisa las capturas de foco y confirma si el foco es visible y el orden es lógico; anota su conclusión en `informe.md` con su nombre. Si no hay revisión humana antes del 17/11/2026, se deja `[PENDIENTE: revisión humana de <interfaz>]` en `qa/PENDIENTES.md`.
- [ ] **Step 4:** Write `informe.md` and `barreras.md`. Commit `docs(qa): add accessibility report`.
- [ ] **Step 5: Cierre de F9 (controlador):** matriz (RNF-05 y CP-EX-05-05), Drive, PR draft y ledger.
