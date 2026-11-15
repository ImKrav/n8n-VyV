/// <reference types="cypress" />
/**
 * Accesibilidad · comprobaciones manuales con guion (las que axe no cubre): teclado, foco, etiquetas,
 * contraste, mensajes y adaptación visual de las interfaces seleccionadas (accessibility/interfaces.js).
 * Cada comprobación registra en results/a11y/manual.json el criterio WCAG, la interfaz, el resultado
 * («cumple», «no cumple» o «revisar») y el detalle medido. Modo auditoría: las barreras no hacen fallar la
 * prueba; la prueba falla si la comprobación no se pudo hacer.
 */
import { INTERFACES, porId, prepararDatos, abrir } from './interfaces.js';

const registro = [];
const anotar = (criterio, interfaz, resultado, detalle) => {
  registro.push({ criterio, interfaz, resultado, detalle });
  cy.evidencia(`${criterio} · ${interfaz} · ${resultado}: ${typeof detalle === 'string' ? detalle : JSON.stringify(detalle)}`);
};

/** Nombre legible del elemento con el foco. */
const describir = (el) =>
  (el.getAttribute('data-test-id') || el.getAttribute('aria-label') || el.closest('[data-test-id]')?.getAttribute('data-test-id')
    || el.innerText || el.getAttribute('placeholder') || el.getAttribute('name') || el.tagName)
    .trim().replace(/\s+/g, ' ').slice(0, 40);

/**
 * Estilo que cambia con el foco, del elemento y de sus dos contenedores (n8n dibuja el foco de un campo en
 * su contenedor): si es igual con y sin foco, el indicador no es visible.
 */
const estiloFoco = (win, el) =>
  [el, el.parentElement, el.parentElement?.parentElement].filter(Boolean).map((n) => {
    const s = win.getComputedStyle(n);
    return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderColor, s.backgroundColor, s.textDecorationLine].join('|');
  }).join('||');

/** Color CSS (rgb, oklch, …) a [r, g, b, a]: el navegador lo convierte al pintarlo en un canvas de 1 px. */
const rgba = (win, color) => {
  const c = win.document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  c.clearRect(0, 0, 1, 1);
  c.fillStyle = color;
  c.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
};
/** Mezcla un color semitransparente sobre el fondo opaco. */
const sobre = ([r, g, b, a], [fr, fg, fb]) => [r * a + fr * (1 - a), g * a + fg * (1 - a), b * a + fb * (1 - a)];
const lum = (rgb) => rgb.slice(0, 3).map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; })
  .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x); return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100; };
/** Fondo efectivo: el primer antepasado con un color de fondo opaco. */
const fondo = (win, el) => {
  for (let n = el; n; n = n.parentElement) {
    const c = rgba(win, win.getComputedStyle(n).backgroundColor);
    if (c[3] > 0.95) return c;
  }
  return [255, 255, 255, 1];
};
/** Contraste de un color (con su transparencia) contra el fondo efectivo del elemento. */
const contraste = (win, color, el) => { const f = fondo(win, el); return ratio(sobre(rgba(win, color), f), f); };
/**
 * Contraste del indicador de foco: el mayor entre el contorno (outline) y el primer anillo de box-shadow,
 * contra el fondo que rodea al elemento. null si el foco no usa ninguno de los dos.
 */
