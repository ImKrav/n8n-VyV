/** Módulo 3 · Credenciales (CR-01 … CR-05). Nunca se envía ni se extrae un secreto real. */
import { z } from 'zod';
import { URL_N8N, afirmar, pausa, unico } from '../lib.mjs';

export const flujos = [
  {
    id: 'CR-01', nombre: 'Crear una credencial Header Auth desde la interfaz',
    async run({ page, api, limpiar }) {
      const nombre = unico('VyV SH cred');
      await page.goto(`${URL_N8N}/home/credentials`);
      await page.act('Abre el menú para crear un recurso nuevo y elige Credential (o el botón Create credential)');
      await page.act('Busca el tipo "Header Auth" y selecciónalo');
      await page.act('Haz clic en Continue');
      await pausa(1000);
      await page.act('En el campo Name del formulario escribe "X-API-Key"');
      await page.act('En el campo Value escribe "valor-de-prueba-vyv"');
      await page.act(`Cambia el nombre de la credencial (arriba del formulario) a "${nombre}"`);
      await page.act('Haz clic en Save');
      await pausa(2500);
      const creadas = await api.credenciales(nombre);
      afirmar(creadas.length === 1, `la credencial debe existir una vez (hay ${creadas.length})`);
      limpiar(() => api.borrarCredencial(creadas[0].id));
    },
  },
  {
    id: 'CR-02', nombre: 'Renombrar y eliminar una credencial',
    async run({ page, api, limpiar }) {
      const original = unico('VyV SH edit');
      const nuevo = `${original} renombrada`;
      const c = await api.crearCredencial(original);
      limpiar(() => api.borrarCredencial(c.id));
      await page.goto(`${URL_N8N}/home/credentials`);
      await page.act(`Escribe "${original}" en el buscador de credenciales`);
      await pausa(1500);
      await page.act(`Abre la credencial "${original}"`);
      await page.act(`Cambia el nombre de la credencial a "${nuevo}" y haz clic en Save`);
      await pausa(2000);
      afirmar((await api.credenciales(nuevo)).length === 1, 'el nombre nuevo debe persistir');
      await page.act('Cierra el diálogo de la credencial');
      await page.act(`Abre el menú de acciones de la tarjeta "${nuevo}" y elige Delete`);
      await page.act('Confirma la eliminación (Yes, delete)');
      await pausa(2000);
      afirmar((await api.credenciales(nuevo)).length === 0, 'la credencial debe haberse eliminado');
    },
  },
  {
    id: 'CR-03', nombre: 'OAuth2: el formulario muestra la URL de callback',
    async run({ page }) {
      await page.goto(`${URL_N8N}/home/credentials`);
      await page.act('Abre el menú para crear un recurso nuevo y elige Credential');
      await page.act('Busca el tipo "OAuth2 API" y selecciónalo, luego haz clic en Continue');
      await pausa(1500);
      const r = await page.extract({ instruction: 'Extrae la OAuth Redirect URL (callback) que muestra el formulario',
        schema: z.object({ redirectUrl: z.string() }) });
      afirmar(/\/rest\/oauth2-credential\/callback/.test(r.redirectUrl), `redirect URL: ${r.redirectUrl}`);
    },
  },
  {
    id: 'CR-04', nombre: 'Un nodo HTTP Request permite elegir una credencial existente',
    async run({ page, api, limpiar }) {
      const c = await api.crearCredencial(unico('VyV SH nodo'));
      limpiar(() => api.borrarCredencial(c.id));
      const http = { id: 'http', name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [220, 0],
        parameters: { url: 'https://example.com', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', options: {} } };
      const wf = await api.crearWorkflow(unico('VyV SH http'), [api.nodoManual(), http], api.cadena('Manual Trigger', 'HTTP Request'));
      limpiar(() => api.borrarWorkflow(wf.id));
      await page.goto(`${URL_N8N}/workflow/${wf.id}`);
      await page.act('Haz doble clic en el nodo "HTTP Request" para abrirlo');
      await page.act(`En el selector de credenciales del nodo elige "${c.name}"`);
      await pausa(1000);
      await page.act('Cierra el panel del nodo y guarda el workflow con Save');
      await pausa(2000);
      const leido = (await api.pedir('GET', `/rest/workflows/${wf.id}`)).datos;
      const asignada = leido.nodes.find((n) => n.name === 'HTTP Request')?.credentials?.httpHeaderAuth;
      afirmar(asignada?.id === c.id, `credencial asignada al nodo: ${JSON.stringify(asignada)}`);
    },
  },
  {
    id: 'CR-05', nombre: 'Listado: buscar y ordenar por nombre',
    async run({ page, api, limpiar }) {
      const pref = unico('vyvsh').replace(/_/g, '');
      for (const x of ['Charlie', 'Alpha', 'Bravo']) { const c = await api.crearCredencial(`${pref} ${x}`); limpiar(() => api.borrarCredencial(c.id)); }
      await page.goto(`${URL_N8N}/home/credentials`);
      await page.act(`Escribe "${pref}" en el buscador de credenciales`);
      await page.act('Abre el selector de orden y elige ordenar por nombre A-Z');
      await pausa(1500);
      const r = await page.extract({ instruction: `Extrae los nombres de las tarjetas de credenciales visibles, en el orden en que aparecen, que empiecen por ${pref}`,
        schema: z.object({ nombres: z.array(z.string()) }) });
      afirmar(JSON.stringify(r.nombres) === JSON.stringify([`${pref} Alpha`, `${pref} Bravo`, `${pref} Charlie`]), `orden mostrado: ${JSON.stringify(r.nombres)}`);
    },
  },
];
