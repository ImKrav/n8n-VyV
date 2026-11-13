/**
 * Definiciones de pasos Gherkin (Dado / Cuando / Entonces) implementadas con Screenplay.
 * Los nombres que llegan desde Gherkin se hacen únicos por ejecución para que los escenarios
 * sean independientes y repetibles (FIRST).
 */
import { Given, When, Then, Before } from '@badeball/cypress-cucumber-preprocessor';
import { Actor } from '../../screenplay/Actor.js';
import { BrowseTheWeb, CallAnApi } from '../../screenplay/abilities/index.js';
import {
  CreateDataTable, PrepareDataTable, AddColumn, ImportCsv,
  CreateFolder, MoveFolder, DeleteFolder, CreateWorkflow,
} from '../../screenplay/tasks/index.js';
import { LastResponse, FolderPath, FolderContent, DataTableCards } from '../../screenplay/questions/index.js';
import { actividad } from '../../screenplay/Actor.js';

let actor;
let sufijo;
const unico = (n) => (n.startsWith('vyv_') ? `${n}_${sufijo}` : n);

Before(() => { sufijo = Date.now().toString(36); });

// ----------------------------------------------------------------- Dado
Given('que {string} es una usuaria con sesión iniciada en n8n', (nombre) => {
  actor = Actor.named(nombre).whoCan(BrowseTheWeb.withCypress(), CallAnApi.atN8n());
  cy.loginApi();
});

Given('existe la data table {string}', (tabla) => {
  actor.attemptsTo(PrepareDataTable.withColumns(unico(tabla), []));
});

Given('existe la data table {string} con las columnas {string}', (tabla, columnas) => {
  const cols = columnas.split(',').map((c) => { const [name, type] = c.split(':'); return { name, type }; });
  actor.attemptsTo(PrepareDataTable.withColumns(unico(tabla), cols));
});

Given('que la tabla tiene las edades {string}', (edades) => {
  actor.attemptsTo(actividad(`insertar edades ${edades}`, (a) => {
    const { api } = a.abilityTo(CallAnApi);
    api.insertar(a.recall('proyecto'), a.recall('tablaId'), edades.split(',').map((e) => ({ edad: Number(e) })));
  }));
});

// Un solo paso para Dado/Cuando: las carpetas de una letra (A, C) se hacen únicas; los nombres inválidos se envían tal cual.
Given('crea la carpeta {string}', (n) => actor.attemptsTo(CreateFolder.named(/^[A-Z]$/.test(n) ? `${n}_${sufijo}` : n)));
Given('crea la carpeta {string} dentro de {string}', (n, padre) => actor.attemptsTo(CreateFolder.named(n, `${padre}_${sufijo}`)));
Given('que la carpeta {string} contiene el workflow {string}', (carpeta, wf) =>
  actor.attemptsTo(CreateWorkflow.named(wf).inFolder(`${carpeta}_${sufijo}`)));

// ----------------------------------------------------------------- Cuando
When('crea la data table {string} desde la interfaz', (tabla) => actor.attemptsTo(CreateDataTable.named(unico(tabla))));

When('intenta crear otra data table llamada {string}', (tabla) => {
  actor.attemptsTo(actividad('crear tabla duplicada por API', (a) => {
    const { api } = a.abilityTo(CallAnApi);
    api.crearTabla(a.recall('proyecto'), unico(tabla), []).then((r) => a.remember('ultimaRespuesta', r));
  }));
});

When('añade la columna {string} de tipo {string}', (n, t) => actor.attemptsTo(AddColumn.named(n, t)));

When('inserta una fila con edad {string}', (edad) => {
  actor.attemptsTo(actividad(`insertar edad=${edad}`, (a) => {
    a.abilityTo(CallAnApi).api.insertar(a.recall('proyecto'), a.recall('tablaId'), [{ edad }])
      .then((r) => a.remember('ultimaRespuesta', r));
  }));
});

When('filtra las filas con edad mayor que {int}', (valor) => {
  actor.attemptsTo(actividad(`filtrar edad > ${valor}`, (a) => {
    a.abilityTo(CallAnApi).api.filasOk(a.recall('proyecto'), a.recall('tablaId'), {
      filter: { type: 'and', filters: [{ columnName: 'edad', condition: 'gt', value: valor }] },
    }).then((filas) => a.remember('filas', filas));
  }));
});

When('sube el archivo {string}', (f) => actor.attemptsTo(ImportCsv.file(f)));
When('mueve la carpeta {string} a {string}', (o, d) => actor.attemptsTo(MoveFolder.named(`${o}_${sufijo}`).into(d === 'B' ? 'B' : `${d}_${sufijo}`)));
When('elimina la carpeta {string} transfiriendo su contenido a {string}', (o, d) =>
  actor.attemptsTo(DeleteFolder.named(`${o}_${sufijo}`).transferringTo(`${d}_${sufijo}`)));

// ----------------------------------------------------------------- Entonces
Then('la respuesta tiene el código {int}', (codigo) => actor.asks(LastResponse.status()).should('eq', codigo));
Then('el mensaje contiene {string}', (texto) => actor.asks(LastResponse.message()).should('contain', texto));

Then('ve la vista de detalle de la data table', () => cy.tid('data-table-details-view').should('be.visible'));
Then('la tarjeta {string} aparece en el listado', (tabla) => {
  cy.visitarN8n('/home/datatables');
  actor.asks(DataTableCards.displayed()).filter(`:contains("${unico(tabla)}")`).should('have.length', 1);
});

Then('obtiene solo las edades {string}', (edades) => {
  cy.then(() => expect(actor.recall('filas').map((f) => f.edad)).to.deep.equal(edades.split(',').map(Number)));
});

Then('las columnas inferidas son {string}', (esperado) => {
  actor.asks(LastResponse.body()).then((body) => {
    const cols = (body.data ?? body).columns.map((c) => `${c.name}:${c.type}`).join(',');
    expect(cols).to.eq(esperado);
  });
});

Then('la ruta de {string} es {string}', (carpeta, ruta) => {
  actor.asks(FolderPath.of(carpeta)).then((nombres) =>
    expect(nombres.map((n) => n.replace(`_${sufijo}`, '')).join(' > ')).to.eq(ruta));
});

Then('la carpeta {string} contiene {int} workflow y {int} subcarpeta', (c, wfs, subs) => {
  actor.asks(FolderContent.of(`${c}_${sufijo}`)).should('deep.include', { totalWorkflows: wfs, totalSubFolders: subs });
});

