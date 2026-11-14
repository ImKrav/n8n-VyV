# language: es
@credentials @cr01
Característica: CR-01 Crear y probar credenciales
  Como usuaria de n8n
  Quiero crear credenciales y probar su conexión
  Para que mis nodos se autentiquen en otros servicios

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n

  @CP-CR-01-01 @exito
  Escenario: Una credencial Header Auth completa se guarda y aparece en el listado
    Cuando crea la credencial Header Auth "vyv_bdd_cabecera" con la cabecera "X-Token" y el valor "v1"
    Entonces la búsqueda por el nombre "vyv_bdd_cabecera" devuelve 1 credencial
    Cuando abre el listado de credenciales buscando "vyv_bdd_cabecera"
    Entonces el listado del editor muestra 1 credencial llamada "vyv_bdd_cabecera"

  @CP-CR-01-06 @alternativo
  Escenario: Dos credenciales con el mismo nombre se permiten y se distinguen por su ID
    Cuando crea dos credenciales Header Auth llamadas "vyv_bdd_repetida"
    Entonces la búsqueda por el nombre "vyv_bdd_repetida" devuelve 2 credenciales
    Y las dos credenciales tienen identificadores distintos

  @CP-CR-01-04 @error
  Escenario: La credencial «n8n API» con una clave incorrecta informa el error
    Cuando prueba una credencial n8n API con la clave "clave-incorrecta-vyv"
    Entonces la prueba de conexión responde "Error" con el mensaje "Unauthorized"

  @CP-CR-01-05 @error
  Escenario: Un tipo de credencial inexistente se rechaza
    Cuando intenta crear una credencial de tipo "tipoNoExisteVyv"
    Entonces la respuesta tiene el código 400
