/**
 * Cliente de la API REST interna de n8n (/rest) usado por las pruebas de API, la preparación
 * de datos de las pruebas de UI y las tareas Screenplay.
 * Las respuestas de /rest vienen envueltas en { data: ... }.
 */
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
    cy.fixture(rutaFixture, 'binary').then((contenido) => {
      const form = new FormData();
      form.append('file', new Blob([Cypress.Buffer.from(contenido, 'binary')], { type: 'text/csv' }), nombre);
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
};
