# language: es
@credentials @cr04
Característica: CR-04 Credenciales en los nodos
  Como usuaria de n8n
  Quiero asignar y cambiar la credencial que usa cada nodo
  Para que cada llamada use el acceso correcto

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y que existe el servicio de eco publicado

  @CP-CR-04-01 @exito
  Escenario: El nodo HTTP Request usa la credencial asignada al ejecutar
    Dado que existe la credencial Header Auth "vyv_bdd_asignada" con la cabecera "X-Token" y el valor "asignada"
    Y que publica un workflow que llama al eco con esa credencial
    Cuando llama al webhook de producción
    Entonces el eco recibe la cabecera "X-Token" con el valor "asignada"

  @CP-CR-04-07 @exito
  Escenario: Sustituir la credencial del nodo se conserva al guardar
    Dado que existe la credencial Header Auth "vyv_bdd_primera" con la cabecera "X-Token" y el valor "a"
    Y que publica un workflow que llama al eco con esa credencial
    Y que existe la credencial Header Auth "vyv_bdd_segunda" con la cabecera "X-Token" y el valor "b"
    Cuando sustituye la credencial del nodo por "vyv_bdd_segunda"
    Entonces el nodo "HTTP Request" guardado usa la credencial "vyv_bdd_segunda"

  @CP-CR-04-02 @alternativo
  Escenario: Al filtrar por el tipo requerido solo aparecen credenciales de ese tipo
    Dado que existe la credencial Header Auth "vyv_bdd_cabecera" con la cabecera "X-Token" y el valor "a"
    Y que existe la credencial Basic Auth "vyv_bdd_basica"
    Cuando filtra las credenciales por el tipo "httpHeaderAuth"
    Entonces todas las credenciales listadas son del tipo "httpHeaderAuth"
    Y la lista incluye la credencial "vyv_bdd_cabecera"
    Pero la lista no incluye la credencial "vyv_bdd_basica"

  @CP-CR-04-05 @error
  Escenario: Un workflow con una credencial que no existe no se publica
    Cuando publica un workflow que llama al eco con una credencial que no existe
    Entonces la respuesta tiene el código 400
    Y el mensaje contiene "credential"
    Y el workflow sigue sin publicar

  @CP-CR-04-06 @error
  Escenario: Un nodo que requiere credencial y no tiene ninguna falla al ejecutar
    Dado que publica un workflow que llama al eco sin credencial
    Cuando llama al webhook de producción
    Entonces la última ejecución del workflow falla en el nodo "HTTP Request" con un mensaje sobre "credential"
