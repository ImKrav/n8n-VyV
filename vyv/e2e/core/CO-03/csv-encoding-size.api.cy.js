/// <reference types="cypress" />
/**
 * CO-03 · Importar y exportar CSV · codificación de Excel en español y archivo grande (caja negra).
 * Trazabilidad: CP-CO-03-04 y CP-CO-03-05 (casos del plan sin equivalente en ESC-018).
 * El parser de n8n acepta solo la coma como separador: el caso del separador «;» documenta el defecto.
 */
import { n8nApi, mensaje } from '../../support/api.js';

describe('CO-03 · CSV de Excel y archivo grande (API)', () => {
  let p;
  const creadas = [];
  before(() => cy.proyectoPersonal().then((id) => { p = id; }));
  beforeEach(() => cy.loginApi());
  after(() => creadas.forEach((id) => n8nApi.borrarTabla(p, id)));

  /** Crea una tabla con el archivo subido y las columnas que n8n infirió (con un nombre válido opcional). */
  const crearConArchivo = (meta, nombreColumna = (c) => c.name) =>
    cy.nombreUnico('vyv_csv').then((nombre) =>
      n8nApi
        .req('POST', n8nApi.dt(p), {
          name: nombre, fileId: meta.id, hasHeaders: true,
          columns: meta.columns.map((c) => ({ name: nombreColumna(c), type: c.type, csvColumnName: c.name })),
        })
        .then((r) => {
          expect(r.status, JSON.stringify(r.body).slice(0, 200)).to.eq(200);
          creadas.push(r.body.data.id);
          return r.body.data;
        }),
    );

  context('CP-CO-03-04 · CSV exportado desde Excel en español (UTF-8 con BOM, «;», tildes)', () => {
    const subirExcel = () =>
      n8nApi.subirArchivo('csv/excel_es.csv', 'vyv_excel.csv').then((up) => {
        expect(up.status, mensaje(up)).to.eq(200);
        return up.body.data ?? up.body;
      });

    it('CP-CO-03-04 · el primer encabezado no incluye el BOM', () => {
      subirExcel().then((meta) => {
        cy.evidencia(`Encabezados: ${JSON.stringify(meta.columns.map((c) => c.name))}`);
        expect(meta.columns[0].name.charCodeAt(0), 'primer carácter del encabezado').not.to.eq(0xfeff);
        expect(meta.columns[0].name).to.match(/^nombre/);
      });
    });

    it('CP-CO-03-04 · las tildes y la ñ se conservan en los valores importados', () => {
      subirExcel().then((meta) => {
        expect(meta.rowCount).to.eq(3);
        // Con «;» la única columna se llama «nombre;ciudad», que no es un nombre válido:
        // se renombra como haría el usuario en el modal para poder revisar los valores.
        crearConArchivo(meta, (c) => c.name.replace(/[^A-Za-z0-9_]/g, '_')).then((t) => {
          n8nApi.filasOk(p, t.id).then((filas) => {
            const texto = filas.map((f) => Object.values(f).join(' ')).join(' | ');
            cy.evidencia(`Valores: ${texto.slice(0, 160)}`);
            ['José', 'Bogotá', 'María', 'Medellín', 'Ñandú Pérez', 'Cúcuta'].forEach((v) =>
              expect(texto).to.contain(v),
            );
          });
        });
      });
    });

    it('Hallazgo CP-CO-03-04 · el separador «;» separa las columnas o n8n informa que no lo admite', () => {
      n8nApi.subirArchivo('csv/excel_es.csv', 'vyv_excel.csv').then((up) => {
        const meta = up.body.data ?? up.body;
        cy.evidencia(`HTTP ${up.status} · columnas: ${JSON.stringify(meta.columns?.map((c) => c.name))}`);
        // Criterio del plan: dos columnas (nombre, ciudad) o un error 400 que nombre el separador.
        const separaColumnas = up.status === 200 && meta.columnCount === 2;
        const informaSeparador = up.status === 400 && /separator|delimiter|separador/i.test(mensaje(up));
        expect(separaColumnas || informaSeparador, 'separa las columnas o informa el separador no admitido').to.eq(true);
      });
    });
  });

  it('CP-CO-03-05 · importa un CSV de 10 000 filas en menos de 30 s y carga todas las filas', () => {
    const FILAS = 10000;
    const lineas = ['nombre,edad,activo'];
    for (let i = 1; i <= FILAS; i++) lineas.push(`Persona ${i},${18 + (i % 60)},${i % 2 === 0}`);
    const csv = `${lineas.join('\n')}\n`;
    let inicio;

    cy.then(() => { inicio = Date.now(); });
    n8nApi.subirBytes(csv, 'vyv_10000.csv').then((up) => {
      expect(up.status, mensaje(up)).to.eq(200);
      const meta = up.body.data ?? up.body;
      expect(meta.rowCount, 'filas detectadas en el archivo').to.eq(FILAS);
      crearConArchivo(meta).then((t) => {
        const segundos = (Date.now() - inicio) / 1000;
        n8nApi.filas(p, t.id, { take: '1' }).then(n8nApi.ok).then((pagina) => {
          cy.evidencia(`Importación: ${segundos.toFixed(1)} s · filas en la tabla: ${pagina.count}`);
          expect(segundos, 'tiempo de importación (s)').to.be.lessThan(30);
          expect(pagina.count, 'filas en la tabla').to.eq(FILAS);
        });
      });
    });
  });
});
