/// <reference types="cypress" />
/**
 * CP-017-08 · Límite de almacenamiento (RNF-017) – valores límite.
 * REQUISITO: iniciar n8n con un límite bajo:  npm run n8n:limite  (N8N_DATA_TABLES_MAX_SIZE_BYTES=1048576)
 * y ejecutar:  npm run test:limite
 * Se omite automáticamente si no se pasa --env limite=true (para no llenar la instancia normal).
 */
import { n8nApi, mensaje } from '../../support/api.js';

describe('CO-02 · Límite de almacenamiento (API)', () => {
  before(function () {
    if (!Cypress.env('limite')) this.skip();
  });

  it('CP-017-08 · rechaza inserciones al superar el límite configurado', () => {
    cy.proyectoPersonal().then((p) => {
      cy.nombreUnico('vyv_limite').then((n) => {
        n8nApi.crearTablaOk(p, n, [{ name: 'texto', type: 'string' }]).then((t) => {
          const bloque = Array.from({ length: 10 }, () => ({ texto: 'x'.repeat(5_000) })); // ~50 KB por petición
          let rechazada = null;
          const intentar = (i) => {
            if (i > 60 || rechazada) return;
            n8nApi.insertar(p, t.id, bloque).then((r) => {
              if (r.status !== 200) { rechazada = { i, r }; return; }
              // n8n cachea el tamaño unos segundos: se espera para que el validador lo recalcule.
              if (i % 5 === 4) cy.wait(1500);
              intentar(i + 1);
            });
          };
          intentar(0);
          cy.then(() => {
            expect(rechazada, 'se esperaba que alguna inserción fuera rechazada').to.not.equal(null);
            expect(rechazada.r.status).to.eq(400);
            expect(mensaje(rechazada.r)).to.match(/size limit exceeded/i);
            cy.evidencia(`Rechazo en el bloque ${rechazada.i}: ${mensaje(rechazada.r)}`);
          });
          n8nApi.borrarTabla(p, t.id);
        });
      });
    });
  });
});
