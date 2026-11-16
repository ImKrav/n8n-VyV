/**
 * Utilidades compartidas de los flujos Stagehand (los 4 módulos del plan).
 *
 * Regla de diseño: la IA (act / extract / observe) se usa en lo que se quiere probar de la interfaz;
 * la PREPARACIÓN de datos y la VERIFICACIÓN independiente se hacen por la API REST (determinista),
 * así un fallo de la IA no se confunde con un defecto de n8n.
 */
import 'dotenv/config';
import { Stagehand } from '@browserbasehq/stagehand';

export const URL_N8N = (process.env.N8N_URL ?? 'http://localhost:5678').replace(/\/$/, '');
export const EMAIL = process.env.N8N_EMAIL ?? 'qa.vyv@example.com';
export const CLAVE = process.env.N8N_PASSWORD ?? 'VyvPrueba2026';
export const unico = (p = 'vyv') => `${p}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e3)}`;

export class Fallo extends Error {}
/** Aserción: si no se cumple, el flujo se marca como fallido con el detalle. */
export const afirmar = (cond, detalle) => { if (!cond) throw new Fallo(detalle); };

// ---------------------------------------------------------------------------------------- API REST
export class Api {
  constructor() { this.cookie = ''; this.h = { 'content-type': 'application/json', 'browser-id': 'vyv-stagehand-api' }; }
  async iniciar() {
    await fetch(`${URL_N8N}/rest/owner/setup`, { method: 'POST', headers: this.h,
      body: JSON.stringify({ email: EMAIL, firstName: 'QA', lastName: 'VyV', password: CLAVE }) }).catch(() => {});
    const r = await fetch(`${URL_N8N}/rest/login`, { method: 'POST', headers: this.h,
      body: JSON.stringify({ emailOrLdapLoginId: EMAIL, password: CLAVE }) });
    if (!r.ok) throw new Fallo(`Login API falló: ${r.status}`);
    this.cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    return this;
  }
  async pedir(metodo, ruta, cuerpo) {
    const r = await fetch(`${URL_N8N}${ruta}`, { method: metodo, headers: { ...this.h, cookie: this.cookie },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    const texto = await r.text();
    let json; try { json = JSON.parse(texto); } catch { json = texto; }
    return { status: r.status, body: json, datos: json?.data ?? json };
  }
  async proyecto() { return (this.p ??= (await this.pedir('GET', '/rest/projects/personal')).datos.id); }

  nodoManual = () => ({ id: 'mt', name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} });
  nodoWebhook = (ruta) => ({ id: `wh-${ruta}`, name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0],
    webhookId: crypto.randomUUID(), parameters: { httpMethod: 'GET', path: ruta, responseMode: 'lastNode', options: {} } });
  nodoCampos = (campos, name = 'Edit Fields', position = [220, 0]) => ({ id: `set-${name}`, name, type: 'n8n-nodes-base.set', typeVersion: 3.4, position,
    parameters: { mode: 'manual', options: {}, assignments: { assignments: Object.entries(campos).map(([k, v], i) => ({ id: String(i), name: k, value: v,
      type: typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'boolean' : 'string' })) } } });
  nodoFalla = (mensaje) => ({ id: 'err', name: 'Falla', type: 'n8n-nodes-base.stopAndError', typeVersion: 1, position: [220, 0], parameters: { errorMessage: mensaje } });
  nodoEspera = (segundos) => ({ id: 'wait', name: 'Wait', type: 'n8n-nodes-base.wait', typeVersion: 1.1, position: [220, 0],
    webhookId: crypto.randomUUID(), parameters: { amount: segundos, unit: 'seconds' } });
  cadena = (...n) => Object.fromEntries(n.slice(0, -1).map((x, i) => [x, { main: [[{ node: n[i + 1], type: 'main', index: 0 }]] }]));

