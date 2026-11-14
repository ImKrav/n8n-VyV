# language: es
@workflows @wf03
Característica: WF-03 Publicar workflows
  Como usuaria de n8n
  Quiero publicar y despublicar workflows con webhook
  Para que reciban llamadas de producción solo cuando yo lo decida

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n

  @CP-WF-03-02 @exito
  Escenario: Un workflow publicado responde en su URL de producción
    Dado que publica un workflow de webhook que responde con el campo "ok"
    Cuando llama al webhook de producción
    Entonces el webhook responde con el código 200
    Y el workflow tiene 1 ejecución con el estado "success" en modo "webhook"
    Cuando abre el workflow en el editor
    Entonces el editor indica que el workflow está publicado

  @CP-WF-03-05 @alternativo
  Escenario: Despublicar el workflow detiene su webhook de producción
    Dado que publica un workflow de webhook que responde con el campo "ok"
    Y llama al webhook de producción
    Cuando despublica el workflow
    Y llama una vez al webhook de producción
    Entonces el webhook responde con el código 404

  @CP-WF-03-01 @error
  Escenario: No se puede publicar un workflow sin nodo trigger
    Dado que tiene un workflow con los nodos "Edit Fields" conectados en cadena
    Cuando intenta publicar el workflow
    Entonces la respuesta tiene el código 400
    Y el mensaje contiene "no trigger node"
    Y el workflow sigue sin publicar

  @CP-WF-03-03 @error
  Escenario: Un segundo workflow con la misma ruta y método no se publica
    Dado que publica un workflow de webhook que responde con el campo "ok"
    Cuando intenta publicar otro workflow con la misma ruta y el mismo método
    Entonces la respuesta tiene el código 409
    Y el mensaje contiene "conflict with one of the webhooks"
