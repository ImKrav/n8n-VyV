# F2 — Ítem 2: Matriz de trazabilidad (versión base) y herramientas de actualización

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar `MATRIZ DE TRAZABILIDAD.xlsx` con las columnas Integrante, Issue y Evidencia (enlace), actualizar versión y entorno, y dejar dos scripts: uno que la actualiza desde `resultados.json` y otro que valida que ningún caso quede sin requisito, resultado o evidencia.

**Architecture:** Python 3 con un entorno virtual `qa/.venv` (`openpyxl`, `python-docx`, versiones fijadas). Las columnas nuevas se añaden **al final** de la hoja RTM para no mover las referencias de las fórmulas del Dashboard. Si el libro contiene gráficos o dibujos, que openpyxl no conserva, se editan directamente las celdas en el XML del `.xlsx` (`zipfile` + `xml.etree`).

**Spec:** `docs/superpowers/plans/2026-11-12-plan-implementacion-qa-n8n-vyv.md`

**Rama:** `qa/fase-02-trazabilidad`. **Fecha límite:** 13/11/2026.

---

### Task F2.T1 — Scripts `actualizar_rtm.py` y `validar_rtm.py`

| Campo | Valor |
|---|---|
| Ítem | 2 |
| Responsable | Líder de pruebas `[PENDIENTE]` |
| Modo / modelo | SDD / sonnet |
| Depende de | F0 (licencia.md) |
| Evidencias | `EV-02-RTM-1` (salida de `python -m unittest` en `qa/02-trazabilidad`), `EV-02-RTM-2` (salida de `validar_rtm.py --modo base`) |
| Destino Drive | `ENTREGABLES/02_Trazabilidad/` |
| Aceptación | Pruebas en verde; el libro resultante conserva las 4 hojas, el mismo número de celdas con fórmula en Dashboard y RTM, y las validaciones de datos; `--modo base` pasa sobre la matriz actualizada. |

**Files:**
- Create: `qa/requirements.txt`, `qa/02-trazabilidad/actualizar_rtm.py`, `qa/02-trazabilidad/validar_rtm.py`, `qa/02-trazabilidad/test_rtm.py`, `qa/02-trazabilidad/README.md`
- Create: `qa/02-trazabilidad/fuente/MATRIZ DE TRAZABILIDAD.xlsx` (copia descargada por el controlador)
- Create (generado): `qa/02-trazabilidad/MATRIZ DE TRAZABILIDAD.xlsx`

**Interfaces:**
- Consumes: `qa/01-plan/licencia.md` (lista de casos Blocked por licencia).
- Produces: `qa/03-ejecucion/resultados.json` con el esquema siguiente. Lo escribe F13 y cada fase puede añadir entradas.
  ```json
  { "CP-WF-01-01": { "estado": "Pass|Fail|Blocked|Not Run", "evidencias": ["EV-06-CP-WF-01-01-1"],
    "issue": 12, "fecha": "16/11/2026", "entorno": "Local · 127.0.0.1:5678 · SQLite · Chromium",
    "version": "2.48.0 (2b1d836)", "notas": "…" } }
  ```
- Produces: `python qa/02-trazabilidad/actualizar_rtm.py --entrada <xlsx> --resultados <json> --integrantes qa/02-trazabilidad/integrantes.json --salida <xlsx>`.
- Produces: `python qa/02-trazabilidad/validar_rtm.py <xlsx> --modo base|final --evidencias qa/evidencias`. Sale con código 1 y lista `CP: motivo`. En modo `base` exige 142 CP únicos, cada uno con HU, RF/RNF, Escenario, Condición e Integrante. En modo `final` exige además Estado ≠ Not Run, evidencia existente si el estado es Pass o Fail, issue si el estado es Fail y motivo en Notas si el estado es Blocked.
- Produces: `qa/02-trazabilidad/integrantes.json` = `{"WF": "Alejandro Bermudez Bedoya", "EX": "Santiago Restrepo Fonnegra", "CR": "Juan David Mosquera García", "CO": "Mario Fernando Andrade Rojas"}`.

