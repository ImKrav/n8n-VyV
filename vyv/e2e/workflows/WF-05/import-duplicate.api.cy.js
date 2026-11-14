/// <reference types="cypress" />
/**
 * WF-05 · Plantillas, importación y duplicado (caja negra, API).
 * Trazabilidad: CP-WF-05-01, 05-03, 05-04, 05-05 y 05-06.
 * Éxito: 05-03 (importar desde URL), 05-06 (duplicado independiente con etiquetas)
 * · alternativo: 05-01 (término sin resultados y filtro por categoría), 05-05 (nombre repetido y de 128)
 * · error: 05-04 (URL inválida o sin JSON de workflow), 05-05 (nombre vacío o de 129).
 * CP-WF-05-01 usa el servicio público de plantillas configurado en la instancia (requiere red).
 */
import { n8nApi } from '../../support/api.js';

const disparador = { id: 'mt', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} };
const noOp = { id: 'np', name: 'No Op', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [220, 0], parameters: {} };
const workflowJson = { name: 'VyV importado', nodes: [disparador, noOp], connections: n8nApi.cadena('Manual Trigger', 'No Op') };

describe('WF-05 · Importar y duplicar workflows (API)', () => {
  let p;
  const workflows = [];
  const etiquetas = [];
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  beforeEach(() => cy.loginApi());
  after(() => {
    workflows.forEach((id) => n8nApi.desactivarWorkflow(id).then(() => n8nApi.req('DELETE', `/rest/workflows/${id}`)));
    etiquetas.forEach((id) => n8nApi.req('DELETE', `/rest/tags/${id}`));
  });

  const crear = (body) =>
    n8nApi.req('POST', '/rest/workflows', { nodes: [], connections: {}, settings: {}, active: false, ...body }).then((r) => {
      if (r.status === 200) workflows.push(r.body.data.id);
      return r;
    });
  const desdeUrl = (url) => n8nApi.req('GET', `/rest/workflows/from-url?${new URLSearchParams({ url, projectId: p })}`);

  it('CP-WF-05-03 · importar desde una URL con JSON válido devuelve los nodos y conexiones del archivo', () => {
    // Un webhook de la propia instancia sirve el JSON del workflow (URL pública sin depender de Internet).
    const ruta = n8nApi.rutaUnica('vyv-json');
    const servidor = { id: 'json', name: 'JSON', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [220, 0], parameters: { mode: 'raw', jsonOutput: JSON.stringify(workflowJson), options: {} } };
    n8nApi.crearWorkflowActivo('VyV servidor de JSON', [n8nApi.nodoWebhook('GET', ruta), servidor], n8nApi.cadena('Webhook', 'JSON'), p).then((wf) => {
      workflows.push(wf.id);
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
      desdeUrl(`${Cypress.config('baseUrl')}/webhook/${ruta}`).then(n8nApi.ok).then((importado) => {
        expect(importado.nodes.map((n) => n.name)).to.deep.eq(['Manual Trigger', 'No Op']);
        expect(importado.connections).to.deep.eq(workflowJson.connections);
        crear({ name: importado.name, nodes: importado.nodes, connections: importado.connections }).then(n8nApi.ok).then((nuevo) => {
          cy.evidencia(`Importado desde /webhook/${ruta} → workflow ${nuevo.id} con ${nuevo.nodes.length} nodos`);
          expect(nuevo.nodes).to.have.length(2);
        });
      });
    });
  });

  it('CP-WF-05-04 · (error) una URL inválida, inexistente o sin JSON de workflow se rechaza con 400', () => {
    const casos = [
      ['texto que no es URL', 'no-es-una-url', /invalid url/i],
      ['ruta inexistente', `${Cypress.config('baseUrl')}/no-existe-vyv`, /does not seem to be a n8n workflow/i],
      ['respuesta que no es un workflow', `${Cypress.config('baseUrl')}/healthz`, /does not seem to be a n8n workflow/i],
    ];
    casos.forEach(([caso, url, mensaje]) =>
      desdeUrl(url).then((r) => {
        cy.evidencia(`${caso} → HTTP ${r.status}: ${r.body.message}`);
        expect(r.status, caso).to.eq(400);
        expect(r.body.message, caso).to.match(mensaje);
      }),
    );
  });

  it('CP-WF-05-05 · nombres del duplicado: vacío y de 129 se rechazan; de 128 y repetido se aceptan', () => {
    const casos = [
      ['vacío', '', 400, /name is required/i],
      ['129 caracteres', 'x'.repeat(129), 400, /128 characters or less/i],
      ['128 caracteres', 'x'.repeat(128), 200],
      ['repetido', 'VyV nombre repetido', 200],
      ['repetido (segunda vez)', 'VyV nombre repetido', 200],
    ];
    casos.forEach(([caso, name, estado, mensaje]) =>
      crear({ name, nodes: [disparador] }).then((r) => {
        cy.evidencia(`Nombre ${caso} → HTTP ${r.status}${r.status === 200 ? '' : `: ${r.body.message}`}`);
        expect(r.status, caso).to.eq(estado);
        if (mensaje) expect(r.body.message, caso).to.match(mensaje);
      }),
    );
  });

  it('CP-WF-05-06 · el duplicado conserva las etiquetas y sus cambios no afectan al original', () => {
    cy.nombreUnico('vyv-etiqueta').then((nombre) =>
      n8nApi.req('POST', '/rest/tags', { name: nombre }).then(n8nApi.ok).then((tag) => {
        etiquetas.push(tag.id);
        crear({ name: 'VyV original', nodes: [disparador, noOp], connections: workflowJson.connections, tags: [tag.id] }).then(n8nApi.ok).then((original) => {
          // Duplicar = crear un workflow con el contenido y las etiquetas del original.
          crear({ name: 'VyV original (copia)', nodes: original.nodes, connections: original.connections, tags: original.tags.map((t) => t.id) })
            .then(n8nApi.ok)
            .then((copia) => {
              expect(copia.id).not.to.eq(original.id);
              expect(copia.tags.map((t) => t.name), 'la copia conserva la etiqueta').to.deep.eq([nombre]);
              n8nApi.req('PATCH', `/rest/workflows/${copia.id}`, { versionId: copia.versionId, name: 'VyV copia modificada', nodes: [disparador], connections: {} }).its('status').should('eq', 200);
              n8nApi.obtenerWorkflow(original.id).then((leido) => {
                cy.evidencia(`Original tras modificar la copia: "${leido.name}", ${leido.nodes.length} nodos, etiquetas ${leido.tags.map((t) => t.name)}`);
                expect(leido.name).to.eq('VyV original');
                expect(leido.nodes).to.have.length(2);
                expect(leido.versionId).to.eq(original.versionId);
              });
            });
        });
      }),
    );
  });

  it('CP-WF-05-01 · (alternativo) la búsqueda de plantillas devuelve resultados, vacío para un término inexistente y respeta la categoría', function () {
    n8nApi.req('GET', '/rest/settings').then(n8nApi.ok).then(({ templates }) => {
      if (!templates?.enabled) this.skip();
      const buscar = (qs) => cy.request({ url: `${templates.host}templates/search?${new URLSearchParams({ rows: 5, page: 1, ...qs })}`, failOnStatusCode: false });
      buscar({ search: 'slack' }).then((r) => {
        expect(r.status).to.eq(200);
        expect(r.body.totalWorkflows, 'término existente').to.be.greaterThan(0);
        cy.evidencia(`"slack": ${r.body.totalWorkflows} plantillas · primera: ${r.body.workflows[0]?.name}`);
      });
      buscar({ search: 'zzqxvyvnoexiste' }).then((r) => {
        cy.evidencia(`Término inexistente: ${r.body.totalWorkflows} plantillas`);
        expect(r.body.totalWorkflows, 'término inexistente').to.eq(0);
      });
      cy.request(`${templates.host}templates/categories`).its('body.categories').then((categorias) => {
        // La API filtra por el nombre de la categoría.
        const categoria = categorias[0].name;
        buscar({}).then((todos) =>
          buscar({ category: categoria }).then((filtrado) => {
            cy.evidencia(`Sin filtro: ${todos.body.totalWorkflows} · categoría "${categoria}": ${filtrado.body.totalWorkflows}`);
            expect(filtrado.body.totalWorkflows, 'la categoría tiene plantillas').to.be.greaterThan(0);
            expect(filtrado.body.totalWorkflows, 'el filtro limita los resultados').to.be.lessThan(todos.body.totalWorkflows);
          }),
        );
      });
    });
  });
});
