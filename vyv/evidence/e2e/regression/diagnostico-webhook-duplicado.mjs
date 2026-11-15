// Diagnóstico del hallazgo CP-WF-03-03: publica A y B con la misma ruta GET N veces, cuenta cuántas veces
// n8n acepta B (debería responder 409) y muestra las filas de webhook_entity después de cada publicación.
// Uso (Node 22.5 o superior, n8n en http://localhost:5678 con SQLite):
//   CYPRESS_ownerEmail=… CYPRESS_ownerPassword=… DB=~/.n8n/database.sqlite node diagnostico-webhook-duplicado.mjs 10
// Borra los workflows que crea.
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync(process.env.DB, { readOnly: true });
const filas = (ruta) => db.prepare('select workflowId, method from webhook_entity where webhookPath = ?').all(ruta).map((r) => r.workflowId.slice(0, 6)).join(',') || 'ninguna';
const base = 'http://localhost:5678', h = { 'content-type': 'application/json', 'browser-id': 'vyv-diag' };
const login = await fetch(`${base}/rest/login`, { method: 'POST', headers: h, body: JSON.stringify({ emailOrLdapLoginId: process.env.CYPRESS_ownerEmail, password: process.env.CYPRESS_ownerPassword }) });
h.cookie = login.headers.get('set-cookie').split(';')[0];
const req = async (m, u, b) => { const r = await fetch(base + u, { method: m, headers: h, body: b && JSON.stringify(b) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const wf = (name, ruta) => ({ name, settings: {}, active: false, connections: {}, nodes: [{ id: 'w', name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], webhookId: crypto.randomUUID(), parameters: { httpMethod: 'GET', path: ruta, responseMode: 'onReceived', options: {} } }] });
let aceptados = 0; const N = Number(process.argv[2] ?? 10);
for (let i = 0; i < N; i++) {
  const ruta = `vyv-diag-${Date.now()}-${i}`;
  const a = (await req('POST', '/rest/workflows', wf('VyV diag A', ruta))).j.data;
  const ra = await req('POST', `/rest/workflows/${a.id}/activate`, { versionId: a.versionId });
  const trasA = filas(ruta);
  const b = (await req('POST', '/rest/workflows', wf('VyV diag B', ruta))).j.data;
  const rb = await req('POST', `/rest/workflows/${b.id}/activate`, { versionId: b.versionId });
  const llamada = await fetch(`${base}/webhook/${ruta}`);
  console.log(`${i}: A ${a.id.slice(0,6)} ${ra.s} · filas tras A: ${trasA} · B ${b.id.slice(0,6)} ${rb.s}${rb.s === 200 ? ' (ACEPTADO)' : ''} · filas tras B: ${filas(ruta)}`);
  if (rb.s === 200) aceptados++;
  for (const w of [a, b]) { await req('POST', `/rest/workflows/${w.id}/deactivate`); await req('POST', `/rest/workflows/${w.id}/archive`); await req('DELETE', `/rest/workflows/${w.id}`); }
}
console.log(`B aceptado ${aceptados} de ${N}`);
