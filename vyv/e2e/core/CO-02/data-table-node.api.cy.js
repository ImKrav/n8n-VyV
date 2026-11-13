/// <reference types="cypress" />
/**
 * CO-02 · Edición de filas · leer y escribir filas desde un workflow con el nodo Data Table (caja negra).
 * Trazabilidad: CP-CO-02-08 (caso del plan sin equivalente en ESC-017).
 * Dos workflows con disparador Webhook (respuesta del último nodo): uno inserta y otro lee.
 * Se activan por API y se llaman por HTTP, sin abrir el editor.
 */
import { n8nApi } from '../../support/api.js';

describe('CO-02 · Nodo Data Table en un workflow (API)', () => {
  let p;
  let tabla;
  const workflows = [];
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  beforeEach(() => cy.loginApi());
  after(() => {
    workflows.forEach((id) => n8nApi.req('POST', `/rest/workflows/${id}/deactivate`));
    if (tabla) n8nApi.borrarTabla(p, tabla.id);
  });

  /** Workflow Webhook → Data Table, guardado y activado. Devuelve la ruta del webhook. */
  const crearYActivar = (nombre, metodo, parametrosNodo) => {
    const ruta = `vyv-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const nodes = [
      {
        id: 'webhook', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0],
        webhookId: crypto.randomUUID(),
        parameters: { httpMethod: metodo, path: ruta, responseMode: 'lastNode', options: {} },
      },
      {
        id: 'datatable', name: 'Data table', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1,
        position: [220, 0], parameters: parametrosNodo,
      },
    ];
    const connections = { Webhook: { main: [[{ node: 'Data table', type: 'main', index: 0 }]] } };
    return n8nApi
      .req('POST', '/rest/workflows', { name: nombre, nodes, connections, settings: {}, active: false, projectId: p })
      .then(n8nApi.ok)
      .then((wf) => {
        workflows.push(wf.id);
        return n8nApi
          .req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId })
          .then((r) => {
            expect(r.status, JSON.stringify(r.body).slice(0, 200)).to.eq(200);
            return ruta;
          });
      });
  };

  const idTabla = () => ({ __rl: true, mode: 'id', value: tabla.id });

  /** n8n registra el webhook poco después de activar: se reintenta mientras responde 404. */
  const llamarWebhook = (metodo, ruta, intentos = 10) =>
    cy.request({ method: metodo, url: `/webhook/${ruta}`, body: {}, failOnStatusCode: false }).then((r) =>
      r.status === 404 && intentos > 1 ? cy.wait(500).then(() => llamarWebhook(metodo, ruta, intentos - 1)) : r,
    );

  it('CP-CO-02-08 · inserta una fila con el nodo Data Table y la lee con un filtro', () => {
    cy.nombreUnico('vyv_clientes').then((nombre) => {
      n8nApi
        .crearTablaOk(p, nombre, [{ name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' }])
        .then((t) => { tabla = t; });
    });

    // Paso 1 · Insertar: el workflow inserta nombre='Luis', edad=40.
    cy.then(() =>
      crearYActivar('VyV insertar fila', 'POST', {
        resource: 'row',
        operation: 'insert',
        dataTableId: idTabla(),
        columns: {
          mappingMode: 'defineBelow',
          value: { nombre: 'Luis', edad: 40 },
          schema: [
            { id: 'nombre', displayName: 'nombre', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true },
            { id: 'edad', displayName: 'edad', required: false, defaultMatch: false, display: true, type: 'number', canBeUsedToMatch: true },
          ],
        },
        options: {},
      }),
    ).then((ruta) => {
      llamarWebhook('POST', ruta).then((r) => {
        expect(r.status, 'la ejecución del workflow es exitosa').to.eq(200);
        cy.evidencia(`Insertar → HTTP ${r.status}: ${JSON.stringify(r.body).slice(0, 160)}`);
      });
    });

    // Paso 2 · Verificar tabla: la fila de 'Luis' está en la tabla.
    cy.then(() => n8nApi.filasOk(p, tabla.id)).then((filas) => {
      expect(filas.map((f) => [f.nombre, f.edad])).to.deep.include(['Luis', 40]);
    });

    // Paso 3 · Leer: el workflow obtiene las filas con edad > 35 y la salida incluye a 'Luis'.
    cy.then(() =>
      n8nApi.insertar(p, tabla.id, [{ nombre: 'Ana', edad: 25 }]).then(() =>
        crearYActivar('VyV leer filas', 'GET', {
          resource: 'row',
          operation: 'get',
          dataTableId: idTabla(),
          matchType: 'allConditions',
          filters: { conditions: [{ keyName: 'edad', condition: 'gt', keyValue: 35 }] },
          returnAll: true,
        }),
      ),
    ).then((ruta) => {
      llamarWebhook('GET', ruta).then((r) => {
        expect(r.status).to.eq(200);
        const salida = [].concat(r.body).map((f) => f.nombre);
        expect(salida, 'la salida incluye a Luis y excluye el valor fuera del filtro').to.include('Luis').and.not.include('Ana');
        cy.evidencia(`Leer edad > 35 → ${JSON.stringify(r.body).slice(0, 160)}`);
      });
    });
  });
});
