# language: es
@workflows @wf01
Característica: WF-01 Crear y editar workflows en el lienzo
  Como usuaria de n8n
  Quiero añadir, conectar, eliminar y desactivar nodos en el lienzo
  Para construir la lógica de mis automatizaciones

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n

  @CP-WF-01-01 @exito
  Escenario: Un Manual Trigger conectado a un Edit Fields se muestra en el lienzo
    Dado que tiene un workflow con los nodos "Manual Trigger, Edit Fields" conectados en cadena
    Cuando abre el workflow en el editor
    Entonces el lienzo muestra 2 nodos
    Y el lienzo muestra la conexión de "Manual Trigger" a "Edit Fields"

  @CP-WF-01-02 @CP-WF-01-05 @alternativo
  Escenario: Eliminar un nodo quita su conexión y deshacer lo restaura
    Dado que tiene un workflow con los nodos "Manual Trigger, Paso A, Paso B" conectados en cadena
    Y abre el workflow en el editor
    Cuando elimina el nodo "Paso B" del lienzo
    Entonces el lienzo no muestra el nodo "Paso B"
    Y el lienzo no muestra la conexión de "Paso A" a "Paso B"
    Pero el lienzo muestra la conexión de "Manual Trigger" a "Paso A"
    Cuando deshace el último cambio con el teclado
    Entonces el lienzo muestra la conexión de "Paso A" a "Paso B"

  @CP-WF-01-04 @alternativo
  Escenario: Un nodo desactivado no transforma los datos y se ve desactivado
    Dado que publica un workflow de webhook con el nodo desactivado "Desactivado" antes del nodo "Final"
    Cuando llama al webhook de producción
    Entonces la respuesta del webhook incluye el campo "final"
    Y la respuesta del webhook no incluye el campo "desactivado"
    Cuando abre el workflow en el editor
    Entonces el nodo "Desactivado" aparece como desactivado en el lienzo

  @CP-WF-01 @error
  Escenario: Abrir un workflow que no existe muestra un aviso y ningún lienzo
    Cuando abre en el editor el workflow con id "no-existe-vyv-000"
    Entonces ve la página "/entity-not-found/workflow" con el aviso "Workflow not found"
    Y el lienzo no muestra nodos