- [ ] **Step 1:** Create the venv (`python3 -m venv qa/.venv` and `qa/.venv/bin/pip install -r qa/requirements.txt`) and add `qa/.venv/` to `qa/.gitignore`. Inspect the workbook: hojas, fila de encabezados de RTM, fórmulas del Dashboard (`cell.data_type == 'f'`), validaciones de datos y presencia de `xl/charts/` o `xl/drawings/` en el zip. Registrar el resultado en `README.md` y elegir con él openpyxl o XML directo.
- [ ] **Step 2: Write the failing tests** in `test_rtm.py` (`unittest`, sobre una copia temporal de la matriz):
  - `test_142_casos`: `validar_rtm --modo base` sobre la matriz actualizada → código 0, y el número de CP únicos es 142.
  - `test_cp_sin_requisito_falla`: vaciar `RF/RNF` de CP-CO-05-08 → código 1 y salida con `CP-CO-05-08`.
  - `test_evidencia_inexistente_falla` (Review Focus #1): estado `Pass` con evidencia `EV-06-CP-WF-01-01-9` que no existe → `--modo final` sale con código 1.
  - `test_fail_sin_issue_falla`: estado `Fail` sin issue → código 1.
  - `test_formulas_preservadas`: el número de celdas con fórmula en Dashboard es igual antes y después de `actualizar_rtm`.
  - `test_hojas_preservadas`: `['Dashboard', 'RTM', 'Lookups', 'Cómo usar']` en el mismo orden.
  - `test_blocked_licencia`: los CP de `licencia.md` quedan en `Blocked` y su motivo en Notas.
- [ ] **Step 3:** Run `qa/.venv/bin/python -m unittest discover qa/02-trazabilidad`. Expected: FAIL.
- [ ] **Step 4:** Implement both scripts. `actualizar_rtm.py` añade al final de RTM las columnas `Integrante`, `Issue` y `Evidencia (enlace)`; sustituye `2.47.0` por `2.48.0 (2b1d836)` en "Versión Probada"; sustituye el entorno por el de `resultados.json` cuando lo haya; aplica los Blocked de licencia; copia el estilo de la última columna existente a las nuevas; nunca toca las celdas con fórmula.
- [ ] **Step 5:** Run the tests. Expected: PASS.
- [ ] **Step 6:** Commit `test(qa): add traceability matrix updater and validator`.

---

### Task F2.T2 — Matriz de casos y matriz de trazabilidad actualizadas (base)

| Campo | Valor |
|---|---|
| Ítem | 2 |
| Responsable | Líder de pruebas `[PENDIENTE]`; cada integrante revisa su módulo |
| Modo / modelo | SDD / sonnet (la subida a Drive la hace el controlador) |
| Depende de | F2.T1 |
| Evidencias | `EV-02-RTM-3` (diff de celdas antes y después, en CSV) |
| Destino Drive | `Final VyV/MATRICES/` (documentos vivos, según la regla de Drive) y `ENTREGABLES/02_Trazabilidad/` |
| Aceptación | En `CASOS Y ESCENARIOS DE PRUEBAS.xlsx` desaparecen `[Por completar]` (sustituido por el integrante del módulo) y `2.47.0 (commit 01bd57cd)` (sustituido por `2.48.0 (commit 2b1d836)`); el resto del contenido no cambia según `EV-02-RTM-3`. |

**Files:**
- Create: `qa/02-trazabilidad/actualizar_casos.py` (mismo enfoque de conservación que F2.T1)
- Create (generados): `qa/02-trazabilidad/CASOS Y ESCENARIOS DE PRUEBAS.xlsx`, `qa/02-trazabilidad/diff-celdas.csv`

- [ ] **Step 1:** Write `actualizar_casos.py`: sustituciones exactas por hoja, que registran cada celda cambiada en `diff-celdas.csv` (`hoja,celda,antes,después`).
- [ ] **Step 2:** Run it. Expected: el CSV solo contiene cambios de responsable, versión y entorno; `grep -c "01bd57cd"` sobre el texto exportado da 0.
- [ ] **Step 3:** Run `actualizar_rtm.py` with an empty `resultados.json` (`{}`) and then `validar_rtm.py --modo base`. Expected: código 0.
- [ ] **Step 4:** Commit `docs(qa): update traceability and test case matrices to 2.48.0`.
- [ ] **Step 5: Cierre de F2 (controlador):** reemplazar en Drive las dos matrices vivas (subir la nueva y mover la anterior a `_RESPALDOS/2026-11-13_<nombre>`); copiar ambas a `ENTREGABLES/02_Trazabilidad/`; PR draft; ledger.

> **Cierre de las fases siguientes:** desde F3, cada cierre añade sus resultados a `qa/03-ejecucion/resultados.json`, ejecuta `actualizar_rtm.py` y `validar_rtm.py --modo base` y reemplaza la matriz viva en Drive.
