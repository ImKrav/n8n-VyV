# language: es
@executions @ex05
Característica: EX-05 Panel de logs de la ejecución
  Como usuaria de n8n
  Quiero ver el recorrido de cada ejecución nodo a nodo
  Para entender qué rama se tomó y dónde falló

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n

  @CP-EX-05-01 @CP-EX-05-02 @exito
  Esquema del escenario: El registro sigue la rama que tomó la bifurcación If
    Dado que publica un workflow de webhook con una bifurcación If entre "Rama sí" y "Rama no"
    Cuando llama al webhook de producción con el parámetro "ok" igual a "<valor>"
    Entonces el registro de la última ejecución sigue el orden "Webhook, If, <rama>"
    Y el registro no incluye el nodo "<otra>"
    Y la salida de "<rama>" en el registro tiene el campo "rama" con el valor "<valor>"

    Ejemplos:
      | valor | rama    | otra    |
      | si    | Rama sí | Rama no |
      | no    | Rama no | Rama sí |

  @CP-EX-05-04 @alternativo
  Escenario: La ejecución de Execute Workflow enlaza con la ejecución hija
    Dado que tiene publicado un workflow hijo que devuelve el campo "desde" con el valor "hijo"
    Y publica un workflow de webhook que llama al workflow hijo
    Cuando llama al webhook de producción
    Entonces la respuesta del webhook tiene el campo "desde" con el valor "hijo"
    Y el registro enlaza el nodo "Execute Workflow" con una ejecución del workflow hijo

  @CP-EX-05-03 @error
  Escenario: El nodo que falla queda marcado con error en el registro
    Dado que publica un workflow de webhook con una bifurcación If cuya rama "Rama sí" falla
    Cuando llama al webhook de producción con el parámetro "ok" igual a "si"
    Entonces en el registro el nodo "Rama sí" termina con error y el nodo "If" termina bien
