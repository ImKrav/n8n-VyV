# language: es
@credentials @cr02
Característica: CR-02 Editar y eliminar credenciales
  Como usuaria de n8n
  Quiero cambiar y eliminar credenciales que ya existen
  Para rotar secretos y retirar accesos que ya no se usan

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y que existe el servicio de eco publicado
    Y que existe la credencial Header Auth "vyv_bdd_rotar" con la cabecera "X-Token" y el valor "v1"

  @CP-CR-02-01 @exito
  Escenario: Al cambiar el valor de una credencial en uso, el workflow envía el valor nuevo
    Dado que publica un workflow que llama al eco con esa credencial
    Cuando cambia el valor de la credencial a "v2"
    Y llama al webhook de producción
    Entonces el eco recibe la cabecera "X-Token" con el valor "v2"

  @CP-CR-02-02 @exito
  Escenario: Al reabrir la credencial en el editor el secreto aparece enmascarado
    Cuando abre el listado de credenciales buscando "vyv_bdd_rotar"
    Y abre la primera credencial del listado
    Entonces el campo secreto no muestra el valor "v1"

  @CP-CR-02-07 @alternativo
  Escenario: Eliminar una credencial sin uso la quita de la instancia
    Cuando elimina la credencial
    Entonces la respuesta tiene el código 200
    Y la credencial ya no se puede consultar

  @CP-CR-02-08 @error
  Escenario: Eliminar una credencial en uso hace que la ejecución informe el problema
    Dado que publica un workflow que llama al eco con esa credencial
    Cuando elimina la credencial
    Y llama al webhook de producción
    Entonces el webhook responde con el código 500
    Y la última ejecución del workflow falla en el nodo "HTTP Request" con el error "CredentialNotFoundError"
