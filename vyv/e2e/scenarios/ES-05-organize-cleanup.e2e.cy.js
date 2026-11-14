/// <reference types="cypress" />
/**
 * ES-05 · Organización y limpieza (escenario extremo a extremo del plan).
 * Crear un workflow desde una plantilla, organizarlo en carpetas anidadas, moverlo y eliminar la
 * carpeta transfiriendo su contenido; verificar que los workflows conservan credenciales y ejecuciones.
 * Cubre WF-05, CO-04, CO-05 y EX-01. Usa el servicio público de plantillas (requiere red).
 * Se ejecuta en las dos resoluciones del plan.
 */
import { n8nApi } from '../support/api.js';

const RESOLUCIONES = [[1366, 768], [1920, 1080]];

describe('ES-05 · Organización y limpieza', () => {
  let p;
  let urlEco;
  let plantilla;
  const workflows = [];
  const credenciales = [];
  const carpetas = [];
  before(() => {
    cy.proyectoPersonal().then((id) => { p = id; });
    n8nApi.crearEco().then(({ wf, ruta }) => {
      workflows.push(wf.id);
      urlEco = `${Cypress.config('baseUrl')}/webhook/${ruta}`;
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
    });
    // Una plantilla real del servicio configurado en la instancia.
    n8nApi.req('GET', '/rest/settings').then(n8nApi.ok).then(({ templates }) => {
      cy.request(`${templates.host}templates/search?search=webhook&rows=1&page=1`).its('body.workflows.0.id').then((id) =>
        cy.request(`${templates.host}templates/workflows/${id}`).its('body.workflow').then((t) => {
          plantilla = { id, name: t.name, nodes: t.workflow.nodes, connections: t.workflow.connections };
        }),
      );
    });
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    workflows.forEach((id) => n8nApi.desactivarWorkflow(id));
    credenciales.forEach((id) => n8nApi.borrarCredencial(id));
    carpetas.forEach((id) => n8nApi.borrarCarpeta(p, id));
  });

  RESOLUCIONES.forEach(([ancho, alto]) => {
    it(`ES-05 · plantilla, carpetas anidadas, mover y eliminar transfiriendo (${ancho} × ${alto})`, () => {
      cy.viewport(ancho, alto);
      const ruta = n8nApi.rutaUnica('vyv-es05');
      const c = {};
      let deLaPlantilla;
      let conCredencial;

      // 1 · Carpetas: A con la subcarpeta B, y C como destino.
      cy.nombreUnico('VyV-A').then((n) => n8nApi.crearCarpetaOk(p, n)).then((a) => { c.A = a; });
      cy.nombreUnico('VyV-C').then((n) => n8nApi.crearCarpetaOk(p, n)).then((x) => { c.C = x; carpetas.push(x.id); });
      cy.then(() => cy.nombreUnico('VyV-B').then((n) => n8nApi.crearCarpetaOk(p, n, c.A.id))).then((b) => { c.B = b; });

      // 2 · Workflow desde la plantilla, dentro de B.
      cy.then(() =>
        n8nApi.req('POST', '/rest/workflows', {
          name: `${plantilla.name} (VyV ${ancho})`, nodes: plantilla.nodes, connections: plantilla.connections,
          settings: {}, active: false, parentFolderId: c.B.id, projectId: p,
        }).then(n8nApi.ok),
      ).then((w) => {
        deLaPlantilla = w;
        workflows.push(w.id);
        expect(w.nodes.length, 'reproduce los nodos de la plantilla').to.eq(plantilla.nodes.length);
      });

      // 3 · Un workflow con credencial y una ejecución, también en B.
      cy.nombreUnico('VyV-ES05').then((n) => n8nApi.crearCredencialHeader(n, 'X-Token', 'es05')).then((cred) => {
        credenciales.push(cred.id);
        return n8nApi.req('POST', '/rest/workflows', {
          name: `VyV ES-05 con credencial ${ancho}`, nodes: [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoHttpCredencial(urlEco, cred)],
          connections: n8nApi.cadena('Webhook', 'HTTP Request'), settings: {}, active: false, parentFolderId: c.B.id, projectId: p,
        }).then(n8nApi.ok).then((w) => {
          conCredencial = { ...w, cred };
          workflows.push(w.id);
          return n8nApi.req('POST', `/rest/workflows/${w.id}/activate`, { versionId: w.versionId });
        });
      }).its('status').should('eq', 200);
      n8nApi.llamarWebhook('GET', ruta).its('body.headers.x-token').should('eq', 'es05');
      cy.then(() => n8nApi.esperarEjecuciones(conCredencial.id, 1)).should('have.length', 1);
      cy.then(() => n8nApi.arbol(p, c.B.id)).then((arbol) => {
        expect(JSON.stringify(arbol), 'B está dentro de A').to.contain(c.A.id);
      });

      // 4 · Mover los dos workflows de B a A.
      cy.then(() => [deLaPlantilla, conCredencial].forEach((w) =>
        n8nApi.obtenerWorkflow(w.id).then((actual) => n8nApi.moverWorkflow(actual, c.A.id)).its('status').should('eq', 200)));
      cy.then(() => n8nApi.contenido(p, c.A.id)).should('deep.include', { totalWorkflows: 2, totalSubFolders: 1 });

      // 5 · Eliminar A transfiriendo su contenido a C.
      cy.then(() => n8nApi.borrarCarpeta(p, c.A.id, c.C.id)).its('status').should('eq', 200);
      cy.then(() => n8nApi.contenido(p, c.C.id)).should('deep.include', { totalWorkflows: 2, totalSubFolders: 1 });

      // 6 · Los workflows conservan contenido, credencial y ejecuciones, y el publicado sigue respondiendo.
      cy.then(() => n8nApi.obtenerWorkflow(deLaPlantilla.id)).then((w) => {
        expect(w.parentFolder?.id).to.eq(c.C.id);
        expect(w.nodes).to.have.length(plantilla.nodes.length);
      });
      cy.then(() => n8nApi.obtenerWorkflow(conCredencial.id)).then((w) => {
        expect(w.parentFolder?.id).to.eq(c.C.id);
        expect(w.nodes.find((n) => n.name === 'HTTP Request').credentials.httpHeaderAuth.id).to.eq(conCredencial.cred.id);
      });
      cy.then(() => n8nApi.ejecuciones(conCredencial.id)).should('have.length', 1);
      n8nApi.llamarWebhook('GET', ruta).its('body.headers.x-token').should('eq', 'es05');

      // 7 · La carpeta C en la interfaz.
      cy.then(() => cy.visitarN8n(`/projects/${p}/folders/${c.C.id}/workflows`));
      cy.contains(`VyV ES-05 con credencial ${ancho}`, { timeout: 30000 }).should('be.visible');
      cy.contains(`(VyV ${ancho})`).should('be.visible');
      cy.screenshot(`ES-05_${ancho}x${alto}_carpeta-destino`);
      cy.then(() => cy.evidencia(`${ancho}×${alto}: plantilla ${plantilla.id} «${plantilla.name}» (${plantilla.nodes.length} nodos) · A/B → mover a A → eliminar A transfiriendo a C · C tiene 2 workflows y la subcarpeta B · credencial y ejecución conservadas`));
    });
  });
});
