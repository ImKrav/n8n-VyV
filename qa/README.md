# QA — Verificación y validación de n8n

Espacio de trabajo aislado del proyecto de QA sobre n8n 2.48.0 (commit `2b1d836bac`). Queda fuera de los globs de `pnpm-workspace.yaml` y usa **npm** con un único `package.json`.

## Requisitos

- Node.js 24 o superior (VPS: v26.13.1) y npm.
- Docker (búsqueda de secretos con gitleaks).
- Copiar `.env.example` a `.env` y completarlo. `.env` está ignorado por git; nunca se versiona.

## Comandos

```bash
npm ci --prefix qa              # instala dependencias (cuando existan)
npm test --prefix qa            # pruebas de los scripts de validación
npm run fechas --prefix qa      # falla con fechas posteriores a 17/11/2026 o marcadores de fecha
npm run secretos --prefix qa    # gitleaks sobre qa/ (imagen fijada, hallazgos redactados)
```

## Índice

| Carpeta | Contenido |
|---|---|
| `01-plan/` | Plan de pruebas |
| `02-trazabilidad/` | Matriz de trazabilidad |
| `03-ejecucion/` | Ejecución y resultados |
| `04-caja-blanca-negra/` | Diseño de casos de caja blanca y negra |
| `05-tdd-unitarias/` | TDD y pruebas unitarias |
| `06-cypress/` | Pruebas E2E con Cypress |
| `06-api/` | Pruebas de API |
| `07-bdd-screenplay/` | BDD y patrón Screenplay |
| `08-pipeline/` | Pipeline de CI/CD y despliegue |
| `09-regresion/` | Pruebas de regresión |
| `10-accesibilidad/` | Accesibilidad |
| `11-usabilidad/` | Usabilidad |
| `12-seguridad/` | Seguridad |
| `13-ia/` | Pruebas asistidas por IA |
| `14-refactorizacion/` | Refactorización |
| `15-informe/` | Informe final |
| `evidencias/` | Evidencias por ítem (`evidencias/README.md`) |

Pendientes que dependen de personas: `PENDIENTES.md`.
