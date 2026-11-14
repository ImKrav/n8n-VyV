# language: es
@executions @ex03
Característica: EX-03 Vista previa, reintento y eliminación de ejecuciones
  Como usuaria de n8n
  Quiero revisar, reintentar y eliminar ejecuciones
  Para diagnosticar fallos y mantener limpia la lista

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n

  @CP-EX-03-01 @exito
  Escenario: La vista previa muestra por nodo los mismos datos que devolvió la ejecución
    Dado que publica un workflow de webhook que responde con el campo "pedido"
    Cuando llama al webhook de producción
    Entonces la vista previa de la última ejecución muestra los nodos "Webhook, Edit Fields"
    Y la salida de "Edit Fields" en la vista previa coincide con la respuesta del webhook

  @CP-EX-03-03 @exito
  Escenario: Reintentar con la versión corregida termina con éxito
    Dado que publica un workflow de webhook que falla con el mensaje "fallo BDD"
    Y llama al webhook de producción
    Cuando corrige el workflow sustituyendo el nodo "Falla"
    Y reintenta la última ejecución con la versión actual
    Entonces el reintento queda enlazado a la ejecución original y termina con el estado "success"

  @CP-EX-03-04 @alternativo
  Escenario: Reintentar con la versión original vuelve a fallar
    Dado que publica un workflow de webhook que falla con el mensaje "fallo BDD"
    Y llama al webhook de producción
    Cuando reintenta la última ejecución con la versión original
    Entonces el reintento queda enlazado a la ejecución original y termina con el estado "error"

  @CP-EX-03-05 @alternativo
  Escenario: Eliminar una ejecución la quita de la lista
    Dado que publica un workflow de webhook que responde con el campo "ok"
    Y llama al webhook de producción
    Cuando elimina la última ejecución
    Entonces la respuesta tiene el código 200
    Y la ejecución eliminada ya no aparece en la lista del workflow

  @CP-EX-03-02 @error
  Escenario: La ejecución fallida identifica el nodo con error y su mensaje
    Dado que publica un workflow de webhook que falla con el mensaje "fallo BDD"
    Cuando llama al webhook de producción
    Entonces el registro indica que el último nodo ejecutado es "Falla"
    Y el error de la ejecución es "fallo BDD"
