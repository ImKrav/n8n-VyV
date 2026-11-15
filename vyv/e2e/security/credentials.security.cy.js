/// <reference types="cypress" />
/**
 * Seguridad · módulo 3 · Credenciales (CR-01 a CR-05) · OWASP Top 10:2025 · RNF-02 del plan.
 * Amplía las pruebas de seguridad del plan que ya tienen spec y no se repiten aquí:
 * CP-CR-01-07 (cifrado en la base), CP-CR-01-08 (nombre con HTML), CP-CR-02-02 (enmascarado en la UI),
 * CP-CR-02-03/02-04 (la API y el JSON del workflow no traen el secreto), CP-CR-05-05 (el miembro no lista ni lee)
 * y CP-CR-05-06 (compartir sin licencia).
 * Cada prueba afirma el comportamiento seguro esperado: si n8n no lo cumple, la prueba falla
 * y el hallazgo queda en results/security/credentials.json (ver vyv/security/README.md).
 */
import { n8nApi } from '../support/api.js';
import { crearMiembro, comoMiembro, borrarMiembro, sinSesion, registrar, guardarHallazgos, sinTraza } from './soporte.js';

const SECRETO = `vyv-seg-cr-${Date.now()}`;
const BLANCO = '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6'; // CREDENTIAL_BLANKING_VALUE de n8n-workflow
const creadas = { credenciales: [], workflows: [] };
const texto = (r) => JSON.stringify(r.body ?? '');
const borrarWf = (id) =>
  n8nApi.desactivarWorkflow(id).then(() => n8nApi.req('POST', `/rest/workflows/${id}/archive`)).then(() => n8nApi.req('DELETE', `/rest/workflows/${id}`));