  async crearWorkflow(name, nodes = [], connections = {}, extra = {}) {
    const r = await this.pedir('POST', '/rest/workflows', { name, nodes, connections, settings: {}, active: false, ...extra });
    afirmar(r.status === 200, `crear workflow: ${r.status} ${JSON.stringify(r.body).slice(0, 150)}`);
    return r.datos;
  }
  async publicar(wf) { return (await this.pedir('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId })); }
  async borrarWorkflow(id) {
    await this.pedir('POST', `/rest/workflows/${id}/deactivate`);
    await this.pedir('POST', `/rest/workflows/${id}/archive`);
    return this.pedir('DELETE', `/rest/workflows/${id}`);
  }
  async workflows(nombre) {
    const r = await this.pedir('GET', `/rest/workflows?filter=${encodeURIComponent(JSON.stringify({ name: nombre }))}&take=50`);
    return r.datos?.data ?? r.datos ?? [];
  }
  async llamarWebhook(ruta, intentos = 15) {
    for (let i = 0; i < intentos; i++) {
      const r = await fetch(`${URL_N8N}/webhook/${ruta}`);
      if (r.status !== 404) return r;
      await new Promise((ok) => setTimeout(ok, 500));
    }
    return fetch(`${URL_N8N}/webhook/${ruta}`);
  }
  async ejecuciones(wfId) {
    const r = await this.pedir('GET', `/rest/executions?filter=${encodeURIComponent(JSON.stringify({ workflowId: wfId }))}&limit=100`);
    return r.datos?.results ?? r.datos ?? [];
  }
  async esperarEjecuciones(wfId, n = 1, intentos = 40) {
    let l = [];
    for (let i = 0; i < intentos; i++) { l = await this.ejecuciones(wfId); if (l.length >= n) break; await new Promise((ok) => setTimeout(ok, 500)); }
    return l;
  }
  async crearCredencial(name, valor = 'secreto') {
    const r = await this.pedir('POST', '/rest/credentials', { name, type: 'httpHeaderAuth', data: { name: 'X-API-Key', value: valor } });
    afirmar(r.status === 200, `crear credencial: ${r.status}`);
    return r.datos;
  }
  borrarCredencial = (id) => this.pedir('DELETE', `/rest/credentials/${id}`);
  async credenciales(nombre) {
    const r = await this.pedir('GET', `/rest/credentials?filter=${encodeURIComponent(JSON.stringify({ name: nombre }))}`);
    return Array.isArray(r.datos) ? r.datos : r.datos?.data ?? [];
  }
  async carpetas() {
    const r = await this.pedir('GET', `/rest/projects/${await this.proyecto()}/folders?take=250`);
    return r.datos?.data ?? r.datos ?? [];
  }
  async crearCarpeta(name, parentFolderId) {
    const r = await this.pedir('POST', `/rest/projects/${await this.proyecto()}/folders`, { name, ...(parentFolderId ? { parentFolderId } : {}) });
    afirmar(r.status === 200, `crear carpeta: ${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
    return r.datos;
  }
  async borrarCarpeta(id, transferTo) {
    return this.pedir('DELETE', `/rest/projects/${await this.proyecto()}/folders/${id}${transferTo ? `?transferToFolderId=${transferTo}` : ''}`);
  }
  async tablas() {
    const r = await this.pedir('GET', `/rest/projects/${await this.proyecto()}/data-tables?take=250`);
    return r.datos?.data ?? r.datos ?? [];
  }
  async borrarTabla(id) { return this.pedir('DELETE', `/rest/projects/${await this.proyecto()}/data-tables/${id}`); }
}

// ---------------------------------------------------------------------------------------- navegador
export async function abrirNavegador() {
  const stagehand = new Stagehand({
    env: 'LOCAL',
    modelName: process.env.STAGEHAND_MODEL ?? 'gpt-4.1-mini',
    modelClientOptions: { apiKey: process.env.OPENAI_API_KEY ?? process.env.GOOGLE_API_KEY },
    localBrowserLaunchOptions: { headless: process.env.HEADLESS === 'true', viewport: { width: 1440, height: 900 } },
    verbose: 0,
  });
  await stagehand.init();
  return stagehand;
}

/** Login determinista (sin IA): el inicio de sesión no es lo que se evalúa aquí. */
export async function iniciarSesion(page) {
  await page.goto(`${URL_N8N}/signin`);
  await page.fill('input[type="email"], input[name="emailOrLdapLoginId"]', EMAIL);
  await page.fill('input[type="password"]', CLAVE);
  await page.keyboard.press('Enter');
  await page.waitForURL(/home|workflows/, { timeout: 30_000 });
}

export const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
