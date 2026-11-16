"""
DeepEval · calidad y seguridad de los errores de la API de los 4 módulos.

Para cada módulo se provoca un error real (recurso inexistente, dato inválido, duplicado, formato no permitido)
y se evalúa con un LLM juez que el mensaje sea (a) útil/accionable y (b) no filtre información interna.
Además se comprueba de forma determinista que el código HTTP sea de error del CLIENTE (4xx), no 5xx.
Las pruebas marcadas BUG-018-05 cubren el código refactorizado (antes respondían 500).

Ejecutar:  deepeval test run test_calidad_errores_api.py   (o  pytest -q)
"""
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import FIXTURES_CSV
from metricas import mensaje_de_error_util, sin_fuga_de_informacion

CASOS = {
    # id: (marca de módulo, descripción de la solicitud, función que provoca el error → respuesta)
    "WF-abrir-inexistente": ("wf", "GET /rest/workflows/<id que no existe>: abrir un workflow inexistente",
        lambda n: n.req("GET", "/rest/workflows/id-que-no-existe-vyv")),
    "WF-cuerpo-invalido": ("wf", "POST /rest/workflows con 'nodes' que no es una lista: crear un workflow con datos inválidos",
        lambda n: n.req("POST", "/rest/workflows", json={"name": "VyV malo", "nodes": "no-es-lista", "connections": {}, "settings": {}})),
    "EX-inexistente": ("ex", "GET /rest/executions/<id que no existe>: ver el detalle de una ejecución inexistente",
        lambda n: n.req("GET", "/rest/executions/999999999")),
    "EX-filtro-json-invalido": ("ex", "GET /rest/executions?filter=<JSON inválido>: filtrar ejecuciones con un filtro mal formado",
        lambda n: n.req("GET", "/rest/executions?filter=%7Bno-json")),
    "CR-tipo-inexistente": ("cr", "POST /rest/credentials con un tipo de credencial que no existe",
        lambda n: n.req("POST", "/rest/credentials", json={"name": "VyV tipo malo", "type": "noExisteVyV", "data": {}})),
    "CR-inexistente": ("cr", "GET /rest/credentials/<id que no existe>: abrir una credencial inexistente",
        lambda n: n.req("GET", "/rest/credentials/id-que-no-existe-vyv")),
    "CO-columna-invalida": ("co", "POST columna con nombre '1edad' en una data table: el nombre debe empezar por letra",
        lambda n: _columna_invalida(n)),
    "CO-tabla-duplicada": ("co", "POST data table con un nombre que ya existe en el proyecto",
        lambda n: _tabla_duplicada(n)),
    "CO-carpeta-nombre-invalido": ("co", "POST carpeta con el nombre 'a/b': contiene un carácter no permitido",
        lambda n: n.req("POST", f"/rest/projects/{n.proyecto}/folders", json={"name": "a/b"})),
    "CO-csv-malformado (BUG-018-05)": ("co", "POST /rest/data-tables/uploads con un archivo CSV malformado (comillas sin cerrar, filas con distinto número de columnas)",
        lambda n: _subir(n, "malformado.csv", "malformado.csv")),
    "CO-archivo-no-csv": ("co", "POST /rest/data-tables/uploads con un archivo que no es .csv",
        lambda n: _subir(n, "no_es_csv.txt", "script.exe")),
    "CO-fileId-traversal (BUG-018-05)": ("co", "POST data table con fileId '../../../../etc/passwd' (intento de path traversal)",
        lambda n: n.req("POST", f"/rest/projects/{n.proyecto}/data-tables", json={
            "name": n.unico("vyv_trav"), "fileId": "../../../../etc/passwd", "hasHeaders": True,
            "columns": [{"name": "a", "type": "string", "csvColumnName": "a"}]})),
}


def _columna_invalida(n):
    t = n.datos(n.req("POST", f"/rest/projects/{n.proyecto}/data-tables", json={"name": n.unico("vyv_col"), "columns": []}))
    try:
        return n.req("POST", f"/rest/projects/{n.proyecto}/data-tables/{t['id']}/columns", json={"name": "1edad", "type": "number"})
    finally:
        n.req("DELETE", f"/rest/projects/{n.proyecto}/data-tables/{t['id']}")


def _tabla_duplicada(n):
    nombre = n.unico("vyv_dup")
    t = n.datos(n.req("POST", f"/rest/projects/{n.proyecto}/data-tables", json={"name": nombre, "columns": []}))
    try:
        return n.req("POST", f"/rest/projects/{n.proyecto}/data-tables", json={"name": nombre, "columns": []})
    finally:
        n.req("DELETE", f"/rest/projects/{n.proyecto}/data-tables/{t['id']}")


def _subir(n, archivo, nombre):
    with open(FIXTURES_CSV / archivo, "rb") as f:
        return n.req("POST", "/rest/data-tables/uploads", files={"file": (nombre, f, "text/csv")}, data={"hasHeaders": "true"})


@pytest.mark.parametrize("caso", [pytest.param(k, marks=getattr(pytest.mark, v[0]), id=k) for k, v in CASOS.items()])
def test_error_de_api_es_de_cliente_util_y_sin_fuga(caso, n8n, requiere_juez):
    modulo, descripcion, provocar = CASOS[caso]
    r = provocar(n8n)
    # 1) Determinista: el error debe ser del cliente (4xx). Un 5xx significa que el servidor no validó la entrada.
    assert 400 <= r.status_code < 500, f"{caso}: HTTP {r.status_code} (se esperaba 4xx) · {n8n.mensaje(r)[:200]}"
    # 2) LLM juez: utilidad del mensaje y ausencia de fuga de información interna.
    test_case = LLMTestCase(input=descripcion, actual_output=f"HTTP {r.status_code} · {n8n.mensaje(r)}")
    assert_test(test_case, [mensaje_de_error_util(), sin_fuga_de_informacion()])
