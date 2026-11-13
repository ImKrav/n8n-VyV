/// <reference types="cypress" />
/**
 * CO-03 · Importar y exportar CSV – Pruebas de API.
 * Trazabilidad: REQ-018-01..04 / RNF-018 · ESC-018 · CP-018-01..08 (CP-018-07 tiene además prueba unitaria TDD en packages/modules/data-table/backend/src/__tests__).
 */
import { n8nApi, mensaje } from '../../support/api.js';

/** Parser CSV mínimo para comparar contenidos (maneja comillas dobles RFC 4180). */
const parseCsv = (texto) =>
  texto.trim().split(/\r?\n/).map((linea) => {
    const celdas = []; let actual = ''; let comillas = false;
    for (let i = 0; i < linea.length; i += 1) {
      const c = linea[i];
      if (comillas && c === '"' && linea[i + 1] === '"') { actual += '"'; i += 1; }
      else if (c === '"') comillas = !comillas;
      else if (c === ',' && !comillas) { celdas.push(actual); actual = ''; }
      else actual += c;
    }
    celdas.push(actual);
    return celdas;
  });

describe('CO-03 · Importar y exportar CSV (API)', () => {
  let p;
  const creadas = [];
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  beforeEach(() => cy.loginApi());
  after(() => creadas.forEach((id) => n8nApi.borrarTabla(p, id)));

  /** Sube el CSV y crea una tabla nueva con las columnas inferidas. */
  const crearDesdeCsv = (fixture) =>
    n8nApi.subirArchivo(`csv/${fixture}`, fixture).then((up) => {
      expect(up.status).to.eq(200);
      const meta = up.body.data ?? up.body;
      return cy.nombreUnico('vyv_csv').then((nombre) =>
        n8nApi.crearTablaOk(p, nombre, meta.columns.map((c) => ({ name: c.name, type: c.type, csvColumnName: c.name }))
        ).then((t) => {
          creadas.push(t.id);
          return { t, meta };
        }),
      );
    });

  it('CP-018-01 · importa un CSV válido e infiere los tipos', () => {
    n8nApi.subirArchivo('csv/valido.csv', 'valido.csv').then((up) => {
      expect(up.status).to.eq(200);
      const meta = up.body.data ?? up.body;
      expect(meta.rowCount).to.eq(5);
      expect(Object.fromEntries(meta.columns.map((c) => [c.name, c.type]))).to.deep.equal({
        nombre: 'string', edad: 'number', activo: 'boolean', fecha: 'date',
      });
      cy.evidencia(`Tipos inferidos: ${JSON.stringify(meta.columns.map((c) => `${c.name}:${c.type}`))}`);
      // Se crea la tabla con el fileId para que n8n inserte las filas del archivo.
      cy.nombreUnico('vyv_csv').then((nombre) => {
        n8nApi.req('POST', n8nApi.dt(p), {
          name: nombre, fileId: meta.id, hasHeaders: true,
          columns: meta.columns.map((c) => ({ name: c.name, type: c.type, csvColumnName: c.name })),
        }).then((r) => {
          expect(r.status).to.eq(200);
          creadas.push(r.body.data.id);
          n8nApi.filasOk(p, r.body.data.id).should('have.length', 5);
        });
      });
    });
  });

  it('CP-018-02 · rechaza archivos que no son .csv (RNF-018)', () => {
    n8nApi.subirArchivo('csv/no_es_csv.txt', 'no_es_csv.txt').then((r) => {
      expect(r.status).to.eq(400);
      expect(JSON.stringify(r.body)).to.match(/Only the following file types are allowed: \.csv/);
    });
  });

  it('CP-018-03 · rechaza un CSV malformado sin crear tablas', () => {
    n8nApi.listarTablas(p).then((antes) => {
      const total = antes.count ?? antes.data?.length;
      n8nApi.subirArchivo('csv/malformado.csv', 'malformado.csv').then((r) => {
        expect(r.status, 'el archivo malformado no debe aceptarse').to.be.within(400, 599);
        cy.evidencia(`Respuesta ${r.status}: ${JSON.stringify(r.body).slice(0, 160)}`);
      });
      n8nApi.listarTablas(p).then((despues) => expect(despues.count ?? despues.data?.length).to.eq(total));
    });
  });

  it('CP-018-04 · no importa filas parciales si hay tipos incompatibles', () => {
    cy.nombreUnico('vyv_tipos').then((nombre) => {
      n8nApi.crearTablaOk(p, nombre, [{ name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' }]).then((t) => {
        creadas.push(t.id);
        n8nApi.subirArchivo('csv/tipos_incompatibles.csv', 'tipos_incompatibles.csv').then((up) => {
          n8nApi.importarCsv(p, t.id, (up.body.data ?? up.body).id).then((r) => {
            expect(r.status).to.eq(400);
            expect(mensaje(r)).to.match(/does not match column type/);
            cy.evidencia(mensaje(r));
          });
          n8nApi.filasOk(p, t.id).should('have.length', 0);
        });
      });
    });
  });

  it('CP-018-05 · rechaza columnas que no existen en la tabla', () => {
    cy.nombreUnico('vyv_desc').then((nombre) => {
      n8nApi.crearTablaOk(p, nombre, [{ name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' }]).then((t) => {
        creadas.push(t.id);
        n8nApi.subirArchivo('csv/columna_desconocida.csv', 'columna_desconocida.csv').then((up) => {
          n8nApi.importarCsv(p, t.id, (up.body.data ?? up.body).id).then((r) => {
            expect(r.status).to.eq(400);
            expect(mensaje(r)).to.contain('CSV contains columns not found in the data table: telefono');
          });
        });
      });
    });
  });

  it('Complementaria · ignora las columnas de sistema del CSV', () => {
    cy.nombreUnico('vyv_sis').then((nombre) => {
      n8nApi.crearTablaOk(p, nombre, [{ name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' }]).then((t) => {
        creadas.push(t.id);
        n8nApi.subirArchivo('csv/con_columnas_sistema.csv', 'con_columnas_sistema.csv').then((up) => {
          n8nApi.importarCsv(p, t.id, (up.body.data ?? up.body).id).its('status').should('eq', 200);
          n8nApi.filasOk(p, t.id).then(([f]) => {
            expect(f).to.include({ nombre: 'Pedro', edad: 50 });
            expect(f.id, 'el id lo asigna n8n, no el CSV').not.to.eq(999);
          });
        });
      });
    });
  });

  it('CP-018-06 · el CSV descargado coincide con el original (round-trip)', () => {
    n8nApi.subirArchivo('csv/valido.csv', 'valido.csv').then((up) => {
      const meta = up.body.data ?? up.body;
      cy.nombreUnico('vyv_rt').then((nombre) => {
        n8nApi.req('POST', n8nApi.dt(p), {
          name: nombre, fileId: meta.id, hasHeaders: true,
          columns: meta.columns.map((c) => ({ name: c.name, type: c.type, csvColumnName: c.name })),
        }).then((r) => {
          const t = r.body.data; creadas.push(t.id);
          n8nApi.descargarCsv(p, t.id, false).then((d) => {
            expect(d.status).to.eq(200);
            const descargado = parseCsv((d.body.data ?? d.body).csvContent);
            cy.fixture('csv/valido.csv').then((orig) => {
              const original = parseCsv(orig);
              expect(descargado[0]).to.deep.equal(original[0]); // encabezado
              // Las fechas vuelven en ISO (2026-01-15T00:00:00.000Z): se comparan por su parte de fecha.
              const norm = (fila) => fila.map((v) => (/^\d{4}-\d{2}-\d{2}T/.test(v) ? v.slice(0, 10) : v));
              expect(descargado.slice(1).map(norm)).to.deep.equal(original.slice(1));
              cy.evidencia(`Round-trip OK: ${descargado.length - 1} filas idénticas`);
            });
          });
        });
      });
    });
  });

  it('Complementaria · exporta con columnas de sistema cuando se solicita', () => {
    crearDesdeCsv('valido.csv').then(({ t }) => {
      n8nApi.descargarCsv(p, t.id, true).then((d) => {
        const encabezado = parseCsv((d.body.data ?? d.body).csvContent)[0];
        expect(encabezado).to.include.members(['id', 'createdAt', 'updatedAt', 'nombre']);
      });
    });
  });

  it('Complementaria · CSV sin encabezados genera Column_1..Column_n', () => {
    n8nApi.subirArchivo('csv/sin_encabezados.csv', 'sin_encabezados.csv', false).then((up) => {
      const meta = up.body.data ?? up.body;
      expect(meta.rowCount).to.eq(3);
      expect(meta.columns.map((c) => c.name)).to.deep.equal(['Column_1', 'Column_2', 'Column_3']);
    });
  });

  it('Hallazgo CP-018-07 · inferencia de fechas imposibles (documenta el defecto)', () => {
    n8nApi.subirArchivo('csv/fechas_limite.csv', 'fechas_limite.csv').then((up) => {
      const tipos = Object.fromEntries((up.body.data ?? up.body).columns.map((c) => [c.name, c.type]));
      cy.evidencia(`Tipos inferidos: ${JSON.stringify(tipos)}`);
      expect(tipos.fecha_iso).to.eq('date');
      // Esperado tras la corrección TDD: 'string'. Antes de la corrección n8n devuelve 'date'.
      expect(tipos.fecha_imposible, '2024-02-30 no es una fecha real').to.eq('string');
    });
  });
  it('Complementaria · BUG-018-05 · CSV malformado y fileId inválido responden 400 (tras la refactorización)', () => {
    n8nApi.subirArchivo('csv/malformado.csv', 'malformado.csv').then((r) => {
      cy.evidencia(`CSV malformado → HTTP ${r.status}`);
      expect(r.status, 'error de entrada del cliente').to.eq(400);
    });
    n8nApi.req('POST', n8nApi.dt(p), {
      name: `vyv_trav_${Date.now()}`, fileId: '../../../../etc/passwd', hasHeaders: true,
      columns: [{ name: 'a', type: 'string', csvColumnName: 'a' }],
    }).then((r) => {
      cy.evidencia(`fileId con path traversal → HTTP ${r.status}`);
      expect(r.status, 'error de entrada del cliente').to.eq(400);
    });
  });
});
