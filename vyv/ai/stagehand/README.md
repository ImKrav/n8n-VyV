# Stagehand · flujos en lenguaje natural sobre los 4 módulos

20 flujos (uno por funcionalidad) en `flujos/`. Cada flujo prepara datos y verifica el resultado por API; solo la
interacción con la interfaz se describe en lenguaje natural (`act`), y lo que se lee de la pantalla se valida con
`extract` + esquema Zod.

| Archivo | Flujos |
| --- | --- |
| `flujos/workflows.mjs` | WF-01 crear y añadir nodo · WF-02 ajustes · WF-03 publicar · WF-04 historial · WF-05 duplicar |
| `flujos/executions.mjs` | EX-01 lista · EX-02 filtro por estado · EX-03 vista previa y eliminar · EX-04 detener · EX-05 logs |
| `flujos/credentials.mjs` | CR-01 crear Header Auth · CR-02 renombrar y eliminar · CR-03 OAuth2 (URL de callback) · CR-04 credencial en nodo · CR-05 buscar y ordenar |
| `flujos/core.mjs` | CO-01 nombre de solo espacios (BUG-016-01) · CO-02 filas · CO-03 importar CSV · CO-04 subcarpeta y migas · CO-05 eliminar transfiriendo |
| `stagehand-datatables-carpetas.mjs` | Script original (crear tabla y columna, añadir fila, crear carpeta); sigue funcionando con `npm run test:core-original` |

```bash
cd vyv/ai/stagehand
npm install && npm run preparar          # instala Chromium para Playwright
cp .env.example .env                     # OPENAI_API_KEY (o GOOGLE_API_KEY) y credenciales de n8n

npm test                                 # los 20 flujos
npm run test:workflows                   # un módulo (executions | credentials | core)
node run.mjs core CO-03                  # un solo flujo
```

Salida: `results/stagehand-<fecha>.json` y `.md` (tabla lista para el informe) y `results/screenshots/<flujo>.png`.
Cada flujo es independiente: si uno falla se registra con captura y se sigue con el siguiente. Código de salida 1 si alguno falla.

## Buenas prácticas aplicadas

- **Verificación independiente:** un flujo pasa solo si el estado real (API) lo confirma; así un error de interpretación del
  modelo no se confunde con un defecto de n8n.
- **Pasos deterministas donde la IA no aporta:** el login y la selección del archivo CSV (`setInputFiles`) no usan lenguaje natural.
- **Datos únicos y limpieza:** cada flujo registra lo que crea y lo borra al terminar.
- Modelo configurable con `STAGEHAND_MODEL` (por defecto `gpt-4.1-mini`).

## Limitaciones

Un LLM interpreta la pantalla: puede equivocarse o tardar distinto entre ejecuciones (reintentar un flujo antes de reportar un
defecto) y cada `act` tiene costo. Los flujos describen la interfaz de n8n 2.47 en inglés; si el idioma del editor cambia, ajustar
las instrucciones.
