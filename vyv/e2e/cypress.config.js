import { defineConfig } from 'cypress';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

export default defineConfig({
  e2e: {
    baseUrl: process.env.N8N_URL ?? 'http://localhost:5678',
    // One folder for each plan module and one subfolder for each feature (core/CO-01 …).
    specPattern: ['{workflows,executions,credentials,core}/**/*.cy.js', '{workflows,executions,credentials,core}/**/*.feature'],
    fixturesFolder: 'fixtures',
    supportFile: 'support/e2e.js',
    viewportWidth: 1440,
    viewportHeight: 900,
    defaultCommandTimeout: 10000,
    video: true,
    trashAssetsBeforeRuns: false,
    screenshotOnRunFailure: true,
    screenshotsFolder: 'results/screenshots',
    videosFolder: 'results/videos',
    downloadsFolder: 'results/downloads',
    reporter: 'mochawesome',
    reporterOptions: {
      reportDir: 'results/mochawesome',
      overwrite: false,
      html: false,
      json: true,
    },
    env: {
      // Usuario propietario de la instancia local de pruebas (se crea en el primer arranque).
      ownerEmail: 'qa.vyv@example.com',
      ownerPassword: 'VyvPrueba2026',
      ownerFirstName: 'QA',
      ownerLastName: 'VyV',
      browserId: 'vyv-cypress-browser',
    },
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config);
      on('file:preprocessor', createBundler({ plugins: [createEsbuildPlugin(config)] }));
      on('task', {
        log(msg) { console.log(msg); return null; },
        table(rows) { console.table(rows); return null; },
        leerArchivo(ruta) { return existsSync(ruta) ? readFileSync(ruta, 'utf8') : null; },
        // Searches raw bytes (e.g. the SQLite file and its WAL) without sending the file to the browser.
        contieneTexto({ rutas, textos }) {
          const datos = Buffer.concat(rutas.filter((r) => existsSync(r)).map((r) => readFileSync(r)));
          return { leidos: datos.length, ...Object.fromEntries(textos.map((t) => [t, datos.includes(Buffer.from(t))])) };
        },
        // Runs a local command, e.g. the n8n restart of CP-WF-03-08 (CYPRESS_restartCommand).
        ejecutar(comando) {
          // Cypress sets NODE_OPTIONS (ts-node loader); a restarted n8n must not inherit it.
          const env = { ...process.env };
          delete env.NODE_OPTIONS;
          delete env.ELECTRON_RUN_AS_NODE;
          execSync(comando, { stdio: 'inherit', timeout: 180000, shell: true, env });
          return null;
        },
      });
      return config;
    },
  },
});
