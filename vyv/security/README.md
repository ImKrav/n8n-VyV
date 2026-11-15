# Pruebas de seguridad · OWASP Top 10:2025

Pruebas de seguridad del plan de n8n-VyV para los 4 módulos (Workflows, Ejecuciones, Credenciales y Core). Cubren el **RNF-02** de la matriz: los secretos no se exponen, se guardan cifrados, se aíslan entre usuarios y los nombres con HTML no se ejecutan. Se combinan cuatro técnicas:

| Técnica | Herramienta (versión) | Qué se analiza | Evidencia (`vyv/evidence/security/`) |
| --- | --- | --- | --- |
| Pruebas dirigidas (caja negra, API y UI) | Cypress 14 · [`e2e/security/`](../e2e/security/) | Control de acceso entre propietario y miembro, exposición de secretos, inyección, integridad, sesión y manejo de errores | `cypress-antes/`, `cypress-despues/` |
| SAST | Semgrep 1.140.0 (`p/owasp-top-ten`, `p/typescript`, `p/nodejsscan`) | Código de los 4 módulos en `packages/cli`, `data-table` y `editor-ui` | `semgrep.json`, `semgrep.sarif` |
| SCA | `pnpm audit --prod` · Trivy 0.67.2 | Dependencias de producción e imagen `n8nio/n8n:2.47.0` | `pnpm-audit.json`, `trivy-image.json` |
| Secretos | gitleaks 8.28.0 | Commits del equipo (`01bd57cdd..HEAD`) y la carpeta `vyv/` | `gitleaks-commits.json`, `gitleaks-vyv.json` |
| DAST (pasivo) | OWASP ZAP 2.16.1 `zap-baseline.py` | Instancia local `http://localhost:5678` | `zap-baseline.html`, `zap-baseline.json` |
| Auditoría de la instancia | `n8n audit` (integrada en n8n) | Credenciales sin uso, nodos de riesgo, configuración | `n8n-audit.json` |

**Alcance y exclusiones.** Solo se prueba la instancia local del equipo (n8n 2.47.0 en Docker, `127.0.0.1:5678`, y el fork compilado en `127.0.0.1:5680`). No se ataca ningún sistema de terceros. ZAP solo hace el análisis pasivo (*baseline*): el análisis activo no se ejecuta, porque crea y borra datos de forma no controlada. No hay fuerza bruta contra cuentas reales: la prueba de límite de intentos usa un correo que no existe. gitleaks no recorre el historial completo de n8n (más de 30 000 commits de upstream, fuera del alcance), solo los commits del equipo.

## Pruebas dirigidas (Cypress)

Cada `it` afirma el **comportamiento seguro esperado**. Si n8n no lo cumple, la prueba falla y registra el hallazgo en `results/security/<módulo>.json`. Ninguna prueba se debilita ni se omite para quedar en verde. Los actores son el **propietario** y un **miembro** (`global:member`) invitado por la propia prueba, que no tiene acceso a los recursos del propietario. Todos los datos llevan el prefijo `VyV-Seg-` y se borran al terminar.

| Spec | Casos | Módulo y funcionalidades |
| --- | --- | --- |
| [`workflows.security.cy.js`](../e2e/security/workflows.security.cy.js) | CP-SEG-WF-01 … 11 | WF-01 a WF-05 |
| [`executions.security.cy.js`](../e2e/security/executions.security.cy.js) | CP-SEG-EX-01 … 09 | EX-01 a EX-05 |
| [`credentials.security.cy.js`](../e2e/security/credentials.security.cy.js) | CP-SEG-CR-01 … 11 | CR-01 a CR-05 |
| [`transversal.security.cy.js`](../e2e/security/transversal.security.cy.js) | CP-SEG-TR-01 … 08 | Cabeceras, sesión, login y data tables (CO-01 a CO-03) |
| [`core/security/owasp.cy.js`](../e2e/core/security/owasp.cy.js) (ya existía) | A01, A03, A04, A05, CP-018-08 | CO-01 a CO-05 |

Las pruebas de seguridad que el plan ya tenía siguen en su funcionalidad y entran en la misma corrida: CP-CR-01-07 (cifrado en la base), CP-CR-01-08 (nombre con HTML), CP-CR-02-02 (enmascarado en la UI), CP-CR-02-03 y 02-04 (la API y el JSON del workflow no traen el secreto) y CP-CR-05-05 (aislamiento entre usuarios).

### Resultados

| Corrida | Instancia | Pruebas | Aprobadas | Fallidas | Evidencia |
| --- | --- | --- | --- | --- | --- |
| Antes | n8n 2.47.0 oficial (Docker), modo normal | 54 | 43 | 11 | [`cypress-antes/`](../evidence/security/cypress-antes/) |
| Después | Fork compilado desde esta rama, modo normal | 54 | 45 | 9 | [`cypress-despues/`](../evidence/security/cypress-despues/) |

