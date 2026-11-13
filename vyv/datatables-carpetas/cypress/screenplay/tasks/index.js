import { actividad } from '../Actor.js';
import { CallAnApi } from '../abilities/index.js';
import { Navigate, Click, Enter } from '../interactions/index.js';

/**
 * Tareas de negocio. Las tareas de UI usan interacciones; la preparación de datos usa la API
 * (más rápida y estable) para que cada escenario sea independiente (FIRST: Independent, Repeatable).
 */
export const CreateDataTable = {
  named: (nombre) =>
    actividad(`crear la data table "${nombre}" desde la interfaz`, (actor) => {
      actor.remember('tabla', nombre);
      actor.attemptsTo(
        Navigate.to('/home/datatables'),
        actividad('abrir el modal de nueva data table', () => cy.abrirModalDataTable()),
        Enter.theValue(nombre).into('data-table-name-input-select'),
        Click.on('create-from-scratch-option'),
        Click.on('proceed-from-select-button'),
      );
    }),
};

export const PrepareDataTable = {
  withColumns: (nombre, columnas) =>
    actividad(`preparar por API la tabla "${nombre}"`, (actor) => {
      const { api } = actor.abilityTo(CallAnApi);
      actor.abilityTo(CallAnApi).proyecto().then((p) => {
        api.crearTablaOk(p, nombre, columnas).then((t) => {
          actor.remember('proyecto', p).remember('tablaId', t.id).remember('tabla', nombre);
        });
      });
    }),
};

export const AddColumn = {
  named: (nombre, tipo) =>
    actividad(`añadir la columna ${nombre}:${tipo} por API`, (actor) => {
      const { api } = actor.abilityTo(CallAnApi);
      api.crearColumna(actor.recall('proyecto'), actor.recall('tablaId'), nombre, tipo).then((r) => {
        actor.remember('ultimaRespuesta', r);
      });
    }),
};

export const ImportCsv = {
  file: (fixture) =>
    actividad(`subir el archivo ${fixture}`, (actor) => {
      const { api } = actor.abilityTo(CallAnApi);
      api.subirArchivo(`csv/${fixture}`, fixture).then((r) => actor.remember('ultimaRespuesta', r));
    }),
};

export const CreateFolder = {
  named: (nombre, padreClave) =>
    actividad(`crear la carpeta "${nombre}"`, (actor) => {
      const ab = actor.abilityTo(CallAnApi);
      ab.proyecto().then((p) => {
        const padre = padreClave ? actor.recall(`carpeta:${padreClave}`).id : undefined;
        ab.api.crearCarpeta(p, nombre, padre).then((r) => {
          actor.remember('proyecto', p).remember('ultimaRespuesta', r);
          if (r.status === 200) actor.remember(`carpeta:${nombre}`, r.body.data);
        });
      });
    }),
};

export const MoveFolder = {
  named: (nombre) => ({
    into: (destino) =>
      actividad(`mover la carpeta "${nombre}" a "${destino}"`, (actor) => {
        const { api } = actor.abilityTo(CallAnApi);
        const origen = actor.recall(`carpeta:${nombre}`);
        const dest = actor.recall(`carpeta:${destino}`);
        api.actualizarCarpeta(actor.recall('proyecto'), origen.id, { parentFolderId: dest.id })
          .then((r) => actor.remember('ultimaRespuesta', r));
      }),
  }),
};

export const DeleteFolder = {
  named: (nombre) => ({
    transferringTo: (destino) =>
      actividad(`eliminar "${nombre}" transfiriendo a "${destino ?? '—'}"`, (actor) => {
        const { api } = actor.abilityTo(CallAnApi);
        const id = actor.recall(`carpeta:${nombre}`).id;
        const destId = destino ? actor.recall(`carpeta:${destino}`).id : undefined;
        api.borrarCarpeta(actor.recall('proyecto'), id, destId).then((r) => actor.remember('ultimaRespuesta', r));
      }),
  }),
};

export const CreateWorkflow = {
  named: (nombre) => ({
    inFolder: (carpeta) =>
      actividad(`crear el workflow "${nombre}" en "${carpeta}"`, (actor) => {
        const { api } = actor.abilityTo(CallAnApi);
        api.crearWorkflow(nombre, actor.recall(`carpeta:${carpeta}`).id).then((wf) => actor.remember(`wf:${nombre}`, wf));
      }),
  }),
};

export const OpenFolder = {
  named: (nombre) =>
    actividad(`abrir la carpeta "${nombre}" en el editor`, (actor) => {
      const c = actor.recall(`carpeta:${nombre}`);
      actor.attemptsTo(Navigate.to(`/projects/${actor.recall('proyecto')}/folders/${c.id}/workflows`));
    }),
};

export { Click };
