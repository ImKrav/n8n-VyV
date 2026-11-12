# F10 — Ítem 11: Usabilidad y UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar los instrumentos de la evaluación heurística de Nielsen y de las pruebas con usuarios (guion de tareas, consentimiento, cuestionario SUS, hoja de registro y script de análisis). Los datos los recopila el equipo (decisión D7). Ningún dato se inventa.

**Architecture:** Los instrumentos son documentos `.docx` (pandoc desde Markdown, como en F1) y hojas `.xlsx` (openpyxl). El script de análisis en Python calcula el SUS con la fórmula estándar (Brooke, 1996): ítems impares, respuesta − 1; ítems pares, 5 − respuesta; suma × 2,5; referencia 68. Calcula también la tasa de finalización, el tiempo medio y los errores por tarea, y la severidad media por heurística.

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-10-usabilidad`. **Paralela a F9, F11 y F12.** **Fecha límite:** instrumentos el 15/11/2026; datos humanos, a más tardar el 17/11/2026.

---

### Task F10.T1 — Instrumentos y script de análisis

| Campo | Valor |
|---|---|
| Ítem | 11 |
| Responsable | Líder de pruebas `[PENDIENTE]`; una tarea del guion por integrante, sobre su módulo |
| Modo / modelo | SDD / sonnet |
| Depende de | F0.T6 (`n8n-pruebas` accesible por HTTPS para los participantes) |
| Evidencias | `EV-11-INST-1` (instrumentos en PDF), `EV-11-SUS-1` (salida de las pruebas del script) |
| Destino Drive | `ENTREGABLES/11_Usabilidad/Instrumentos/` |
| Aceptación | Las pruebas del script pasan; los instrumentos están en español, con redacción impersonal y sin datos personales precargados; la hoja de registro trae validaciones de datos (SUS de 1 a 5 y tiempos numéricos). |

**Files:**
- Create: `qa/11-usabilidad/guion-tareas.md` (cinco tareas, una por módulo más una transversal; cada una con objetivo, punto de partida en `n8n-pruebas`, criterio de éxito y tiempo máximo)
- Create: `qa/11-usabilidad/consentimiento.md` (propósito, voluntariedad, anonimización con código `P01…P05`, uso exclusivamente académico, derecho a retirarse; firma y fecha en blanco)
- Create: `qa/11-usabilidad/sus.md` (los 10 ítems de la versión en español del SUS, escala de 1 a 5)
- Create: `qa/11-usabilidad/heuristicas.md` (las 10 heurísticas de Nielsen, escala de severidad 0–4 y una hoja por evaluador)
- Create: `qa/11-usabilidad/generar_instrumentos.py`, `qa/11-usabilidad/analisis.py`, `qa/11-usabilidad/test_analisis.py`
- Create (generados): `registro-usuarios.xlsx` (hojas `Participantes`, `Tareas` con finalizada S/N, segundos y errores, `SUS`), `evaluacion-heuristica.xlsx` (hoja por evaluador y hoja de consolidado) y los `.docx` y PDF de los instrumentos

**Interfaces:**
- Produces: `python qa/11-usabilidad/analisis.py --usuarios registro-usuarios.xlsx --heuristica evaluacion-heuristica.xlsx --salida qa/11-usabilidad/resultados.md`. Si una hoja no tiene filas, escribe `[PENDIENTE: datos de …]` en lugar de cifras y sale con código 0. Nunca rellena valores.
- Produces: `def sus(respuestas: list[int]) -> float` (exactamente 10 valores entre 1 y 5; si no, `ValueError`).

- [ ] **Step 1: Write the failing tests** in `test_analisis.py`:
  - `test_sus_todos_3`: `sus([3]*10) == 50.0`.
  - `test_sus_maximo`: `sus([5,1,5,1,5,1,5,1,5,1]) == 100.0`.
  - `test_sus_minimo`: `sus([1,5,1,5,1,5,1,5,1,5]) == 0.0`.
  - `test_sus_rango_invalido`: `sus([0]*10)` lanza `ValueError`.
  - `test_sin_datos_marca_pendiente`: con hojas vacías, `resultados.md` contiene `[PENDIENTE:` y ningún número de SUS.
  - `test_tasa_finalizacion`: con 2 de 4 tareas finalizadas, la tasa es 50 %.
- [ ] **Step 2:** Run `qa/.venv/bin/python -m unittest discover qa/11-usabilidad`. Expected: FAIL. Implement `analisis.py`. Run again. Expected: PASS.
- [ ] **Step 3:** Write the Markdown instruments and `generar_instrumentos.py`, which builds the `.xlsx` files and calls pandoc and LibreOffice for the `.docx` and PDF. Run it.
- [ ] **Step 4:** Commit `docs(qa): add usability instruments and SUS analysis`.

---

### Task F10.T2 — Recopilación de datos e interpretación (INLINE)

| Campo | Valor |
|---|---|
| Ítem | 11 |
| Responsable | Equipo completo; el usuario coordina a los participantes |
| Modo / modelo | INLINE / controlador |
| Depende de | F10.T1 |
| Evidencias | `EV-11-HEU-<evaluador>-1` (hoja diligenciada), `EV-11-USR-P0N-1` (registro anonimizado por participante), `EV-11-SUS-2` (`resultados.md`) |
| Destino Drive | `ENTREGABLES/11_Usabilidad/Resultados/` (los consentimientos firmados se guardan en Drive fuera del repositorio) |
| Aceptación | Si hay datos: `resultados.md` muestra el SUS por participante, la media, la comparación con 68, la tasa de finalización, los tiempos y errores por tarea, la severidad media por heurística y una interpretación que explica cómo se obtuvieron los datos. Si no hay datos antes del 17/11/2026: `resultados.md` contiene `[PENDIENTE]` y `qa/PENDIENTES.md` lo registra; el informe final lo declara como diferencia. |

- [ ] **Step 1:** El usuario nombra a los evaluadores heurísticos (al menos 2) y a los participantes (al menos 5 sugeridos) y los registra en `qa/PENDIENTES.md` solo con códigos.
- [ ] **Step 2:** El equipo diligencia las hojas. El controlador las recibe del usuario, las guarda en `qa/11-usabilidad/datos/` sin nombres reales y ejecuta `analisis.py`.
- [ ] **Step 3:** El controlador redacta la interpretación en `resultados.md` solo a partir de los datos recibidos. Commit `docs(qa): add usability results`.
- [ ] **Step 4: Cierre de F10 (controlador):** matriz (RNF-03), Drive, PR draft y ledger.
