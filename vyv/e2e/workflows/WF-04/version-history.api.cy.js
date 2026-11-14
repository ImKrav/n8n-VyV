/// <reference types="cypress" />
/**
 * WF-04 · Historial de versiones (caja negra, API /rest/workflow-history).
 * Trazabilidad: CP-WF-04-01, 04-02, 04-03, 04-04, 04-05 y 04-06.
 * Éxito: 04-01, 04-03, 04-04/04-06 · alternativo: 04-05 (comparar versiones)
 * · error: 04-02 sin licencia (403), versión o workflow inexistente (404).
 */
import { n8nApi } from '../../support/api.js';

const h = (wfId) => `/rest/workflow-history/workflow/${wfId}`;
const disparador = { id: 'mt', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} };
const noOp = (name, x) => ({ id: name, name, type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [x, 0], parameters: {} });
const nombres = (nodes) => nodes.map((n) => n.name).sort();

describe('WF-04 · Historial de versiones (API)', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() => workflows.forEach((id) => n8nApi.req('DELETE', `/rest/workflows/${id}`)));

  /** Crea un workflow con el Manual Trigger y guarda `pasos` cambios: el cambio i deja i nodos No Op. */
  const crearConCambios = (nombre, pasos) =>
    n8nApi.req('POST', '/rest/workflows', { name: nombre, nodes: [disparador], connections: {}, settings: {}, active: false })
      .then(n8nApi.ok)
      .then((wf) => {
        workflows.push(wf.id);
        const versiones = [wf.versionId];
        const guardar = (i) =>
          i > pasos ? cy.wrap({ wf, versiones })
            : n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, {
              versionId: versiones.at(-1),
              nodes: [disparador, ...Array.from({ length: i }, (_, j) => noOp(`Paso ${j + 1}`, 220 * (j + 1)))],
            }).then(n8nApi.ok).then((w) => { versiones.push(w.versionId); return guardar(i + 1); });
        return guardar(1);
      });
  const historial = (wfId) => n8nApi.req('GET', `${h(wfId)}?take=20`).then(n8nApi.ok);
  const version = (wfId, v) => n8nApi.req('GET', `${h(wfId)}/version/${v}`).then(n8nApi.ok);

  it('CP-WF-04-01 · tres cambios guardados crean tres versiones nuevas en orden cronológico', () => {
    crearConCambios('VyV historial', 3).then(({ wf, versiones }) => {
      historial(wf.id).then((lista) => {
        cy.evidencia(`Versiones (más reciente primero): ${lista.map((v) => v.versionId.slice(0, 8)).join(' → ')}`);
        expect(lista, 'creación + 3 cambios').to.have.length(4);
        expect(lista.map((v) => v.versionId), 'orden: la más reciente primero').to.deep.eq([...versiones].reverse());
        const fechas = lista.map((v) => Date.parse(v.createdAt));
        expect(fechas, 'fechas en orden descendente').to.deep.eq([...fechas].sort((a, b) => b - a));
      });
    });
  });

  it('CP-WF-04-03 · restaurar la versión con 2 nodos sobre un workflow de 4 crea una versión nueva con ese contenido', () => {
    crearConCambios('VyV restaurar', 3).then(({ wf, versiones }) => {
      version(wf.id, versiones[1]).then((v1) => {
        expect(v1.nodes, 'la versión a restaurar tiene 2 nodos').to.have.length(2);
        // El editor restaura guardando el contenido de la versión sobre el workflow actual.
        n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, { versionId: versiones.at(-1), nodes: v1.nodes, connections: v1.connections })
          .then(n8nApi.ok)
          .then((restaurado) => {
            expect(nombres(restaurado.nodes)).to.deep.eq(nombres(v1.nodes));
            historial(wf.id).then((lista) => {
              cy.evidencia(`Después de restaurar: ${restaurado.nodes.length} nodos · ${lista.length} versiones`);
              expect(lista, 'la restauración crea una versión nueva').to.have.length(5);
              expect(lista[0].versionId).to.eq(restaurado.versionId);
            });
          });
      });
    });
  });

  it('CP-WF-04-04 / CP-WF-04-06 · una versión antigua se clona como workflow nuevo y el original no cambia', () => {
    crearConCambios('VyV clonar', 2).then(({ wf, versiones }) => {
      version(wf.id, versiones[1]).then((v1) => {
        // El JSON descargado de la versión es el que se importa.
        const json = JSON.parse(JSON.stringify({ name: 'VyV clon de versión', nodes: v1.nodes, connections: v1.connections }));
        n8nApi.req('POST', '/rest/workflows', { ...json, settings: {}, active: false }).then(n8nApi.ok).then((clon) => {
          workflows.push(clon.id);
          expect(clon.id).not.to.eq(wf.id);
          expect(nombres(clon.nodes), 'el clon reproduce los nodos de la versión').to.deep.eq(nombres(v1.nodes));
          n8nApi.obtenerWorkflow(wf.id).then((original) => {
            cy.evidencia(`Clon ${clon.id}: ${clon.nodes.length} nodos · original ${wf.id}: ${original.nodes.length} nodos`);
            expect(original.versionId, 'el original no cambia').to.eq(versiones.at(-1));
            expect(original.nodes).to.have.length(3);
          });
        });
      });
    });
  });

  it('CP-WF-04-05 · (alternativo) comparar dos versiones identifica los nodos añadidos, eliminados y modificados', () => {
    n8nApi.req('POST', '/rest/workflows', { name: 'VyV comparar', nodes: [disparador, noOp('Se queda', 220), noOp('Se va', 440)], connections: {}, settings: {}, active: false })
      .then(n8nApi.ok)
      .then((wf) => {
        workflows.push(wf.id);
        const modificado = { ...noOp('Se queda', 220), notes: 'cambiado' };
        n8nApi.req('PATCH', `/rest/workflows/${wf.id}`, { versionId: wf.versionId, nodes: [disparador, modificado, noOp('Nuevo', 660)] })
          .then(n8nApi.ok)
          .then((w2) =>
            version(wf.id, wf.versionId).then((a) => version(wf.id, w2.versionId).then((b) => {
              const porNombre = (v) => Object.fromEntries(v.nodes.map((n) => [n.name, n]));
              const [na, nb] = [porNombre(a), porNombre(b)];
              const diff = {
                añadidos: Object.keys(nb).filter((n) => !na[n]),
                eliminados: Object.keys(na).filter((n) => !nb[n]),
                modificados: Object.keys(nb).filter((n) => na[n] && JSON.stringify(na[n]) !== JSON.stringify(nb[n])),
              };
              cy.evidencia(`Diff: ${JSON.stringify(diff)}`);
              expect(diff).to.deep.eq({ añadidos: ['Nuevo'], eliminados: ['Se va'], modificados: ['Se queda'] });
            })),
          );
      });
  });

  it('CP-WF-04-02 · (error) nombrar una versión sin licencia responde 403 y no cambia el nombre', () => {
    crearConCambios('VyV nombrar', 1).then(({ wf, versiones }) => {
      n8nApi.req('PATCH', `${h(wf.id)}/versions/${versiones[0]}`, { name: 'Versión estable' }).then((r) => {
        cy.evidencia(`Nombrar versión → HTTP ${r.status}: ${r.body.message}`);
        expect(r.status).to.eq(403);
        expect(r.body.message).to.match(/license/i);
      });
      version(wf.id, versiones[0]).its('name').should('be.null');
    });
  });

  it('CP-WF-04 · (error) una versión o un workflow inexistentes responden 404', () => {
    crearConCambios('VyV versión inexistente', 0).then(({ wf }) => {
      n8nApi.req('GET', `${h(wf.id)}/version/no-existe`).then((r) => {
        expect(r.status).to.eq(404);
        expect(r.body.message).to.eq('Could not find version');
      });
      n8nApi.req('GET', `${h('no-existe-vyv')}?take=5`).then((r) => {
        cy.evidencia(`Workflow inexistente → HTTP ${r.status}: ${r.body.message}`);
        expect(r.status).to.eq(404);
        expect(r.body.message).to.eq('Could not find workflow');
      });
    });
  });
});
