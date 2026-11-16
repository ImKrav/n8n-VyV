/**
 * Soporte de las pruebas de seguridad (OWASP Top 10:2025) de los 4 módulos del plan.
 * - Sesiones: el propietario (cy.loginApi) y un miembro sin permisos sobre los recursos del propietario.
 * - Hallazgos: cada prueba registra su resultado; al final se escriben en results/security/<módulo>.json.
 */
import { n8nApi } from '../support/api.js';

export const h = () => ({ 'browser-id': Cypress.env('browserId') });
const CLAVE_MIEMBRO = 'VyvMiembro2026';

/**
 * El propietario invita a un miembro y el miembro acepta. Termina con la sesión del propietario activa.
 * Devuelve { id, email }. Borre el miembro en after() con borrarMiembro().
 */
export const crearMiembro = () => {
  const email = `vyv.seg.${Date.now()}${Cypress._.random(100, 999)}@example.com`;
  cy.loginApi();
  return n8nApi.req('POST', '/rest/invitations', [{ email, role: 'global:member' }]).then((r) => {
    expect(r.status, `invitar: ${JSON.stringify(r.body).slice(0, 200)}`).to.eq(200);
    const invitado = r.body.data[0].user;
    const token = new URL(invitado.inviteAcceptUrl).searchParams.get('token');
    cy.clearCookies();
    cy.request({
      method: 'POST', url: '/rest/invitations/accept', headers: h(),
      body: { token, firstName: 'Miembro', lastName: 'VyV', password: CLAVE_MIEMBRO },
    }).its('status').should('eq', 200);
    cy.loginApi(); // cy.session restaura la sesión del propietario
    return cy.wrap({ id: invitado.id, email });
  });
};

/** Cambia a la sesión del miembro. Para volver a la del propietario: cy.loginApi(). */
export const comoMiembro = (miembro) =>
  cy.session(['miembro', miembro.email], () => {
    cy.request({
      method: 'POST', url: '/rest/login', headers: h(),
      body: { emailOrLdapLoginId: miembro.email, password: CLAVE_MIEMBRO },
    }).its('status').should('eq', 200);
  });

export const borrarMiembro = (miembro) => {
  cy.loginApi();
  if (miembro) n8nApi.req('DELETE', `/rest/users/${miembro.id}`);
};

/** Petición sin cookie de sesión (el browser-id solo no autentica). */
export const sinSesion = (method, url, body) => {
  cy.clearCookies();
  return cy.request({ method, url, body, headers: h(), failOnStatusCode: false });
};

const hallazgos = [];
/**
 * Registra el resultado de una comprobación.
 * @param {{ id: string, owasp: string, resultado: 'OK' | 'HALLAZGO', detalle: string, severidad?: string }} r
 */
export const registrar = (r) => {
  hallazgos.push({ severidad: 'N/A', ...r });
  cy.evidencia(`${r.id} · ${r.owasp} · ${r.resultado} · ${r.detalle}`);
};
export const guardarHallazgos = (modulo) => cy.writeFile(`results/security/${modulo}.json`, hallazgos);

/** La respuesta de error no filtra trazas ni rutas internas del servidor. */
export const sinTraza = (res) => {
  const texto = JSON.stringify(res.body ?? '');
  expect(texto, 'sin traza de pila').not.to.match(/\bat .+\(.+:\d+:\d+\)|node_modules|\/usr\/local\/lib|packages\/cli/);
};
