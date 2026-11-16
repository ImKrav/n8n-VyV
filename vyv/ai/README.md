# Herramientas de IA · pruebas de n8n-VyV (módulos 1–4)

Tres herramientas, cada una con un papel distinto, sobre **las 20 funcionalidades** del plan
(Workflows, Ejecuciones, Credenciales y Core), no solo sobre el código refactorizado:

| Herramienta | Qué hace | Cómo prueba la app | Carpeta |
| --- | --- | --- | --- |
| **Selenium** (Python + pytest) | Pruebas de interfaz **deterministas**: selectores `data-test-id`, Page Objects, esperas explícitas | Prepara datos y verifica por API REST; el navegador comprueba lo que ve el usuario | [`selenium/`](selenium/README.md) |
| **Stagehand** (Node + LLM) | Flujos de interfaz en **lenguaje natural** (`act`, `extract`, `observe`), sin selectores | Un LLM interpreta la pantalla; el resultado se valida por API y con esquemas Zod | [`stagehand/`](stagehand/README.md) |
| **DeepEval** (Python + LLM juez) | Evalúa **calidad de la IA y de los mensajes**: relevancia, fidelidad, exactitud, fuga de datos | Errores reales de la API de los 4 módulos y un asistente que responde sobre datos reales | [`deepeval/`](deepeval/README.md) |
| Generador de casos | Genera CSV límite y escenarios Gherkin con un LLM | Salida para revisión humana | [`generator/`](generator/) |

## Cobertura por funcionalidad

`●` prueba automatizada · `—` no aplica. Las columnas muestran **cuántas** pruebas o flujos hay.

| Funcionalidad | Selenium | Stagehand | DeepEval |
| --- | :-: | :-: | :-: |
| WF-01 Crear y editar (lienzo, eliminar/deshacer) | 3 | ● | errores API |
| WF-02 Ajustes y ejecución manual | 2 | ● | — |
| WF-03 Publicar y versión publicada | 3 | ● | — |
| WF-04 Historial de versiones | — | ● | — |
| WF-05 Importar, duplicar y plantillas | — | ● | — |
| EX-01 Lista de ejecuciones | 3 | ● | asistente |
| EX-02 Filtros | 2 | ● | errores API |
| EX-03 Vista previa, reintento y eliminación | — | ● | — |
| EX-04 Detener ejecuciones | — | ● | — |
| EX-05 Panel de logs (teclado) | 1 | ● | — |
| CR-01 Crear y probar credenciales | 2 | ● | errores API |
| CR-02 Editar y eliminar | 2 | ● | seguridad: sin fuga de secretos |
| CR-03 OAuth2 | — | ● (formulario y callback) | — |
| CR-04 Credenciales en nodos | 1 | ● | — |
| CR-05 Listado, búsqueda y orden | 3 | ● | asistente |
| CO-01 Data tables | 5 | ● | errores API |
| CO-02 Filas | 2 | ● | asistente |
| CO-03 CSV (importar/exportar) | 7 | ● | errores API |
| CO-04 Carpetas: crear y navegar | 3 | ● | errores API |
| CO-05 Carpetas: mover y eliminar | 2 | ● | — |

Lo que no cubren estas herramientas (WF-04/05, EX-03/04 y CR-03 en Selenium; todo el flujo OAuth2 con un proveedor real) ya
tiene pruebas Cypress en [`../e2e`](../e2e/README.md) o es manual (CP-CR-03-05).

## Código refactorizado

Las pruebas que verifican directamente los cambios de la rama (BUG-016-01, BUG-018-01…05) están marcadas:
`pytest -m refactor` en Selenium, flujo `CO-01` de Stagehand y los casos `(BUG-018-05)` de DeepEval.

## Ejecución rápida

Requisito común: n8n en `http://localhost:5678` con el propietario creado y la licencia community registrada
(Settings → Usage and plan), igual que para Cypress.

```bash
./vyv/run-tests.sh ai selenium                 # solo Selenium (no necesita API key)
./vyv/run-tests.sh ai selenium -m "wf or cr"   # por módulo (wf, ex, cr, co) o -m refactor
./vyv/run-tests.sh ai stagehand                # los 20 flujos; ./run-tests.sh ai stagehand core CO-03 para uno
./vyv/run-tests.sh ai deepeval                 # errores de API y asistente
./vyv/run-tests.sh ai                          # las tres
```

Cada herramienta lee su propio `.env` (copiar `.env.example`). Selenium no usa LLM; Stagehand y DeepEval necesitan
`OPENAI_API_KEY` (o `GOOGLE_API_KEY`). Sin clave, o con n8n apagado, la herramienta se **omite con un mensaje claro**.

## Límites que conviene reportar

- Stagehand y DeepEval dependen de un LLM: los resultados pueden variar entre ejecuciones y tienen costo por llamada.
  Por eso lo crítico (datos, estados, códigos HTTP) siempre se verifica por API de forma determinista.
- Los selectores de Selenium vienen de las pruebas Cypress y de las pruebas oficiales de n8n; si el equipo de n8n los cambia
  en una versión nueva, se rompen solo los Page Objects de [`selenium/pages.py`](selenium/pages.py).
- Los menús de Element Plus y de Reka UI abren de forma distinta según la versión de n8n (2.46 vs 2.47): para esas
  acciones Stagehand es más tolerante que Selenium.
