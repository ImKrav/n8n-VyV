# language: es
@credentials @cr03
Característica: CR-03 Credenciales OAuth2
  Como usuaria de n8n
  Quiero conectar credenciales OAuth2 con el proveedor
  Para usar servicios que piden mi consentimiento

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y que existe una credencial OAuth2 del proveedor "https://auth.example.com/authorize" con los scopes "read write"

  @CP-CR-03-01 @exito
  Escenario: La URL de autorización apunta al proveedor y vuelve al callback de la instancia
    Cuando pide la URL de autorización de la credencial
    Entonces la URL de autorización apunta a "https://auth.example.com/authorize"
    Y la URL de autorización vuelve al callback de esta instancia

  @CP-CR-03-04 @alternativo
  Escenario: Los scopes de la URL coinciden con los de la credencial
    Cuando pide la URL de autorización de la credencial
    Entonces la URL de autorización pide los scopes "read write"

  @CP-CR-03-03 @error
  Escenario: Si la persona cancela en el proveedor, no se guarda ningún token
    Cuando cancela la autorización en el proveedor
    Entonces la página de callback informa "access_denied"
    Y la página de callback informa "Failed to connect"
    Y la credencial no guarda un token de acceso

  @CP-CR-03 @error
  Escenario: Pedir la URL de autorización de una credencial inexistente responde 404
    Cuando pide la URL de autorización de la credencial "no-existe-vyv"
    Entonces la respuesta tiene el código 404
    Y el mensaje contiene "Credential not found"
