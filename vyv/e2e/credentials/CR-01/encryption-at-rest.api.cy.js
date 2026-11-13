/// <reference types="cypress" />
/**
 * CR-01 · Crear credenciales · el secreto se guarda cifrado en la base de datos (caja negra).
 * Trazabilidad: CP-CR-01-07. Necesita la ruta del archivo SQLite de n8n en CYPRESS_dbPath
 * (por defecto `~/.n8n/database.sqlite`); sin esa variable el caso se omite.
 * Se buscan los bytes del archivo y de su WAL: el nombre de la credencial se guarda en claro
 * (prueba que es la base correcta) y el secreto no debe aparecer.
 */
import { n8nApi } from '../../support/api.js';

const SECRETO = 'secreto-vyv-999';

describe('CR-01 · Cifrado de la credencial en la base de datos', () => {
  let cred;
  beforeEach(() => cy.loginApi());
  after(() => { if (cred) n8nApi.borrarCredencial(cred.id); });

  it('CP-CR-01-07 · la columna data de credentials_entity no contiene el secreto en texto plano', function () {
    const db = Cypress.env('dbPath');
    if (!db) this.skip();
    cy.nombreUnico('VyV-Header').then((nombre) =>
      n8nApi.crearCredencialHeader(nombre, 'X-Secreto', SECRETO).then((c) => { cred = c; }),
    );
    cy.then(() =>
      cy.task('contieneTexto', { rutas: [db, `${db}-wal`], textos: [cred.name, SECRETO] }),
    ).then((r) => {
      cy.evidencia(`Bytes leídos: ${r.leidos} · nombre en la base: ${r[cred.name]} · secreto en claro: ${r[SECRETO]}`);
      expect(r.leidos, 'se leyó la base de datos').to.be.greaterThan(0);
      expect(r[cred.name], 'el registro de la credencial está en el archivo leído').to.eq(true);
      expect(r[SECRETO], 'el secreto no aparece en claro').to.eq(false);
    });
  });
});
