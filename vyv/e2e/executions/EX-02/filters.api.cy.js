/// <reference types="cypress" />
/**
 * EX-02 · Filtrar ejecuciones (caja negra, API GET /rest/executions?filter=...).
 * Trazabilidad: CP-EX-02-01, 02-02, 02-03, 02-04 y 02-05.
 * Éxito: 02-01, 02-02, 02-05 · alternativo: 02-03 (rangos límite), 02-04 (filtros combinados)
 * · error: filtro mal formado y límite fuera de rango (400).
 */
import { n8nApi } from '../../support/api.js';

const listar = (filter, limit = 100) =>
  n8nApi.req('GET', `/rest/executions?filter=${encodeURIComponent(JSON.stringify(filter))}&limit=${limit}`).then(n8nApi.ok).then((d) => d.results);
const ids = (lista) => lista.map((e) => e.id);

describe('EX-02 · Filtros de la lista de ejecuciones (API)', () => {
  const wf = {};
  const ejec = {};
  before(() => {
    cy.loginApi();
    // Datos propios: una ejecución exitosa, una fallida y una en espera.
    const casos = { ok: [n8nApi.nodoCampos({ ok: true })], falla: [n8nApi.nodoFalla('fallo VyV')], espera: [n8nApi.nodoEspera(5, 'minutes')] };
    Object.entries(casos).forEach(([clave, nodos]) => {
      const ruta = n8nApi.rutaUnica(`vyv-ex02-${clave}`);
      const nodes = [n8nApi.nodoWebhook('GET', ruta, clave === 'espera' ? 'onReceived' : 'lastNode'), ...nodos];
      n8nApi.crearWorkflowActivo(`VyV filtros ${clave}`, nodes, n8nApi.cadena(...nodes.map((n) => n.name))).then((w) => {
        wf[clave] = w.id;
        n8nApi.llamarWebhook('GET', ruta);
        const estado = { ok: 'success', falla: 'error', espera: 'waiting' }[clave];
        n8nApi.esperarEjecuciones(w.id, 1, (e) => e.status === estado).then(([e]) => { ejec[clave] = e; });
      });
    });
  });
  beforeEach(() => cy.loginApi());
  after(() =>
    Object.values(wf).forEach((id) => {
      n8nApi.req('POST', '/rest/executions/stopMany', { filter: { workflowId: id, status: ['waiting'] } });
      n8nApi.desactivarWorkflow(id);
    }),
  );

  it('CP-EX-02-01 · cada valor del filtro de estado muestra solo ejecuciones con ese estado', () => {
    const esperado = { success: 'ok', error: 'falla', waiting: 'espera' };
    ['success', 'error', 'waiting', 'canceled', 'running'].forEach((estado) =>
      listar({ status: [estado] }).then((lista) => {
        cy.evidencia(`status=${estado}: ${lista.length} ejecuciones`);
        expect(lista.every((e) => e.status === estado), `solo «${estado}»`).to.eq(true);
        if (esperado[estado]) expect(ids(lista), `incluye la ejecución «${estado}» creada`).to.include(ejec[esperado[estado]].id);
      }),
    );
  });

  it('CP-EX-02-02 · el filtro por workflow muestra solo ejecuciones de ese workflow', () => {
    listar({ workflowId: wf.ok }).then((lista) => {
      cy.evidencia(`workflowId=${wf.ok}: ${lista.length} ejecuciones`);
      expect(lista).to.have.length(1);
      expect(lista.every((e) => e.workflowId === wf.ok)).to.eq(true);
    });
  });

  it('CP-EX-02-03 · (alternativo) rangos de fechas: el mismo día incluye, el futuro y el rango invertido devuelven vacío', () => {
    const inicio = ejec.ok.startedAt;
    const dia = inicio.slice(0, 10);
    listar({ workflowId: wf.ok, startedAfter: `${dia}T00:00:00.000Z`, startedBefore: `${dia}T23:59:59.999Z` }).then((lista) => {
      cy.evidencia(`Día ${dia} (UTC): ${lista.length} ejecuciones`);
      expect(ids(lista)).to.include(ejec.ok.id);
    });
    listar({ workflowId: wf.ok, startedAfter: '2099-01-01T00:00:00.000Z' }).should('have.length', 0);
    listar({ workflowId: wf.ok, startedAfter: `${dia}T23:59:59.999Z`, startedBefore: `${dia}T00:00:00.000Z` }).then((lista) => {
      cy.evidencia(`Rango invertido: ${lista.length} ejecuciones`);
      expect(lista, 'rango invertido').to.have.length(0);
    });
  });

  it('CP-EX-02-04 · (alternativo) estado + workflow + fecha a la vez solo devuelven lo que cumple todo', () => {
    const desde = new Date(Date.parse(ejec.falla.startedAt) - 60000).toISOString();
    listar({ workflowId: wf.falla, status: ['error'], startedAfter: desde }).then((lista) => {
      cy.evidencia(`error + workflow + desde ${desde}: ${ids(lista).join(', ')}`);
      expect(ids(lista)).to.deep.eq([ejec.falla.id]);
    });
    listar({ workflowId: wf.falla, status: ['success'], startedAfter: desde }).should('have.length', 0);
  });

  it('CP-EX-02-05 · sin filtros la lista vuelve a mostrar todas las ejecuciones', () => {
    listar({}).then((todas) => {
      cy.evidencia(`Sin filtros: ${todas.length} ejecuciones (límite 100)`);
      expect(ids(todas)).to.include.members(Object.values(ejec).map((e) => e.id));
      expect(new Set(todas.map((e) => e.status)).size, 'mezcla de estados').to.be.greaterThan(1);
    });
  });

  it('CP-EX-02 · (error) un filtro mal formado o un límite fuera de rango responden 400', () => {
    n8nApi.req('GET', '/rest/executions?filter=%7Bno-json').then((r) => {
      cy.evidencia(`Filtro mal formado → HTTP ${r.status}: ${r.body.message}`);
      expect(r.status).to.eq(400);
    });
    n8nApi.req('GET', '/rest/executions?limit=500').then((r) => {
      cy.evidencia(`limit=500 → HTTP ${r.status}: ${r.body.message}`);
      expect(r.status).to.eq(400);
      expect(r.body.message).to.match(/between 1 and 100/);
    });
  });
});
