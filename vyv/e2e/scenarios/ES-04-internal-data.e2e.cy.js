/// <reference types="cypress" />
/**
 * ES-04 · Datos internos (escenario extremo a extremo del plan).
 * Crear una data table importando un CSV, escribir y leer filas desde un workflow con el nodo
 * Data Table y exportar el resultado. Cubre CO-01, CO-03, CO-02 y WF-01.
 * Se ejecuta en las dos resoluciones del plan.
 */
import { n8nApi } from '../support/api.js';

const RESOLUCIONES = [[1366, 768], [1920, 1080]];
const columna = (id, type) => ({ id, displayName: id, required: false, defaultMatch: false, display: true, type, canBeUsedToMatch: true });

describe('ES-04 · Datos internos', () => {
  let p;
  const tablas = [];
  const workflows = [];
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  beforeEach(() => cy.loginApi());
  after(() => {
    workflows.forEach((id) => n8nApi.desactivarWorkflow(id));
    tablas.forEach((id) => n8nApi.borrarTabla(p, id));
  });

  /** Publica Webhook → Data table con los parámetros dados y devuelve la ruta. */
  const publicarNodo = (nombre, metodo, parametros) => {
    const ruta = n8nApi.rutaUnica('vyv-es04');
    const nodes = [n8nApi.nodoWebhook(metodo, ruta), { id: 'dt', name: 'Data table', type: 'n8n-nodes-base.dataTable', typeVersion: 1.1, position: [220, 0], parameters: parametros }];
    return n8nApi.crearWorkflowActivo(nombre, nodes, n8nApi.cadena('Webhook', 'Data table'), p).then((wf) => {
      workflows.push(wf.id);
      return ruta;
    });
  };

  RESOLUCIONES.forEach(([ancho, alto]) => {
    it(`ES-04 · importar CSV, escribir y leer con el nodo Data Table y exportar (${ancho} × ${alto})`, () => {
      cy.viewport(ancho, alto);
      let tabla;

      // 1 · Crear la data table importando valido.csv (5 filas, 4 tipos).
      n8nApi.subirArchivo('csv/valido.csv', 'valido.csv').then((up) => {
        expect(up.status).to.eq(200);
        const meta = up.body.data ?? up.body;
        return cy.nombreUnico('vyv_es04').then((nombre) =>
          n8nApi.req('POST', n8nApi.dt(p), {
            name: nombre, fileId: meta.id, hasHeaders: true,
            columns: meta.columns.map((c) => ({ name: c.name, type: c.type, csvColumnName: c.name })),
          }).then(n8nApi.ok),
        );
      }).then((t) => {
        tabla = t;
        tablas.push(t.id);
        n8nApi.filasOk(p, t.id).should('have.length', 5);
      });

      // 2 · Escribir una fila desde un workflow.
      cy.then(() =>
        publicarNodo(`VyV ES-04 insertar ${ancho}`, 'POST', {
          resource: 'row', operation: 'insert', dataTableId: { __rl: true, mode: 'id', value: tabla.id },
          columns: { mappingMode: 'defineBelow', value: { nombre: 'Eva', edad: 45 }, schema: [columna('nombre', 'string'), columna('edad', 'number')] },
          options: {},
        }),
      ).then((ruta) => n8nApi.llamarWebhook('POST', ruta).its('status').should('eq', 200));

      // 3 · Leer las filas con edad > 41 desde otro workflow (la mayor del CSV es Marta, 41).
      cy.then(() =>
        publicarNodo(`VyV ES-04 leer ${ancho}`, 'GET', {
          resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'id', value: tabla.id },
          matchType: 'allConditions', filters: { conditions: [{ keyName: 'edad', condition: 'gt', keyValue: 41 }] }, returnAll: true,
        }),
      ).then((ruta) =>
        n8nApi.llamarWebhook('GET', ruta).then((r) => {
          expect(r.status).to.eq(200);
          expect([].concat(r.body).map((f) => f.nombre)).to.deep.eq(['Eva']);
        }),
      );

      // 4 · Exportar: el CSV tiene las 5 filas importadas y la escrita por el workflow.
      cy.then(() => n8nApi.descargarCsv(p, tabla.id)).then((r) => {
        expect(r.status).to.eq(200);
        const lineas = (r.body.data ?? r.body).csvContent.trim().split('\n');
        cy.evidencia(`${ancho}×${alto}: tabla ${tabla.id} importada con 5 filas · el workflow escribe «Eva» y la lee con edad > 41 · CSV exportado con ${lineas.length - 1} filas`);
        expect(lineas[0]).to.contain('nombre');
        expect(lineas).to.have.length(7);
        expect(lineas.join('\n')).to.contain('Eva');
      });

      // 5 · La tabla en la interfaz.
      cy.then(() => cy.visitarN8n(`/projects/${p}/datatables/${tabla.id}`));
      cy.contains('Eva', { timeout: 30000 }).should('be.visible');
      cy.screenshot(`ES-04_${ancho}x${alto}_tabla`);
    });
  });
});
