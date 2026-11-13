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
| CO-02 · Límite de almacenamiento (API) CP-017-08 · rechaza inserciones al superar el límite configurado | pending | pending | igual |
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
