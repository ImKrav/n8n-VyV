# language: es
@credentials @cr05
Característica: CR-05 Listado y permisos de credenciales
  Como usuaria de n8n
  Quiero buscar, filtrar y compartir mis credenciales
  Para encontrarlas rápido y controlar quién las usa

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y que tiene las credenciales Header Auth "Facturación" y "Correo" y la credencial Basic Auth "Básica"

  @CP-CR-05-01 @exito
  Escenario: Un término parcial devuelve solo las credenciales que coinciden
    Cuando busca sus credenciales por "Fact"
    Entonces el resultado contiene solo "Facturación"
    Cuando busca "Fact" en el listado de credenciales del editor
    Entonces el listado del editor muestra 1 credencial llamada "Facturación"

  @CP-CR-05-03 @exito
  Escenario: El filtro por tipo solo muestra las credenciales de ese tipo
    Cuando filtra las credenciales por el tipo "httpBasicAuth"
    Entonces todas las credenciales listadas son del tipo "httpBasicAuth"
    Y el resultado incluye "Básica"

  @CP-CR-05-01 @alternativo
  Escenario: Un término inexistente devuelve un listado vacío
    Cuando busca sus credenciales por "Inexistente"
    Entonces el resultado está vacío

  @CP-CR-05-06 @error
  Escenario: Compartir una credencial sin licencia se rechaza
    Cuando intenta compartir la credencial "Correo"
    Entonces la respuesta tiene el código 403
    Y el mensaje contiene "license"
    Y la credencial "Correo" no queda compartida
