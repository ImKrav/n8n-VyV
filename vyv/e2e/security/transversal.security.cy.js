/// <reference types="cypress" />
/**
 * Seguridad transversal (los 4 módulos) · OWASP Top 10:2025 · RNF-02 del plan.
 * Configuración del servidor, sesión e inicio de sesión, y control de acceso a las data tables (Core, CO-01 a CO-03).
 * Las cabeceras dependen del modo de arranque: con E2E_TESTS=true o en desarrollo n8n no envía X-Frame-Options
 * (packages/cli/src/server.ts:425). Ejecute esta spec contra una instancia en modo normal.
 * Las pruebas de data tables y carpetas del propietario siguen en core/security/owasp.cy.js.
 */
import { n8nApi } from '../support/api.js';
import { crearMiembro, comoMiembro, borrarMiembro, h, registrar, guardarHallazgos } from './soporte.js';

describe('Seguridad transversal (OWASP Top 10:2025)', () => {
  let miembro;
  let p;
  let tabla;

  before(() => {
    crearMiembro().then((m) => { miembro = m; });
    cy.proyectoPersonal().then((id) => {
      p = id;
      cy.nombreUnico('VyV_Seg_TR').then((n) => n8nApi.crearTablaOk(p, n, [{ name: 'dato', type: 'string' }])).then((t) => {
        tabla = t;
        n8nApi.insertar(p, t.id, [{ dato: 'vyv-seg-fila' }]);
      });
    });
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    cy.loginApi();
    if (tabla) n8nApi.borrarTabla(p, tabla.id);
    borrarMiembro(miembro);
    guardarHallazgos('transversal');
  });

  it('CP-SEG-TR-01 · A02 Security Misconfiguration · el editor envía las cabeceras de seguridad y no expone la tecnología', () => {
    cy.request('/home/workflows').then((r) => {
      const c = r.headers;
      const revisadas = {
        'x-frame-options': c['x-frame-options'], 'x-content-type-options': c['x-content-type-options'],
        'referrer-policy': c['referrer-policy'], 'cross-origin-opener-policy': c['cross-origin-opener-policy'], 'x-powered-by': c['x-powered-by'] ?? 'ausente',
      };
      registrar({ id: 'CP-SEG-TR-01', owasp: 'A02', resultado: c['x-frame-options'] ? 'OK' : 'HALLAZGO', detalle: JSON.stringify(revisadas) });
      expect(c['x-frame-options'], 'protección contra clickjacking').to.match(/sameorigin|deny/i);
      expect(c['x-content-type-options']).to.eq('nosniff');
      expect(c['referrer-policy']).to.exist;
      expect(c).not.to.have.property('x-powered-by');
    });
  });

  it('CP-SEG-TR-02 · A02 Security Misconfiguration · la política de seguridad de contenido (CSP) se aplica, no solo se informa', () => {
    cy.request('/home/workflows').then((r) => {
      const aplicada = r.headers['content-security-policy'];
      const informe = r.headers['content-security-policy-report-only'];
      registrar({
        id: 'CP-SEG-TR-02', owasp: 'A02', resultado: aplicada ? 'OK' : 'HALLAZGO', severidad: aplicada ? 'N/A' : 'Baja',
        detalle: aplicada ? `CSP: ${aplicada}` : `Solo Content-Security-Policy-Report-Only: ${String(informe).replace(/'nonce-[^']+'/, "'nonce-…'")}`,
      });
      expect(aplicada, 'cabecera Content-Security-Policy').to.exist;
    });
  });

  it('CP-SEG-TR-08 · A02 Security Misconfiguration · los scripts estáticos del editor se sirven con X-Content-Type-Options: nosniff', () => {
    // Hallazgo de ZAP baseline (regla 10021), comprobado aquí sobre el primer script de la página.
    cy.request('/').then((r) => {
      const asset = /\/assets\/[^"]+\.js/.exec(r.body)[0];
      cy.request(asset).then((a) => {
        const valor = a.headers['x-content-type-options'];
        registrar({ id: 'CP-SEG-TR-08', owasp: 'A02', resultado: valor === 'nosniff' ? 'OK' : 'HALLAZGO', severidad: valor ? 'N/A' : 'Baja', detalle: `${asset} → x-content-type-options: ${valor ?? 'ausente'}` });
        expect(valor).to.eq('nosniff');
      });
    });
  });

  it('CP-SEG-TR-03 · A07 Authentication Failures · la cookie de sesión es HttpOnly y SameSite', () => {
    cy.request({ method: 'POST', url: '/rest/login', headers: h(), body: { emailOrLdapLoginId: Cypress.env('ownerEmail'), password: Cypress.env('ownerPassword') } }).then((r) => {
      const cookie = [].concat(r.headers['set-cookie'] ?? []).find((c) => c.startsWith('n8n-auth='));
      const atributos = cookie.split(';').slice(1).map((a) => a.trim()).join('; ');
      registrar({ id: 'CP-SEG-TR-03', owasp: 'A07', resultado: 'OK', detalle: `n8n-auth: ${atributos} (Secure depende de N8N_SECURE_COOKIE y de HTTPS)` });
      expect(cookie).to.match(/HttpOnly/i);
      expect(cookie).to.match(/SameSite=(Lax|Strict)/i);
    });
  });

  it('CP-SEG-TR-04 · A07 Authentication Failures · el error de inicio de sesión no revela si el correo existe', () => {
    const intento = (email) => cy.request({ method: 'POST', url: '/rest/login', headers: h(), failOnStatusCode: false, body: { emailOrLdapLoginId: email, password: 'VyV-incorrecta-1' } });
    intento(miembro.email).then((a) => intento(`vyv.noexiste.${Date.now()}@example.com`).then((b) => {
      registrar({ id: 'CP-SEG-TR-04', owasp: 'A07', resultado: 'OK', detalle: `existente → ${a.status} «${a.body.message}»; inexistente → ${b.status} «${b.body.message}»` });
      expect(a.status).to.eq(401);
      expect(b.status).to.eq(a.status);
      expect(b.body.message).to.eq(a.body.message);
    }));
  });

  it('CP-SEG-TR-05 · A07 Authentication Failures · el inicio de sesión limita los intentos fallidos por correo', () => {
    // Correo que no existe: no bloquea ninguna cuenta real de la instancia.
    const email = `vyv.limite.${Date.now()}@example.com`;
    const estados = [];
    Cypress._.times(7, () => cy.request({ method: 'POST', url: '/rest/login', headers: h(), failOnStatusCode: false, body: { emailOrLdapLoginId: email, password: 'VyV-incorrecta-1' } })
      .then((r) => estados.push(r.status)));
    cy.then(() => {
      registrar({ id: 'CP-SEG-TR-05', owasp: 'A07', resultado: estados.includes(429) ? 'OK' : 'HALLAZGO', detalle: `7 intentos → ${estados.join(', ')}` });
      expect(estados, 'algún intento responde 429').to.include(429);
    });
  });

  it('CP-SEG-TR-06 · A07 Authentication Failures · cerrar sesión invalida la cookie aunque se reutilice', () => {
    cy.request({ method: 'POST', url: '/rest/login', headers: h(), body: { emailOrLdapLoginId: miembro.email, password: 'VyvMiembro2026' } }).then((r) => {
      const cookie = [].concat(r.headers['set-cookie']).find((c) => c.startsWith('n8n-auth=')).split(';')[0];
      cy.request({ method: 'POST', url: '/rest/logout', headers: { ...h(), cookie } }).its('status').should('eq', 200);
      cy.clearCookies();
      cy.request({ url: '/rest/login', headers: { ...h(), cookie }, failOnStatusCode: false }).then((g) => {
        registrar({ id: 'CP-SEG-TR-06', owasp: 'A07', resultado: g.status === 401 ? 'OK' : 'HALLAZGO', detalle: `cookie reutilizada tras logout → ${g.status}` });
        expect(g.status).to.eq(401);
      });
    });
    // El JWT lleva la hora en segundos: un login del miembro en el mismo segundo daría el mismo token, ya invalidado.
    cy.wait(1100);
  });

  it('CP-SEG-TR-07 · A01 Broken Access Control · el miembro no lee, escribe ni borra la data table del propietario', () => {
    comoMiembro(miembro);
    const base = `/rest/projects/${p}/data-tables/${tabla.id}`;
    const intentos = [['GET', `${base}/rows`], ['POST', `${base}/insert`, { data: [{ dato: 'intruso' }], returnType: 'all' }], ['GET', `${base}/download-csv`], ['DELETE', base]];
    const estados = [];
    // La sesión es la del miembro (descarta que el rechazo venga de una sesión perdida).
    n8nApi.req('GET', '/rest/login').its('body.data.email').should('eq', miembro.email);
    intentos.forEach(([m, url, body]) => n8nApi.req(m, url, body).then((r) => {
      estados.push(`${m} ${url.replace(base, ':tabla')} → ${r.status} ${String(r.body?.message ?? '').slice(0, 40)}`);
      expect(JSON.stringify(r.body ?? ''), 'sin filas del propietario').not.to.contain('vyv-seg-fila');
      expect(r.status, `${m} ${url}`).to.be.oneOf([403, 404]);
    }));
    n8nApi.req('GET', '/rest/login').its('body.data.email').should('eq', miembro.email);
    cy.loginApi();
    n8nApi.filasOk(p, tabla.id).then((filas) => {
      expect(filas.map((f) => f.dato)).to.deep.eq(['vyv-seg-fila']);
      registrar({ id: 'CP-SEG-TR-07', owasp: 'A01', resultado: 'OK', detalle: estados.join('; ') });
    });
  });
});
