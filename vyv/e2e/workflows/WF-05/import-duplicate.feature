# language: es
@workflows @wf05
Característica: WF-05 Importar y duplicar workflows
  Como usuaria de n8n
  Quiero importar workflows desde una URL y duplicar los que ya tengo
  Para reutilizar automatizaciones sin empezar de cero

  Antecedentes:
    Dado que "Ana" es una usuaria con sesión iniciada en n8n

  @CP-WF-05-06 @exito
  Escenario: El duplicado conserva la etiqueta y sus cambios no afectan al original
    Dado que tiene el workflow "VyV original BDD" con la etiqueta "vyv_etiqueta"
    Cuando lo duplica con el nombre "VyV original BDD (copia)"
    Y renombra el duplicado a "VyV copia modificada"
    Entonces el duplicado tiene la etiqueta "vyv_etiqueta"
    Y el original conserva el nombre "VyV original BDD" y su versión

  @CP-WF-05-05 @alternativo @error
  Esquema del escenario: Validar la longitud del nombre del workflow
    Cuando guarda un workflow con un nombre de <longitud> caracteres
    Entonces la respuesta tiene el código <codigo>

    Ejemplos:
      | longitud | codigo |
      | 1        | 200    |
      | 128      | 200    |
      | 129      | 400    |
      | 0        | 400    |

  @CP-WF-05-04 @error
  Esquema del escenario: Rechazar una URL de importación no válida
    Cuando importa un workflow desde la URL "<url>"
    Entonces la respuesta tiene el código 400
    Y el mensaje contiene "<mensaje>"

    Ejemplos:
      | url            | mensaje                            |
      | no-es-una-url  | invalid url                        |
      | /no-existe-vyv | does not seem to be a n8n workflow |
      | /healthz       | does not seem to be a n8n workflow |
