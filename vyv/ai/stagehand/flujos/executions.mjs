/** Módulo 2 · Ejecuciones (EX-01 … EX-05). */
import { z } from 'zod';
import { URL_N8N, afirmar, pausa, unico } from '../lib.mjs';

const montarWebhook = async (api, nombre, nodoFinal) => {
  const ruta = unico('vyv-sh-ex').replace(/_/g, '-');
  const wf = await api.crearWorkflow(nombre, [api.nodoWebhook(ruta), nodoFinal], api.cadena('Webhook', nodoFinal.name));
  await api.publicar(wf);
  return { wf, ruta };
};

export const flujos = [
  {
    id: 'EX-01', nombre: 'Lista de ejecuciones: ver las ejecuciones con su estado',
    async run({ page, api, limpiar }) {
      const { wf, ruta } = await montarWebhook(api, unico('VyV SH lista'), api.nodoCampos({ ok: true }));
      limpiar(() => api.borrarWorkflow(wf.id));
      for (let i = 0; i < 3; i++) await api.llamarWebhook(ruta);
      await api.esperarEjecuciones(wf.id, 3);
      await page.goto(`${URL_N8N}/workflow/${wf.id}`);
      await page.act('Abre la pestaña Executions del workflow');
      await pausa(2000);
      const r = await page.extract({ instruction: 'Extrae el estado de cada ejecución que aparece en la lista (Success, Error, Running...)',
        schema: z.object({ estados: z.array(z.string()) }) });
      afirmar(r.estados.length >= 3 && r.estados.every((e) => /success|succeeded/i.test(e)), `estados: ${JSON.stringify(r.estados)}`);
    },
  },
  {
    id: 'EX-02', nombre: 'Filtros: filtrar la lista por estado Error',
    async run({ page, api, limpiar }) {
      const { wf, ruta } = await montarWebhook(api, unico('VyV SH filtro'), api.nodoFalla('fallo-intencional-sh'));
      limpiar(() => api.borrarWorkflow(wf.id));
      await api.llamarWebhook(ruta);
      await api.esperarEjecuciones(wf.id, 1);
      await page.goto(`${URL_N8N}/home/executions`);
      await page.act('Abre el panel de filtros de la lista de ejecuciones');
      await page.act('Filtra por estado "Error"');
      await pausa(2000);
      const r = await page.extract({ instruction: 'Extrae el estado de todas las ejecuciones visibles en la tabla',
        schema: z.object({ estados: z.array(z.string()) }) });
      afirmar(r.estados.length >= 1 && r.estados.every((e) => /error|fail/i.test(e)), `con el filtro Error se vieron: ${JSON.stringify(r.estados)}`);
    },
  },
  {
    id: 'EX-03', nombre: 'Vista previa y eliminación de una ejecución',
    async run({ page, api, limpiar }) {
      const { wf, ruta } = await montarWebhook(api, unico('VyV SH borrar'), api.nodoCampos({ ok: true }));
      limpiar(() => api.borrarWorkflow(wf.id));
      await api.llamarWebhook(ruta);
      const [ej] = await api.esperarEjecuciones(wf.id, 1);
      await page.goto(`${URL_N8N}/workflow/${wf.id}/executions/${ej.id}`);
      await pausa(2000);
      const vista = await page.extract({ instruction: 'Indica si se ve una vista previa del workflow con sus nodos y el estado de la ejecución',
        schema: z.object({ hayVistaPrevia: z.boolean() }) });
      afirmar(vista.hayVistaPrevia, 'la vista previa de la ejecución no se muestra');
      await page.act('Elimina esta ejecución desde su menú de acciones (Delete)');
      await page.act('Confirma la eliminación en el diálogo');
      await pausa(2000);
      const restantes = await api.ejecuciones(wf.id);
      afirmar(!restantes.some((e) => e.id === ej.id), 'la ejecución debe haberse eliminado');
    },
  },
  {
    id: 'EX-04', nombre: 'Detener una ejecución en curso',
    async run({ page, api, limpiar }) {
      const wf = await api.crearWorkflow(unico('VyV SH detener'), [api.nodoManual(), api.nodoEspera(60)], api.cadena('Manual Trigger', 'Wait'));
      limpiar(() => api.borrarWorkflow(wf.id));
      await page.goto(`${URL_N8N}/workflow/${wf.id}`);
      await page.act('Haz clic en el botón para ejecutar el workflow (Execute workflow)');
      await pausa(3000);
      await page.act('Haz clic en el botón para detener la ejecución (Stop execution)');
      await pausa(3000);
      const lista = await api.ejecuciones(wf.id);
      afirmar(lista.length >= 1 && !lista.some((e) => e.status === 'running'), `estados tras detener: ${lista.map((e) => e.status)}`);
    },
  },
  {
    id: 'EX-05', nombre: 'Panel de logs: mostrar los nodos ejecutados',
    async run({ page, api, limpiar }) {
      const wf = await api.crearWorkflow(unico('VyV SH logs'), [api.nodoManual(), api.nodoCampos({ a: 1 }, 'Paso A'), api.nodoCampos({ b: 2 }, 'Paso B')],
        api.cadena('Manual Trigger', 'Paso A', 'Paso B'));
      limpiar(() => api.borrarWorkflow(wf.id));
      await page.goto(`${URL_N8N}/workflow/${wf.id}`);
      await page.act('Haz clic en el botón para ejecutar el workflow');
      await pausa(3000);
      await page.act('Abre el panel de logs en la parte inferior del editor si no está visible');
      const r = await page.extract({ instruction: 'Extrae los nombres de los nodos que aparecen en el panel de logs',
        schema: z.object({ nodos: z.array(z.string()) }) });
      afirmar(['Manual Trigger', 'Paso A', 'Paso B'].every((n) => r.nodos.some((x) => x.includes(n))), `logs: ${JSON.stringify(r.nodos)}`);
    },
  },
];
