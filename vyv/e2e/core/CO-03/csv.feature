# language: es
@core @co03 @regresion
Característica: CO-03 Importar y exportar CSV
  Como usuario de n8n
  Quiero importar y descargar archivos CSV
  Para intercambiar datos con otras herramientas

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n

  @CP-CO-03-01 @exito
  Escenario: Importar un CSV válido infiere los tipos
    Cuando sube el archivo "valido.csv"
    Entonces la respuesta tiene el código 200
    Y las columnas inferidas son "nombre:string,edad:number,activo:boolean,fecha:date"

  @CP-CO-03 @alternativo
  Escenario: Un CSV sin fila de encabezados recibe nombres de columna genéricos
    Cuando sube el archivo "sin_encabezados.csv" sin encabezados
    Entonces la respuesta tiene el código 200
    Y las columnas inferidas se llaman "Column_1,Column_2,Column_3"

  @CP-CO-03 @error
  Escenario: Rechazar un archivo que no es CSV
    Cuando sube el archivo "no_es_csv.txt"
    Entonces la respuesta tiene el código 400
    Y el mensaje contiene "Only the following file types are allowed"
