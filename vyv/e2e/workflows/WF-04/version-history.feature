# language: es
@workflows @wf04
Característica: WF-04 Historial de versiones
  Como usuaria de n8n
  Quiero revisar y restaurar las versiones guardadas de un workflow
  Para recuperar un estado anterior sin perder el trabajo actual

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y que tiene un workflow con los nodos "Manual Trigger" conectados en cadena

  @CP-WF-04-01 @exito
  Escenario: Cada cambio guardado crea una versión nueva
    Cuando guarda 3 cambios en el workflow
    Entonces el historial tiene 4 versiones con la más reciente primero

  @CP-WF-04-03 @alternativo
  Escenario: Restaurar la primera versión recupera sus nodos y crea una versión nueva
    Dado que guarda 3 cambios en el workflow
    Cuando restaura la primera versión del historial
    Entonces el workflow guardado tiene los nodos de la primera versión
    Y el historial tiene 5 versiones con la más reciente primero

  @CP-WF-04 @error
  Escenario: Una versión inexistente responde 404
    Cuando consulta la versión "no-existe" del historial
    Entonces la respuesta tiene el código 404
    Y el mensaje contiene "Could not find version"

  @CP-WF-04-02 @error
  Escenario: Nombrar una versión sin licencia se rechaza
    Cuando intenta nombrar la última versión "Versión estable"
    Entonces la respuesta tiene el código 403
    Y el mensaje contiene "license"
