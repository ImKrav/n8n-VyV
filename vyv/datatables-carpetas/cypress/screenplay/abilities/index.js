import { n8nApi } from '../../support/api.js';

/** Habilidad: navegar el editor web de n8n con sesión iniciada. */
export class BrowseTheWeb {
  static withCypress() { return new BrowseTheWeb(); }
  visitar(ruta) { cy.visitarN8n(ruta); }
}

/** Habilidad: usar la API REST interna de n8n (prepara datos y verifica estado). */
export class CallAnApi {
  static atN8n() { return new CallAnApi(); }
  get api() { return n8nApi; }
  proyecto() { return cy.proyectoPersonal(); }
}
