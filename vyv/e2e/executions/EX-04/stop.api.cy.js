/// <reference types="cypress" />
/**
 * EX-04 · Detener ejecuciones (caja negra, API /rest/executions/:id/stop y /stopMany).
 * Trazabilidad: CP-EX-04-02, 04-03, 04-04 y 04-05.
 * Éxito: 04-02, 04-03 · alternativo: 04-04 (solo las seleccionadas), 04-05 (todas)
 * · error: detener una ejecución ya terminada.
 * Hallazgo: detener una ejecución terminada responde 500; lo esperado es un 4xx con un mensaje claro.
 */
import { n8nApi } from '../../support/api.js';

describe('EX-04 · Detener ejecuciones (API)', () => {
  const workflows = [];
  beforeEach(() => cy.loginApi());
  after(() =>
    workflows.forEach((id) => {
      n8nApi.req('POST', '/rest/executions/stopMany', { filter: { workflowId: id, status: ['waiting', 'running'] } });
      n8nApi.desactivarWorkflow(id);
    }),
  );

  /** Publica Webhook → Wait, lo llama y devuelve el workflow y su ejecución en el estado indicado. */
  const enCurso = (nombre, espera, estado) => {
    const ruta = n8nApi.rutaUnica('vyv-ex04');
    return n8nApi
      .crearWorkflowActivo(nombre, [n8nApi.nodoWebhook('GET', ruta, 'onReceived'), espera], n8nApi.cadena('Webhook', 'Wait'))
      .then((wf) => {
        workflows.push(wf.id);
        n8nApi.llamarWebhook('GET', ruta);
        return n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === estado).then(([e]) => ({ wf, e }));
      });
  };
  const estado = (id) => n8nApi.req('GET', `/rest/executions/${id}`).then(n8nApi.ok).its('status');

  it('CP-EX-04-03 · detener una ejecución en un nodo Wait la deja «canceled» y no se reanuda', () => {
    enCurso('VyV detener en espera', n8nApi.nodoEspera(5, 'minutes'), 'waiting').then(({ e }) => {
      expect(e.status).to.eq('waiting');
      n8nApi.req('POST', `/rest/executions/${e.id}/stop`, {}).then(n8nApi.ok).then((r) => {
        cy.evidencia(`Detener ${e.id}: waiting → ${r.status}`);
        expect(r.status).to.eq('canceled');
      });
      cy.wait(2000);
      estado(e.id).should('eq', 'canceled');
    });
  });

  it('CP-EX-04-02 · detener una ejecución de producción en curso la deja «canceled»', () => {
    enCurso('VyV detener en curso', n8nApi.nodoEspera(30), 'running').then(({ e }) => {
      n8nApi.req('POST', `/rest/executions/${e.id}/stop`, {}).then(n8nApi.ok).then((r) => {
        cy.evidencia(`Detener ${e.id}: running → ${r.status}`);
        expect(r.status).to.eq('canceled');
      });
      estado(e.id).should('eq', 'canceled');
    });
  });

  it('CP-EX-04-04 · (alternativo) detener en bloque solo afecta a las ejecuciones seleccionadas', () => {
    enCurso('VyV detener seleccionadas A', n8nApi.nodoEspera(5, 'minutes'), 'waiting').then(({ wf: a, e: ea }) =>
      enCurso('VyV detener seleccionadas B', n8nApi.nodoEspera(5, 'minutes'), 'waiting').then(({ e: eb }) => {
        n8nApi.req('POST', '/rest/executions/stopMany', { filter: { workflowId: a.id, status: ['waiting'] } }).then(n8nApi.ok).then((r) => {
          expect(r.stopped).to.eq(1);
        });
        estado(ea.id).should('eq', 'canceled');
        estado(eb.id).then((s) => {
          cy.evidencia(`Detener solo A: ${ea.id} canceled · ${eb.id} ${s}`);
          expect(s, 'la no seleccionada sigue en espera').to.eq('waiting');
        });
      }),
    );
  });

  it('CP-EX-04-05 · (alternativo) «detener todas» cancela todas las ejecuciones en curso', () => {
    enCurso('VyV detener todas 1', n8nApi.nodoEspera(5, 'minutes'), 'waiting').then(({ e: e1 }) =>
      enCurso('VyV detener todas 2', n8nApi.nodoEspera(5, 'minutes'), 'waiting').then(({ e: e2 }) => {
        n8nApi.req('POST', '/rest/executions/stopMany', { filter: { workflowId: 'all', status: ['waiting', 'running', 'new'] } }).then(n8nApi.ok).then((r) => {
          cy.evidencia(`Detener todas: ${r.stopped} ejecuciones detenidas`);
          expect(r.stopped).to.be.at.least(2);
        });
        [e1, e2].forEach((e) => estado(e.id).should('eq', 'canceled'));
        n8nApi.req('GET', `/rest/executions?filter=${encodeURIComponent(JSON.stringify({ status: ['waiting', 'running'] }))}`)
          .then(n8nApi.ok).its('results').should('have.length', 0);
      }),
    );
  });

  it('CP-EX-04 · (error, hallazgo) detener una ejecución ya terminada no la modifica (responde 500)', () => {
    const ruta = n8nApi.rutaUnica('vyv-ex04-fin');
    n8nApi.crearWorkflowActivo('VyV detener terminada', [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoCampos({ ok: true })], n8nApi.cadena('Webhook', 'Edit Fields')).then((wf) => {
      workflows.push(wf.id);
      n8nApi.llamarWebhook('GET', ruta);
      n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'success').then(([e]) => {
        n8nApi.req('POST', `/rest/executions/${e.id}/stop`, {}).then((r) => {
          cy.evidencia(`Detener la ejecución terminada ${e.id} → HTTP ${r.status}: ${r.body.message}`);
          expect(r.status, 'se rechaza').to.be.at.least(400);
        });
        estado(e.id).should('eq', 'success');
      });
    });
  });
});
