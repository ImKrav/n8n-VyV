# language: es
@executions @ex02
Característica: EX-02 Filtros de la lista de ejecuciones
  Como usuaria de n8n
  Quiero filtrar las ejecuciones por estado y por workflow
  Para encontrar rápido las que necesito revisar

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y que tiene una ejecución exitosa y una ejecución fallida en workflows distintos

  @CP-EX-02-01 @exito
  Escenario: El filtro de estado muestra solo ejecuciones con ese estado
    Cuando filtra las ejecuciones por el estado "error"
    Entonces todas las ejecuciones listadas tienen el estado "error"
    Y la lista incluye la ejecución del workflow "fallido"

  @CP-EX-02-02 @exito
  Escenario: El filtro por workflow muestra solo las ejecuciones de ese workflow
    Cuando filtra las ejecuciones del workflow "correcto"
    Entonces la lista contiene solo la ejecución del workflow "correcto"

  @CP-EX-02-04 @alternativo
  Escenario: Combinar filtros que no coinciden devuelve una lista vacía
    Cuando filtra las ejecuciones del workflow "correcto" con el estado "error"
    Entonces la lista de ejecuciones está vacía

  @CP-EX-02 @error
  Esquema del escenario: Rechazar parámetros de consulta no válidos
    Cuando consulta la lista de ejecuciones con "<consulta>"
    Entonces la respuesta tiene el código 400

    Ejemplos:
      | consulta          |
      | filter=%7Bno-json |
      | limit=500         |
