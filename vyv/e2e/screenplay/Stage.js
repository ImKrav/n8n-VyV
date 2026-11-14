/**
 * Escena (Stage) del patrón Screenplay: guarda el actor en foco entre los pasos de Gherkin y los
 * recursos que crea cada escenario, para borrarlos al terminar (FIRST: Independent, Repeatable).
 * Los pasos de los cuatro módulos están en archivos distintos y comparten el actor por aquí.
 */
import { Actor } from './Actor.js';
import { BrowseTheWeb, CallAnApi } from './abilities/index.js';

let enFoco;
let sufijo = '';
let creados = [];

export const Stage = {
  /** Se llama antes de cada escenario. */
  reset() {
    enFoco = undefined;
    sufijo = Date.now().toString(36);
    creados = [];
  },
  actorCalled(nombre) {
    enFoco = Actor.named(nombre).whoCan(BrowseTheWeb.withCypress(), CallAnApi.atN8n());
    return enFoco;
  },
  actorInTheSpotlight() {
    if (!enFoco) throw new Error('No hay actor en escena: falta el paso «Dado que … es una usuaria con sesión iniciada en n8n»');
    return enFoco;
  },
  sufijo: () => sufijo,
  /** Los nombres de Gherkin que empiezan por «vyv_» se hacen únicos por ejecución. */
  unico: (nombre) => (nombre.startsWith('vyv_') ? `${nombre}_${sufijo}` : nombre),
  /** Prefijo común de los nombres que se buscan por un término parcial (p. ej. «vyvbddm1x2 Facturación»). */
  conPrefijo: (nombre) => `vyvbdd${sufijo} ${nombre}`,
  sinPrefijo: (nombre) => nombre.replace(`vyvbdd${sufijo} `, ''),
  /** Anota un recurso creado (workflow, credential o tag) para borrarlo al final del escenario. */
  registrar(tipo, id) { creados.push({ tipo, id }); },
  creados: () => [...creados].reverse(),
};
