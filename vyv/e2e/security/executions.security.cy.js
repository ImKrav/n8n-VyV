/// <reference types="cypress" />
/**
 * Seguridad · módulo 2 · Ejecuciones (EX-01 a EX-05) · OWASP Top 10:2025 · RNF-02 del plan.
 * Cada prueba afirma el comportamiento seguro esperado: si n8n no lo cumple, la prueba falla
 * y el hallazgo queda en results/security/executions.json (ver vyv/security/README.md).
 * Datos: un workflow con Webhook → Wait (deja una ejecución en espera) y otro con Webhook → HTTP Request
 * que usa una credencial y falla (para buscar el secreto en el detalle del error).
 */
import { n8nApi } from '../support/api.js';
import { crearMiembro, comoMiembro, borrarMiembro, sinSesion, registrar, guardarHallazgos, sinTraza } from './soporte.js';

const SECRETO = `vyv-seg-ex-${Date.now()}`;
const workflows = [];
const json = (r) => JSON.stringify(r.body ?? '');

describe('Seguridad · Ejecuciones (OWASP Top 10:2025)', () => {
  let miembro;
  let enEspera; // ejecución en estado waiting del propietario
  let wfEspera;
  let terminada; // ejecución terminada (error) del propietario
  let cred;

  before(() => {
    crearMiembro().then((m) => { miembro = m; });
    // Webhook → Wait de 10 min: la ejecución queda en espera.
    const rutaEspera = n8nApi.rutaUnica('vyv-seg-ex');
    const nodosEspera = [n8nApi.nodoWebhook('GET', rutaEspera, 'onReceived'), n8nApi.nodoEspera(10, 'minutes')];
    n8nApi.crearWorkflowActivo('VyV-Seg-EX-espera', nodosEspera, n8nApi.cadena('Webhook', 'Wait')).then((w) => {
      wfEspera = w; workflows.push(w.id);
      n8nApi.llamarWebhook('GET', rutaEspera);
      n8nApi.esperarEjecuciones(w.id, 1, (e) => e.status === 'waiting').then(([e]) => { enEspera = e; });
    });
    // Webhook → HTTP Request con credencial Header Auth hacia un puerto cerrado: la ejecución falla.
    cy.nombreUnico('VyV-Seg-EX-cred').then((n) => n8nApi.crearCredencialHeader(n, 'X-Api-Key', SECRETO)).then((c) => {
      cred = c;
      const ruta = n8nApi.rutaUnica('vyv-seg-ex');
      const nodos = [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoHttpCredencial('http://127.0.0.1:9/vyv', c)];
      n8nApi.crearWorkflowActivo('VyV-Seg-EX-error', nodos, n8nApi.cadena('Webhook', 'HTTP Request')).then((w) => {
        workflows.push(w.id);
        n8nApi.llamarWebhook('GET', ruta);
        n8nApi.esperarEjecuciones(w.id, 1, (e) => e.status === 'error').then(([e]) => { terminada = e; });
      });
    });
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    cy.loginApi();
    workflows.forEach((id) => {
      n8nApi.req('POST', '/rest/executions/stopMany', { filter: { workflowId: id, status: ['waiting', 'running'] } });
      n8nApi.req('POST', '/rest/executions/delete', { deleteBefore: new Date(Date.now() + 60000).toISOString(), filters: { workflowId: id } });
      n8nApi.desactivarWorkflow(id).then(() => n8nApi.req('POST', `/rest/workflows/${id}/archive`)).then(() => n8nApi.req('DELETE', `/rest/workflows/${id}`));
    });
    if (cred) n8nApi.borrarCredencial(cred.id);
    borrarMiembro(miembro);
    guardarHallazgos('executions');
  });

  it('CP-SEG-EX-01 · A01 Broken Access Control · sin sesión, la API de ejecuciones responde 401', () => {
    const rutas = [
      ['GET', '/rest/executions'], ['GET', `/rest/executions/${terminada.id}`], ['POST', `/rest/executions/${enEspera.id}/stop`],
      ['POST', `/rest/executions/${terminada.id}/retry`], ['POST', '/rest/executions/delete'],
    ];
    rutas.forEach(([m, url]) => sinSesion(m, url, m === 'GET' ? undefined : {}).then((r) => expect(r.status, `${m} ${url}`).to.eq(401)));
    cy.then(() => registrar({ id: 'CP-SEG-EX-01', owasp: 'A01', resultado: 'OK', detalle: `${rutas.length} rutas responden 401 sin sesión` }));
  });

  it('CP-SEG-EX-02 · A01 Broken Access Control · el miembro no ve las ejecuciones del propietario en su lista ni filtrando por workflowId', () => {
    comoMiembro(miembro);
    n8nApi.req('GET', '/rest/executions').then((r) => {
      expect(r.status).to.eq(200);
      const ids = r.body.data.results.map((e) => e.id);
      expect(ids).not.to.include(enEspera.id);
      expect(ids).not.to.include(terminada.id);
    });
    n8nApi.req('GET', `/rest/executions?filter=${encodeURIComponent(JSON.stringify({ workflowId: wfEspera.id }))}`).then((r) => {
      const n = r.status === 200 ? r.body.data.results.length : 0;
      registrar({ id: 'CP-SEG-EX-02', owasp: 'A01', resultado: n ? 'HALLAZGO' : 'OK', detalle: `filtro workflowId ajeno → ${r.status}, ${n} resultados` });
      expect(n).to.eq(0);
    });
  });

  it('CP-SEG-EX-03 · A01 Broken Access Control · el miembro no obtiene el detalle de una ejecución ajena', () => {
    comoMiembro(miembro);
    n8nApi.req('GET', `/rest/executions/${terminada.id}`).then((r) => {
      const fuga = /workflowData|"data"\s*:\s*"/.test(json(r)) || json(r).includes(SECRETO);
      registrar({
        id: 'CP-SEG-EX-03', owasp: 'A01', resultado: fuga ? 'HALLAZGO' : 'OK',
        detalle: `GET /rest/executions/:id ajena → ${r.status} ${json(r).slice(0, 60)} (sin datos de la ejecución: ${!fuga})`,
      });
      expect(fuga, 'la respuesta no incluye datos de la ejecución').to.eq(false);
    });
  });

  it('CP-SEG-EX-04 · A01 Broken Access Control · el miembro no puede detener, reintentar ni eliminar ejecuciones ajenas', () => {
    comoMiembro(miembro);
    const estados = [];
    n8nApi.req('POST', `/rest/executions/${enEspera.id}/stop`).then((r) => { estados.push(`stop → ${r.status}`); expect(r.status).to.be.within(400, 499); });
    n8nApi.req('POST', `/rest/executions/${terminada.id}/retry`, { loadWorkflow: false }).then((r) => { estados.push(`retry → ${r.status}`); expect(r.status).to.be.within(400, 499); });
    n8nApi.req('POST', '/rest/executions/delete', { ids: [enEspera.id, terminada.id] }).then((r) => estados.push(`delete → ${r.status}`));
    // El propietario comprueba que las dos ejecuciones siguen ahí y con su estado.
    cy.loginApi();
    n8nApi.ejecuciones(wfEspera.id).then((lista) => {
      const e = lista.find((x) => x.id === enEspera.id);
      registrar({ id: 'CP-SEG-EX-04', owasp: 'A01', resultado: e?.status === 'waiting' ? 'OK' : 'HALLAZGO', detalle: `${estados.join('; ')}; estado final: ${e?.status ?? 'eliminada'}` });
      expect(e?.status, 'la ejecución en espera sigue en espera').to.eq('waiting');
    });
    n8nApi.detalleEjecucion(terminada.id).its('id').should('eq', terminada.id);
  });

  it('CP-SEG-EX-05 · A04 Cryptographic Failures · el detalle de una ejecución fallida no contiene el secreto de la credencial', () => {
    n8nApi.req('GET', `/rest/executions/${terminada.id}`).then((r) => {
      expect(r.status).to.eq(200);
      const texto = json(r);
      expect(texto, 'el detalle trae el error del nodo').to.match(/ECONNREFUSED|connect|refused/i);
      registrar({ id: 'CP-SEG-EX-05', owasp: 'A04', resultado: texto.includes(SECRETO) ? 'HALLAZGO' : 'OK', detalle: `Detalle de ${texto.length} caracteres; contiene el secreto: ${texto.includes(SECRETO)}` });
      expect(texto, 'sin el valor de X-Api-Key').not.to.contain(SECRETO);
    });
  });

  it('CP-SEG-EX-06 · A05 Injection · filtros malformados o con SQL responden 4xx y no amplían resultados', () => {
    const casos = [
      ['filter={mal', 'JSON roto'], [`filter=${encodeURIComponent(JSON.stringify({ status: ["' OR '1'='1"] }))}`, 'estado con SQL'],
      [`filter=${encodeURIComponent(JSON.stringify({ workflowId: "' OR '1'='1" }))}`, 'workflowId con SQL'], ['lastId=1%20OR%201=1', 'lastId con SQL'],
    ];
    const detalle = [];
    casos.forEach(([q, nombre]) => n8nApi.req('GET', `/rest/executions?${q}`).then((r) => {
      detalle.push(`${nombre} → ${r.status}`);
      expect(r.status, nombre).to.be.oneOf([200, 400]);
      if (r.status === 200) expect(r.body.data.results, `${nombre}: sin resultados`).to.have.length(0);
    }));
    cy.then(() => registrar({ id: 'CP-SEG-EX-06', owasp: 'A05', resultado: 'OK', detalle: detalle.join('; ') }));
  });

  it('CP-SEG-EX-07 · A06 Insecure Design · la lista no permite pedir más de 100 ejecuciones por página', () => {
    n8nApi.req('GET', '/rest/executions?limit=100000').then((r) => {
      registrar({ id: 'CP-SEG-EX-07', owasp: 'A06', resultado: r.status === 400 ? 'OK' : 'HALLAZGO', detalle: `limit=100000 → ${r.status}: ${r.body?.message}` });
      expect(r.status).to.eq(400);
    });
  });

  it('CP-SEG-EX-08 · A10 Mishandling of Exceptional Conditions · detener una ejecución terminada responde 4xx, no 500 (issue #9)', () => {
    n8nApi.req('POST', `/rest/executions/${terminada.id}/stop`).then((r) => {
      registrar({
        id: 'CP-SEG-EX-08', owasp: 'A10', resultado: r.status < 500 ? 'OK' : 'HALLAZGO', severidad: r.status < 500 ? 'N/A' : 'Baja',
        detalle: `stop de una terminada → ${r.status}: ${String(r.body?.message).slice(0, 80)}`,
      });
      sinTraza(r);
      expect(r.status).to.be.within(400, 499);
    });
  });

  it('CP-SEG-EX-09 · A10 Mishandling of Exceptional Conditions · una ejecución inexistente responde 404 (issue #10)', () => {
    n8nApi.req('GET', '/rest/executions/999999999').then((r) => {
      registrar({
        id: 'CP-SEG-EX-09', owasp: 'A10', resultado: r.status === 404 ? 'OK' : 'HALLAZGO', severidad: r.status === 404 ? 'N/A' : 'Baja',
        detalle: `GET de una inexistente → ${r.status} ${json(r).slice(0, 40)}`,
      });
      expect(r.status).to.eq(404);
    });
  });
});
