/**
 * Cliente de la API REST interna de n8n (/rest) usado por las pruebas de API, la preparación
 * de datos de las pruebas de UI y las tareas Screenplay.
 * Las respuestas de /rest vienen envueltas en { data: ... }.
 */
import { parse } from 'flatted';

const h = () => ({ 'browser-id': Cypress.env('browserId') });

const req = (method, url, body, opts = {}) =>
  cy.request({ method, url, body, headers: h(), failOnStatusCode: false, ...opts });

const ok = (res) => {
  expect(res.status, `HTTP ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`).to.be.oneOf([200, 201]);
  return res.body?.data ?? res.body;
};

/** Mensaje de error de una respuesta (n8n usa { message } o { data: { message } }). */
export const mensaje = (res) => String(res.body?.message ?? res.body?.data?.message ?? JSON.stringify(res.body));

export const n8nApi = {
  req,
  ok,

  proyectoPersonal: () => req('GET', '/rest/projects/personal').then((r) => ok(r).id),

  // ----------------------------------------------------------------------- Data tables
  dt: (p) => `/rest/projects/${p}/data-tables`,
  crearTabla: (p, name, columns = []) => req('POST', n8nApi.dt(p), { name, columns }),
  crearTablaOk: (p, name, columns = []) => n8nApi.crearTabla(p, name, columns).then(ok),
  borrarTabla: (p, id) => req('DELETE', `${n8nApi.dt(p)}/${id}`),
  listarTablas: (p) => req('GET', `${n8nApi.dt(p)}?take=250`).then(ok),
  columnas: (p, t) => req('GET', `${n8nApi.dt(p)}/${t}/columns`).then(ok),
  crearColumna: (p, t, name, type) => req('POST', `${n8nApi.dt(p)}/${t}/columns`, { name, type }),
  renombrarColumna: (p, t, c, name) => req('PATCH', `${n8nApi.dt(p)}/${t}/columns/${c}/rename`, { name }),
  borrarColumna: (p, t, c) => req('DELETE', `${n8nApi.dt(p)}/${t}/columns/${c}`),
  insertar: (p, t, data) => req('POST', `${n8nApi.dt(p)}/${t}/insert`, { data, returnType: 'all' }),
  filas: (p, t, query = {}) => {
    const q = { take: '250', ...query };
    if (q.filter && typeof q.filter !== 'string') q.filter = JSON.stringify(q.filter);
    return req('GET', `${n8nApi.dt(p)}/${t}/rows?${new URLSearchParams(q)}`);
  },
  filasOk: (p, t, query) => n8nApi.filas(p, t, query).then(ok).then((d) => d.data ?? d),
  borrarFilas: (p, t, ids) => {
    const filter = { type: 'or', filters: ids.map((id) => ({ columnName: 'id', condition: 'eq', value: id })) };
    return req('DELETE', `${n8nApi.dt(p)}/${t}/rows?filter=${encodeURIComponent(JSON.stringify(filter))}`);
  },
  descargarCsv: (p, t, includeSystemColumns = false) =>
    req('GET', `${n8nApi.dt(p)}/${t}/download-csv?includeSystemColumns=${includeSystemColumns}`),

  /** Sube un archivo de fixtures/ (multipart, campo "file"). */
  subirArchivo: (rutaFixture, nombre, hasHeaders = true) =>
    cy.fixture(rutaFixture, 'binary').then((contenido) =>
      n8nApi.subirBytes(Cypress.Buffer.from(contenido, 'binary'), nombre, hasHeaders),
    ),

  /** Sube un CSV generado en la prueba (texto o bytes), p. ej. un archivo grande. */
  subirBytes: (bytes, nombre, hasHeaders = true) =>
    cy.wrap(null, { log: false }).then(() => {
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: 'text/csv' }), nombre);
      form.append('hasHeaders', String(hasHeaders));
      return cy
        .request({ method: 'POST', url: '/rest/data-tables/uploads', body: form, headers: h(), failOnStatusCode: false })
        .then((r) => {
          // Con FormData, Cypress entrega el cuerpo como ArrayBuffer: se decodifica a JSON.
          const texto = typeof r.body === 'string' ? r.body : new TextDecoder().decode(r.body);
          let body;
          try { body = JSON.parse(texto); } catch { body = texto; }
          return { status: r.status, body };
        });
    }),
  importarCsv: (p, t, fileId) => req('POST', `${n8nApi.dt(p)}/${t}/import-csv`, { fileId }),

  // ----------------------------------------------------------------------- Carpetas y workflows
  fo: (p) => `/rest/projects/${p}/folders`,
  crearCarpeta: (p, name, parentFolderId) => req('POST', n8nApi.fo(p), parentFolderId ? { name, parentFolderId } : { name }),
  crearCarpetaOk: (p, name, parentFolderId) => n8nApi.crearCarpeta(p, name, parentFolderId).then(ok),
  actualizarCarpeta: (p, id, body) => req('PATCH', `${n8nApi.fo(p)}/${id}`, body),
  arbol: (p, id) => req('GET', `${n8nApi.fo(p)}/${id}/tree`).then(ok),
  contenido: (p, id) => req('GET', `${n8nApi.fo(p)}/${id}/content`).then(ok),
  listarCarpetas: (p) => req('GET', `${n8nApi.fo(p)}?take=250`).then(ok),
  borrarCarpeta: (p, id, transferToFolderId) =>
    req('DELETE', `${n8nApi.fo(p)}/${id}${transferToFolderId ? `?transferToFolderId=${transferToFolderId}` : ''}`),

  crearWorkflow: (name, parentFolderId, projectId) =>
    req('POST', '/rest/workflows', {
      name, nodes: [], connections: {}, settings: {}, active: false,
      ...(parentFolderId ? { parentFolderId } : {}), ...(projectId ? { projectId } : {}),
    }).then(ok),
  obtenerWorkflow: (id) => req('GET', `/rest/workflows/${id}`).then(ok),
  moverWorkflow: (wf, parentFolderId) =>
    req('PATCH', `/rest/workflows/${wf.id}`, { versionId: wf.versionId, parentFolderId }),

  // ----------------------------------------------------------------------- Workflows publicados (webhook)
  /** Nodo Webhook en la ruta dada. `lastNode` responde con la salida del último nodo. */
  nodoWebhook: (metodo, ruta, responseMode = 'lastNode') => ({
    id: `webhook-${ruta}-${metodo}`, name: 'Webhook', type: 'n8n-nodes-base.webhook', typeVersion: 2,
    position: [0, 0], webhookId: crypto.randomUUID(),
    parameters: { httpMethod: metodo, path: ruta, responseMode, options: {} },
  }),
  /** Ruta de webhook única para que las pruebas no choquen entre sí. */
  rutaUnica: (prefijo = 'vyv') => `${prefijo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  /** Crea un workflow y lo publica (activa). Devuelve el workflow guardado. */
  crearWorkflowActivo: (nombre, nodes, connections, projectId) =>
    req('POST', '/rest/workflows', { name: nombre, nodes, connections, settings: {}, active: false, ...(projectId ? { projectId } : {}) })
      .then(ok)
      .then((wf) =>
        req('POST', `/rest/workflows/${wf.id}/activate`, { versionId: wf.versionId }).then((r) => {
          expect(r.status, `publicar: ${JSON.stringify(r.body).slice(0, 200)}`).to.eq(200);
          return r.body.data ?? wf;
        }),
      ),
  desactivarWorkflow: (id) => req('POST', `/rest/workflows/${id}/deactivate`),
  /** n8n registra el webhook poco después de publicar: se reintenta mientras responde 404. */
  llamarWebhook: (metodo, ruta, body = {}, intentos = 10) =>
    cy.request({ method: metodo, url: `/webhook/${ruta}`, body, failOnStatusCode: false }).then((r) =>
      r.status === 404 && intentos > 1
        ? cy.wait(500).then(() => n8nApi.llamarWebhook(metodo, ruta, body, intentos - 1))
        : r,
    ),
  // ----------------------------------------------------------------------- Credenciales
  /** Credencial Header Auth (cabecera `cabecera: valor`). Devuelve la credencial creada. */
  crearCredencialHeader: (name, cabecera, valor, projectId) =>
    req('POST', '/rest/credentials', {
      name, type: 'httpHeaderAuth', data: { name: cabecera, value: valor }, ...(projectId ? { projectId } : {}),
    }).then(ok),
  borrarCredencial: (id) => req('DELETE', `/rest/credentials/${id}`),
  /** Workflow de eco: un Webhook que responde con lo que recibe, incluidas las cabeceras. */
  crearEco: () => {
    const ruta = n8nApi.rutaUnica('vyv-eco');
    return n8nApi.crearWorkflowActivo('VyV eco de cabeceras', [n8nApi.nodoWebhook('GET', ruta)], {}).then((wf) => ({ wf, ruta }));
  },
  /** Nodo HTTP Request que llama a `url` con la credencial Header Auth dada (o sin credencial). */
  nodoHttpCredencial: (url, cred, name = 'HTTP Request', position = [220, 0]) => ({
    id: `http-${name}`, name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position,
    parameters: { url, authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', options: {} },
    ...(cred ? { credentials: { httpHeaderAuth: { id: cred.id, name: cred.name } } } : {}),
  }),

  /** Ejecuciones de un workflow (las más recientes primero). */
  ejecuciones: (workflowId, limit = 100) =>
    req('GET', `/rest/executions?filter=${encodeURIComponent(JSON.stringify({ workflowId }))}&limit=${limit}`)
      .then(ok)
      .then((d) => d.results ?? d),
  /** Espera hasta que el workflow tenga `n` ejecuciones que cumplan `cond` (n8n las guarda tras responder). */
  esperarEjecuciones: (workflowId, n = 1, cond = () => true, intentos = 30) =>
    n8nApi.ejecuciones(workflowId).then((lista) => {
      const listas = lista.filter(cond);
      return listas.length >= n || intentos <= 1
        ? listas
        : cy.wait(500).then(() => n8nApi.esperarEjecuciones(workflowId, n, cond, intentos - 1));
    }),
  /** Detalle de una ejecución con `data` decodificado (n8n lo guarda serializado con flatted). */
  detalleEjecucion: (id) =>
    req('GET', `/rest/executions/${id}`).then(ok).then((e) => ({ ...e, data: e?.data ? parse(e.data) : undefined })),

  // ----------------------------------------------------------------------- Nodos de uso común
  /** Nodo Edit Fields (Set) que devuelve los campos dados. */
  nodoCampos: (campos, name = 'Edit Fields', position = [220, 0]) => ({
    id: `set-${name}`, name, type: 'n8n-nodes-base.set', typeVersion: 3.4, position,
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: Object.entries(campos).map(([campo, value], i) => ({
          id: String(i), name: campo, value, type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string',
        })),
      },
      options: {},
    },
  }),
  /** Nodo Stop and Error que hace fallar la ejecución con el mensaje dado. */
  nodoFalla: (mensaje, name = 'Falla', position = [220, 0]) => ({
    id: `err-${name}`, name, type: 'n8n-nodes-base.stopAndError', typeVersion: 1, position, parameters: { errorMessage: mensaje },
  }),
  /** Nodo Wait de `amount` unidades (`seconds` o `minutes`). */
  nodoEspera: (amount, unit = 'seconds', name = 'Wait', position = [220, 0]) => ({
    id: `wait-${name}`, name, type: 'n8n-nodes-base.wait', typeVersion: 1.1, position,
    webhookId: crypto.randomUUID(), parameters: { amount, unit },
  }),
  /** Conexiones `main` en cadena: cadena('A', 'B', 'C') conecta A → B → C. */
  cadena: (...nombres) =>
    Object.fromEntries(nombres.slice(0, -1).map((n, i) => [n, { main: [[{ node: nombres[i + 1], type: 'main', index: 0 }]] }])),
};