Fecha de las dos corridas: 15/11/2026, Chromium. Las fallidas de «después» son los 8 hallazgos de n8n de la tabla siguiente y el caso de carpetas con HTML de `owasp.cy.js`, que necesita la licencia de carpetas (*Blocked (licencia)* en modo normal). Respecto de «antes» cambian dos casos: **CP-018-08 pasa** por la corrección del equipo en `csv-escape.ts` (BUG-018-04), y **CP-CR-01-07 pasa** porque en el fork el archivo SQLite es accesible (en Docker queda dentro del volumen y la prueba no lo puede leer).

### Categorías OWASP Top 10:2025

| Categoría | Pruebas aplicadas | Resultado |
| --- | --- | --- |
| A01 Broken Access Control (incluye SSRF) | Sin sesión → 401 en los 4 módulos (WF-01, EX-01, CR-01); el miembro no lee, edita, borra, archiva, activa, comparte, transfiere, detiene, reintenta ni elimina recursos ajenos (WF-02 a 04, EX-02 a 04, CR-02, CR-03, TR-07); webhooks no registrados (WF-09); importar desde URL interna (WF-05) | ❌ **SEC-01**: SSRF por configuración por defecto · ⚠️ SEC-10 por validar · el resto ✅ |
| A02 Security Misconfiguration | Cabeceras del editor y de los estáticos (TR-01, TR-02, TR-08), ZAP baseline, `n8n audit` | ❌ SEC-02, SEC-03, SEC-04, SEC-14 · ✅ X-Frame-Options, nosniff en la interfaz, sin X-Powered-By |
| A03 Software Supply Chain Failures | `pnpm audit --prod`, Trivy sobre la imagen | ❌ SEC-12 (18 altas), SEC-13 (2 críticas de Alpine) |
| A04 Cryptographic Failures | El secreto no sale en POST, PATCH, GET `includeData`, el listado ni el detalle de una ejecución fallida; OAuth2 sin `clientSecret` ni tokens; cifrado en la base (CR-04, CR-06, CR-08, EX-05, CP-CR-01-07) | ✅ |
| A05 Injection | Nombres y filtros con SQL, claves `__proto__`, nombres con HTML en la lista de workflows (WF-06, WF-07, EX-06, CR-07, `owasp.cy.js`) | ✅ · ℹ️ SEC-11 por validar |
| A06 Insecure Design | Límite de 100 ejecuciones por página (EX-07), el listado no trae secretos (CR-08), campos obligatorios (CR-10) | ❌ SEC-09 · el resto ✅ |
| A07 Authentication Failures | Cookie HttpOnly y SameSite (TR-03), error de login genérico (TR-04), límite de 5 intentos por correo → 429 (TR-05), logout invalida la cookie (TR-06), sesión ligada al `browser-id` (`owasp.cy.js`), OAuth2 con *state* falso o credencial ajena (CR-09) | ✅ |
| A08 Software or Data Integrity Failures | Edición con versión vieja (WF-08); reenviar el valor redactado conserva el secreto (CR-05) | ❌ SEC-05 · CR-05 ✅ |
| A09 Security Logging and Alerting Failures | Un login fallido y `docker logs` de la instancia; lectura de `auth.controller.ts:124` | ❌ **SEC-18**: el evento `user-login-failed` solo llega a *log streaming* (Enterprise); en el log de la instancia Community no queda ningún registro |
| A10 Mishandling of Exceptional Conditions | Id inexistente, cuerpo malformado, detener una terminada (WF-10, WF-11, EX-08, EX-09, CR-11), sin trazas en los errores | ❌ SEC-06, SEC-07, SEC-08 · en modo producción ninguna respuesta filtra trazas; sin `NODE_ENV=production` sí (SEC-19) |

### Hallazgos

El registro completo, con CWE, vector CVSS v3.1, validación y recomendación, está en [`hallazgos.csv`](hallazgos.csv). Resumen por severidad:

