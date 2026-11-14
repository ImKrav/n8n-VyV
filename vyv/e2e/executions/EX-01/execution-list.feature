# language: es
@executions @ex01
Característica: EX-01 Lista de ejecuciones
  Como usuaria de n8n
  Quiero ver cada ejecución con su estado
  Para saber qué pasó con mis workflows en producción

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n

  @CP-EX-01-01 @exito
  Escenario: Una ejecución exitosa aparece en la lista con el estado «success»
    Dado que publica un workflow de webhook que responde con el campo "ok"
    Cuando llama al webhook de producción
    Entonces el workflow tiene 1 ejecución con el estado "success" en modo "webhook"
    Cuando abre la lista de ejecuciones del workflow en el editor
    Entonces la lista del editor muestra 1 ejecución

  @CP-EX-01-03 @alternativo
  Escenario: Mientras dura un nodo Wait la ejecución aparece «waiting»
    Dado que publica un workflow de webhook con una espera de 5 minutos
    Cuando llama al webhook de producción
    Entonces la última ejecución del workflow queda en estado "waiting"

  @CP-EX-01-02 @error
  Escenario: Una ejecución cuyo nodo falla aparece con el estado «error»
    Dado que publica un workflow de webhook que falla con el mensaje "fallo BDD"
    Cuando llama al webhook de producción
    Entonces el webhook responde con el código 500
    Y la última ejecución del workflow termina con el estado "error"
    Cuando abre la lista de ejecuciones del workflow en el editor
    Entonces la lista del editor muestra 1 ejecución con el texto "Error"
