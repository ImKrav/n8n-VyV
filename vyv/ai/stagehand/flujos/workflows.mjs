/** Módulo 1 · Workflows (WF-01 … WF-05). Instrucciones en lenguaje natural + verificación por API. */
import { z } from 'zod';
import { URL_N8N, afirmar, pausa, unico } from '../lib.mjs';

export const flujos = [
  {
    id: 'WF-01', nombre: 'Crear un workflow y añadir un nodo desde el lienzo',
    async run({ page, api, limpiar }) {
      const nombre = unico('VyV SH wf');
      await page.goto(`${URL_N8N}/home/workflows`);
      await page.act('Haz clic en el botón para crear un nuevo workflow (Create workflow o el botón +)');
      await pausa(1500);
      await page.act('Haz clic en el nombre del workflow en la parte superior para renombrarlo');
      await page.act(`Escribe "${nombre}" como nombre del workflow y presiona Enter`);
      await page.act('Haz clic en el botón + para añadir el primer paso o disparador');
      await page.act('Busca "Manual Trigger" y selecciónalo (o "Trigger manually")');
      await pausa(1000);
      await page.act('Presiona el botón Save para guardar el workflow');
      await pausa(2000);
      const wfs = await api.workflows(nombre);
      afirmar(wfs.length === 1, `el workflow "${nombre}" debe existir una vez (hay ${wfs.length})`);
      limpiar(() => api.borrarWorkflow(wfs[0].id));
      const r = await page.extract({ instruction: 'Extrae el nombre del workflow abierto y cuántos nodos hay en el lienzo',
        schema: z.object({ nombre: z.string(), nodos: z.number() }) });
      afirmar(r.nombre.includes(nombre) && r.nodos >= 1, `lienzo: ${JSON.stringify(r)}`);
    },
  },
  {
    id: 'WF-02', nombre: 'Abrir los ajustes del workflow y leer su configuración',
    async run({ page, api, limpiar }) {
      const wf = await api.crearWorkflow(unico('VyV SH ajustes'), [api.nodoManual()], {}, { settings: { timezone: 'America/Bogota', executionTimeout: 120 } });
      limpiar(() => api.borrarWorkflow(wf.id));
      await page.goto(`${URL_N8N}/workflow/${wf.id}`);
      await page.act('Abre el menú de opciones del workflow (los tres puntos) y elige Settings');
      await pausa(1000);
      const r = await page.extract({ instruction: 'Extrae la zona horaria (Timezone) que muestra el diálogo de ajustes del workflow',
        schema: z.object({ zonaHoraria: z.string() }) });
      afirmar(/bogot/i.test(r.zonaHoraria), `zona horaria mostrada: ${r.zonaHoraria}`);
    },
  },
  {
    id: 'WF-03', nombre: 'Publicar un workflow desde la interfaz y verificar el webhook',
    async run({ page, api, limpiar }) {
      const ruta = unico('vyv-sh-pub').replace(/_/g, '-');
      const wf = await api.crearWorkflow(unico('VyV SH publicar'), [api.nodoWebhook(ruta), api.nodoCampos({ ok: true })], api.cadena('Webhook', 'Edit Fields'));
      limpiar(() => api.borrarWorkflow(wf.id));
      await page.goto(`${URL_N8N}/workflow/${wf.id}`);
      await page.act('Haz clic en el botón Publish');
      await pausa(1000);
      await page.act('Confirma la publicación en el diálogo (botón Publish o Confirm)');
      await pausa(2500);
      const r = await api.llamarWebhook(ruta);
      afirmar(r.status === 200, `el webhook publicado debe responder 200 (respondió ${r.status})`);
    },
  },
  {
    id: 'WF-04', nombre: 'Historial de versiones: ver las versiones guardadas',
    async run({ page, api, limpiar }) {
      const wf = await api.crearWorkflow(unico('VyV SH historial'), [api.nodoManual()], {});
      limpiar(() => api.borrarWorkflow(wf.id));
      const g = await api.pedir('PATCH', `/rest/workflows/${wf.id}`, { versionId: wf.versionId, nodes: [api.nodoManual(), api.nodoCampos({ a: 1 })], connections: api.cadena('Manual Trigger', 'Edit Fields') });
      afirmar(g.status === 200, `segunda versión: ${g.status}`);
      await page.goto(`${URL_N8N}/workflow/${wf.id}`);
      await page.act('Abre el historial de versiones del workflow (Version history / icono de reloj o menú de opciones)');
      await pausa(1500);
      const r = await page.extract({ instruction: 'Extrae cuántas versiones se listan en el historial', schema: z.object({ versiones: z.number() }) });
      afirmar(r.versiones >= 1, `versiones listadas: ${r.versiones}`);
    },
  },
  {
    id: 'WF-05', nombre: 'Duplicar un workflow desde el menú',
    async run({ page, api, limpiar }) {
      const nombre = unico('VyV SH original');
      const wf = await api.crearWorkflow(nombre, [api.nodoManual(), api.nodoCampos({ a: 1 })], api.cadena('Manual Trigger', 'Edit Fields'));
      limpiar(() => api.borrarWorkflow(wf.id));
      await page.goto(`${URL_N8N}/workflow/${wf.id}`);
      await page.act('Abre el menú de opciones del workflow (tres puntos) y elige Duplicate');
      await pausa(1000);
      await page.act('Confirma la duplicación con el botón Duplicate o Save del diálogo');
      await pausa(3000);
      const copias = (await api.workflows(nombre)).filter((w) => w.id !== wf.id);
      afirmar(copias.length >= 1, 'debe existir una copia con el nombre original');
      copias.forEach((c) => limpiar(() => api.borrarWorkflow(c.id)));
    },
  },
];