| ID | Severidad | CVSS 3.1 | Hallazgo | Recomendación |
| --- | --- | --- | --- | --- |
| SEC-13 | Crítica | hasta 9,8 | La imagen oficial trae brotli y openssh vulnerables (Alpine 3.24) | Reconstruir sobre una base actualizada; actualizar a n8n 2.47.7 |
| SEC-12 | Alta | hasta 9,1 | 18 avisos altos en dependencias de producción | Actualizar multer, body-parser, vue-i18n, @modelcontextprotocol/node |
| **SEC-01** | **Media** | **5,0** | **SSRF: `N8N_SSRF_PROTECTION_ENABLED` es `false` por defecto y el import desde URL lee direcciones internas** | `N8N_SSRF_PROTECTION_ENABLED=true` (verificado: bloquea las dos URL internas) |
| SEC-02 | Baja | 3,1 | CSP solo en modo Report-Only, con `'unsafe-eval'` | Aplicar la política |
| SEC-03 | Baja | 3,1 | Los estáticos no llevan `X-Content-Type-Options: nosniff` | Cabeceras también en `/assets` |
| SEC-04 | Baja | 3,1 | Sin `Permissions-Policy` | Enviar la cabecera |
| SEC-19 | Baja | 4,3 | Sin `NODE_ENV=production` (n8n desde el código fuente), los errores de la API incluyen `stacktrace` | Arrancar siempre con `NODE_ENV=production` |
| SEC-18 | Baja | N/A | Los logins fallidos no quedan en el log de la instancia sin la licencia de *log streaming* | Registrar `user-login-failed` en el log normal o usar un proxy que lo registre |
| SEC-05 | Baja | 2,6 | Sin licencia, una edición vieja sobrescribe la actual (`forceSave`) | Detectar conflictos sin licencia |
| SEC-06 a 09 | Baja | N/A | 500 ante JSON malformado y al detener una terminada; 200 `{}` para una ejecución inexistente; credencial sin campos obligatorios (issues #9, #10 y #11) | Respuestas 4xx coherentes |
| SEC-10, SEC-11 | Por validar | 3,7 / N/A | Ventana de ~250 ms del webhook tras despublicar; SyntaxError con un nombre con `onerror="…"` sin ejecución | Repetir en el entorno del plan |

**Verdaderos negativos relevantes.** El miembro no puede usar una credencial ajena: n8n acepta guardar la referencia, pero rechaza publicar («You do not have access to credential») y la prueba de la credencial responde 403 (CP-SEG-CR-03). El detalle de una ejecución fallida con una credencial Header Auth no incluye el secreto (CP-SEG-EX-05). Reenviar el valor redactado (`CREDENTIAL_BLANKING_VALUE`) conserva el secreto original, y así lo confirma un webhook de eco (CP-SEG-CR-05).

**Falsos positivos.** Los 32 resultados de Semgrep (SEC-15) y las 14 coincidencias de gitleaks (SEC-16) se revisaron en el código y son falsos positivos; la justificación de cada grupo está en `hallazgos.csv`. **El issue #8 (BUG-018-06, sin X-Frame-Options) no se reproduce en modo normal** (SEC-17): la cabecera falta solo en desarrollo, en vista previa y con `E2E_TESTS=true` (`packages/cli/src/server.ts:425`), que es como se ejecutó aquella prueba.

### Riesgos residuales y limitaciones

- No se ejecutó el análisis activo de ZAP ni pruebas con usuarios de otros proyectos con licencia (compartir credenciales y workflows, roles de proyecto).
- No se verificó si un miembro puede ejecutar de forma manual (`POST /rest/workflows/:id/run`) un workflow propio que referencia una credencial ajena; solo la publicación y la prueba de la credencial.
- La explotabilidad de cada dependencia vulnerable (SEC-12, SEC-13) no se verificó paquete por paquete.
- A09 (registro y alertas): sin *log streaming* no hay alertas de seguridad; solo se probó el login fallido.

## Cómo ejecutar

Requisitos: Docker, Node 24 y n8n en marcha en modo normal (sin `E2E_TESTS`, para que las cabeceras sean las de producción).

```bash
docker run -d --name vyv-n8n -p 127.0.0.1:5678:5678 -e N8N_SECURE_COOKIE=false -v vyv_n8n_data:/home/node/.n8n n8nio/n8n:2.47.0
cd vyv/e2e && npm install
CYPRESS_ownerEmail='…' CYPRESS_ownerPassword='…' npm run test:security
./vyv/security/scans.sh            # sast, sca, secretos, dast y audit; o una sola parte: ./vyv/security/scans.sh dast
```

`npm run test:security` ejecuta `e2e/security/` y `e2e/core/security/`. Para incluir los casos de seguridad de Credenciales del plan:

```bash
npx cypress run --browser chrome --spec "security/**/*.cy.js,core/security/**/*.cy.js,credentials/CR-01/encryption-at-rest.api.cy.js,credentials/CR-01/html-name.ui.cy.js,credentials/CR-02/*.cy.js,credentials/CR-05/isolation.api.cy.js" --env dbPath=<ruta de database.sqlite>
```

Las pruebas de seguridad de Workflows, Ejecuciones y Credenciales también forman parte de la suite de regresión (`e2e/regression/`).

## Referencias

- OWASP Foundation. (2025). *OWASP Top 10:2025*. https://owasp.org/Top10/2025/
- FIRST. (2019). *Common Vulnerability Scoring System v3.1: Specification document*. https://www.first.org/cvss/v3-1/specification-document
- MITRE. (2025). *Common Weakness Enumeration*. https://cwe.mitre.org/
- n8n GmbH. (2026). *Security audit* y *SSRF protection*. Documentación de n8n. https://docs.n8n.io/hosting/securing/
