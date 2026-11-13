# language: es
@co04 @co05 @regresion
Característica: CO-04 y CO-05 Organizar carpetas
  Como usuario de n8n
  Quiero crear, mover y eliminar carpetas
  Para organizar mis workflows sin perder información

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y crea la carpeta "A"
    Y crea la carpeta "B" dentro de "A"
    Y crea la carpeta "C"

  Escenario: Las carpetas anidadas muestran su ruta
    Entonces la ruta de "B" es "A > B"

  Escenario: Impedir mover una carpeta dentro de su descendiente
    Cuando mueve la carpeta "A" a "B"
    Entonces la respuesta tiene el código 400
    Y el mensaje contiene "descendant"

  Escenario: Eliminar una carpeta transfiriendo su contenido
    Dado que la carpeta "A" contiene el workflow "WF BDD"
    Cuando elimina la carpeta "A" transfiriendo su contenido a "C"
    Entonces la carpeta "C" contiene 1 workflow y 1 subcarpeta

  Esquema del escenario: Rechazar nombres de carpeta inválidos
    Cuando crea la carpeta "<nombre>"
    Entonces la respuesta tiene el código 400
    Y el mensaje contiene "<mensaje>"

    Ejemplos:
      | nombre  | mensaje            |
      | a/b     | invalid characters |
      | ...     | dots only          |
      | .oculta | start with a dot   |
