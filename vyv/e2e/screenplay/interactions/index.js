import { actividad } from '../Actor.js';
import { BrowseTheWeb } from '../abilities/index.js';

/** Interacciones atómicas sobre la interfaz. */
export const Navigate = {
  to: (ruta) => actividad(`navegar a ${ruta}`, (actor) => actor.abilityTo(BrowseTheWeb).visitar(ruta)),
};

export const Click = {
  on: (testId, opciones = {}) =>
    actividad(`hacer clic en [${testId}]`, () => cy.tid(testId).first().click(opciones)),
  onText: (texto) => actividad(`hacer clic en "${texto}"`, () => cy.contains(texto).click()),
};

export const Enter = {
  theValue: (valor) => ({
    into: (testId) =>
      actividad(`escribir "${valor}" en [${testId}]`, () => {
        cy.campo(testId).clear().type(valor);
      }),
  }),
};

export const Press = {
  key: (tecla) => actividad(`presionar ${tecla}`, () => cy.focused().type(`{${tecla}}`)),
};
