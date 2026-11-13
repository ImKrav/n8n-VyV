/// <reference types="cypress" />
/**
 * CO-02 · Edición de filas – Pruebas de API.
 * Trazabilidad: REQ-017-01..04 · ESC-017 · CP-017-01..08 (el CP-017-08 está en co02-limite-almacenamiento).
 */
import { n8nApi, mensaje } from '../../support/api.js';

describe('CO-02 · Edición de filas (API)', () => {
  let p;
  let t;
  const columnas = [
    { name: 'nombre', type: 'string' },
    { name: 'edad', type: 'number' },
    { name: 'activo', type: 'boolean' },
    { name: 'fecha', type: 'date' },
  ];

  before(() => cy.proyectoPersonal().then((id) => { p = id; }));

  beforeEach(() => {
    cy.loginApi();
    cy.nombreUnico('vyv_filas').then((n) => n8nApi.crearTablaOk(p, n, columnas).then((tabla) => { t = tabla.id; }));
  });

  afterEach(() => n8nApi.borrarTabla(p, t));

  it('CP-017-01 · añade una fila con un valor válido por tipo', () => {
    n8nApi.insertar(p, t, [{ nombre: 'Ana', edad: 25, activo: true, fecha: '2026-11-08T00:00:00.000Z' }])
      .its('status').should('eq', 200);
    n8nApi.filasOk(p, t).then(([fila]) => {
      expect(fila).to.include({ nombre: 'Ana', edad: 25, activo: true });
      expect(new Date(fila.fecha).toISOString()).to.eq('2026-11-08T00:00:00.000Z');
    });
  });

  it('CP-017-02 · rechaza valores incompatibles con el tipo de la columna', () => {
    n8nApi.insertar(p, t, [{ edad: 'abc' }]).then((r) => {
      expect(r.status).to.eq(400);
      expect(mensaje(r)).to.match(/does not match column type 'number'/);
      cy.evidencia(mensaje(r));
    });
    n8nApi.insertar(p, t, [{ activo: 'quizás' }]).its('status').should('eq', 400);
    n8nApi.insertar(p, t, [{ fecha: 'no-es-fecha' }]).its('status').should('eq', 400);
    n8nApi.filasOk(p, t).should('have.length', 0);
  });

  it('CP-017-03 · guarda fechas en formato ISO UTC', () => {
    n8nApi.insertar(p, t, [{ nombre: 'Fecha', fecha: '2026-11-08' }]).its('status').should('eq', 200);
    n8nApi.filasOk(p, t).then(([f]) => expect(f.fecha).to.match(/^2026-11-08T/));
  });

  it('CP-017-04 · admite nulos y el filtro isEmpty los encuentra', () => {
    n8nApi.insertar(p, t, [{ nombre: 'SinEdad', edad: null }, { nombre: 'ConEdad', edad: 9 }]);
    n8nApi.filasOk(p, t, { filter: { type: 'and', filters: [{ columnName: 'edad', condition: 'isEmpty', value: null }] } })
      .then((filas) => expect(filas.map((f) => f.nombre)).to.deep.equal(['SinEdad']));
  });

  [10_000, 100_000].forEach((largo) => {
    it(`CP-017-05 · guarda una celda de ${largo.toLocaleString('es-CO')} caracteres`, () => {
      const texto = 'x'.repeat(largo);
      const inicio = Date.now();
      n8nApi.insertar(p, t, [{ nombre: texto }]).then((r) => {
        expect(r.status).to.eq(200);
        cy.evidencia(`Inserción de ${largo} caracteres en ${Date.now() - inicio} ms`);
      });
      n8nApi.filasOk(p, t).then(([f]) => expect(f.nombre).to.have.length(largo));
    });
  });

  context('Con datos de ejemplo', () => {
    beforeEach(() => {
      n8nApi.insertar(p, t, [
        { nombre: 'Ana', edad: 30 }, { nombre: 'Juan', edad: 12 }, { nombre: 'Mariana', edad: 45 },
      ]);
    });

    it('CP-017-06 · ordena por edad ascendente y descendente', () => {
      n8nApi.filasOk(p, t, { sortBy: 'edad:asc' }).then((f) => expect(f.map((x) => x.edad)).to.deep.equal([12, 30, 45]));
      n8nApi.filasOk(p, t, { sortBy: 'edad:desc' }).then((f) => expect(f.map((x) => x.edad)).to.deep.equal([45, 30, 12]));
    });

    it('CP-017-07 · filtra con gt (valor límite excluido), eq y like', () => {
      const filtro = (columnName, condition, value) => ({ filter: { type: 'and', filters: [{ columnName, condition, value }] } });
      n8nApi.filasOk(p, t, filtro('edad', 'gt', 30)).then((f) => expect(f.map((x) => x.edad)).to.deep.equal([45]));
      n8nApi.filasOk(p, t, filtro('nombre', 'eq', 'Ana')).then((f) => expect(f).to.have.length(1));
      n8nApi.filasOk(p, t, filtro('nombre', 'like', '%an%')).then((f) =>
        expect(f.map((x) => x.nombre).sort()).to.deep.equal(['Juan', 'Mariana']));
    });

    it('Complementaria · elimina filas seleccionadas', () => {
      n8nApi.filasOk(p, t).then((filas) => {
        n8nApi.borrarFilas(p, t, filas.slice(0, 2).map((f) => f.id)).its('status').should('eq', 200);
        n8nApi.filasOk(p, t).should('have.length', 1);
      });
    });
  });
});
