# Selenium · pruebas de interfaz de n8n (módulos 1–4)

49 pruebas en `tests/`, una por escenario de éxito, alternativo o de error, con Page Objects y `data-test-id`.

```
selenium/
├── conftest.py         fixtures: cfg, api (REST), driver ya autenticado, limpiar (borra lo creado)
├── n8n_client.py       cliente de la API REST interna para preparar y verificar datos
├── pages.py            Page Objects: SignIn, Listado, Lienzo, DataTables, Carpetas
├── pytest.ini          marcadores: wf, ex, cr, co, seguridad, refactor
└── tests/
    ├── test_wf_workflows.py     Módulo 1 + inicio de sesión (10)
    ├── test_ex_executions.py    Módulo 2 (6)
    ├── test_cr_credentials.py   Módulo 3 (8)
    └── test_co_core.py          Módulo 4 (25, con los 7 nombres inválidos parametrizados)
```

## Instalar y ejecutar

```bash
cd vyv/ai/selenium
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt                         # Selenium Manager descarga el driver solo
cp .env.example .env                                    # URL de n8n, usuario y navegador

pytest                              # todo
pytest -m wf                        # un módulo: wf | ex | cr | co
pytest -m refactor                  # solo lo que cubre el código refactorizado
pytest -m seguridad                 # comprobaciones OWASP desde el navegador
SELENIUM_HEADLESS=false pytest -k canvas     # ver el navegador
SELENIUM_BROWSER=firefox pytest              # Firefox
```

El informe queda en `results/informe-selenium.html` y las capturas de las pruebas que fallan en `results/screenshots/`.

## Cómo funciona

- **Sesión:** el cliente REST inicia sesión una vez y su cookie `n8n-auth` + el `browser-id` se inyectan en el navegador, así no se
  repite el login por la interfaz (el login se prueba aparte, con `driver_anonimo`).
- **Independencia (FIRST):** cada prueba crea sus datos con nombres únicos y los borra en `limpiar`.
- **Sin esperas fijas:** todo es `WebDriverWait`; `implicitly_wait` está en 0 para que no se mezclen los dos tipos de espera.
- **Selenium Grid / Docker:** definir `SELENIUM_REMOTE_URL=http://localhost:4444`.
- Los CSV de entrada se reutilizan de `../../e2e/fixtures/csv`.

## Trazabilidad

| Archivo | Pruebas | Casos del plan |
| --- | --- | --- |
| `test_wf_workflows.py` | lienzo (persistir, eliminar/deshacer, inexistente), ejecución manual, ajustes, publicar y cambios sin publicar, sin disparador | CP-WF-01-01/02/05, 02-0x, 03-0x, 03-07 |
| `test_ex_executions.py` | lista y estado de ejecuciones, filtros, logs con teclado | CP-EX-01-0x, 02-0x, 05-05 |
| `test_cr_credentials.py` | HTML en nombres, tipo inválido, secreto enmascarado, cancelar eliminación, credencial en nodo, búsqueda y orden | CP-CR-01-08, 02-02, 02-06, 04-01, 05-01/02 |
| `test_co_core.py` | crear tabla, nombre vacío o de espacios (BUG-016-01), columnas, filas, importar/exportar CSV, fórmulas (BUG-018-04), CSV malformado y `fileId` (BUG-018-05), carpetas, mover y eliminar | CP-016-0x … CP-020-0x |

## Limitaciones

- Estas pruebas necesitan un n8n en marcha; sin él se omiten, no fallan.
- No cubren WF-04, WF-05, EX-03, EX-04 ni CR-03 en interfaz (los cubre Stagehand y Cypress).
- La comprobación de tipos de columna en la vista previa del CSV lee el valor del selector de Element Plus y acepta `string`
  o `text`; si una versión nueva de n8n cambia esas etiquetas, ajustar `test_co03_vista_previa_*`.
