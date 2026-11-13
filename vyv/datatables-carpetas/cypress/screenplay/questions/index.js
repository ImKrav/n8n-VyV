import { pregunta } from '../Actor.js';
import { CallAnApi } from '../abilities/index.js';
import { mensaje } from '../../support/api.js';

/** Preguntas: devuelven Chainables sobre los que se hacen aserciones fluidas (should/expect). */
export const LastResponse = {
  status: () => pregunta('el código HTTP de la última respuesta', (a) => cy.wrap(a.recall('ultimaRespuesta').status)),
  message: () => pregunta('el mensaje de la última respuesta', (a) => cy.wrap(mensaje(a.recall('ultimaRespuesta')))),
  body: () => pregunta('el cuerpo de la última respuesta', (a) => cy.wrap(a.recall('ultimaRespuesta').body)),
};

export const TableColumns = {
  names: () =>
    pregunta('los nombres de columnas de la tabla', (a) =>
      a.abilityTo(CallAnApi).api.columnas(a.recall('proyecto'), a.recall('tablaId')).then((cols) => cols.map((c) => c.name))),
};

export const DataTableCards = {
  displayed: () => pregunta('las tarjetas de data tables visibles', () => cy.tid('data-table-card')),
};

export const FolderPath = {
  of: (nombre) =>
    pregunta(`la ruta de la carpeta "${nombre}"`, (a) =>
      a.abilityTo(CallAnApi).api.arbol(a.recall('proyecto'), a.recall(`carpeta:${nombre}`).id).then((arbol) => {
        // El árbol devuelve la jerarquía desde la raíz; se aplana a nombres.
        const nombres = [];
        let nodo = Array.isArray(arbol) ? arbol[0] : arbol;
        while (nodo) { nombres.push(nodo.name); nodo = nodo.children?.[0]; }
        return nombres;
      })),
};

export const FolderContent = {
  of: (nombre) =>
    pregunta(`el contenido de "${nombre}"`, (a) =>
      a.abilityTo(CallAnApi).api.contenido(a.recall('proyecto'), a.recall(`carpeta:${nombre}`).id)),
};
