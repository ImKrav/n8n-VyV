/// <reference types="cypress" />
/**
 * CO-04 · Crear y navegar carpetas – Pruebas de API.
 * PRECONDICIÓN: licencia community registrada (habilita "Folders"); si no, la API responde 403.
 * Trazabilidad: REQ-019-01..04 · ESC-019 · CP-019-01..05, 07 (06 es de UI; 08 unitaria).
 */
import { n8nApi, mensaje } from '../../support/api.js';

describe('CO-04 · Carpetas: crear y navegar (API)', () => {
  let p;
  const raiz = [];
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  beforeEach(() => cy.loginApi());
  after(() => raiz.forEach((id) => n8nApi.borrarCarpeta(p, id)));

  const crear = (nombre, padre) =>
    n8nApi.crearCarpeta(p, nombre, padre).then((r) => {
      if (r.status === 200 && !padre) raiz.push(r.body.data.id);
      return r;
    });

  it('Precondición · la función Folders está habilitada por licencia', () => {
    cy.nombreUnico('VyV licencia').then((n) => crear(n).then((r) => {
      expect(r.status, 'Si es 403: registra la Community Edition (Settings → Usage and plan)').to.eq(200);
    }));
  });

  it('CP-019-01 · crea una carpeta en la raíz del proyecto', () => {
    cy.nombreUnico('VyV Carpeta A').then((n) => crear(n).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.data).to.include({ name: n });
      expect(r.body.data.parentFolder ?? null).to.eq(null);
    }));
  });

  it('CP-019-02 · rechaza las 4 clases de nombres inválidos con su mensaje', () => {
    const casos = [
      ['   ', /cannot be empty/],
      ['a/b', /invalid characters/],
      ['x*y', /invalid characters/],
      ['...', /dots only/],
      ['.oculta', /start with a dot/],
    ];
    casos.forEach(([nombre, msg]) =>
      crear(nombre).then((r) => {
        expect(r.status, `nombre "${nombre}"`).to.eq(400);
        expect(mensaje(r)).to.match(msg);
      }));
  });

  it('Complementaria · valores límite de longitud (128 acepta / 129 rechaza)', () => {
    const s = Date.now().toString(36);
    crear((s + 'f'.repeat(200)).slice(0, 128)).its('status').should('eq', 200);
    crear((s + 'f'.repeat(200)).slice(0, 129)).then((r) => {
      expect(r.status).to.eq(400);
      expect(mensaje(r)).to.match(/longer than 128/);
    });
  });

  it('CP-019-03 · renombra una carpeta', () => {
    cy.nombreUnico('VyV Renombrar').then((n) => crear(n).then((r) => {
      const id = r.body.data.id;
      n8nApi.actualizarCarpeta(p, id, { name: `${n} 1` }).its('status').should('eq', 200);
      n8nApi.listarCarpetas(p).then((l) => {
        const lista = l.data ?? l;
        expect(lista.find((c) => c.id === id)).to.have.property('name', `${n} 1`);
      });
    }));
  });

  it('CP-019-04 · anida 3 niveles y el árbol muestra la ruta A → B → C', () => {
    cy.nombreUnico('VyV A').then((a) => crear(a).then((ra) => {
      crear('B', ra.body.data.id).then((rb) => {
        crear('C', rb.body.data.id).then((rc) => {
          n8nApi.arbol(p, rc.body.data.id).then((arbol) => {
            const nombres = []; let nodo = arbol[0];
            while (nodo) { nombres.push(nodo.name); [nodo] = nodo.children ?? []; }
            expect(nombres).to.deep.equal([a, 'B', 'C']);
          });
        });
      });
    }));
  });

  it('CP-019-06 · el contenido de la carpeta cuenta workflows y subcarpetas', () => {
    cy.nombreUnico('VyV Conteo').then((n) => crear(n).then((r) => {
      const id = r.body.data.id;
      n8nApi.crearWorkflow('WF VyV 1', id);
      n8nApi.crearWorkflow('WF VyV 2', id);
      crear('Sub', id);
      n8nApi.contenido(p, id).should('deep.include', { totalWorkflows: 2, totalSubFolders: 1 });
    }));
  });
});
