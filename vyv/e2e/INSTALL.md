# Guía de instalación y ejecución (Windows · PowerShell)

Pruebas de **Data tables y carpetas** (ESC-016 a ESC-020) · Mario Andrade.
Todos los comandos se verificaron antes de la entrega (ver la sección 8).

Hay dos partes independientes:

| Parte | Dónde | Para qué |
|---|---|---|
| **A. Pruebas Cypress** | `vyv/e2e` | API, UI, BDD/Screenplay, seguridad, accesibilidad, regresión, reportes |
| **B. Pruebas unitarias y refactorización** | raíz del repositorio `n8n-VyV` | Caja blanca, TDD, mocks y n8n con las correcciones |

---

## 1. Requisitos (una sola vez)

```powershell
node -v                      # v24 o superior
git --version
python --version             # 3.10+ (solo para DeepEval)
```

Si falta alguno:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
winget install Python.Python.3.12
```

Cierra y vuelve a abrir PowerShell después de instalar.

---

## 2. Obtener el código

```powershell
cd C:\Proyectos
git clone https://github.com/ImKrav/n8n-VyV.git
cd n8n-VyV
git fetch C:\ruta\a\mario-datatables-carpetas.bundle vyv/mario-datatables-carpetas:vyv/mario-datatables-carpetas
git checkout vyv/mario-datatables-carpetas
git log --oneline -12        # comprobar: deben verse los commits test(vyv), fix(...), refactor(...)
```

> Si la rama ya está en GitHub: `git fetch origin` y `git checkout vyv/mario-datatables-carpetas`.

---

## A. Pruebas Cypress

### A.1 Instalar dependencias

```powershell
cd C:\Proyectos\n8n-VyV\vyv\e2e
npm install                  # package-lock.json no se versiona (la raíz del repositorio lo ignora)
npx cypress verify           # debe decir: Verified Cypress!
```

Si `npx cypress verify` dice que Cypress no está instalado:

```powershell
npx cypress install --force
```

Si la descarga se traba en "Unzipping", instálalo a mano (descarga desde el navegador
https://download.cypress.io/desktop/14.5.4?platform=win32&arch=x64):

```powershell
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\Cypress\Cache\14.5.4"
tar -xf "$env:USERPROFILE\Downloads\cypress.zip" -C "$env:LOCALAPPDATA\Cypress\Cache\14.5.4"
Test-Path "$env:LOCALAPPDATA\Cypress\Cache\14.5.4\Cypress\Cypress.exe"    # True
npx cypress verify
```

### A.2 Levantar n8n (Terminal 1, dejarla abierta)

```powershell
npx --yes n8n@2.46.6
```

Espera `Editor is now accessible via: http://localhost:5678`. En el navegador:

1. Crea o usa tu usuario propietario.
2. **Settings → Usage and plan → Unlock selected paid features for free**: registra tu correo y pega
   la clave. Sin esto fallan las pruebas de carpetas (CP-019 y CP-020).

### A.3 Ejecutar (Terminal 2)

```powershell
cd C:\Proyectos\n8n-VyV\vyv\e2e
$env:CYPRESS_ownerEmail = 'tu-correo@ejemplo.com'
$env:CYPRESS_ownerPassword = 'tu-contraseña'

npm run test:api             # 36 casos por API          (~15 s)
npm run test:security        # OWASP Top 10              (~10 s)
npm run test:ui              # interfaz                  (~2 min)
npm run test:bdd             # Gherkin + Screenplay      (~20 s)
npm run test:a11y            # accesibilidad WCAG        (~20 s)
npm run report               # results\report\index.html
npm run evidence             # results\by-case\CP-xxx-yy\
```

Resultado esperado contra **n8n 2.46.6 sin corregir**: fallan solo las pruebas que documentan
defectos reales: CP-016-02, CP-018-07, CP-018-08 y la complementaria "BUG-018-05". CP-017-08 queda
pendiente (ver A.4).

Para repetir desde cero, borra las evidencias anteriores:

```powershell
Remove-Item -Recurse -Force results -ErrorAction SilentlyContinue
```

### A.4 Límite de almacenamiento (CP-017-08, opcional)

Terminal 1 (detén n8n con Ctrl+C):

```powershell
cd C:\Proyectos\n8n-VyV\vyv\e2e
npm run n8n:storage-limit
```

Terminal 2: `npm run test:storage-limit`. Después vuelve a levantar n8n normal (A.2).

---

## B. Pruebas unitarias y refactorización (raíz del repositorio)

### B.1 Instalar pnpm y dependencias

```powershell
cd C:\Proyectos\n8n-VyV
npm install -g pnpm@12.4.2
pnpm -v                      # 12.4.2
pnpm install                 # varios minutos la primera vez
```

### B.2 Compilar lo necesario para las pruebas unitarias (~10 min)

```powershell
pnpm --filter @n8n/vitest-config build
pnpm --filter "@n8n/backend-module-data-table^..." build
pnpm --filter "@n8n/scheduler..." --filter "@n8n/agents..." --filter "@n8n/task-runner..." build
```

### B.3 Ejecutar las pruebas unitarias

