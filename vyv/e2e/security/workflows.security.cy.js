/// <reference types="cypress" />
/**
 * Seguridad · módulo 1 · Workflows (WF-01 a WF-05) · OWASP Top 10:2025 · RNF-02 del plan.
 * Cada prueba afirma el comportamiento seguro esperado: si n8n no lo cumple, la prueba falla
 * y el hallazgo queda en results/security/workflows.json (ver vyv/security/README.md).
 * Actores: el propietario (cy.loginApi) y un miembro sin acceso a los workflows del propietario.
 */
import { n8nApi } from '../support/api.js';
import { crearMiembro, comoMiembro, borrarMiembro, sinSesion, registrar, guardarHallazgos, sinTraza } from './soporte.js';

const creados = [];
const borrarWf = (id) =>
  n8nApi.desactivarWorkflow(id).then(() => n8nApi.req('POST', `/rest/workflows/${id}/archive`)).then(() => n8nApi.req('DELETE', `/rest/workflows/${id}`));
const nuevo = (nombre, nodes = [], connections = {}) =>
  n8nApi.req('POST', '/rest/workflows', { name: nombre, nodes, connections, settings: {}, active: false }).then(n8nApi.ok)
    .then((wf) => { creados.push(wf.id); return wf; });

describe('Seguridad · Workflows (OWASP Top 10:2025)', () => {
  let miembro;
  let p;
  let wf;

  before(() => {
    crearMiembro().then((m) => { miembro = m; });
    cy.proyectoPersonal().then((id) => { p = id; });
    cy.nombreUnico('VyV-Seg-WF').then((n) => nuevo(n)).then((w) => { wf = w; });
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    cy.loginApi();
    creados.forEach(borrarWf);
    borrarMiembro(miembro);
    guardarHallazgos('workflows');
  });

  it('CP-SEG-WF-01 · A01 Broken Access Control · sin sesión, la API de workflows responde 401', () => {
    const rutas = [
      ['GET', '/rest/workflows'], ['GET', `/rest/workflows/${wf.id}`], ['POST', '/rest/workflows'],
      ['PATCH', `/rest/workflows/${wf.id}`], ['DELETE', `/rest/workflows/${wf.id}`],
      ['POST', `/rest/workflows/${wf.id}/activate`], ['GET', `/rest/workflow-history/workflow/${wf.id}`],
    ];
    rutas.forEach(([m, url]) => sinSesion(m, url, m === 'GET' ? undefined : {}).then((r) => expect(r.status, `${m} ${url}`).to.eq(401)));
    cy.then(() => registrar({ id: 'CP-SEG-WF-01', owasp: 'A01', resultado: 'OK', detalle: `${rutas.length} rutas responden 401 sin sesión` }));
  });

  it('CP-SEG-WF-02 · A01 Broken Access Control · un miembro no lee, edita, archiva, activa ni ve el historial de un workflow ajeno', () => {
    comoMiembro(miembro);
    const intentos = [
      ['GET', `/rest/workflows/${wf.id}`], ['PATCH', `/rest/workflows/${wf.id}`, { name: 'VyV-Seg-robado', versionId: wf.versionId }],
      ['POST', `/rest/workflows/${wf.id}/archive`], ['DELETE', `/rest/workflows/${wf.id}`],
      ['POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }], ['GET', `/rest/workflow-history/workflow/${wf.id}`],
    ];
    const estados = [];
    intentos.forEach(([m, url, body]) => n8nApi.req(m, url, body).then((r) => {
      estados.push(`${m} ${url.replace(wf.id, ':id')} → ${r.status}`);
      expect(r.status, `${m} ${url}`).to.be.oneOf([403, 404]);
    }));
    // El propietario comprueba que el workflow no cambió.
    cy.loginApi();
    n8nApi.obtenerWorkflow(wf.id).then((w) => {
      expect(w.name).to.eq(wf.name);
      expect(w.isArchived, 'no se archivó').to.not.eq(true);
      registrar({ id: 'CP-SEG-WF-02', owasp: 'A01', resultado: 'OK', detalle: estados.join('; ') });
    });
  });

  it('CP-SEG-WF-03 · A01 Broken Access Control · el listado del miembro no incluye el workflow del propietario', () => {
    comoMiembro(miembro);
    n8nApi.req('GET', '/rest/workflows').then((r) => {
      expect(r.status).to.eq(200);
      const ids = r.body.data.map((w) => w.id);
      registrar({ id: 'CP-SEG-WF-03', owasp: 'A01', resultado: ids.includes(wf.id) ? 'HALLAZGO' : 'OK', detalle: `${ids.length} workflows visibles para el miembro` });
      expect(ids).not.to.include(wf.id);
    });
  });

  it('CP-SEG-WF-04 · A01 Broken Access Control · el miembro no puede crear un workflow en el proyecto personal del propietario', () => {
    comoMiembro(miembro);
    n8nApi.req('POST', '/rest/workflows', { name: 'VyV-Seg-intruso', nodes: [], connections: {}, settings: {}, active: false, projectId: p }).then((r) => {
      if (r.status === 200) creados.push(r.body.data.id);
      registrar({ id: 'CP-SEG-WF-04', owasp: 'A01', resultado: [400, 403, 404].includes(r.status) ? 'OK' : 'HALLAZGO', detalle: `POST /rest/workflows con projectId ajeno → ${r.status}` });
      expect(r.status).to.be.oneOf([400, 403, 404]);
    });
  });

  it('CP-SEG-WF-05 · A01 Broken Access Control (SSRF) · importar desde URL no consulta direcciones internas', () => {
    // Si la URL interna se consultara, n8n responde «no es un workflow» (leyó la respuesta);
    // con la protección SSRF activa responde que la dirección está bloqueada.
    const puerto = new URL(Cypress.config('baseUrl')).port;
    const internas = [`http://127.0.0.1:${puerto}/rest/settings`, `http://localhost:${puerto}/healthz`];
    const detalle = [];
    internas.forEach((url) => n8nApi.req('GET', `/rest/workflows/from-url?${new URLSearchParams({ url, projectId: p })}`).then((r) => {
      detalle.push(`${url} → ${r.status}: ${String(r.body?.message).slice(0, 70)}`);
    }));
    cy.then(() => {
      const consultadas = detalle.filter((d) => /does not seem to be a n8n workflow/i.test(d));
      registrar({
        id: 'CP-SEG-WF-05', owasp: 'A01', resultado: consultadas.length ? 'HALLAZGO' : 'OK', detalle: detalle.join('; '),
        severidad: consultadas.length ? 'Media' : 'N/A',
      });
      expect(consultadas, 'n8n descargó contenido de direcciones internas (N8N_SSRF_PROTECTION_ENABLED=false por defecto)').to.have.length(0);
    });
  });

  it('CP-SEG-WF-06 · A05 Injection · un nombre con HTML se guarda como texto y no se ejecuta en la lista', () => {
    // Con el manejador entre comillas el editor lanza un SyntaxError (observación, ver vyv/security/README.md):
    // se recoge como evidencia; lo que decide la prueba es que no se ejecute código ni se cree el elemento.
    const errores = [];
    cy.on('uncaught:exception', (err) => { errores.push(err.message.split('\n')[2]?.trim()); return false; });
    const ts = Date.now();
    const nombres = [`VyV-Seg-<img src=x onerror="window.__xss=1">${ts}`, `VyV-Seg-<svg onload=window.__xss=2>${ts}`];
    nombres.forEach((n) => nuevo(n).its('name').should('eq', n));
    cy.visitarN8n('/home/workflows');
    nombres.forEach((n) => cy.contains(n, { timeout: 20000 }).should('exist'));
    cy.wait(2000);
    cy.get('img[onerror], svg[onload]').should('not.exist');
    cy.window().its('__xss').should('be.undefined');
    cy.then(() => registrar({
      id: 'CP-SEG-WF-06', owasp: 'A05', resultado: 'OK',
      detalle: `2 nombres con manejadores mostrados como texto, sin ejecución. Errores de la página: ${errores.length ? errores.join(' | ') : 'ninguno'}`,
    }));
  });

  it('CP-SEG-WF-07 · A05 Injection · un nombre y una búsqueda con SQL no alteran los datos', () => {
    nuevo(`VyV-Seg-x'); DROP TABLE workflow_entity; --${Date.now()}`).then((w) => expect(w.id).to.be.a('string'));
    n8nApi.req('GET', `/rest/workflows?filter=${encodeURIComponent(JSON.stringify({ query: "' OR '1'='1" }))}`).then((r) => {
      expect(r.status, 'no responde 500').to.be.oneOf([200, 400]);
      if (r.status === 200) expect(r.body.data, 'el filtro no amplía resultados').to.have.length(0);
    });
    n8nApi.obtenerWorkflow(wf.id).its('name').should('eq', wf.name);
    cy.then(() => registrar({ id: 'CP-SEG-WF-07', owasp: 'A05', resultado: 'OK', detalle: 'Consultas parametrizadas: nombre y filtro con SQL sin efecto' }));
  });

  it('CP-SEG-WF-08 · A08 Software or Data Integrity Failures · una edición basada en una versión vieja no sobrescribe la actual', () => {
    // n8n detecta ediciones concurrentes con el checksum que devuelve al leer el workflow (expectedChecksum),
    // pero sin la licencia de sharing el controlador fuerza forceSave (workflows.controller.ts:341).
    cy.nombreUnico('VyV-Seg-WF-ver').then((n) => nuevo(n)).then((w) => {
      n8nApi.req('PATCH', `/rest/workflows/${w.id}`, { name: `${w.name}-v2`, expectedChecksum: w.checksum }).its('status').should('eq', 200);
      n8nApi.req('PATCH', `/rest/workflows/${w.id}`, { name: `${w.name}-obsoleta`, expectedChecksum: w.checksum }).then((r) => {
        const ok = r.status === 400 || r.status === 409;
        registrar({
          id: 'CP-SEG-WF-08', owasp: 'A08', resultado: ok ? 'OK' : 'HALLAZGO', severidad: ok ? 'N/A' : 'Baja',
          detalle: `PATCH con checksum viejo → ${r.status}${ok ? '' : ': la edición vieja sobrescribe la actual (sin licencia no hay detección de conflictos)'}`,
        });
        expect(r.status).to.be.oneOf([400, 409]);
      });
      n8nApi.obtenerWorkflow(w.id).its('name').should('eq', `${w.name}-v2`);
    });
  });

  it('CP-SEG-WF-09 · A01 Broken Access Control · un webhook deja de ejecutar el workflow al despublicarlo', () => {
    const ruta = n8nApi.rutaUnica('vyv-seg');
    cy.nombreUnico('VyV-Seg-WF-hook').then((n) => n8nApi.crearWorkflowActivo(n, [n8nApi.nodoWebhook('GET', ruta)], {})).then((w) => {
      creados.push(w.id);
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
      n8nApi.desactivarWorkflow(w.id).its('status').should('eq', 200);
      cy.request({ url: `/webhook/${n8nApi.rutaUnica('no-registrada')}`, failOnStatusCode: false }).its('status').should('eq', 404);
      // Primera petición justo después de que «deactivate» respondió 200.
      cy.request({ url: `/webhook/${ruta}`, failOnStatusCode: false }).then((r) => {
        const ok = r.status === 404;
        registrar({
          id: 'CP-SEG-WF-09', owasp: 'A01', resultado: ok ? 'OK' : 'HALLAZGO', severidad: ok ? 'N/A' : 'Baja',
          detalle: `Ruta no registrada → 404; webhook despublicado, primera petición → ${r.status}${ok ? '' : ' (todavía ejecuta el workflow; se cierra en ~250 ms)'}`,
        });
        expect(r.status, 'el webhook despublicado no ejecuta el workflow').to.eq(404);
      });
    });
  });

  it('CP-SEG-WF-10 · A10 Mishandling of Exceptional Conditions · un id inexistente responde 404 sin traza', () => {
    n8nApi.req('GET', '/rest/workflows/VyVnoExiste1').then((r) => {
      expect(r.status).to.eq(404);
      sinTraza(r);
      registrar({ id: 'CP-SEG-WF-10', owasp: 'A10', resultado: 'OK', detalle: `404: ${r.body.message}` });
    });
  });

  it('CP-SEG-WF-11 · A10 Mishandling of Exceptional Conditions · un cuerpo JSON malformado responde 400, no 500', () => {
    n8nApi.req('POST', '/rest/workflows', '{"name":', { headers: { 'browser-id': Cypress.env('browserId'), 'content-type': 'application/json' } }).then((r) => {
      registrar({
        id: 'CP-SEG-WF-11', owasp: 'A10', resultado: r.status === 400 ? 'OK' : 'HALLAZGO',
        detalle: `POST /rest/workflows con JSON truncado → ${r.status}`, severidad: r.status >= 500 ? 'Baja' : 'N/A',
      });
      sinTraza(r);
      expect(r.status, 'error del cliente, no del servidor').to.eq(400);
    });
  });
});
