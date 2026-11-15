/**
 * Interfaces seleccionadas para las pruebas de accesibilidad: al menos una por módulo del plan, las
 * pantallas que más usa una persona en cada funcionalidad. `ruta(d)` recibe los datos de prueba que crea
 * `prepararDatos()` y `listo` es el elemento que indica que la vista terminó de cargar.
 */
import { n8nApi } from '../support/api.js';

export const INTERFACES = [
  { id: 'I-00', modulo: '—', funcionalidad: 'Acceso', nombre: 'Inicio de sesión', ruta: () => '/signin', listo: 'emailOrLdapLoginId', sinSesion: true },
  { id: 'I-01', modulo: '1 · Workflows', funcionalidad: 'WF-01, WF-05', nombre: 'Lista de workflows', ruta: () => '/home/workflows', listo: 'resources-list-item-workflow' },
  { id: 'I-02', modulo: '1 · Workflows', funcionalidad: 'WF-01, WF-02, WF-03', nombre: 'Editor de workflows (lienzo)', ruta: (d) => `/workflow/${d.wf}`, listo: 'canvas-node' },
  { id: 'I-03', modulo: '1 · Workflows', funcionalidad: 'WF-04', nombre: 'Historial de versiones', ruta: (d) => `/workflow/${d.wf}/history`, listo: 'workflow-history-list-item' },
  { id: 'I-04', modulo: '2 · Ejecuciones', funcionalidad: 'EX-01, EX-02, EX-04', nombre: 'Lista global de ejecuciones', ruta: () => '/home/executions', listo: 'global-execution-list-item' },
  { id: 'I-05', modulo: '2 · Ejecuciones', funcionalidad: 'EX-03, EX-05', nombre: 'Ejecuciones del workflow y vista previa', ruta: (d) => `/workflow/${d.wf}/executions/${d.ejecucion}`, listo: 'execution-preview-host' },
  { id: 'I-06', modulo: '3 · Credenciales', funcionalidad: 'CR-05', nombre: 'Lista de credenciales', ruta: () => '/home/credentials', listo: 'resources-list-item' },
  { id: 'I-07', modulo: '3 · Credenciales', funcionalidad: 'CR-01, CR-02', nombre: 'Formulario de una credencial', ruta: (d) => `/home/credentials/${d.credencial}`, listo: 'editCredential-modal' },
  { id: 'I-08', modulo: '4 · Core', funcionalidad: 'CO-01', nombre: 'Lista de data tables', ruta: () => '/home/datatables', listo: 'data-table-card' },
  { id: 'I-09', modulo: '4 · Core', funcionalidad: 'CO-02, CO-03', nombre: 'Detalle de una data table', ruta: (d) => `/projects/${d.proyecto}/datatables/${d.tabla}`, listo: 'data-table-details-view' },
  { id: 'I-10', modulo: '4 · Core', funcionalidad: 'CO-04, CO-05', nombre: 'Carpeta con migas de pan', ruta: (d) => `/projects/${d.proyecto}/folders/${d.carpeta}/workflows`, listo: 'breadcrumbs-item-current' },
  // Sin URL propia: se abre desde I-08 (Lighthouse no lo audita).
  { id: 'I-11', modulo: '4 · Core', funcionalidad: 'CO-01, CO-03', nombre: 'Modal de nueva data table', ruta: () => '/home/datatables', listo: 'data-table-card', abrir: () => cy.abrirModalDataTable() },
];

export const porId = (id) => INTERFACES.find((i) => i.id === id);

/**
 * Crea los datos que necesitan las vistas (un workflow publicado con una ejecución, una credencial, una data
 * table con filas y una carpeta con un workflow) y los guarda en results/a11y/datos.json para Lighthouse.
 * Los datos se quedan en la instancia de pruebas para que Lighthouse pueda abrir las mismas vistas.
 */
export const prepararDatos = () => {
  const d = {};
  cy.proyectoPersonal().then((p) => { d.proyecto = p; });
  const ruta = n8nApi.rutaUnica('vyv-a11y');
  n8nApi.crearWorkflowActivo('VyV A11y workflow', [n8nApi.nodoWebhook('GET', ruta), n8nApi.nodoCampos({ cliente: 'Ana', total: 42 })], n8nApi.cadena('Webhook', 'Edit Fields'))
    .then((wf) => {
      d.wf = wf.id;
      n8nApi.llamarWebhook('GET', ruta).its('status').should('eq', 200);
      n8nApi.esperarEjecuciones(wf.id, 1, (e) => e.status === 'success').then(([e]) => { d.ejecucion = e.id; });
    });
  n8nApi.crearCredencialHeader('VyV A11y credencial', 'X-Token', 'valor-de-prueba').then((c) => { d.credencial = c.id; });
  cy.then(() => cy.nombreUnico('vyv_a11y')).then((n) =>
    n8nApi.crearTablaOk(d.proyecto, n, [{ name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' }]).then((t) => {
      d.tabla = t.id;
      n8nApi.insertar(d.proyecto, t.id, [{ nombre: 'Ana', edad: 30 }, { nombre: 'Luis', edad: 41 }]);
    }));
  cy.then(() => cy.nombreUnico('VyV A11y carpeta')).then((n) =>
    n8nApi.crearCarpetaOk(d.proyecto, n).then((c) => {
      d.carpeta = c.id;
      n8nApi.crearWorkflow('VyV A11y en carpeta', c.id);
    }));
  return cy.then(() => {
    const urls = Object.fromEntries(INTERFACES.filter((i) => !i.abrir).map((i) => [i.id, i.ruta(d)]));
    return cy.writeFile('results/a11y/datos.json', { ...d, urls }).then(() => d);
  });
};

/** Abre la interfaz (con o sin sesión) y espera a que esté lista. `tema` 'dark' usa el parámetro ?theme= de n8n. */
export const abrir = (interfaz, d, { tema } = {}) => {
  const ruta = `${interfaz.ruta(d)}${tema ? `${interfaz.ruta(d).includes('?') ? '&' : '?'}theme=${tema}` : ''}`;
  if (interfaz.sinSesion) {
    cy.clearAllCookies();
    cy.visit(ruta);
  } else {
    cy.visitarN8n(ruta);
  }
  cy.tid(interfaz.listo, { timeout: 30000 }).should('exist');
  if (interfaz.abrir) interfaz.abrir();
  // Las animaciones de entrada terminan antes de medir.
  cy.wait(800);
};