`--config.shell-emulator=true` es necesario en Windows (los scripts de n8n usan sintaxis de Linux).

```powershell
pnpm --config.shell-emulator=true --filter @n8n/backend-module-data-table test vyv     # 37 pruebas: CP-018-03, 07, 08
pnpm --config.shell-emulator=true --filter @n8n/api-types test folder-name.schema.vyv  # 19 pruebas: CP-019-07
pnpm --config.shell-emulator=true --filter n8n test folder.service.vyv                 # 5 pruebas:  CP-020-06 (mocks)
```

Cobertura (para el informe y SonarQube):

```powershell
pnpm --config.shell-emulator=true --filter @n8n/backend-module-data-table test vyv -- --coverage
```

### B.4 Ver el ciclo TDD (rojo → verde)

```powershell
git log --oneline -12
git checkout <hash del commit "TDD rojo – inferencia de tipos...">
pnpm --config.shell-emulator=true --filter @n8n/backend-module-data-table test csv-parser   # 13 de 31 fallan (rojo)
git checkout vyv/mario-datatables-carpetas
pnpm --config.shell-emulator=true --filter @n8n/backend-module-data-table test csv-parser   # 31 de 31 pasan (verde)
```

### B.5 Regresión con las pruebas originales de n8n

```powershell
pnpm --config.shell-emulator=true --filter @n8n/backend-module-data-table test csv-parser data-table-csv-import data-table.service.test multer
# esperado: 97 pruebas aprobadas (75 originales de n8n + 22 VyV)
```

---

## C. Antes y después de la refactorización (puntos 10 y 15)

1. **Antes** (n8n publicado, A.2) – en `vyv\e2e`:
   ```powershell
   Remove-Item -Recurse -Force results -ErrorAction SilentlyContinue
   npm run test:regression; npm run test:refactor; npm run report
   Copy-Item results\report\consolidado.json ..\evidence\e2e\regression-before.json
   ```
2. **Compilar y levantar n8n con las correcciones** (Terminal 1, raíz del repositorio; 30–60 min la primera vez):
   ```powershell
   cd C:\Proyectos\n8n-VyV
   pnpm build
   pnpm start                # http://localhost:5678 (base de datos nueva: crea el usuario y registra la licencia)
   ```
3. **Después** – en `vyv\e2e`:
   ```powershell
   Remove-Item -Recurse -Force results -ErrorAction SilentlyContinue
   npm run test:regression; npm run test:refactor; npm run report
   Copy-Item results\report\consolidado.json results\regression-after.json
   npm run regression:compare        # results\regression-comparison.md → "corregidos"
   ```
   Esperado: CP-016-02, CP-018-07, CP-018-08 y "BUG-018-05" pasan a aprobadas, sin regresiones.

> `pnpm build` compila todo n8n y es pesado (≈8 GB de RAM). Si falla en Windows, usa WSL (Ubuntu)
> con los mismos comandos, o pídele al integrante de Docker/Jenkins que levante la imagen de esta rama.

---

## D. Inteligencia artificial (punto 14, necesita API key)

```powershell
# Stagehand
cd C:\Proyectos\n8n-VyV\vyv\ai\stagehand
npm install
npm run preparar                  # instala Chromium para Playwright
Copy-Item .env.example .env       # editar: OPENAI_API_KEY (o GOOGLE_API_KEY), N8N_EMAIL, N8N_PASSWORD
npm test

# DeepEval (antes crea el workflow "Asistente de Data Tables": vyv\ai\deepeval\README.md)
cd ..\deepeval
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env       # editar OPENAI_API_KEY
deepeval test run test_asistente_datatables.py

# Generador de casos
cd ..\generator
$env:LLM_API_KEY = 'tu-api-key'
node generar-casos-ia.mjs         # output\datos_limite_ia.csv, escenarios_ia.feature, analisis.json
```

---

## E. Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `401 Wrong username or password` | Revisa `$env:CYPRESS_ownerEmail` / `$env:CYPRESS_ownerPassword` (se pierden al cerrar PowerShell) |
| Pruebas de carpetas con `403` | Falta registrar la licencia community (A.2) |
| `ECONNREFUSED localhost:5678` | n8n no está corriendo en la Terminal 1 |
| `Cypress executable not found` | Sección A.1 (`npx cypress install --force` o instalación manual) |
| `pnpm test` falla con `N8N_LOG_LEVEL=silent no se reconoce` | Falta `--config.shell-emulator=true` |
| `Failed to resolve entry for package "@n8n/..."` | Falta compilar dependencias: repite B.2 |

---

## 8. Verificación realizada antes de la entrega

- `npm ci` limpio desde `package-lock.json` (596 paquetes, Cypress 14.5.4) y las 14 especificaciones
  empaquetadas con esbuild sin errores de importación; `cypress.config.js` carga correctamente.
- Comandos B.3 ejecutados tal cual: 37/37, 19/19 y 5/5 aprobadas; B.4: 13/31 fallan en rojo y 31/31 en verde; B.5: 97/97.
- Ejecución real de Cypress contra n8n 2.46.6 (08/11/2026): 84 aprobadas, 3 fallidas (defectos reales), 1 pendiente.
