/// <reference types="cypress" />
/**
 * CR-05 · Listado y permisos de credenciales · rendimiento del listado con 50 credenciales (UI).
 * Requisito no funcional del plan (numeral 8.2, rendimiento: «50 credenciales en el listado»).
 * Criterio: el listado carga en menos de 3 s (mediana de tres recargas, el mismo límite que el
 * lienzo) y la búsqueda filtra las 50 credenciales en menos de 3 s.
 */
import { n8nApi } from '../../support/api.js';

const N = 50;
const ITEMS = '[data-test-id="resources-list-item"]';
const BUSCAR = 'input[data-test-id="resources-list-search"], [data-test-id="resources-list-search"] input';
const mediana = (v) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

describe('CR-05 · Listado con 50 credenciales (UI)', () => {
  const prefijo = `vyvcincuenta${Date.now() % 100000}`;
  const creadas = [];
  before(() => {
    cy.loginApi();
    Cypress._.times(N, (i) =>
      n8nApi.req('POST', '/rest/credentials', { name: `${prefijo} ${String(i + 1).padStart(2, '0')}`, type: 'httpHeaderAuth', data: { name: 'X-A', value: `v${i}` } }, { log: false })
        .then(n8nApi.ok).then((c) => creadas.push(c.id)));
  });
  beforeEach(() => cy.loginApi());
  after(() => creadas.forEach((id) => n8nApi.req('DELETE', `/rest/credentials/${id}`, undefined, { log: false })));

  it('CR-05 · RNF · el listado con 50 credenciales carga en menos de 3 s y la búsqueda las filtra', () => {
    expect(creadas).to.have.length(N);
    // El listado no se pagina: es una lista con desplazamiento que solo pinta las tarjetas visibles.
    const ultima = `${prefijo} ${String(N).padStart(2, '0')}`;
    const primera = `${prefijo} 01`;

    // Búsqueda: desde el listado completo hasta ver la credencial más reciente del prefijo.
    cy.visitarN8n('/home/credentials');
    cy.get(ITEMS, { timeout: 30000 }).should('have.length.greaterThan', 0);
    let busqueda;
    cy.then(() => { busqueda = performance.now(); });
    cy.get(BUSCAR).first().type(prefijo);
    cy.get(ITEMS, { timeout: 30000 }).first().should('contain.text', ultima).then(() => { busqueda = Math.round(performance.now() - busqueda); });

    // Carga: mediana de tres recargas del listado filtrado (la búsqueda queda en la URL).
    const cargas = [];
    for (let i = 0; i < 3; i++) {
      let t0;
      cy.then(() => { t0 = performance.now(); });
      cy.reload();
      cy.get(ITEMS, { timeout: 30000 }).first().should('contain.text', ultima).then(() => cargas.push(Math.round(performance.now() - t0)));
    }

    // Las 50 se alcanzan desplazándose hasta la primera creada; todas las tarjetas son del prefijo.
    const bajar = (restantes = 15) =>
      cy.get(ITEMS).then(($i) => {
        if ([...$i].some((el) => el.textContent.includes(primera)) || restantes <= 0) return;
        cy.wrap($i.last()).scrollIntoView();
        cy.wait(300).then(() => bajar(restantes - 1));
      });
    bajar();
    cy.contains(ITEMS, primera).should('exist');
    cy.get(ITEMS).each(($i) => expect($i.text()).to.contain(prefijo));
    cy.screenshot('CR-05_50-credenciales');

    cy.then(() => {
      cy.evidencia(`Listado con ${N} credenciales nuevas · búsqueda: ${busqueda} ms · carga filtrada: ${cargas.join(' / ')} ms (mediana ${mediana(cargas)} ms) · desplazamiento hasta «${primera}»`);
      expect(mediana(cargas), 'mediana de carga del listado (ms)').to.be.lessThan(3000);
      expect(busqueda, 'búsqueda (ms)').to.be.lessThan(3000);
    });
  });
});
