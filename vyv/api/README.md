# Pruebas de API · Newman

Colección Postman de la API REST interna de n8n (`/rest`) para los 4 módulos del plan. Cada petición tiene aserciones (`pm.test`) y su nombre indica el caso del plan y el escenario: éxito, alternativo o error.

| Archivo | Contenido |
| --- | --- |
| `n8n-vyv.postman_collection.json` | 40 peticiones y 62 aserciones en 6 carpetas: sesión, Workflows, Ejecuciones, Credenciales, Core y limpieza |
| `local.postman_environment.json` | `baseUrl`, propietario de la instancia de pruebas y `browser-id` |

## Ejecutar

Requisitos: n8n en `http://localhost:5678` con el propietario del entorno (el mismo de Cypress) y las dependencias de `../e2e` instaladas.

```bash
cd vyv/e2e && npm run test:newman
```

También desde la raíz del repositorio:

```bash
./vyv/run-tests.sh api
```

Salida: consola, `vyv/e2e/results/newman/junit.xml` (para CI) y `vyv/e2e/results/newman/report.json`. La evidencia de la última corrida está en [`../evidence/api/`](../evidence/api/).

La colección es independiente y repetible: crea sus propios datos con un sufijo único y los elimina al final. Para otro servidor, cambie `baseUrl` y las credenciales del propietario en el entorno, o páselas con `--env-var`.

## Casos

| Módulo | Éxito | Alternativo | Error |
| --- | --- | --- | --- |
| 1 · Workflows | CP-WF-01-01, 03-02, 04-01 | — | CP-WF-03-01 sin trigger, 04-02 sin licencia, 05-04 URL inválida, 05-05 nombre vacío y de 129 |
| 2 · Ejecuciones | CP-EX-01-01, 03-01, 03-05 | CP-EX-02-01 estado sin coincidencias | filtro mal formado, límite fuera de rango; hallazgos: detener una terminada (500) y consultar una eliminada (200) |
| 3 · Credenciales | CP-CR-01-01, 02-03, 02-07, 05-01 | — | CP-CR-01-05 tipo inexistente, 05-06 sin licencia, eliminar inexistente (404) |
| 4 · Core | CP-CO-01-01/01-05, 02-01, 03-06, 04-01, 05-05 | CP-CO-02-01 solo se guarda la fila válida | CP-CO-01-03 nombre repetido (409), 02-02 tipo incorrecto, 04-03 carpeta sin nombre |
