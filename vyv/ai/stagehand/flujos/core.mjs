/**
 * Módulo 4 · Core (CO-01 … CO-05). Complementa los 3 flujos del script original
 * (stagehand-datatables-carpetas.mjs: crear tabla/columna, añadir fila, crear carpeta).
 */
import { z } from 'zod';
import { fileURLToPath } from 'node:url';
import { URL_N8N, afirmar, pausa, unico } from '../lib.mjs';

const CSV = (n) => fileURLToPath(new URL(`../../../e2e/fixtures/csv/${n}`, import.meta.url));

export const flujos = [
  {
    id: 'CO-01', nombre: 'Crear una data table con un nombre de solo espacios no es posible (BUG-016-01)',
    async run({ page }) {
      await page.goto(`${URL_N8N}/home/datatables`);
      await page.act('Haz clic en el botón para crear una nueva data table');
      await page.act('Selecciona la opción "From scratch"');
      await page.act('Escribe tres espacios en el campo del nombre de la data table');
      const r = await page.extract({ instruction: 'Indica si el botón para continuar o crear la data table está habilitado (clicable) o deshabilitado',
        schema: z.object({ habilitado: z.boolean() }) });
      afirmar(r.habilitado === false, 'con un nombre de solo espacios el botón debe estar deshabilitado');
    },
  },
  {
    id: 'CO-02', nombre: 'Filas: los datos insertados por API se ven y se filtran en la cuadrícula',
    async run({ page, api, limpiar }) {
      const p = await api.proyecto();
      const nombre = unico('vyv_sh_filas');
      const t = (await api.pedir('POST', `/rest/projects/${p}/data-tables`, { name: nombre, columns: [{ name: 'nombre', type: 'string' }, { name: 'edad', type: 'number' }] })).datos;
      limpiar(() => api.borrarTabla(t.id));
      await api.pedir('POST', `/rest/projects/${p}/data-tables/${t.id}/insert`, { data: [{ nombre: 'Ana', edad: 25 }, { nombre: 'Luis', edad: 32 }, { nombre: 'Marta', edad: 41 }], returnType: 'all' });
      await page.goto(`${URL_N8N}/projects/${p}/datatables/${t.id}`);
      await pausa(2000);
      const r = await page.extract({ instruction: 'Extrae los nombres de la columna nombre de todas las filas visibles', schema: z.object({ nombres: z.array(z.string()) }) });
      afirmar(['Ana', 'Luis', 'Marta'].every((n) => r.nombres.includes(n)), `filas: ${JSON.stringify(r.nombres)}`);
    },
  },
  {
    id: 'CO-03', nombre: 'Importar un CSV desde el modal de nueva data table',
    async run({ page, api, limpiar }) {
      const nombre = unico('vyv_sh_csv');
      await page.goto(`${URL_N8N}/home/datatables`);
      await page.act('Haz clic en el botón para crear una nueva data table');
      await page.act(`Escribe "${nombre}" en el campo del nombre de la data table`);
      await page.act('Selecciona la opción para importar un archivo CSV');
      // La selección de archivos del sistema operativo no se puede hacer con lenguaje natural: paso determinista.
      await page.setInputFiles('input[type="file"]', CSV('valido.csv'));
      await page.act('Haz clic en el botón para continuar');
      await pausa(1500);
      const vista = await page.extract({ instruction: 'Extrae los nombres de las columnas de la vista previa de importación', schema: z.object({ columnas: z.array(z.string()) }) });
      afirmar(['nombre', 'edad', 'activo', 'fecha'].every((c) => vista.columnas.includes(c)), `columnas: ${JSON.stringify(vista.columnas)}`);
      await page.act('Confirma la creación de la data table');
      await pausa(2500);
      const t = (await api.tablas()).find((x) => x.name === nombre);
      afirmar(!!t, 'la tabla importada debe existir');
      limpiar(() => api.borrarTabla(t.id));
      const filas = await api.pedir('GET', `/rest/projects/${await api.proyecto()}/data-tables/${t.id}/rows?take=50`);
      afirmar((filas.datos.data ?? filas.datos).length === 5, 'la tabla debe tener las 5 filas del CSV');
    },
  },
  {
    id: 'CO-04', nombre: 'Crear una subcarpeta y navegar con las migas de pan',
    async run({ page, api, limpiar }) {
      const padre = await api.crearCarpeta(unico('VyV SH padre'));
      limpiar(() => api.borrarCarpeta(padre.id));
      const hija = unico('VyV SH hija');
      const p = await api.proyecto();
      await page.goto(`${URL_N8N}/projects/${p}/folders/${padre.id}/workflows`);
      await page.act('Abre el menú para crear un recurso nuevo y elige crear una carpeta (Folder)');
      await page.act(`Escribe "${hija}" como nombre de la carpeta y confírmala`);
      await pausa(2000);
      const lista = await page.extract({ instruction: 'Extrae los nombres de las tarjetas de carpeta visibles', schema: z.object({ carpetas: z.array(z.string()) }) });
      afirmar(lista.carpetas.some((c) => c.includes(hija)), `carpetas: ${JSON.stringify(lista.carpetas)}`);
      await page.act(`Haz clic en la carpeta "${hija}" para abrirla`);
      const miga = await page.extract({ instruction: 'Extrae el nombre de la carpeta actual en las migas de pan (breadcrumbs)', schema: z.object({ actual: z.string() }) });
      afirmar(miga.actual.includes(hija), `miga actual: ${miga.actual}`);
    },
  },
  {
    id: 'CO-05', nombre: 'Eliminar una carpeta transfiriendo su contenido',
    async run({ page, api, limpiar }) {
      const origen = await api.crearCarpeta(unico('VyV SH origen'));
      const destino = await api.crearCarpeta(unico('VyV SH destino'));
      limpiar(() => api.borrarCarpeta(destino.id));
      const wf = await api.crearWorkflow(unico('WF SH trasladado'), [], {}, { parentFolderId: origen.id });
      limpiar(() => api.borrarWorkflow(wf.id));
      const p = await api.proyecto();
      await page.goto(`${URL_N8N}/projects/${p}/folders/${origen.id}/workflows`);
      await page.act('Abre el menú de acciones de la carpeta actual (tres puntos junto a las migas de pan) y elige Delete');
      await page.act('Selecciona la opción de transferir el contenido a otra carpeta');
      await page.act(`Elige la carpeta destino "${destino.name}" en el selector`);
      await page.act('Confirma la eliminación de la carpeta');
      await pausa(2500);
      const carpetas = await api.carpetas();
      afirmar(!carpetas.some((c) => c.id === origen.id), 'la carpeta origen debe haberse eliminado');
      const mov = (await api.pedir('GET', `/rest/workflows/${wf.id}`)).datos;
      afirmar(mov.parentFolder?.id === destino.id, `el workflow debe estar en la carpeta destino (está en ${mov.parentFolder?.id})`);
    },
  },
];
