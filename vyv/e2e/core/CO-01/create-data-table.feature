# language: es
@co01 @regresion
Característica: CO-01 Crear data table y columnas
  Como usuario de n8n
  Quiero crear data tables y definir sus columnas
  Para almacenar datos estructurados que usen mis workflows

  Escenario: Crear una data table con nombre válido desde la interfaz
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Cuando crea la data table "vyv_bdd_clientes" desde la interfaz
    Entonces ve la vista de detalle de la data table
    Y la tarjeta "vyv_bdd_clientes" aparece en el listado

  Escenario: Rechazar un nombre de tabla duplicado
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y existe la data table "vyv_bdd_dup"
    Cuando intenta crear otra data table llamada "vyv_bdd_dup"
    Entonces la respuesta tiene el código 409
    Y el mensaje contiene "already exists"

  Esquema del escenario: Validar nombres de columna
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y existe la data table "vyv_bdd_cols"
    Cuando añade la columna "<nombre>" de tipo "string"
    Entonces la respuesta tiene el código <codigo>

    Ejemplos:
      | nombre      | codigo |
      | edad_1      | 200    |
      | 1edad       | 400    |
      | mi-col      | 400    |
      | createdAt   | 409    |
