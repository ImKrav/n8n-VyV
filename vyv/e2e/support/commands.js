/**
 * Comandos personalizados para n8n.
 *
 * n8n liga la cookie de sesión a un "browser-id": todas las peticiones a /rest deben enviar
 * el mismo encabezado `browser-id` usado en el login (si no, responde 401). El editor lee ese
 * valor de localStorage['n8n-browserId'], por eso se fija antes de visitar cualquier página.
 */
import { n8nApi } from './api.js';

const env = (k) => Cypress.env(k);
export const headers = () => ({ 'browser-id': env('browserId') });

/** Crea el propietario si la instancia es nueva (solo funciona una vez) e inicia sesión. */
Cypress.Commands.add('loginApi', () => {
  cy.session(
    'owner',
    () => {
      cy.request({
        method: 'POST',
        url: '/rest/owner/setup',
        failOnStatusCode: false,
        headers: headers(),
        body: {
          email: env('ownerEmail'),
          firstName: env('ownerFirstName'),
          lastName: env('ownerLastName'),
          password: env('ownerPassword'),
        },
      });
      cy.request({
        method: 'POST',
        url: '/rest/login',
        headers: headers(),
        body: { emailOrLdapLoginId: env('ownerEmail'), password: env('ownerPassword') },
      })
        .its('status')
        .should('eq', 200);
    },
    { cacheAcrossSpecs: true },
  );
});

/** Visita una ruta del editor ya autenticado y con el browser-id correcto. */
Cypress.Commands.add('visitarN8n', (ruta) => {
  cy.loginApi();
  cy.visit(ruta, {
    onBeforeLoad(win) {
      win.localStorage.setItem('n8n-browserId', env('browserId'));
    },
  });
});

/** Atajo para seleccionar por data-test-id (los mismos que usan las pruebas E2E oficiales de n8n). */
Cypress.Commands.add('tid', (id, opts) => cy.get(`[data-test-id="${id}"]`, opts));

/** Obtiene (y guarda en el alias @proyecto) el id del proyecto personal. */
Cypress.Commands.add('proyectoPersonal', () => {
  cy.loginApi();
  return n8nApi.proyectoPersonal().then((id) => {
    cy.wrap(id).as('proyecto');
    return cy.wrap(id);
  });
});

/** Nombre único para que las pruebas sean independientes y repetibles (principio FIRST). */
Cypress.Commands.add('nombreUnico', (prefijo = 'vyv') =>
  cy.wrap(`${prefijo}_${Date.now().toString(36)}${Cypress._.random(100, 999)}`));

/** Registra en el log de Cypress y en la terminal el resultado de una comprobación (evidencia). */
Cypress.Commands.add('evidencia', (texto) => {
  cy.log(`📌 ${texto}`);
  cy.task('log', `[EVIDENCIA] ${Cypress.currentTest.titlePath.join(' > ')} :: ${texto}`);
});

/** Abre el modal "nueva data table" (desde el botón de añadir recurso o el estado vacío). */
Cypress.Commands.add('abrirModalDataTable', () => {
  cy.get('body').then(($b) => {
    if ($b.find('[data-test-id="add-resource"]').length) {
      cy.tid('add-resource').first().click();
      cy.tid('add-resource-dataTable').first().click();
    } else {
      cy.contains('button', /create data table/i).click();
    }
  });
  cy.tid('addDataTableModal-modal').should('be.visible');
});

/**
 * Devuelve el campo de texto de un componente por su data-test-id: si el elemento ya es un
 * <input>/<textarea> lo usa; si es un contenedor (p. ej. un N8nInput), busca el campo interno.
 */
Cypress.Commands.add('campo', (testId) =>
  cy.tid(testId).first().then(($el) => {
    const $campo = $el.is('input, textarea') ? $el : $el.find('input, textarea').first();
    return cy.wrap($campo);
  }),
);
