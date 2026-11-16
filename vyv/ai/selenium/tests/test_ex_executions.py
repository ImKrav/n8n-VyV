"""Módulo 2 · Ejecuciones (EX-01 … EX-05) · Selenium. EX-02/EX-03 también los cubre Stagehand."""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

from n8n_client import N8nClient
from pages import Lienzo, Pagina, sel

pytestmark = pytest.mark.ex

TARJETA = "div.execution-card"
CUERPO_LOGS = sel("logs-overview-body")
FILAS_LOGS = f'{CUERPO_LOGS} [role="treeitem"]'
SELECCIONADA = f'{CUERPO_LOGS} [role="treeitem"][aria-selected="true"]'


def _ruta(prefijo):
    return N8nClient.unico(prefijo).replace("_", "-")


def test_ex01_las_ejecuciones_aparecen_en_la_lista_del_workflow(api, driver, cfg, limpiar):
    ruta = _ruta("vyv-ex01")
    wf = api.crear_publicado(N8nClient.unico("VyV lista ejecuciones"), ruta)
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    for _ in range(3):
        assert api.llamar_webhook(ruta).status_code == 200
    assert len(api.esperar_ejecuciones(wf["id"], 3)) >= 3

    p = Pagina(driver, cfg["url"]).ir(f"/workflow/{wf['id']}/executions")
    p.hasta_cantidad(TARJETA, 3, minimo=True)


def test_ex01_una_ejecucion_fallida_se_registra_con_estado_error(api, limpiar):
    ruta = _ruta("vyv-ex01-err")
    nodos = [N8nClient.nodo_webhook(ruta), N8nClient.nodo_falla("fallo-intencional-vyv")]
    wf = api.crear_workflow(N8nClient.unico("VyV falla"), nodos, N8nClient.cadena("Webhook", "Falla"))
    api.publicar(wf)
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    api.llamar_webhook(ruta)
    ejecs = api.esperar_ejecuciones(wf["id"], 1)
    assert ejecs and ejecs[0]["status"] == "error"


def test_ex01_pagina_de_ejecuciones_global_abre(driver, cfg):
    p = Pagina(driver, cfg["url"]).ir("/home/executions")
    p.esperar(lambda d: "execution" in p.texto_pagina().lower())


def test_ex02_filtro_por_estado_devuelve_solo_ese_estado(api, limpiar):
    ruta = _ruta("vyv-ex02")
    nodos = [N8nClient.nodo_webhook(ruta), N8nClient.nodo_falla("fallo-filtro")]
    wf = api.crear_workflow(N8nClient.unico("VyV filtro"), nodos, N8nClient.cadena("Webhook", "Falla"))
    api.publicar(wf)
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    api.llamar_webhook(ruta)
    api.esperar_ejecuciones(wf["id"], 1)
    import json
    r = api.req("GET", "/rest/executions", params={
        "filter": json.dumps({"workflowId": wf["id"], "status": ["success"]}), "limit": 20})
    d = api.datos(r)
    assert (d.get("results", d) if isinstance(d, dict) else d) == [], "no hay ejecuciones exitosas"


def test_ex02_filtro_con_json_invalido_responde_error_de_cliente(api):
    r = api.req("GET", "/rest/executions?filter=%7Bno-json")
    assert 400 <= r.status_code < 500


def test_ex05_panel_de_logs_se_recorre_con_el_teclado(api, driver, cfg, limpiar):
    nodos = [N8nClient.nodo_manual(), N8nClient.nodo_campos({"a": 1}, "Paso A"),
             N8nClient.nodo_campos({"b": 2}, "Paso B", (440, 0))]
    wf = api.crear_workflow(N8nClient.unico("VyV logs"), nodos,
                            N8nClient.cadena("Manual Trigger", "Paso A", "Paso B"))
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    lienzo = Lienzo(driver, cfg["url"]).abrir(wf["id"]).ejecutar()
    lienzo.esperar(lambda d: lienzo.existe(
        f'{Lienzo.NODO}[data-node-name="Paso B"] {sel("canvas-node-status-success")}'))

    def alternar():
        lienzo.tid("canvas").click()
        lienzo.teclas("l")
    if lienzo.existe(CUERPO_LOGS):
        alternar()
        lienzo.esperar(lambda d: not lienzo.existe(CUERPO_LOGS))
    alternar()
    filas = lienzo.hasta_cantidad(FILAS_LOGS, 3, minimo=True)
    filas[0].click()
    for esperado, tecla in (("Manual Trigger", None), ("Paso A", Keys.ARROW_DOWN), ("Paso B", Keys.ARROW_DOWN),
                            ("Paso A", Keys.ARROW_UP)):
        if tecla:
            lienzo.teclas(tecla)
        lienzo.esperar(lambda d, e=esperado: any(e in x.text for x in lienzo.todos(SELECCIONADA)))
