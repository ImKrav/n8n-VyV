# language: es
@core @co04 @regresion
Característica: CO-04 Crear y navegar carpetas
  Como usuario de n8n
  Quiero crear y anidar carpetas
  Para organizar mis workflows

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n
    Y crea la carpeta "A"
    Y crea la carpeta "B" dentro de "A"
    Y crea la carpeta "C"

  @CP-CO-04-01 @CP-CO-04-02 @exito
  Escenario: Las carpetas anidadas muestran su ruta
    Entonces la ruta de "B" es "A > B"

  @CP-CO-04-04 @alternativo
  Escenario: Renombrar una carpeta cambia la ruta de sus subcarpetas
    Cuando renombra la carpeta "A" a "Proyectos"
    Entonces la respuesta tiene el código 200
    Y la ruta de "B" es "Proyectos > B"

  @CP-CO-04-03 @error
  Esquema del escenario: Rechazar nombres de carpeta inválidos
    Cuando crea la carpeta "<nombre>"
    Entonces la respuesta tiene el código 400
    Y el mensaje contiene "<mensaje>"

    Ejemplos:
      | nombre  | mensaje            |
      | a/b     | invalid characters |
      | ...     | dots only          |
      | .oculta | start with a dot   |
