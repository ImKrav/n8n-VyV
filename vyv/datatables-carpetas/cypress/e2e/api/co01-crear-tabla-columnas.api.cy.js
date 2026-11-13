/// <reference types="cypress" />
/**
 * CO-01 · Crear data table y columnas – Pruebas de API (caja negra).
 * Técnicas: particiones de equivalencia, valores límite y valores reservados.
 * Trazabilidad: REQ-016-01..04 · ESC-016 · CP-016-xx (ver RTM).
 */
import { n8nApi, mensaje } from '../../support/api.js';

describe('CO-01 · Data tables y columnas (API)', () => {
  let p;
  const creadas = [];

  before(() => {
    cy.proyectoPersonal().then((id) => { p = id; });
  });

  beforeEach(() => cy.loginApi());

  after(() => {
    // Limpieza: cada ejecución deja la instancia como la encontró (FIRST: Repeatable).
    creadas.forEach((id) => n8nApi.borrarTabla(p, id));
  });

  const crear = (nombre, columnas = []) =>
    n8nApi.crearTabla(p, nombre, columnas).then((r) => {
      if (r.status === 200) creadas.push(r.body.data.id);
      return r;
    });

  it('CP-016-01 · crea una data table con nombre válido', () => {
    cy.nombreUnico('vyv_clientes').then((nombre) => {
      crear(nombre).then((r) => {
        expect(r.status).to.eq(200);
        expect(r.body.data).to.include({ name: nombre }).and.to.have.property('id');
        cy.evidencia(`Tabla creada con id ${r.body.data.id}`);
      });
    });
  });

  it('CP-016-02 · rechaza nombre vacío o solo espacios', () => {
    ['', '   '].forEach((nombre) => {
      crear(nombre).its('status').should('eq', 400);
    });
  });

  it('CP-016-03 · rechaza nombre duplicado en el mismo proyecto (409)', () => {
    cy.nombreUnico('vyv_dup').then((nombre) => {
      crear(nombre).its('status').should('eq', 200);
      crear(nombre).then((r) => {
        expect(r.status).to.eq(409);
        expect(mensaje(r)).to.match(/already exists/i);
        cy.evidencia(mensaje(r));
      });
    });
  });

  it('Complementaria · valores límite de la longitud del nombre (1 / 128 / 129)', () => {
    const sufijo = Date.now().toString(36);
    const base = (n) => (sufijo + 't'.repeat(200)).slice(0, n);
    crear(`a${sufijo}`.slice(0, 1)).its('status').should('be.oneOf', [200, 409]); // 1 carácter (puede existir de otra corrida)
    crear(base(128)).its('status').should('eq', 200);
    crear(base(129)).its('status').should('eq', 400);
  });

  context('Columnas', () => {
    let tabla;
    beforeEach(() => {
      cy.nombreUnico('vyv_cols').then((nombre) => crear(nombre).then((r) => { tabla = r.body.data.id; }));
    });

    it('CP-016-04 · añade columnas de los 4 tipos', () => {
      const tipos = { nombre: 'string', edad: 'number', activo: 'boolean', fecha: 'date' };
      Object.entries(tipos).forEach(([n, t]) => n8nApi.crearColumna(p, tabla, n, t).its('status').should('eq', 200));
      n8nApi.columnas(p, tabla).then((cols) => {
        const mapa = Object.fromEntries(cols.map((c) => [c.name, c.type]));
        expect(mapa).to.deep.include(tipos);
      });
    });

    it('CP-016-05 · rechaza nombres de columna inválidos y acepta los válidos (límite 63/64)', () => {
      ['1edad', 'mi-col', 'con espacio', 'c'.repeat(64)].forEach((n) =>
        n8nApi.crearColumna(p, tabla, n, 'string').its('status').should('eq', 400));
      ['edad_1', 'c'.repeat(63)].forEach((n) =>
        n8nApi.crearColumna(p, tabla, n, 'string').its('status').should('eq', 200));
    });

    it('Complementaria · rechaza columna duplicada (409)', () => {
      n8nApi.crearColumna(p, tabla, 'email', 'string').its('status').should('eq', 200);
      n8nApi.crearColumna(p, tabla, 'email', 'number').then((r) => {
        expect(r.status).to.eq(409);
        expect(mensaje(r)).to.match(/already exists/i);
      });
    });

    it('Complementaria · rechaza nombres reservados del sistema', () => {
      ['id', 'createdAt', 'updatedAt'].forEach((n) =>
        n8nApi.crearColumna(p, tabla, n, 'string').its('status').should('be.oneOf', [400, 409]));
    });

    it('CP-016-06 · renombra una columna y conserva sus datos', () => {
      n8nApi.crearColumna(p, tabla, 'nombre', 'string').then((r) => {
        const col = r.body.data;
        n8nApi.insertar(p, tabla, [{ nombre: 'Ana' }]).its('status').should('eq', 200);
        n8nApi.renombrarColumna(p, tabla, col.id, 'nombre_completo').its('status').should('eq', 200);
        n8nApi.filasOk(p, tabla).then((filas) => {
          expect(filas[0]).to.have.property('nombre_completo', 'Ana');
          expect(filas[0]).not.to.have.property('nombre');
        });
      });
    });

    it('CP-016-07 · elimina una columna sin afectar las demás', () => {
      n8nApi.crearColumna(p, tabla, 'nombre', 'string');
      n8nApi.crearColumna(p, tabla, 'activo', 'boolean').then((r) => {
        n8nApi.insertar(p, tabla, [{ nombre: 'Luis', activo: true }]);
        n8nApi.borrarColumna(p, tabla, r.body.data.id).its('status').should('eq', 200);
        n8nApi.columnas(p, tabla).then((cols) => expect(cols.map((c) => c.name)).to.deep.equal(['nombre']));
        n8nApi.filasOk(p, tabla).then((f) => expect(f[0]).to.have.property('nombre', 'Luis'));
      });
    });
  });
});
