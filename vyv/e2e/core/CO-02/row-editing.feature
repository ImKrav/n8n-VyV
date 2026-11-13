# language: es
@co02 @regresion
Característica: CO-02 Edición de filas
  Como usuario de n8n
  Quiero añadir, filtrar y validar filas
  Para mantener datos correctos en mis data tables

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y existe la data table "vyv_bdd_filas" con las columnas "nombre:string,edad:number"

  Escenario: Rechazar un valor que no coincide con el tipo de la columna
    Cuando inserta una fila con edad "abc"
    Entonces la respuesta tiene el código 400
    Y el mensaje contiene "does not match column type 'number'"

  Escenario: Filtrar filas con un valor límite
    Dado que la tabla tiene las edades "30,12,45"
    Cuando filtra las filas con edad mayor que 30
    Entonces obtiene solo las edades "45"
