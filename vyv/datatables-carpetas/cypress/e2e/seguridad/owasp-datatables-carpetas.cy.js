/// <reference types="cypress" />
/**
 * Pruebas de seguridad dinámicas (DAST ligero) alineadas con OWASP Top 10:2021.
 * RNF-018. Cada prueba documenta la categoría OWASP, el resultado y la severidad sugerida.
 * Complementos estáticos: ver README → "Seguridad" (Semgrep sobre el código del módulo y npm audit).
 */
import { n8nApi, mensaje } from '../../support/api.js';

const hallazgos = [];
const registrar = (h) => { hallazgos.push(h); cy.evidencia(`${h.owasp} · ${h.resultado} · ${h.detalle}`); };

describe('Seguridad · Data tables y carpetas (OWASP Top 10)', () => {
  let p; let t;
  before(() => {
    cy.proyectoPersonal().then((id) => {
      p = id;
      cy.nombreUnico('vyv_seg').then((n) => n8nApi.crearTablaOk(p, n, [{ name: 'nombre', type: 'string' }, { name: 'formula', type: 'string' }])
        .then((tabla) => { t = tabla.id; }));
    });
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    n8nApi.borrarTabla(p, t);
    cy.writeFile('evidencias/hallazgos-seguridad.json', hallazgos);
  });

  it('A01 Broken Access Control · la API exige sesión válida (sin cookie → 401)', () => {
    cy.clearCookies();
    const rutas = [`/rest/projects/${p}/data-tables`, `/rest/projects/${p}/folders`, `/rest/projects/${p}/data-tables/${t}/rows`];
    rutas.forEach((url) => {
      cy.request({ url, failOnStatusCode: false, headers: { 'browser-id': Cypress.env('browserId') } }).then((r) => {
        expect(r.status, url).to.eq(401);
      });
    });
    cy.then(() => registrar({ owasp: 'A01', resultado: 'OK', detalle: 'Endpoints protegidos devuelven 401 sin sesión', severidad: 'N/A' }));
  });

  it('A01/A07 · la cookie de sesión no sirve con otro browser-id (protección de secuestro de sesión)', () => {
    cy.request({ url: `/rest/projects/${p}/data-tables`, failOnStatusCode: false, headers: { 'browser-id': 'otro-navegador' } })
      .its('status').should('eq', 401);
    cy.then(() => registrar({ owasp: 'A07', resultado: 'OK', detalle: 'Sesión ligada al browser-id', severidad: 'N/A' }));
  });

  it('A01 · path traversal en fileId al crear una tabla desde CSV', () => {
    n8nApi.req('POST', n8nApi.dt(p), {
      name: `vyv_trav_${Date.now()}`, fileId: '../../../../etc/passwd', hasHeaders: true,
      columns: [{ name: 'a', type: 'string', csvColumnName: 'a' }],
    }).then((r) => {
      expect(r.status, 'no debe leer archivos fuera del directorio de subidas').to.be.within(400, 599);
      expect(JSON.stringify(r.body)).not.to.match(/root:x:0:0/);
      registrar({ owasp: 'A01', resultado: 'OK', detalle: `fileId con ../ rechazado (${r.status}: ${mensaje(r).slice(0, 80)})`, severidad: 'N/A' });
    });
  });

  it('A03 Injection · nombres con SQL no alteran la base de datos', () => {
    const malicioso = "x'); DROP TABLE data_table; --";
    n8nApi.crearTabla(p, malicioso, []).then((r) => {
      // Se acepta como texto (consultas parametrizadas) o se rechaza; nunca error 500.
      expect(r.status).to.be.oneOf([200, 400]);
      if (r.status === 200) n8nApi.borrarTabla(p, r.body.data.id);
    });
    n8nApi.listarTablas(p).its('count').should('be.gte', 1);
    n8nApi.filasOk(p, t, { filter: { type: 'and', filters: [{ columnName: 'nombre', condition: 'eq', value: "' OR '1'='1" }] } })
      .should('have.length', 0);
    cy.then(() => registrar({ owasp: 'A03', resultado: 'OK', detalle: 'Sin inyección SQL en nombres ni filtros', severidad: 'N/A' }));
  });

  it('A03 Injection (XSS) · un nombre de carpeta con HTML se muestra como texto', () => {
    const xss = `<img src=x onerror="window.__xss=1">${Date.now()}`;
    n8nApi.crearCarpeta(p, xss).then((r) => {
      // Los caracteres < > están prohibidos en nombres de carpeta: se espera 400.
      expect(r.status).to.eq(400);
      registrar({ owasp: 'A03', resultado: 'OK', detalle: 'Nombre de carpeta con < > rechazado', severidad: 'N/A' });
    });
    const xssTabla = `<img src=x onerror="window.__xss=1">_${Date.now()}`;
    n8nApi.crearTabla(p, xssTabla, []).then((r) => {
      if (r.status !== 200) return;
      cy.visitarN8n('/home/datatables');
      cy.contains(xssTabla).should('exist'); // se ve el texto literal
      cy.window().its('__xss').should('be.undefined');
      registrar({ owasp: 'A03', resultado: 'OK', detalle: 'Nombre de tabla con HTML se renderiza escapado', severidad: 'N/A' });
      n8nApi.borrarTabla(p, r.body.data.id);
    });
  });

  it('CP-018-08 · A03 inyección de fórmulas en el CSV exportado (CWE-1236)', () => {
    const peligrosos = ['=HYPERLINK("https://example.com";"clic")', '+1+1', '-2+3', '@SUM(1+1)'];
    n8nApi.insertar(p, t, peligrosos.map((f) => ({ nombre: 'x', formula: f }))).its('status').should('eq', 200);
    n8nApi.descargarCsv(p, t).then((d) => {
      const csv = (d.body.data ?? d.body).csvContent;
      const lineas = csv.split(/\r?\n/).slice(1);
      const sinNeutralizar = lineas.filter((l) => /,"?[=+\-@]/.test(l));
      registrar({
        owasp: 'A03',
        resultado: sinNeutralizar.length ? 'HALLAZGO' : 'OK',
        detalle: sinNeutralizar.length
          ? `${sinNeutralizar.length} celdas exportadas empiezan por = + - @ sin neutralizar (se ejecutan al abrir en Excel)`
          : 'Las fórmulas se neutralizan al exportar',
        severidad: sinNeutralizar.length ? 'Media' : 'N/A',
        recomendacion: 'Prefijar con comilla simple (\') las celdas que empiezan por = + - @ en escapeCsvValue (data-table.service.ts).',
      });
      // La prueba documenta el comportamiento esperado por OWASP: debe fallar mientras exista el hallazgo.
      expect(sinNeutralizar, 'celdas con fórmulas sin neutralizar').to.have.length(0);
    });
  });

  it('A04 Insecure Design · solo se aceptan archivos .csv', () => {
    n8nApi.subirArchivo('csv/no_es_csv.txt', 'script.exe').its('status').should('eq', 400);
    cy.then(() => registrar({ owasp: 'A04', resultado: 'OK', detalle: 'Extensiones distintas de .csv rechazadas', severidad: 'N/A' }));
  });

  it('A05 Security Misconfiguration · cabeceras de seguridad en la respuesta del editor', () => {
    cy.request('/').then((r) => {
      const h = r.headers;
      const revisadas = {
        'x-content-type-options': h['x-content-type-options'],
        'x-frame-options / CSP frame-ancestors': h['x-frame-options'] ?? (h['content-security-policy'] || '').includes('frame-ancestors'),
        'x-powered-by (no debe exponerse)': h['x-powered-by'] ?? 'ausente',
      };
      cy.task('table', revisadas);
      registrar({ owasp: 'A05', resultado: 'REVISAR', detalle: JSON.stringify(revisadas), severidad: 'Baja' });
    });
  });
});
