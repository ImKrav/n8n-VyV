# language: es
@executions @ex04
Característica: EX-04 Detener ejecuciones
  Como usuaria de n8n
  Quiero detener ejecuciones en curso, una o varias a la vez
  Para cortar procesos que ya no deben continuar

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n

  @CP-EX-04-03 @exito
  Escenario: Detener una ejecución en un nodo Wait la deja cancelada
    Dado que publica un workflow de webhook con una espera de 5 minutos
    Y llama al webhook de producción
    Y la última ejecución del workflow queda en estado "waiting"
    Cuando detiene la última ejecución
    Entonces la ejecución queda en estado "canceled"

  @CP-EX-04-04 @alternativo
  Escenario: Detener en bloque solo afecta a las ejecuciones seleccionadas
    Dado que publica los workflows en espera "A" y "B" y llama a sus webhooks
    Cuando detiene en bloque las ejecuciones en espera del workflow "A"
    Entonces la respuesta informa 1 ejecución detenida
    Y la ejecución del workflow "B" sigue en estado "waiting"

  @CP-EX-04 @error @hallazgo
  Escenario: Detener una ejecución ya terminada se rechaza y no la modifica
    Dado que publica un workflow de webhook que responde con el campo "ok"
    Y llama al webhook de producción
    Y la última ejecución del workflow termina con el estado "success"
    Cuando detiene la última ejecución
    Entonces la respuesta tiene un código de error
    Y la ejecución queda en estado "success"