const contrasteFoco = (win, el) => {
  const s = win.getComputedStyle(el);
  const partes = [];
  if (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) partes.push(s.outlineColor);
  const sombra = s.boxShadow !== 'none' && s.boxShadow.match(/^((?:oklch|rgba?|hsla?|lab|lch|color)\([^)]*\)|#\w+)/);
  if (sombra) partes.push(sombra[1]);
  return partes.length ? Math.max(...partes.map((c) => contraste(win, c, el.parentElement || el))) : null;
};

/**
 * Recorre `pasos` paradas de Tab y devuelve, para cada una, el elemento, si el foco se ve (el estilo cambia
 * al perderlo), si queda tapado por otro elemento y el contraste del contorno con el fondo.
 */
const recorrerConTab = (pasos) => {
  const paradas = [];
  Cypress._.times(pasos, () => {
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.window().then((win) => {
      const el = win.document.activeElement;
      const anterior = paradas.at(-1);
      if (anterior && anterior.el !== el) anterior.foco = anterior.estilo !== estiloFoco(win, anterior.el);
      if (!el || el === win.document.body) return;
      const r = el.getBoundingClientRect();
      const arriba = win.document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      paradas.push({
        el, nombre: describir(el), estilo: estiloFoco(win, el),
        tapado: !!arriba && !(el === arriba || el.contains(arriba) || arriba.contains(el)),
        contorno: contrasteFoco(win, el),
      });
    });
  });
  return cy.wrap(paradas);
};

describe('Accesibilidad · comprobaciones manuales con guion', () => {
  let d;
  before(() => {
    cy.loginApi();
    prepararDatos().then((datos) => { d = datos; });
  });
  beforeEach(() => cy.loginApi());
  after(() => cy.writeFile('results/a11y/manual.json', registro));

  // ------------------------------------------------------------------ Teclado (2.1.1, 2.1.2, 2.4.3)
  it('Teclado · inicio de sesión: orden de Tab y envío con Enter (2.1.1, 2.4.3)', () => {
    abrir(porId('I-00'), d);
    let inicial;
    cy.document().then((doc) => { inicial = describir(doc.activeElement); });
    recorrerConTab(4).then((p) => {
      const orden = [inicial, ...p.map((x) => x.nombre)];
      const email = orden.findIndex((n) => /email/i.test(n));
      const clave = orden.findIndex((n) => /password|contraseña/i.test(n));
      anotar('2.4.3', 'I-00', email >= 0 && clave > email ? 'cumple' : 'no cumple', `orden de Tab: ${orden.join(' → ')}`);
    });
    cy.tid('emailOrLdapLoginId').find('input').type(Cypress.env('ownerEmail'));
    cy.tid('password').find('input').type('clave-incorrecta-vyv{enter}');
    cy.location('pathname').should('eq', '/signin');
    cy.wait(1500);
    cy.document().then((doc) => {
      // Mensajes (3.3.1, 4.1.3): el error se muestra y llega a los lectores de pantalla.
      const avisos = [...doc.querySelectorAll('[role="alert"], [role="status"], [aria-live]')].filter((e) => e.innerText.trim());
      const texto = avisos.map((e) => e.innerText.trim().replace(/\s+/g, ' ')).join(' | ') || [...doc.querySelectorAll('.el-notification, .el-message, [class*="error"]')].map((e) => e.innerText.trim()).filter(Boolean).join(' | ');
      anotar('2.1.1', 'I-00', 'cumple', 'Enter en el campo de contraseña envía el formulario');
      anotar('3.3.1', 'I-00', texto ? 'cumple' : 'no cumple', texto ? `mensaje: «${texto.slice(0, 120)}»` : 'no aparece ningún mensaje de error');
      anotar('4.1.3', 'I-00', avisos.length ? 'cumple' : 'no cumple', avisos.length ? `anunciado por ${avisos.map((a) => a.getAttribute('role') || `aria-live=${a.getAttribute('aria-live')}`).join(', ')}` : 'el mensaje no está en una región role=alert/status ni aria-live');
    });
  });

  ['I-01', 'I-06', 'I-08'].forEach((id) => {
    it(`Teclado y foco · ${porId(id).nombre}: alcance, indicador visible y foco no tapado (2.1.1, 2.1.2, 2.4.7, 2.4.11, 1.4.11)`, () => {
      abrir(porId(id), d);
      recorrerConTab(45).then((p) => {
        const unicos = new Set(p.map((x) => x.el));
        const crear = p.some((x) => /add-resource|create|crear/i.test(x.nombre));
        anotar('2.1.1', id, crear ? 'cumple' : 'no cumple', `${unicos.size} elementos distintos en 45 Tab; botón de crear ${crear ? 'alcanzable' : 'no alcanzado'}`);
        // Trampa: el foco gira siempre entre los mismos 2 elementos o menos.
        const ultimos = new Set(p.slice(-10).map((x) => x.el));
        anotar('2.1.2', id, ultimos.size > 2 ? 'cumple' : 'no cumple', `últimas 10 paradas en ${ultimos.size} elementos distintos`);
        const medidos = p.filter((x) => x.foco !== undefined);
        const sinFoco = medidos.filter((x) => !x.foco).map((x) => x.nombre);
        anotar('2.4.7', id, sinFoco.length ? 'no cumple' : 'cumple', `${medidos.length - sinFoco.length} de ${medidos.length} paradas con indicador visible${sinFoco.length ? `; sin indicador: ${[...new Set(sinFoco)].slice(0, 6).join(', ')}` : ''}`);
        const tapados = p.filter((x) => x.tapado).map((x) => x.nombre);
        anotar('2.4.11', id, tapados.length ? 'no cumple' : 'cumple', tapados.length ? `foco tapado en: ${[...new Set(tapados)].slice(0, 6).join(', ')}` : 'ningún elemento con foco queda tapado');
        const bajos = p.filter((x) => x.contorno !== null && x.contorno < 3).map((x) => `${x.nombre} (${x.contorno}:1)`);
        const conContorno = p.filter((x) => x.contorno !== null).length;
        anotar('1.4.11', id, bajos.length ? 'no cumple' : conContorno ? 'cumple' : 'revisar', conContorno ? `${conContorno} indicadores de foco medidos (outline o box-shadow)${bajos.length ? `; por debajo de 3:1: ${[...new Set(bajos)].slice(0, 5).join(', ')}` : ', todos ≥ 3:1'}` : 'el foco no usa outline ni box-shadow; contraste no medible así');
      });
    });
  });

  it('Teclado · formulario de una credencial: el foco queda en el modal, Esc lo cierra y vuelve al origen (2.1.2, 2.4.3)', () => {
    abrir(porId('I-06'), d);
    // La tarjeta es un <div> que solo abre con el ratón; con el teclado se llega a su menú de acciones.
    recorrerConTab(45).then((p) => {
      const enTarjeta = p.find((x) => x.el.closest('[data-test-id="resources-list-item"]'));
      anotar('2.1.1', 'I-06', enTarjeta ? 'cumple' : 'no cumple', enTarjeta
        ? `la tarjeta no recibe el foco; con Tab se llega a su menú de acciones («${enTarjeta.nombre}»), que ofrece «Open»`
        : 'ninguna tarjeta de credencial se alcanza con Tab en 45 pulsaciones');
    });
    cy.get('[data-test-id="credential-card-actions"] button').first().focus();
    cy.focused().type('{enter}');
    cy.tid('action-open').should('exist');
    cy.focused().type('{enter}');
    cy.tid('editCredential-modal', { timeout: 15000 }).should('be.visible');
    // El diálogo (role=dialog) incluye la cabecera del modal: nombre, Delete y cerrar.
    const dialogo = (doc) => { const m = doc.querySelector('[data-test-id="editCredential-modal"]'); return m.closest('[role="dialog"]') || m; };
    cy.document().then((doc) => anotar('2.4.3', 'I-07', dialogo(doc).contains(doc.activeElement) ? 'cumple' : 'no cumple',
      `al abrir con Enter el foco está en «${describir(doc.activeElement)}»`));
    recorrerConTab(20).then((p) => {
      cy.document().then((doc) => {
        const modal = dialogo(doc);
        const fuera = p.filter((x) => !modal.contains(x.el)).map((x) => x.nombre);
        anotar('2.4.3', 'I-07', fuera.length ? 'no cumple' : 'cumple', fuera.length ? `el foco sale del modal hacia: ${[...new Set(fuera)].slice(0, 5).join(', ')}` : '20 Tab: el foco no sale del modal');
      });
    });
    // Un primer Esc puede cerrar solo el desplegable que tiene el foco; un segundo Esc cierra el modal.
    let enfocado;
    cy.focused().then(($e) => { enfocado = describir($e[0]); });
    cy.focused().type('{esc}');
    cy.wait(600);
    cy.document().then((doc) => {
      if (doc.querySelector('[data-test-id="editCredential-modal"]')) { cy.focused().type('{esc}'); cy.wait(600); }
    });
    cy.document().then((doc) => {
      const abierto = !!doc.querySelector('[data-test-id="editCredential-modal"]');
      anotar('2.1.1', 'I-07', abierto ? 'no cumple' : 'cumple', abierto
        ? `con el foco en «${enfocado}» (un campo del formulario), Esc no cierra el modal ni con dos pulsaciones; solo el botón de cerrar lo cierra`
        : `Esc cierra el modal con el foco en «${enfocado}»`);
      if (!abierto) {
        const vuelve = doc.activeElement?.closest('[data-test-id="resources-list-item"]');
        anotar('2.4.3', 'I-07', vuelve ? 'cumple' : 'no cumple',
          vuelve ? 'al cerrar, el foco vuelve a la tarjeta que abrió el modal' : `al cerrar, el foco no vuelve a la tarjeta: queda en «${doc.activeElement === doc.body ? 'body' : describir(doc.activeElement)}»`);
      }
    });
  });

  it('Teclado · modal de nueva data table: foco inicial en el nombre y Esc lo cierra (2.4.3, 2.1.1)', () => {
    abrir(porId('I-11'), d);
    cy.document().then((doc) => anotar('2.4.3', 'I-11', doc.activeElement?.tagName === 'INPUT' ? 'cumple' : 'no cumple', `foco inicial en «${describir(doc.activeElement)}»`));
    cy.get('body').type('{esc}');
    cy.tid('addDataTableModal-modal').should('not.exist');
    anotar('2.1.1', 'I-11', 'cumple', 'Esc cierra el modal');
  });

  it('Teclado · editor de workflows: los nodos del lienzo se alcanzan con Tab (2.1.1)', () => {
    abrir(porId('I-02'), d);
    recorrerConTab(60).then((p) => {
      const nodos = p.filter((x) => x.el.closest('[data-test-id="canvas-node"]'));
      anotar('2.1.1', 'I-02', nodos.length ? 'cumple' : 'no cumple', nodos.length ? `${nodos.length} paradas dentro de nodos del lienzo` : 'ningún nodo del lienzo recibe el foco con Tab en 60 pulsaciones');
    });
  });

  // ------------------------------------------------------------------ Etiquetas (1.3.1, 3.3.2, 4.1.2, 2.5.3)
  const AMBITO = { 'I-00': 'body', 'I-07': '[data-test-id="editCredential-modal"]', 'I-11': '[data-test-id="addDataTableModal-modal"]' };
  Object.keys(AMBITO).forEach((id) => {
    it(`Etiquetas · ${porId(id).nombre}: cada campo tiene nombre accesible (1.3.1, 3.3.2, 4.1.2)`, () => {
      abrir(porId(id), d);
      cy.document().then((doc) => {
        const campos = [...doc.querySelector(AMBITO[id]).querySelectorAll('input:not([type=hidden]), textarea, select')].filter((e) => e.offsetParent);
        const nombre = (e) => e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') || '').split(' ').map((i) => doc.getElementById(i)?.innerText).join(' ').trim()
          || (e.id && doc.querySelector(`label[for="${e.id}"]`)?.innerText) || e.closest('label')?.innerText || e.getAttribute('title') || '';
        const sin = campos.filter((e) => !nombre(e).trim()).map((e) => `${e.tagName.toLowerCase()}${e.getAttribute('placeholder') ? ` (placeholder «${e.getAttribute('placeholder')}»)` : ''}`);
        anotar('3.3.2', id, sin.length ? 'no cumple' : 'cumple', `${campos.length - sin.length} de ${campos.length} campos con etiqueta${sin.length ? `; sin etiqueta: ${sin.slice(0, 5).join(', ')}` : ''}`);
      });
    });
  });

  // ------------------------------------------------------------------ Contraste (1.4.3)
  // axe no mide el texto de ejemplo (placeholder); aquí se mide contra el fondo del campo.
  ['I-01', 'I-07', 'I-11'].forEach((id) => {
    it(`Contraste · texto de ejemplo (placeholder) de los campos · ${porId(id).nombre} (1.4.3)`, () => {
      abrir(porId(id), d);
      cy.window().then((win) => {
        const ambito = AMBITO[id] ? win.document.querySelector(AMBITO[id]) : win.document;
        const medidas = [...ambito.querySelectorAll('input[placeholder]:not([placeholder=""]), textarea[placeholder]:not([placeholder=""])')]
          .filter((e) => e.offsetParent)
          .map((e) => ({ campo: e.getAttribute('placeholder'), ratio: contraste(win, win.getComputedStyle(e, '::placeholder').color, e) }));
        const bajos = medidas.filter((m) => m.ratio < 4.5);
        anotar('1.4.3', id, medidas.length ? (bajos.length ? 'no cumple' : 'cumple') : 'revisar',
          medidas.length ? medidas.map((m) => `«${m.campo.slice(0, 25)}» ${m.ratio}:1`).join(', ') : 'sin texto de ejemplo visible');
      });
    });
  });

  // ------------------------------------------------------------------ Página (2.4.2, 3.1.1, 2.4.1)
  it('Página · título, idioma y salto de bloques en todas las interfaces (2.4.2, 3.1.1, 2.4.1)', () => {
    const titulos = {};
    INTERFACES.forEach((i) => {
      abrir(i, d);
      cy.document().then((doc) => {
        titulos[i.id] = doc.title;
        if (i.id === 'I-00') anotar('3.1.1', 'todas', doc.documentElement.lang ? 'cumple' : 'no cumple', `<html lang="${doc.documentElement.lang}">`);
        const main = doc.querySelector('main, [role="main"]');
        const salto = [...doc.querySelectorAll('a[href^="#"]')].some((a) => /skip|saltar|main|contenido/i.test(a.innerText));
        anotar('2.4.1', i.id, main || salto ? 'cumple' : 'no cumple', `${main ? 'región main' : 'sin región main'}; ${salto ? 'con' : 'sin'} enlace para saltar al contenido`);
      });
    });
    cy.then(() => {
      const genericos = Object.entries(titulos).filter(([, t]) => /^n8n(\.io)?( - Workflow Automation)?$/i.test(t.replace(/\[DEV\]/, '').trim()));
      anotar('2.4.2', 'todas', genericos.length ? 'no cumple' : 'cumple', `${Object.entries(titulos).map(([k, t]) => `${k}: «${t}»`).join(' · ')}`);
    });
  });

  // ------------------------------------------------------------------ Adaptación visual (1.4.10, 1.4.4, 1.4.12, 1.3.4, 2.3.3)
  const LISTAS = ['I-00', 'I-01', 'I-04', 'I-06', 'I-08'];
  [[320, 640, '1.4.10', 'reflujo a 320 px de ancho'], [720, 450, '1.4.4', 'zoom del 200 % (1440 × 900 al 200 %)']].forEach(([ancho, alto, criterio, nombre]) => {
    it(`Adaptación visual · ${nombre}: sin desplazamiento horizontal (${criterio})`, () => {
      cy.viewport(ancho, alto);
      LISTAS.forEach((id) => {
        abrir(porId(id), d);
        cy.window().then((win) => {
          const exceso = win.document.documentElement.scrollWidth - win.innerWidth;
          const listo = win.document.querySelector(`[data-test-id="${porId(id).listo}"]`);
          const visible = !!listo && listo.getBoundingClientRect().width > 0;
          anotar(criterio, id, exceso <= 1 && visible ? 'cumple' : 'no cumple',
            `ancho ${ancho} px: ${exceso > 1 ? `desplazamiento horizontal de ${exceso} px` : 'sin desplazamiento horizontal'}; contenido principal ${visible ? 'visible' : 'no visible'}`);
        });
      });
    });
  });

  it('Adaptación visual · espaciado de texto de WCAG sin perder contenido (1.4.12)', () => {
    ['I-00', 'I-01', 'I-06', 'I-07'].forEach((id) => {
      abrir(porId(id), d);
      cy.document().then((doc) => {
        const css = doc.createElement('style');
        css.textContent = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';
        doc.head.appendChild(css);
      });
      cy.wait(300);
      cy.window().then((win) => {
        // Texto cortado: el contenido es más grande que la caja y el desbordamiento está oculto.
        const cortados = [...win.document.querySelectorAll('button, a, label, span, p, h1, h2, h3, td, th')]
          .filter((e) => e.offsetParent && e.children.length === 0 && e.innerText.trim().length > 2)
          .filter((e) => { const s = win.getComputedStyle(e); return /hidden|clip/.test(s.overflow + s.overflowX) && s.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2; })
          .map((e) => e.innerText.trim().slice(0, 25));
        anotar('1.4.12', id, cortados.length ? 'no cumple' : 'cumple', cortados.length ? `${cortados.length} textos cortados: ${[...new Set(cortados)].slice(0, 5).join(', ')}` : 'ningún texto queda cortado');
      });
    });
  });

  it('Adaptación visual · orientación vertical y horizontal (1.3.4) y movimiento reducido (2.3.3)', () => {
    [[768, 1024], [1024, 768]].forEach(([w, h]) => {
      cy.viewport(w, h);
      abrir(porId('I-01'), d);
      cy.tid(porId('I-01').listo).should('be.visible');
    });
    cy.then(() => anotar('1.3.4', 'I-01', 'cumple', 'la vista se usa en 768 × 1024 (vertical) y en 1024 × 768 (horizontal)'));
    cy.window().then((win) => {
      let reglas = 0;
      [...win.document.styleSheets].forEach((h) => { try { [...h.cssRules].forEach((r) => { if (/prefers-reduced-motion/.test(r.conditionText || r.media?.mediaText || '')) reglas++; }); } catch { /* hoja de otro origen */ } });
      anotar('2.3.3', 'todas', reglas ? 'cumple' : 'no cumple', `${reglas} reglas CSS para prefers-reduced-motion`);
    });
  });

  // ------------------------------------------------------------------ Tamaño de los objetivos (2.5.8)
  ['I-01', 'I-02', 'I-06'].forEach((id) => {
    it(`Objetivos · ${porId(id).nombre}: controles de al menos 24 × 24 px (2.5.8)`, () => {
      abrir(porId(id), d);
      cy.window().then((win) => {
        const controles = [...win.document.querySelectorAll('button, a[href], input, [role="button"], [role="checkbox"], [role="tab"], [tabindex="0"]')]
          .filter((e) => e.offsetParent && win.getComputedStyle(e).visibility !== 'hidden');
        // Excepción de espaciado: un círculo de 24 px centrado en el control no toca otro control.
        const pequenos = controles.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 24 || r.height < 24); })
          .filter((e) => {
            const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2; const cy2 = r.top + r.height / 2;
            return controles.some((o) => { if (o === e || o.contains(e) || e.contains(o)) return false; const q = o.getBoundingClientRect(); const dx = Math.max(q.left - cx, 0, cx - q.right); const dy = Math.max(q.top - cy2, 0, cy2 - q.bottom); return Math.hypot(dx, dy) < 12; });
          });
        anotar('2.5.8', id, pequenos.length ? 'no cumple' : 'cumple', `${controles.length} controles; ${pequenos.length} menores de 24 px sin espacio suficiente${pequenos.length ? `: ${[...new Set(pequenos.map(describir))].slice(0, 5).join(', ')}` : ''}`);
      });
    });
  });
});
