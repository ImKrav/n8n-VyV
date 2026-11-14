# language: es
@workflows @wf02
Característica: WF-02 Ajustes del workflow
  Como usuaria de n8n
  Quiero configurar la zona horaria, el timeout, el guardado de ejecuciones y el workflow de error
  Para controlar cómo se ejecuta y se registra cada workflow

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n

  @CP-WF-02-05 @CP-WF-02-06 @exito
  Escenario: Los ajustes guardados persisten al volver a leer el workflow
    Dado que tiene un workflow con los nodos "Manual Trigger" conectados en cadena
    Cuando guarda la zona horaria "America/Bogota" y un timeout de 120 segundos
    Entonces el workflow guardado tiene la zona horaria "America/Bogota" y un timeout de 120 segundos

  @CP-WF-02-01 @alternativo
  Escenario: Con «no guardar ejecuciones exitosas» la ejecución no queda registrada
    Dado que publica un workflow de webhook que no guarda las ejecuciones exitosas
    Cuando llama al webhook de producción
    Entonces el webhook responde con el código 200
    Y el workflow no tiene ejecuciones guardadas

  @CP-WF-02-03 @error
  Escenario: Una ejecución más larga que el timeout se cancela
    Dado que publica un workflow de webhook con una espera de 4 segundos y un timeout de 1 segundo
    Cuando llama al webhook de producción
    Entonces la última ejecución del workflow termina con el estado "canceled"

  @CP-WF-02-04 @error
  Escenario: El workflow de error se ejecuta cuando el workflow principal falla
    Dado que tiene publicado un workflow de error
    Y publica un workflow de webhook que falla y usa ese workflow de error
    Cuando llama al webhook de producción
    Entonces el workflow de error tiene una ejecución en modo "error" con el estado "success"
