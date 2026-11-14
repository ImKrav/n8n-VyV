# Comparación de regresión

Regresiones: 0 · Corregidos: 3

| Prueba | Antes | Después | Cambio |
|---|---|---|---|
| CO-02 · Edición de filas (API) CP-017-01 · añade una fila con un valor válido por tipo | passed | passed | igual |
| CO-02 · Edición de filas (API) CP-017-02 · rechaza valores incompatibles con el tipo de la columna | passed | passed | igual |
| CO-02 · Edición de filas (API) CP-017-03 · guarda fechas en formato ISO UTC | passed | passed | igual |
| CO-02 · Edición de filas (API) CP-017-04 · admite nulos y el filtro isEmpty los encuentra | passed | passed | igual |
| CO-02 · Edición de filas (API) CP-017-05 · guarda una celda de 10.000 caracteres | passed | passed | igual |
| CO-02 · Edición de filas (API) CP-017-05 · guarda una celda de 100.000 caracteres | passed | passed | igual |
| CO-02 · Edición de filas (API) Con datos de ejemplo CP-017-06 · ordena por edad ascendente y descendente | passed | passed | igual |
| CO-02 · Edición de filas (API) Con datos de ejemplo CP-017-07 · filtra con gt (valor límite excluido), eq y like | passed | passed | igual |
| CO-02 · Edición de filas (API) Con datos de ejemplo Complementaria · elimina filas seleccionadas | passed | passed | igual |
| CO-02 · Límite de almacenamiento (API) CP-017-08 · rechaza inserciones al superar el límite configurado | pending | passed | cambió |
| CO-03 · Importar y exportar CSV (API) CP-018-01 · importa un CSV válido e infiere los tipos | passed | passed | igual |
| CO-03 · Importar y exportar CSV (API) CP-018-02 · rechaza archivos que no son .csv (RNF-018) | passed | passed | igual |
| CO-03 · Importar y exportar CSV (API) CP-018-03 · rechaza un CSV malformado sin crear tablas | passed | passed | igual |
| CO-03 · Importar y exportar CSV (API) CP-018-04 · no importa filas parciales si hay tipos incompatibles | passed | passed | igual |
| CO-03 · Importar y exportar CSV (API) CP-018-05 · rechaza columnas que no existen en la tabla | passed | passed | igual |
| CO-03 · Importar y exportar CSV (API) Complementaria · ignora las columnas de sistema del CSV | passed | passed | igual |
| CO-03 · Importar y exportar CSV (API) CP-018-06 · el CSV descargado coincide con el original (round-trip) | passed | passed | igual |
| CO-03 · Importar y exportar CSV (API) Complementaria · exporta con columnas de sistema cuando se solicita | passed | passed | igual |
| CO-03 · Importar y exportar CSV (API) Complementaria · CSV sin encabezados genera Column_1..Column_n | passed | passed | igual |
| CO-03 · Importar y exportar CSV (API) Hallazgo CP-018-07 · inferencia de fechas imposibles (documenta el defecto) | failed | passed | 🟢 corregido |
| CO-03 · Importar y exportar CSV (API) Complementaria · BUG-018-05 · CSV malformado y fileId inválido responden 400 (tras la refactorización) | failed | passed | 🟢 corregido |
| CO-04 · Carpetas: crear y navegar (API) Precondición · la función Folders está habilitada por licencia | passed | passed | igual |
| CO-04 · Carpetas: crear y navegar (API) CP-019-01 · crea una carpeta en la raíz del proyecto | passed | passed | igual |
| CO-04 · Carpetas: crear y navegar (API) CP-019-02 · rechaza las 4 clases de nombres inválidos con su mensaje | passed | passed | igual |
| CO-04 · Carpetas: crear y navegar (API) Complementaria · valores límite de longitud (128 acepta / 129 rechaza) | passed | passed | igual |
| CO-04 · Carpetas: crear y navegar (API) CP-019-03 · renombra una carpeta | passed | passed | igual |
| CO-04 · Carpetas: crear y navegar (API) CP-019-04 · anida 3 niveles y el árbol muestra la ruta A → B → C | passed | passed | igual |
| CO-04 · Carpetas: crear y navegar (API) CP-019-06 · el contenido de la carpeta cuenta workflows y subcarpetas | passed | passed | igual |
| CO-05 · Carpetas: mover y eliminar (API) CP-020-01 · mueve un workflow de la raíz a una carpeta | passed | passed | igual |
| CO-05 · Carpetas: mover y eliminar (API) CP-020-02 · mueve una carpeta con contenido dentro de otra | passed | passed | igual |
| CO-05 · Carpetas: mover y eliminar (API) CP-020-03 · impide que una carpeta sea su propio padre | passed | passed | igual |
| CO-05 · Carpetas: mover y eliminar (API) Complementaria · impide mover una carpeta dentro de su descendiente | passed | passed | igual |
| CO-05 · Carpetas: mover y eliminar (API) Complementaria · elimina una carpeta vacía | passed | passed | igual |
| CO-05 · Carpetas: mover y eliminar (API) CP-020-04 · elimina con contenido transfiriéndolo a otra carpeta | passed | passed | igual |
| CO-05 · Carpetas: mover y eliminar (API) CP-020-05 · elimina con contenido sin transferir: los workflows quedan archivados | passed | passed | igual |
| CO-05 · Carpetas: mover y eliminar (API) Complementaria · rechaza transferir el contenido a la carpeta que se elimina | passed | passed | igual |
| Seguridad · Data tables y carpetas (OWASP Top 10) A01 Broken Access Control · la API exige sesión válida (sin cookie → 401) | passed | passed | igual |
| Seguridad · Data tables y carpetas (OWASP Top 10) A01/A07 · la cookie de sesión no sirve con otro browser-id (protección de secuestro de sesión) | passed | passed | igual |
| Seguridad · Data tables y carpetas (OWASP Top 10) A01 · path traversal en fileId al crear una tabla desde CSV | passed | passed | igual |
| Seguridad · Data tables y carpetas (OWASP Top 10) A03 Injection · nombres con SQL no alteran la base de datos | passed | passed | igual |
| Seguridad · Data tables y carpetas (OWASP Top 10) A03 Injection (XSS) · un nombre de carpeta con HTML se muestra como texto | passed | passed | igual |
| Seguridad · Data tables y carpetas (OWASP Top 10) CP-018-08 · A03 inyección de fórmulas en el CSV exportado (CWE-1236) | failed | passed | 🟢 corregido |
| Seguridad · Data tables y carpetas (OWASP Top 10) A04 Insecure Design · solo se aceptan archivos .csv | passed | passed | igual |
| Seguridad · Data tables y carpetas (OWASP Top 10) A05 Security Misconfiguration · cabeceras de seguridad en la respuesta del editor | passed | passed | igual |
| CO-01 / CO-02 · Data tables (UI) CP-016-01 · crea una data table desde cero y aparece su tarjeta | passed | — | cambió |
| CO-01 / CO-02 · Data tables (UI) CP-016-02 · el botón Create queda deshabilitado con nombre vacío | failed | — | cambió |
| CO-01 / CO-02 · Data tables (UI) CP-016-04 · muestra los encabezados de las columnas de los 4 tipos | passed | — | cambió |
| CO-01 / CO-02 · Data tables (UI) CP-016-05 · el popover de nueva columna no crea nombres inválidos | passed | — | cambió |
| CO-01 / CO-02 · Data tables (UI) CP-017-01 · añade una fila y los valores persisten tras recargar | passed | — | cambió |
| CO-01 / CO-02 · Data tables (UI) CP-017-06/07 · ordena y busca filas en la vista | passed | — | cambió |
| CO-01 / CO-02 · Data tables (UI) Complementaria · elimina filas seleccionadas | passed | — | cambió |
| CO-03 · CSV (UI) CP-018-01 · importa valido.csv desde el modal de nueva data table | passed | passed | igual |
| CO-03 · CSV (UI) CP-018-06 · descarga el CSV desde la vista de la tabla | passed | passed | igual |
| CO-04 / CO-05 · Carpetas (UI) CP-019-01 · crea una carpeta desde el botón de añadir recurso | passed | — | cambió |
| CO-04 / CO-05 · Carpetas (UI) CP-019-03/05 · renombra desde los breadcrumbs y navega con las migas de pan | passed | — | cambió |
| CO-04 / CO-05 · Carpetas (UI) CP-019-06 · la tarjeta de carpeta muestra los conteos | passed | — | cambió |
| CO-04 / CO-05 · Carpetas (UI) CP-020-04 · elimina una carpeta transfiriendo su contenido | passed | — | cambió |
| CO-04 / CO-05 · Carpetas (UI) CP-020-02 · mueve una carpeta a otra con el modal de mover | passed | — | cambió |
| CO-01 Crear data table y columnas Crear una data table con nombre válido desde la interfaz | passed | passed | igual |
| CO-01 Crear data table y columnas Rechazar un nombre de tabla duplicado | passed | passed | igual |
| CO-01 Crear data table y columnas Validar nombres de columna (example #1) | passed | passed | igual |
| CO-01 Crear data table y columnas Validar nombres de columna (example #2) | passed | passed | igual |
| CO-01 Crear data table y columnas Validar nombres de columna (example #3) | passed | passed | igual |
| CO-01 Crear data table y columnas Validar nombres de columna (example #4) | passed | passed | igual |
| CO-02 Edición de filas Rechazar un valor que no coincide con el tipo de la columna | passed | passed | igual |
| CO-02 Edición de filas Filtrar filas con un valor límite | passed | passed | igual |
| CO-03 Importar y exportar CSV Importar un CSV válido infiere los tipos | passed | passed | igual |
| CO-03 Importar y exportar CSV Rechazar un archivo que no es CSV | passed | passed | igual |
| CO-04 y CO-05 Organizar carpetas Las carpetas anidadas muestran su ruta | passed | — | cambió |
| CO-04 y CO-05 Organizar carpetas Impedir mover una carpeta dentro de su descendiente | passed | — | cambió |
| CO-04 y CO-05 Organizar carpetas Eliminar una carpeta transfiriendo su contenido | passed | — | cambió |
| CO-04 y CO-05 Organizar carpetas Rechazar nombres de carpeta inválidos (example #1) | passed | — | cambió |
| CO-04 y CO-05 Organizar carpetas Rechazar nombres de carpeta inválidos (example #2) | passed | — | cambió |
| CO-04 y CO-05 Organizar carpetas Rechazar nombres de carpeta inválidos (example #3) | passed | — | cambió |
| Accesibilidad · Data tables y carpetas Auditoría WCAG · Listado /home/datatables (WCAG 1.1.1, 1.3.1, 1.4.3, 2.4.x, 4.1.2) | passed | passed | igual |
| Accesibilidad · Data tables y carpetas Auditoría WCAG · Detalle de una data table (grid) | passed | passed | igual |
| Accesibilidad · Data tables y carpetas Auditoría WCAG · Modal de nueva data table: etiquetas y foco (WCAG 1.3.1, 2.4.3, 3.3.2) | passed | passed | igual |
| Accesibilidad · Data tables y carpetas Auditoría WCAG · Vista de carpetas y breadcrumbs | passed | passed | igual |
| Accesibilidad · Data tables y carpetas Teclado: se llega con Tab a las acciones principales y el foco es visible (WCAG 2.1.1, 2.4.7) | passed | passed | igual |
| CO-01 · Data tables y columnas (API) CP-016-01 · crea una data table con nombre válido | passed | passed | igual |
| CO-01 · Data tables y columnas (API) CP-016-02 · rechaza nombre vacío o solo espacios | passed | passed | igual |
| CO-01 · Data tables y columnas (API) CP-016-03 · rechaza nombre duplicado en el mismo proyecto (409) | passed | passed | igual |
| CO-01 · Data tables y columnas (API) Complementaria · valores límite de la longitud del nombre (1 / 128 / 129) | passed | passed | igual |
| CO-01 · Data tables y columnas (API) Columnas CP-016-04 · añade columnas de los 4 tipos | passed | passed | igual |
| CO-01 · Data tables y columnas (API) Columnas CP-016-05 · rechaza nombres de columna inválidos y acepta los válidos (límite 63/64) | passed | passed | igual |
| CO-01 · Data tables y columnas (API) Columnas Complementaria · rechaza columna duplicada (409) | passed | passed | igual |
| CO-01 · Data tables y columnas (API) Columnas Complementaria · rechaza nombres reservados del sistema | passed | passed | igual |
| CO-01 · Data tables y columnas (API) Columnas CP-016-06 · renombra una columna y conserva sus datos | passed | passed | igual |
| CO-01 · Data tables y columnas (API) Columnas CP-016-07 · elimina una columna sin afectar las demás | passed | passed | igual |
| CO-01 · Data tables (UI) CP-016-01 · crea una data table desde cero y aparece su tarjeta | — | passed | cambió |
| CO-01 · Data tables (UI) CP-016-02 · el botón Create queda deshabilitado con nombre vacío | — | passed | cambió |
| CO-01 · Data tables (UI) CP-016-04 · muestra los encabezados de las columnas de los 4 tipos | — | passed | cambió |
| CO-01 · Data tables (UI) CP-016-05 · el popover de nueva columna no crea nombres inválidos | — | passed | cambió |
| CO-02 · Nodo Data Table en un workflow (API) CP-CO-02-08 · inserta una fila con el nodo Data Table y la lee con un filtro | — | passed | cambió |
| CO-02 · Edición de filas (UI) CP-017-01 · añade una fila y los valores persisten tras recargar | — | passed | cambió |
| CO-02 · Edición de filas (UI) CP-017-06/07 · ordena y busca filas en la vista | — | passed | cambió |
| CO-02 · Edición de filas (UI) Complementaria · elimina filas seleccionadas | — | passed | cambió |
| EX-04 · Cola de ejecuciones con límite de concurrencia (API) CP-EX-04-08 · las ejecuciones en cola pasan a ejecución y terminan con éxito en orden de llegada | — | passed | cambió |
| CO-03 · CSV de Excel y archivo grande (API) CP-CO-03-05 · importa un CSV de 10 000 filas en menos de 30 s y carga todas las filas | — | passed | cambió |
| CO-03 · CSV de Excel y archivo grande (API) CP-CO-03-04 · CSV exportado desde Excel en español (UTF-8 con BOM, «;», tildes) CP-CO-03-04 · el primer encabezado no incluye el BOM | — | passed | cambió |
| CO-03 · CSV de Excel y archivo grande (API) CP-CO-03-04 · CSV exportado desde Excel en español (UTF-8 con BOM, «;», tildes) CP-CO-03-04 · las tildes y la ñ se conservan en los valores importados | — | passed | cambió |
| CO-03 · CSV de Excel y archivo grande (API) CP-CO-03-04 · CSV exportado desde Excel en español (UTF-8 con BOM, «;», tildes) Hallazgo CP-CO-03-04 · el separador «;» separa las columnas o n8n informa que no lo admite | — | failed | cambió |
| CO-04 Crear y navegar carpetas Las carpetas anidadas muestran su ruta | — | passed | cambió |
| CO-04 Crear y navegar carpetas Rechazar nombres de carpeta inválidos (example #1) | — | passed | cambió |
| CO-04 Crear y navegar carpetas Rechazar nombres de carpeta inválidos (example #2) | — | passed | cambió |
| CO-04 Crear y navegar carpetas Rechazar nombres de carpeta inválidos (example #3) | — | passed | cambió |
| CO-04 · Carpetas: crear y navegar (UI) CP-019-01 · crea una carpeta desde el botón de añadir recurso | — | passed | cambió |
| CO-04 · Carpetas: crear y navegar (UI) CP-019-03/05 · renombra desde los breadcrumbs y navega con las migas de pan | — | passed | cambió |
| CO-04 · Carpetas: crear y navegar (UI) CP-019-06 · la tarjeta de carpeta muestra los conteos | — | passed | cambió |
| CO-05 Mover y eliminar carpetas Impedir mover una carpeta dentro de su descendiente | — | passed | cambió |
| CO-05 Mover y eliminar carpetas Eliminar una carpeta transfiriendo su contenido | — | passed | cambió |
| CO-05 · Carpetas: mover y eliminar (UI) CP-020-04 · elimina una carpeta transfiriendo su contenido | — | passed | cambió |
| CO-05 · Carpetas: mover y eliminar (UI) CP-020-02 · mueve una carpeta a otra con el modal de mover | — | passed | cambió |
| WF-01 · Lienzo del editor (UI) CP-WF-01-01 · los nodos Manual Trigger y Edit Fields conectados se conservan al recargar | — | passed | cambió |
| WF-01 · Lienzo del editor (UI) CP-WF-01-02 / CP-WF-01-05 · (alternativo) eliminar un nodo quita sus conexiones y Ctrl+Z lo restaura | — | passed | cambió |
| WF-01 · Lienzo del editor (UI) CP-WF-01-04 · (alternativo) un nodo desactivado se muestra atenuado y no transforma los datos | — | passed | cambió |
| WF-01 · Lienzo del editor (UI) CP-WF-01-07 · la nota adhesiva conserva color, contenido y tamaño al guardar | — | passed | cambió |
| WF-01 · Lienzo del editor (UI) CP-WF-01 · (error) abrir un workflow que no existe muestra el aviso y no abre un lienzo | — | passed | cambió |
| WF-01 · Workflow de 100 nodos (UI) CP-WF-01-08 · el lienzo con 100 nodos carga en menos de 3 s y el zoom y el desplazamiento responden | — | failed | cambió |
| WF-02 · Ajustes del workflow (API) CP-WF-02-06 / CP-WF-02-05 · los ajustes (zona horaria y timeout) persisten al volver a leer el workflow | — | passed | cambió |
| WF-02 · Ajustes del workflow (API) CP-WF-02-01 · (alternativo) con «no guardar ejecuciones exitosas» la ejecución de producción no queda registrada | — | passed | cambió |
| WF-02 · Ajustes del workflow (API) CP-WF-02-03 · (error) una ejecución más larga que el timeout del workflow se cancela | — | passed | cambió |
| WF-02 · Ajustes del workflow (API) CP-WF-02-04 · (error) el workflow de error se dispara cuando el workflow principal falla | — | passed | cambió |
| WF-03 · Webhook de producción (API) CP-WF-03-02 · el webhook de producción responde 200 y registra una ejecución exitosa | — | passed | cambió |
| WF-03 · Webhook de producción (API) CP-WF-03-04 · dos workflows con la misma ruta y métodos distintos reciben cada uno su método | — | passed | cambió |
| WF-03 · Webhook de producción (API) CP-WF-03-01 · (error) no se puede publicar un workflow sin nodo trigger | — | passed | cambió |
| WF-03 · Webhook de producción (API) CP-WF-03-03 · (error) un segundo workflow con la misma ruta y método no se publica | — | passed | cambió |
| WF-03 · Webhook de producción (API) CP-WF-03-05 · (alternativo) despublicar el workflow detiene su webhook de producción | — | passed | cambió |
| WF-03 · Webhook de producción (API) CP-WF-03-08 · después de reiniciar n8n el workflow sigue publicado y su webhook responde | — | passed | cambió |
| WF-04 · Historial de versiones (API) CP-WF-04-01 · tres cambios guardados crean tres versiones nuevas en orden cronológico | — | passed | cambió |
| WF-04 · Historial de versiones (API) CP-WF-04-03 · restaurar la versión con 2 nodos sobre un workflow de 4 crea una versión nueva con ese contenido | — | passed | cambió |
| WF-04 · Historial de versiones (API) CP-WF-04-04 / CP-WF-04-06 · una versión antigua se clona como workflow nuevo y el original no cambia | — | passed | cambió |
| WF-04 · Historial de versiones (API) CP-WF-04-05 · (alternativo) comparar dos versiones identifica los nodos añadidos, eliminados y modificados | — | passed | cambió |
| WF-04 · Historial de versiones (API) CP-WF-04-02 · (error) nombrar una versión sin licencia responde 403 y no cambia el nombre | — | passed | cambió |
| WF-04 · Historial de versiones (API) CP-WF-04 · (error) una versión o un workflow inexistentes responden 404 | — | passed | cambió |
| WF-05 · Importar y duplicar workflows (API) CP-WF-05-03 · importar desde una URL con JSON válido devuelve los nodos y conexiones del archivo | — | passed | cambió |
| WF-05 · Importar y duplicar workflows (API) CP-WF-05-04 · (error) una URL inválida, inexistente o sin JSON de workflow se rechaza con 400 | — | passed | cambió |
| WF-05 · Importar y duplicar workflows (API) CP-WF-05-05 · nombres del duplicado: vacío y de 129 se rechazan; de 128 y repetido se aceptan | — | passed | cambió |
| WF-05 · Importar y duplicar workflows (API) CP-WF-05-06 · el duplicado conserva las etiquetas y sus cambios no afectan al original | — | passed | cambió |
| WF-05 · Importar y duplicar workflows (API) CP-WF-05-01 · (alternativo) la búsqueda de plantillas devuelve resultados, vacío para un término inexistente y respeta la categoría | — | passed | cambió |
| EX-01 · Estados de las ejecuciones (API) CP-EX-01-01 · una ejecución exitosa aparece como «success» con inicio y duración coherentes | — | passed | cambió |
| EX-01 · Estados de las ejecuciones (API) CP-EX-01-02 · (error) una ejecución cuyo nodo falla aparece con estado «error» | — | passed | cambió |
| EX-01 · Estados de las ejecuciones (API) CP-EX-01-03 · (alternativo) mientras dura el nodo Wait la ejecución aparece «waiting» | — | passed | cambió |
| EX-01 · Estados de las ejecuciones (API) CP-EX-01-04 · (alternativo) una ejecución larga aparece «running» y cambia a «success» al terminar | — | passed | cambió |
| EX-01 · Estados de las ejecuciones (API) CP-EX-01-07 · la lista global y la del workflow muestran las mismas ejecuciones con los mismos datos | — | passed | cambió |
| EX-01 · Lista global con más de 1 000 ejecuciones CP-EX-01-08 · la API de la lista global responde en menos de 3 s con más de 1 000 ejecuciones | — | passed | cambió |
| EX-01 · Lista global con más de 1 000 ejecuciones CP-EX-01-08 · la lista global se abre en menos de 3 s y se desplaza sin bloqueos | — | passed | cambió |
| EX-03 · Vista previa, reintento y eliminación (API) CP-EX-03-01 · la vista previa muestra por nodo los mismos datos que devolvió la ejecución | — | passed | cambió |
| EX-03 · Vista previa, reintento y eliminación (API) CP-EX-03-02 · (error) la ejecución fallida identifica el nodo con error, su mensaje y sus datos de entrada | — | passed | cambió |
| EX-03 · Vista previa, reintento y eliminación (API) CP-EX-03-04 · (alternativo) reintentar con la versión original vuelve a fallar y queda como reintento | — | passed | cambió |
| EX-03 · Vista previa, reintento y eliminación (API) CP-EX-03-03 · reintentar con la versión actual (corregida) termina con éxito | — | passed | cambió |
| EX-03 · Vista previa, reintento y eliminación (API) CP-EX-03-05 · eliminar una ejecución la quita de la lista | — | passed | cambió |
| EX-03 · Vista previa, reintento y eliminación (API) CP-EX-03-06 · (alternativo) eliminar varias seleccionadas solo quita esas | — | passed | cambió |
| EX-03 · Vista previa, reintento y eliminación (API) CP-EX-03 · (error, hallazgo) consultar una ejecución eliminada no devuelve datos (responde 200 {} y no 404) | — | passed | cambió |
| EX-02 · Filtros de la lista de ejecuciones (API) CP-EX-02-01 · cada valor del filtro de estado muestra solo ejecuciones con ese estado | — | passed | cambió |
| EX-02 · Filtros de la lista de ejecuciones (API) CP-EX-02-02 · el filtro por workflow muestra solo ejecuciones de ese workflow | — | passed | cambió |
| EX-02 · Filtros de la lista de ejecuciones (API) CP-EX-02-03 · (alternativo) rangos de fechas: el mismo día incluye, el futuro y el rango invertido devuelven vacío | — | passed | cambió |
| EX-02 · Filtros de la lista de ejecuciones (API) CP-EX-02-04 · (alternativo) estado + workflow + fecha a la vez solo devuelven lo que cumple todo | — | passed | cambió |
| EX-02 · Filtros de la lista de ejecuciones (API) CP-EX-02-05 · sin filtros la lista vuelve a mostrar todas las ejecuciones | — | passed | cambió |
| EX-02 · Filtros de la lista de ejecuciones (API) CP-EX-02 · (error) un filtro mal formado o un límite fuera de rango responden 400 | — | passed | cambió |
| EX-04 · Detener ejecuciones (API) CP-EX-04-03 · detener una ejecución en un nodo Wait la deja «canceled» y no se reanuda | — | passed | cambió |
| EX-04 · Detener ejecuciones (API) CP-EX-04-02 · detener una ejecución de producción en curso la deja «canceled» | — | passed | cambió |
| EX-04 · Detener ejecuciones (API) CP-EX-04-04 · (alternativo) detener en bloque solo afecta a las ejecuciones seleccionadas | — | passed | cambió |
| EX-04 · Detener ejecuciones (API) CP-EX-04-05 · (alternativo) «detener todas» cancela todas las ejecuciones en curso | — | passed | cambió |
| EX-04 · Detener ejecuciones (API) CP-EX-04 · (error, hallazgo) detener una ejecución ya terminada no la modifica (responde 500) | — | passed | cambió |
| EX-05 · Datos del panel de logs (API) CP-EX-05-01 · el árbol sigue el orden real de ejecución e incluye solo la rama tomada | — | passed | cambió |
| EX-05 · Datos del panel de logs (API) CP-EX-05-02 · la entrada y la salida de un nodo coinciden con los datos del workflow | — | passed | cambió |
| EX-05 · Datos del panel de logs (API) CP-EX-05-03 · (error) el nodo que falla queda marcado con error y su mensaje | — | passed | cambió |
| EX-05 · Datos del panel de logs (API) CP-EX-05-04 · (alternativo) la ejecución de Execute Workflow enlaza con la ejecución hija y sus datos | — | passed | cambió |
| CR-01 · Crear credenciales (API) CP-CR-01-01 · una credencial Header Auth con todos sus campos se guarda y aparece en el listado | — | passed | cambió |
| CR-01 · Crear credenciales (API) CP-CR-01-03 · la credencial «n8n API» con una clave válida de la instancia prueba la conexión con éxito | — | passed | cambió |
| CR-01 · Crear credenciales (API) CP-CR-01-04 · (error) la credencial «n8n API» con una clave incorrecta informa el error | — | passed | cambió |
| CR-01 · Crear credenciales (API) CP-CR-01-05 · (error) un tipo de credencial inexistente se rechaza con 400 | — | passed | cambió |
| CR-01 · Crear credenciales (API) CP-CR-01-06 · (alternativo) dos credenciales con el mismo nombre se permiten y se distinguen por su ID | — | passed | cambió |
| CR-01 · Crear credenciales (API) CP-CR-01-02 · (alternativo) la API guarda una credencial sin su campo obligatorio; la validación es de la interfaz | — | passed | cambió |
| CR-01 · Cifrado de la credencial en la base de datos CP-CR-01-07 · la columna data de credentials_entity no contiene el secreto en texto plano | — | passed | cambió |
| CR-01 · Nombre de credencial con HTML (UI) CP-CR-01-08 · (error) el nombre se muestra literal y no ejecuta ningún script | — | passed | cambió |
| CR-03 · OAuth2 (API) CP-CR-03-01 · la URL de autorización apunta al proveedor y su redirect_uri es el callback de esta instancia | — | passed | cambió |
| CR-03 · OAuth2 (API) CP-CR-03-04 · (alternativo) los scopes de la URL coinciden con los configurados en la credencial | — | passed | cambió |
| CR-03 · OAuth2 (API) CP-CR-03-03 · (error) si el usuario cancela en el proveedor, el callback informa el error y no se guarda token | — | passed | cambió |
| CR-03 · OAuth2 (API) CP-CR-03 · (error) pedir la URL de autorización de una credencial inexistente responde 404 | — | passed | cambió |
| CR-02 · Editar y eliminar credenciales (API) CP-CR-02-01 · al cambiar el valor de una credencial en uso, el workflow envía el valor nuevo | — | passed | cambió |
| CR-02 · Editar y eliminar credenciales (API) CP-CR-02-05 · renombrar una credencial en uso cambia el nombre y el workflow la sigue usando | — | passed | cambió |
| CR-02 · Editar y eliminar credenciales (API) CP-CR-02-07 · (alternativo) eliminar una credencial sin uso la quita del listado y de la base de datos | — | passed | cambió |
| CR-02 · Editar y eliminar credenciales (API) CP-CR-02-08 · (error) eliminar una credencial en uso hace que la ejecución informe el problema | — | passed | cambió |
| CR-02 · Editar y eliminar credenciales (API) CP-CR-02 · (error) eliminar una credencial inexistente responde 404 | — | passed | cambió |
| CR-02 · Secretos de una credencial (API) CP-CR-02-03 · abrir la credencial y el listado no devuelven el secreto en claro | — | passed | cambió |
| CR-02 · Secretos de una credencial (API) CP-CR-02-04 · el JSON del workflow que usa la credencial solo la referencia por ID y nombre | — | passed | cambió |
| CR-04 · Cambiar la credencial de un nodo (API) CP-CR-04-08 · la ejecución envía la cabecera de la credencial nueva y no la de la anterior | — | passed | cambió |
| CR-04 · Credenciales en nodos (API) CP-CR-04-01 · el nodo HTTP Request usa la credencial asignada al ejecutar | — | passed | cambió |
| CR-04 · Credenciales en nodos (API) CP-CR-04-07 · sustituir la credencial del nodo se conserva al guardar y volver a leer | — | passed | cambió |
| CR-04 · Credenciales en nodos (API) CP-CR-04-02 · (alternativo) al filtrar por el tipo requerido solo aparecen credenciales de ese tipo | — | passed | cambió |
| CR-04 · Credenciales en nodos (API) CP-CR-04-05 · (error) un workflow importado con una credencial que no existe no se publica e informa el nodo | — | passed | cambió |
| CR-04 · Credenciales en nodos (API) CP-CR-04-06 · (error) un nodo que requiere credencial y no tiene ninguna falla y lo informa | — | passed | cambió |
| CR-05 · Aislamiento de credenciales entre usuarios (API) CP-CR-05-05 · el miembro no ve ni puede consultar una credencial que no se le compartió | — | passed | cambió |
| CR-05 · Buscar, filtrar y compartir credenciales (API) CP-CR-05-01 · un término parcial devuelve solo las coincidencias | — | passed | cambió |
| CR-05 · Buscar, filtrar y compartir credenciales (API) CP-CR-05-01 · (alternativo) un término inexistente devuelve un listado vacío | — | passed | cambió |
| CR-05 · Buscar, filtrar y compartir credenciales (API) CP-CR-05-03 · el filtro por tipo solo muestra credenciales de ese tipo | — | passed | cambió |
| CR-05 · Buscar, filtrar y compartir credenciales (API) CP-CR-05-06 · (error) compartir una credencial sin licencia responde 403 y no la comparte | — | passed | cambió |
| CR-05 · Orden del listado de credenciales (UI) CP-CR-05-02 · el listado respeta el orden por nombre y por última actualización | — | passed | cambió |
