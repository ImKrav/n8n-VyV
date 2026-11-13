/// <reference types="cypress" />
/**
 * EX-01 · Lista global de ejecuciones · rendimiento con más de 1 000 ejecuciones (caja negra).
 * Trazabilidad: CP-EX-01-08. Criterio: la lista se muestra en menos de 3 s y el desplazamiento
 * es fluido. Las ejecuciones se generan con un webhook de producción que responde al recibir.
 */
import { n8nApi } from '../../support/api.js';

const EJECUCIONES = 1000;

describe('EX-01 · Lista global con más de 1 000 ejecuciones', () => {
  let wf;
  before(() => {
    cy.loginApi();
    const ruta = n8nApi.rutaUnica('vyv-ex01');
    n8nApi
      .crearWorkflowActivo('VyV 1000 ejecuciones', [n8nApi.nodoWebhook('POST', ruta, 'onReceived')], {})
      .then((w) => {
        wf = w;
        // Paso 1 · Generar: una llamada al webhook es una ejecución de producción.
        n8nApi.llamarWebhook('POST', ruta).its('status').should('eq', 200);
        for (let i = 1; i < EJECUCIONES; i++) {
          cy.request({ method: 'POST', url: `/webhook/${ruta}`, body: { i }, log: false });
        }
      });
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    if (!wf) return;
    // La API exige deleteBefore o ids; el filtro limita el borrado a este workflow.
    n8nApi.req('POST', '/rest/executions/delete', { deleteBefore: new Date().toISOString(), filters: { workflowId: wf.id } });
    n8nApi.desactivarWorkflow(wf.id);
    n8nApi.req('POST', `/rest/workflows/${wf.id}/archive`);
  });

  it('CP-EX-01-08 · la API de la lista global responde en menos de 3 s con más de 1 000 ejecuciones', () => {
    // Las ejecuciones se guardan después de responder: se espera a que estén todas.
    const esperarTodas = (intentos = 30) =>
      n8nApi.ejecuciones(wf.id, 1).then(() =>
        n8nApi.req('GET', `/rest/executions?filter=${encodeURIComponent(JSON.stringify({ workflowId: wf.id }))}&limit=1`)
          .then(n8nApi.ok)
          .then((d) => (d.count < EJECUCIONES && intentos > 1 ? cy.wait(1000).then(() => esperarTodas(intentos - 1)) : d)),
      );
    esperarTodas().its('count').should('be.gte', EJECUCIONES);

    // Paso 2 · Medir: la misma petición que hace la lista global del editor (sin filtro, 10 por página).
    n8nApi.req('GET', '/rest/executions?limit=10').then((r) => {
      expect(r.status).to.eq(200);
      const d = r.body.data;
      cy.evidencia(`GET /rest/executions?limit=10 → ${r.duration} ms · total ${d.count}${d.estimated ? ' (estimado)' : ''}`);
      expect(d.count, 'ejecuciones registradas').to.be.gte(EJECUCIONES);
      expect(r.duration, 'tiempo de respuesta (ms)').to.be.lessThan(3000);
    });
  });

  it('CP-EX-01-08 · la lista global se abre en menos de 3 s y se desplaza sin bloqueos', () => {
    // Se parte del editor ya cargado (Overview → Workflows) y se mide la apertura de la pestaña Executions.
    cy.visitarN8n('/home/workflows');
    cy.get('[data-test-id="project-tabs"]', { timeout: 30000 }).should('be.visible');
    let inicio;
    cy.then(() => { inicio = performance.now(); });
    cy.get('[data-test-id="project-tabs"]').contains(/executions/i).click();
    cy.get('[data-test-id="global-execution-list-item"]', { timeout: 30000 }).should('have.length.greaterThan', 0).then(() => {
      const ms = Math.round(performance.now() - inicio);
      cy.evidencia(`Lista global visible tras abrir la pestaña Executions: ${ms} ms`);
      expect(ms, 'tiempo hasta ver la lista (ms)').to.be.lessThan(3000);
    });
    cy.screenshot('CP-EX-01-08_lista');

    // Paso 3 · Desplazar: bajar hasta el final carga más filas sin bloquear la interfaz.
    cy.get('[data-test-id="global-execution-list-item"]').its('length').then((antes) => {
      let t0;
      cy.then(() => { t0 = performance.now(); });
      cy.get('[data-test-id="global-execution-list-item"]').last().scrollIntoView();
      cy.get('[data-test-id="global-execution-list-item"]').last().should('be.visible').then(() => {
        const ms = Math.round(performance.now() - t0);
        cy.evidencia(`Desplazamiento al final de ${antes} filas: ${ms} ms`);
        expect(ms, 'desplazamiento (ms)').to.be.lessThan(1000);
      });
    });
  });
});