describe('Seguridad · Credenciales (OWASP Top 10:2025)', () => {
  let miembro;
  let proyectoMiembro;
  let cred; // Header Auth del propietario con SECRETO
  let rutaEco;

  before(() => {
    crearMiembro().then((m) => {
      miembro = m;
      comoMiembro(m);
      n8nApi.proyectoPersonal().then((id) => { proyectoMiembro = id; });
      cy.loginApi();
    });
    cy.nombreUnico('VyV-Seg-CR').then((n) => n8nApi.crearCredencialHeader(n, 'X-Api-Key', SECRETO)).then((c) => {
      cred = c;
      creadas.credenciales.push(c.id);
    });
    n8nApi.crearEco().then(({ wf, ruta }) => { creadas.workflows.push(wf.id); rutaEco = ruta; });
  });
  beforeEach(() => cy.loginApi());
  after(() => {
    cy.loginApi();
    creadas.workflows.forEach(borrarWf);
    creadas.credenciales.forEach((id) => n8nApi.borrarCredencial(id));
    borrarMiembro(miembro);
    guardarHallazgos('credentials');
  });

  /** Publica Webhook → HTTP Request (con la credencial) → eco y devuelve las cabeceras que recibió el eco. */
  const cabecerasConCredencial = (c) => {
    const ruta = n8nApi.rutaUnica('vyv-seg-cr');
    const http = n8nApi.nodoHttpCredencial(`${Cypress.config('baseUrl')}/webhook/${rutaEco}`, c);
    return n8nApi.crearWorkflowActivo('VyV-Seg-CR-uso', [n8nApi.nodoWebhook('GET', ruta), http], n8nApi.cadena('Webhook', 'HTTP Request'))
      .then((w) => { creadas.workflows.push(w.id); return n8nApi.llamarWebhook('GET', ruta); })
      .then((r) => r.body?.headers ?? {});
  };

  it('CP-SEG-CR-01 · A01 Broken Access Control · sin sesión, la API de credenciales responde 401', () => {
    const rutas = [
      ['GET', '/rest/credentials'], ['GET', `/rest/credentials/${cred.id}`], ['POST', '/rest/credentials'],
      ['PATCH', `/rest/credentials/${cred.id}`], ['DELETE', `/rest/credentials/${cred.id}`],
      ['POST', '/rest/credentials/test'], ['PUT', `/rest/credentials/${cred.id}/share`],
    ];
    rutas.forEach(([m, url]) => sinSesion(m, url, m === 'GET' ? undefined : {}).then((r) => expect(r.status, `${m} ${url}`).to.eq(401)));
    cy.then(() => registrar({ id: 'CP-SEG-CR-01', owasp: 'A01', resultado: 'OK', detalle: `${rutas.length} rutas responden 401 sin sesión` }));
  });

  it('CP-SEG-CR-02 · A01 Broken Access Control · el miembro no edita, borra, comparte ni transfiere una credencial ajena', () => {
    comoMiembro(miembro);
    const estados = [];
    const intentos = [
      ['PATCH', `/rest/credentials/${cred.id}`, { name: 'VyV-Seg-robada', type: 'httpHeaderAuth', data: { name: 'X-Api-Key', value: 'otro' } }],
      ['DELETE', `/rest/credentials/${cred.id}`],
      ['PUT', `/rest/credentials/${cred.id}/share`, { shareWithIds: [proyectoMiembro] }],
      ['PUT', `/rest/credentials/${cred.id}/transfer`, { destinationProjectId: proyectoMiembro }],
    ];
    intentos.forEach(([m, url, body]) => n8nApi.req(m, url, body).then((r) => {
      estados.push(`${m} ${url.replace(cred.id, ':id')} → ${r.status}`);
      expect(r.status, `${m} ${url}`).to.be.oneOf([403, 404]);
    }));
    cy.loginApi();
    n8nApi.req('GET', `/rest/credentials/${cred.id}`).then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.data.name, 'el nombre no cambió').to.eq(cred.name);
      registrar({ id: 'CP-SEG-CR-02', owasp: 'A01', resultado: 'OK', detalle: estados.join('; ') });
    });
    cabecerasConCredencial(cred).its('x-api-key').should('eq', SECRETO);
  });

  it('CP-SEG-CR-03 · A01 Broken Access Control · el miembro no puede usar en su workflow ni probar una credencial ajena', () => {
    // Lo que importa es que el secreto no salga: n8n puede aceptar guardar la referencia,
    // pero la publicación o la ejecución no deben aplicar una credencial a la que el miembro no tiene acceso.
    comoMiembro(miembro);
    const ruta = n8nApi.rutaUnica('vyv-seg-cr-ajena');
    const nodos = [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoHttpCredencial(`${Cypress.config('baseUrl')}/webhook/${rutaEco}`, cred)];
    const pasos = [];
    n8nApi.req('POST', '/rest/workflows', { name: 'VyV-Seg-CR-ajena', nodes: nodos, connections: n8nApi.cadena('Webhook', 'HTTP Request'), settings: {}, active: false }).then((r) => {
      pasos.push(`guardar → ${r.status}`);
      if (r.status !== 200) return;
      const w = r.body.data;
      creadas.workflows.push(w.id);
      n8nApi.req('POST', `/rest/workflows/${w.id}/activate`, { versionId: w.versionId }).then((a) => {
        pasos.push(`publicar → ${a.status}${a.status === 200 ? '' : `: ${String(a.body?.message).slice(0, 80)}`}`);
        if (a.status === 200) n8nApi.llamarWebhook('GET', ruta).then((e) => pasos.push(`ejecutar → cabecera x-api-key recibida: ${e.body?.headers?.['x-api-key'] ?? 'ninguna'}`));
      });
    });
    n8nApi.req('POST', '/rest/credentials/test', { credentials: { id: cred.id, name: cred.name, type: 'httpHeaderAuth', data: {} } }).then((r) => {
      pasos.push(`probar → ${r.status} ${String(r.body?.data?.status ?? r.body?.message ?? '').slice(0, 60)}`);
      expect(texto(r), 'la prueba no devuelve el secreto').not.to.contain(SECRETO);
      expect(r.status === 200 && r.body?.data?.status === 'OK', 'la credencial ajena no se prueba con éxito').to.eq(false);
    });
    cy.then(() => {
      const fuga = pasos.some((p) => p.includes(SECRETO));
      registrar({ id: 'CP-SEG-CR-03', owasp: 'A01', resultado: fuga ? 'HALLAZGO' : 'OK', severidad: fuga ? 'Crítica' : 'N/A', detalle: pasos.join('; ').replace(SECRETO, '<secreto>') });
      expect(fuga, 'el secreto del propietario no llega a un workflow del miembro').to.eq(false);
    });
  });

  it('CP-SEG-CR-04 · A04 Cryptographic Failures · crear y editar no devuelven el secreto, y leerlo con includeData lo redacta', () => {
    cy.nombreUnico('VyV-Seg-CR-red').then((n) => n8nApi.req('POST', '/rest/credentials', { name: n, type: 'httpHeaderAuth', data: { name: 'X-Api-Key', value: SECRETO } })).then((r) => {
      expect(r.status).to.eq(200);
      creadas.credenciales.push(r.body.data.id);
      expect(texto(r), 'POST no devuelve el secreto').not.to.contain(SECRETO);
      const id = r.body.data.id;
      n8nApi.req('PATCH', `/rest/credentials/${id}`, { name: `${r.body.data.name}-2`, type: 'httpHeaderAuth', data: { name: 'X-Api-Key', value: `${SECRETO}-2` } }).then((p) => {
        expect(p.status).to.eq(200);
        expect(texto(p), 'PATCH no devuelve el secreto').not.to.contain(SECRETO);
      });
      n8nApi.req('GET', `/rest/credentials/${id}?includeData=true`).then((g) => {
        expect(texto(g)).not.to.contain(SECRETO);
        expect(g.body.data.data.value, 'el campo secreto viene redactado').to.eq(BLANCO);
        registrar({ id: 'CP-SEG-CR-04', owasp: 'A04', resultado: 'OK', detalle: 'POST, PATCH y GET?includeData=true sin el secreto; value = CREDENTIAL_BLANKING_VALUE' });
      });
    });
  });

  it('CP-SEG-CR-05 · A08 Software or Data Integrity Failures · guardar reenviando el valor redactado conserva el secreto original', () => {
    cy.nombreUnico('VyV-Seg-CR-int').then((n) => n8nApi.crearCredencialHeader(n, 'X-Api-Key', SECRETO)).then((c) => {
      creadas.credenciales.push(c.id);
      // El editor reenvía el centinela cuando el usuario solo cambia el nombre.
      n8nApi.req('PATCH', `/rest/credentials/${c.id}`, { name: `${c.name}-renombrada`, type: 'httpHeaderAuth', data: { name: 'X-Api-Key', value: BLANCO } }).its('status').should('eq', 200);
      cabecerasConCredencial(c).then((h) => {
        registrar({ id: 'CP-SEG-CR-05', owasp: 'A08', resultado: h['x-api-key'] === SECRETO ? 'OK' : 'HALLAZGO', detalle: `cabecera recibida por el eco tras renombrar: ${h['x-api-key'] === SECRETO ? 'el secreto original' : h['x-api-key']}` });
        expect(h['x-api-key']).to.eq(SECRETO);
      });
    });
  });

  it('CP-SEG-CR-06 · A04 Cryptographic Failures · una credencial OAuth2 no devuelve clientSecret ni tokens en claro', () => {
    const clientSecret = `${SECRETO}-oauth`;
    n8nApi.req('POST', '/rest/credentials', {
      name: `VyV-Seg-CR-oauth-${Date.now()}`, type: 'oAuth2Api',
      data: { grantType: 'authorizationCode', authUrl: 'https://auth.example.com/authorize', accessTokenUrl: 'https://auth.example.com/token', clientId: 'vyv-seg', clientSecret, scope: 'read', authQueryParameters: '', authentication: 'header' },
    }).then((r) => {
      expect(r.status).to.eq(200);
      creadas.credenciales.push(r.body.data.id);
      expect(texto(r)).not.to.contain(clientSecret);
      n8nApi.req('GET', `/rest/credentials/${r.body.data.id}?includeData=true`).then((g) => {
        expect(texto(g), 'sin clientSecret').not.to.contain(clientSecret);
        expect(g.body.data.data.clientSecret).to.eq(BLANCO);
        expect(g.body.data.data, 'sin oauthTokenData').not.to.have.property('oauthTokenData');
        registrar({ id: 'CP-SEG-CR-06', owasp: 'A04', resultado: 'OK', detalle: 'clientSecret redactado y sin oauthTokenData en la respuesta' });
      });
    });
  });

  it('CP-SEG-CR-07 · A05 Injection · un nombre con SQL y claves __proto__ en data no alteran otras credenciales ni el servidor', () => {
    cy.nombreUnico("VyV-Seg-CR-x'); DROP TABLE credentials_entity; --").then((n) => n8nApi.crearCredencialHeader(n, 'X-Api-Key', 'v')).then((c) => {
      creadas.credenciales.push(c.id);
      expect(c.name).to.contain('DROP TABLE');
    });
    n8nApi.req('POST', '/rest/credentials', JSON.parse(`{"name":"VyV-Seg-CR-proto-${Date.now()}","type":"httpHeaderAuth","data":{"name":"X","value":"v","__proto__":{"vyvPolluted":true},"constructor":{"prototype":{"vyvPolluted":true}}}}`)).then((r) => {
      if (r.status === 200) creadas.credenciales.push(r.body.data.id);
      expect(r.status, 'no responde 500').to.be.oneOf([200, 400]);
    });
    // Si el prototipo del servidor se hubiera contaminado, la propiedad aparecería en cualquier respuesta nueva.
    n8nApi.req('GET', `/rest/credentials/${cred.id}`).then((r) => {
      expect(r.body.data.name).to.eq(cred.name);
      expect(texto(r)).not.to.contain('vyvPolluted');
      registrar({ id: 'CP-SEG-CR-07', owasp: 'A05', resultado: 'OK', detalle: 'Nombre con SQL guardado como texto; __proto__ en data sin efecto' });
    });
  });

  it('CP-SEG-CR-08 · A06 Insecure Design · el listado con includeData=true no devuelve secretos', () => {
    n8nApi.req('GET', '/rest/credentials?includeData=true&includeScopes=true').then((r) => {
      expect(r.status).to.eq(200);
      expect(r.body.data.map((c) => c.id)).to.include(cred.id);
      registrar({ id: 'CP-SEG-CR-08', owasp: 'A06', resultado: texto(r).includes(SECRETO) ? 'HALLAZGO' : 'OK', detalle: `${r.body.data.length} credenciales listadas; secreto en claro: ${texto(r).includes(SECRETO)}` });
      expect(texto(r)).not.to.contain(SECRETO);
    });
  });

  it('CP-SEG-CR-09 · A07 Authentication Failures · el flujo OAuth2 no se inicia para una credencial ajena ni acepta un state falso', () => {
    let oauth;
    n8nApi.req('POST', '/rest/credentials', {
      name: `VyV-Seg-CR-oauth2-${Date.now()}`, type: 'oAuth2Api',
      data: { grantType: 'authorizationCode', authUrl: 'https://auth.example.com/authorize', accessTokenUrl: 'https://auth.example.com/token', clientId: 'vyv-seg', clientSecret: `${SECRETO}-o2`, scope: 'read', authQueryParameters: '', authentication: 'header' },
    }).then(n8nApi.ok).then((c) => { oauth = c; creadas.credenciales.push(c.id); });
    const estados = [];
    cy.then(() => {
      comoMiembro(miembro);
      n8nApi.req('GET', `/rest/oauth2-credential/auth?id=${oauth.id}`).then((r) => {
        estados.push(`auth de una ajena → ${r.status}`);
        expect(r.status, 'el miembro no obtiene la URL de autorización').to.be.within(400, 499);
      });
    });
    cy.then(() => {
      cy.loginApi();
      const stateFalso = btoa(JSON.stringify({ token: 'vyv-falso', cid: oauth.id, createdAt: Date.now() }));
      n8nApi.req('GET', `/rest/oauth2-credential/callback?code=vyv&state=${encodeURIComponent(stateFalso)}`).then((r) => {
        estados.push(`callback con state falso → ${r.status}`);
        expect(String(r.body), 'no completa la conexión').not.to.match(/success|Connection successful/i);
      });
      n8nApi.req('GET', `/rest/credentials/${oauth.id}?includeData=true`).then((r) => {
        expect(r.body.data.data, 'no se guardó ningún token').not.to.have.property('oauthTokenData');
        registrar({ id: 'CP-SEG-CR-09', owasp: 'A07', resultado: 'OK', detalle: estados.join('; ') });
      });
    });
  });

  it('CP-SEG-CR-10 · A06 Insecure Design · la API rechaza una credencial sin sus campos obligatorios (issue #11)', () => {
    n8nApi.req('POST', '/rest/credentials', { name: `VyV-Seg-CR-vacia-${Date.now()}`, type: 'httpHeaderAuth', data: {} }).then((r) => {
      if (r.status === 200) creadas.credenciales.push(r.body.data.id);
      registrar({ id: 'CP-SEG-CR-10', owasp: 'A06', resultado: r.status === 400 ? 'OK' : 'HALLAZGO', severidad: r.status === 400 ? 'N/A' : 'Baja', detalle: `POST con data {} → ${r.status}` });
      expect(r.status).to.eq(400);
    });
  });

  it('CP-SEG-CR-11 · A10 Mishandling of Exceptional Conditions · id y tipo inexistentes responden 4xx sin traza', () => {
    n8nApi.req('GET', '/rest/credentials/VyVnoExiste1').then((r) => { expect(r.status).to.eq(404); sinTraza(r); });
    n8nApi.req('POST', '/rest/credentials', { name: 'VyV-Seg-CR-tipo', type: 'vyvTipoInexistente', data: {} }).then((r) => {
      if (r.status === 200) creadas.credenciales.push(r.body.data.id);
      sinTraza(r);
      registrar({ id: 'CP-SEG-CR-11', owasp: 'A10', resultado: r.status >= 400 && r.status < 500 ? 'OK' : 'HALLAZGO', detalle: `id inexistente → 404; tipo inexistente → ${r.status}` });
      expect(r.status).to.be.within(400, 499);
    });
  });
});
