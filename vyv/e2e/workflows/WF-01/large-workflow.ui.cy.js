/// <reference types="cypress" />
/**
 * WF-01 · Crear y editar workflows · rendimiento del lienzo con 100 nodos (caja negra, UI).
 * Trazabilidad: CP-WF-01-08. Criterio: el lienzo carga en menos de 3 s y el zoom y el
 * desplazamiento responden sin bloqueos.
 * El tiempo se mide desde la recarga de la página hasta que los 100 nodos están en el lienzo.
 */
import { n8nApi } from '../../support/api.js';

const NODOS = 100;

/** Manual Trigger seguido de 99 nodos No Op en una cuadrícula de 10 columnas. */
const workflowGrande = () => {
  const nombre = (i) => (i === 0 ? 'Inicio' : `Paso ${i}`);
  const nodes = Array.from({ length: NODOS }, (_, i) => ({
    id: `n${i}`,
    name: nombre(i),
    type: i === 0 ? 'n8n-nodes-base.manualTrigger' : 'n8n-nodes-base.noOp',
    typeVersion: 1,
    position: [(i % 10) * 220, Math.floor(i / 10) * 160],
    parameters: {},
  }));
  const connections = Object.fromEntries(
    nodes.slice(0, -1).map((n, i) => [n.name, { main: [[{ node: nombre(i + 1), type: 'main', index: 0 }]] }]),
  );
  return { nodes, connections };
};

/** Recarga la página tres veces y devuelve los tiempos hasta que el lienzo muestra `nodos` nodos. */
const medirRecargas = (nodos) => {
  const cargas = [];
  for (let i = 0; i < 3; i++) {
    let inicio;
    cy.then(() => { inicio = performance.now(); });
    cy.reload();
    cy.get('[data-test-id="canvas-node"]', { timeout: 30000 }).should('have.length', nodos).then(() => {
      cargas.push(Math.round(performance.now() - inicio));
    });
  }
  return cy.wrap(cargas, { log: false });
};
const mediana = (valores) => [...valores].sort((a, b) => a - b)[Math.floor(valores.length / 2)];

describe('WF-01 · Workflow de 100 nodos (UI)', () => {
  let wf;
  let referencia;
  before(() => {
    cy.loginApi();
    const { nodes, connections } = workflowGrande();
    n8nApi
      .req('POST', '/rest/workflows', { name: 'VyV 100 nodos', nodes, connections, settings: {}, active: false })
      .then(n8nApi.ok)
      .then((w) => { wf = w; });
    n8nApi
      .req('POST', '/rest/workflows', { name: 'VyV 1 nodo', nodes: nodes.slice(0, 1), connections: {}, settings: {}, active: false })
      .then(n8nApi.ok)
      .then((w) => { referencia = w; });
  });
  beforeEach(() => cy.loginApi());
  after(() => [wf, referencia].forEach((w) => w && n8nApi.req('DELETE', `/rest/workflows/${w.id}`)));

  it('CP-WF-01-08 · el lienzo con 100 nodos carga en menos de 3 s y el zoom y el desplazamiento responden', () => {
    expect(wf.nodes, 'el workflow se crea con 100 nodos').to.have.length(NODOS);
    cy.visitarN8n(`/workflow/${wf.id}`);
    cy.get('[data-test-id="canvas-node"]', { timeout: 30000 }).should('have.length', NODOS);

    // Paso 2 · Medir la carga: recargar el workflow hasta que el lienzo muestra los 100 nodos.
    // Se mide tres veces y se usa la mediana, para que una recarga lenta aislada no decida el caso.
    let cargas;
    medirRecargas(NODOS).then((c) => { cargas = c; });
    cy.screenshot('CP-WF-01-08_lienzo');

    // Paso 3 · Interactuar: zoom y desplazamiento; cada acción debe terminar sin bloquear la interfaz.
    const acciones = [];
    const medir = (nombre, accion) => {
      let t0;
      cy.then(() => { t0 = performance.now(); });
      accion();
      cy.get('[data-test-id="canvas-node"]').should('have.length.greaterThan', 0).then(() => {
        acciones.push({ accion: nombre, ms: Math.round(performance.now() - t0) });
      });
    };
    for (let i = 0; i < 5; i++) {
      medir('zoom +', () => cy.get('[data-test-id="zoom-in-button"]').click());
      medir('zoom −', () => cy.get('[data-test-id="zoom-out-button"]').click());
      medir('desplazar', () =>
        cy.get('[data-test-id="canvas"]').trigger('wheel', { deltaX: 200, deltaY: 120, force: true }),
      );
    }
    medir('ajustar a la vista', () => cy.get('[data-test-id="zoom-to-fit"]').click());
    // Referencia (solo evidencia): la misma recarga con 1 nodo separa el arranque del editor del costo del lienzo.
    let cargasReferencia;
    cy.visitarN8n(`/workflow/${referencia.id}`);
    medirRecargas(1).then((c) => { cargasReferencia = c; });
    cy.then(() => {
      const peor = Math.max(...acciones.map((a) => a.ms));
      cy.evidencia(`Carga del lienzo con ${NODOS} nodos: ${cargas.join(' / ')} ms (mediana ${mediana(cargas)} ms)`);
      cy.evidencia(`Referencia con 1 nodo: ${cargasReferencia.join(' / ')} ms (mediana ${mediana(cargasReferencia)} ms)`);
      cy.evidencia(`Zoom y desplazamiento: ${acciones.length} acciones · la más lenta ${peor} ms`);
      cy.task('table', acciones);
    });
    // Las aserciones van aparte: un expect que falla dentro del bloque anterior cancelaría la evidencia.
    cy.then(() => {
      const peor = Math.max(...acciones.map((a) => a.ms));
      expect(peor, 'acción más lenta (ms): sin bloqueos perceptibles').to.be.lessThan(1000);
      expect(mediana(cargas), 'mediana del tiempo de carga del lienzo (ms)').to.be.lessThan(3000);
    });
  });
});
