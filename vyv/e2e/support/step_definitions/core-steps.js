/**
 * Pasos Gherkin del módulo 4 · Core: data tables, CSV y carpetas (CO-01 a CO-05).
 * Las carpetas de una letra (A, B, C) se hacen únicas por ejecución; los nombres inválidos se envían tal cual.
 */
import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';
import { actividad } from '../../screenplay/Actor.js';
import { CallAnApi } from '../../screenplay/abilities/index.js';
import { Stage } from '../../screenplay/Stage.js';
import {
  CreateDataTable, PrepareDataTable, AddColumn, ImportCsv,
  CreateFolder, MoveFolder, DeleteFolder, CreateWorkflow, RenameFolder,
} from '../../screenplay/tasks/index.js';
import { LastResponse, FolderPath, FolderContent, DataTableCards } from '../../screenplay/questions/index.js';

const actor = () => Stage.actorInTheSpotlight();
const unico = (n) => Stage.unico(n);
const carpeta = (n) => (/^[A-Z]$/.test(n) ? `${n}_${Stage.sufijo()}` : n);

// ----------------------------------------------------------------- Dado
Given('existe la data table {string}', (tabla) => actor().attemptsTo(PrepareDataTable.withColumns(unico(tabla), [])));

Given('existe la data table {string} con las columnas {string}', (tabla, columnas) => {
  const cols = columnas.split(',').map((c) => { const [name, type] = c.split(':'); return { name, type }; });
  actor().attemptsTo(PrepareDataTable.withColumns(unico(tabla), cols));
});

Given('que la tabla tiene las edades {string}', (edades) => {
  actor().attemptsTo(actividad(`insertar edades ${edades}`, (a) => {
    const { api } = a.abilityTo(CallAnApi);
    api.insertar(a.recall('proyecto'), a.recall('tablaId'), edades.split(',').map((e) => ({ edad: Number(e) })));
  }));
});

// Un solo paso para Dado/Cuando.
Given('crea la carpeta {string}', (n) => actor().attemptsTo(CreateFolder.named(carpeta(n))));
Given('crea la carpeta {string} dentro de {string}', (n, padre) => actor().attemptsTo(CreateFolder.named(n, carpeta(padre))));
Given('que la carpeta {string} contiene el workflow {string}', (c, wf) => actor().attemptsTo(CreateWorkflow.named(wf).inFolder(carpeta(c))));

// ----------------------------------------------------------------- Cuando
When('crea la data table {string} desde la interfaz', (tabla) => actor().attemptsTo(CreateDataTable.named(unico(tabla))));

When('intenta crear otra data table llamada {string}', (tabla) => {
  actor().attemptsTo(actividad('crear tabla duplicada por API', (a) => {
    const { api } = a.abilityTo(CallAnApi);
    api.crearTabla(a.recall('proyecto'), unico(tabla), []).then((r) => a.remember('ultimaRespuesta', r));
  }));
});

When('añade la columna {string} de tipo {string}', (n, t) => actor().attemptsTo(AddColumn.named(n, t)));

When('inserta una fila con edad {string}', (edad) => {
  actor().attemptsTo(actividad(`insertar edad=${edad}`, (a) => {
    a.abilityTo(CallAnApi).api.insertar(a.recall('proyecto'), a.recall('tablaId'), [{ edad }])
      .then((r) => a.remember('ultimaRespuesta', r));
  }));
});

When('inserta la fila con nombre {string} y edad {int}', (nombre, edad) => {
  actor().attemptsTo(actividad(`insertar ${nombre}, ${edad}`, (a) => {
    a.abilityTo(CallAnApi).api.insertar(a.recall('proyecto'), a.recall('tablaId'), [{ nombre, edad }])
      .then((r) => a.remember('ultimaRespuesta', r));
  }));
});

When('filtra las filas con edad mayor que {int}', (valor) => {
  actor().attemptsTo(actividad(`filtrar edad > ${valor}`, (a) => {
    a.abilityTo(CallAnApi).api.filasOk(a.recall('proyecto'), a.recall('tablaId'), {
      filter: { type: 'and', filters: [{ columnName: 'edad', condition: 'gt', value: valor }] },
    }).then((filas) => a.remember('filas', filas));
  }));
});

When('sube el archivo {string}', (f) => actor().attemptsTo(ImportCsv.file(f)));
When('sube el archivo {string} sin encabezados', (f) => actor().attemptsTo(ImportCsv.withoutHeaders(f)));
When('mueve la carpeta {string} a {string}', (o, d) => actor().attemptsTo(MoveFolder.named(carpeta(o)).into(d === 'B' ? 'B' : carpeta(d))));
When('elimina la carpeta {string} transfiriendo su contenido a {string}', (o, d) =>
  actor().attemptsTo(DeleteFolder.named(carpeta(o)).transferringTo(carpeta(d))));
When('elimina la carpeta vacía {string}', (c) => actor().attemptsTo(DeleteFolder.named(carpeta(c)).transferringTo(undefined)));
When('renombra la carpeta {string} a {string}', (c, nuevo) => actor().attemptsTo(RenameFolder.named(carpeta(c)).to(`${nuevo}_${Stage.sufijo()}`)));

// ----------------------------------------------------------------- Entonces
Then('ve la vista de detalle de la data table', () => cy.tid('data-table-details-view').should('be.visible'));
Then('la tarjeta {string} aparece en el listado', (tabla) => {
  cy.visitarN8n('/home/datatables');
  actor().asks(DataTableCards.displayed()).filter(`:contains("${unico(tabla)}")`).should('have.length', 1);
});

Then('obtiene solo las edades {string}', (edades) => {
  cy.then(() => expect(actor().recall('filas').map((f) => f.edad)).to.deep.equal(edades.split(',').map(Number)));
});

Then('la tabla tiene {int} fila(s)', (n) => {
  const a = actor();
  a.abilityTo(CallAnApi).api.filasOk(a.recall('proyecto'), a.recall('tablaId')).should('have.length', n);
});

Then('las columnas inferidas son {string}', (esperado) => {
  actor().asks(LastResponse.body()).then((body) => {
    const cols = (body.data ?? body).columns.map((c) => `${c.name}:${c.type}`).join(',');
    expect(cols).to.eq(esperado);
  });
});

Then('las columnas inferidas se llaman {string}', (esperado) => {
  actor().asks(LastResponse.body()).then((body) => expect((body.data ?? body).columns.map((c) => c.name).join(',')).to.eq(esperado));
});

Then('la ruta de {string} es {string}', (c, ruta) => {
  actor().asks(FolderPath.of(c)).then((nombres) =>
    expect(nombres.map((n) => n.replace(`_${Stage.sufijo()}`, '')).join(' > ')).to.eq(ruta));
});

Then('la carpeta {string} contiene {int} workflow y {int} subcarpeta', (c, wfs, subs) => {
  actor().asks(FolderContent.of(carpeta(c))).should('deep.include', { totalWorkflows: wfs, totalSubFolders: subs });
});

Then('la carpeta {string} ya no existe', (c) => {
  const a = actor();
  a.abilityTo(CallAnApi).api.listarCarpetas(a.recall('proyecto')).then((l) =>
    expect((l.data ?? l).map((f) => f.id)).not.to.include(a.recall(`carpeta:${carpeta(c)}`).id));
});
