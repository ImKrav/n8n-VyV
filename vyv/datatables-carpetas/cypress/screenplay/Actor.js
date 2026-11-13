/**
 * Patrón Screenplay (implementación ligera para Cypress).
 *
 *  Actor        → quién usa el sistema (p. ej. "Ana, analista de datos").
 *  Habilidades  → qué puede hacer: navegar el editor (BrowseTheWeb) y llamar la API (CallAnApi).
 *  Interacciones→ acciones atómicas sobre la UI (clic, escribir, visitar).
 *  Tareas       → acciones de negocio compuestas de interacciones (crear tabla, mover carpeta…).
 *  Preguntas    → consultas sobre el estado del sistema que se verifican con aserciones.
 *
 * Serenity/JS no tiene integración oficial con Cypress, por eso se implementa el patrón
 * directamente, manteniendo sus cuatro elementos y su lenguaje (attemptsTo / asks / remembers).
 */
export class Actor {
  static named(nombre) { return new Actor(nombre); }

  constructor(nombre) {
    this.nombre = nombre;
    this.habilidades = new Map();
    this.memoria = new Map();
  }

  whoCan(...habilidades) {
    habilidades.forEach((h) => this.habilidades.set(h.constructor, h));
    return this;
  }

  abilityTo(Tipo) {
    const h = this.habilidades.get(Tipo);
    if (!h) throw new Error(`${this.nombre} no tiene la habilidad ${Tipo.name}`);
    return h;
  }

  /** Ejecuta tareas o interacciones en orden (cada una expone performAs(actor)). */
  attemptsTo(...actividades) {
    actividades.forEach((a) => {
      cy.log(`🎭 ${this.nombre} intenta: ${a.toString()}`);
      a.performAs(this);
    });
    return this;
  }

  /** Responde una pregunta (cada pregunta expone answeredBy(actor) y devuelve un Chainable). */
  asks(pregunta) {
    cy.log(`❓ ${this.nombre} pregunta: ${pregunta.toString()}`);
    return pregunta.answeredBy(this);
  }

  remember(clave, valor) { this.memoria.set(clave, valor); return this; }
  recall(clave) {
    if (!this.memoria.has(clave)) throw new Error(`${this.nombre} no recuerda "${clave}"`);
    return this.memoria.get(clave);
  }
}

/** Utilidad para crear actividades con descripción legible en el log. */
export const actividad = (descripcion, fn) => ({ performAs: fn, toString: () => descripcion });
export const pregunta = (descripcion, fn) => ({ answeredBy: fn, toString: () => descripcion });
