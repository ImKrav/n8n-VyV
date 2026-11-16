"""
Módulo 1 · Workflows (WF-01 … WF-05) + inicio de sesión · Selenium.
Cada prueba prepara datos por API y verifica en el navegador. WF-04 (historial) y WF-05 (plantillas,
importar, duplicar) los cubre Stagehand en lenguaje natural (ver ../stagehand/stagehand-workflows.mjs).
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC

from n8n_client import N8nClient
from pages import Lienzo, Pagina, SignIn, sel

pytestmark = pytest.mark.wf

INDICADOR = sel("workflow-active-version-indicator")


@pytest.fixture
def lienzo(driver, cfg):
    return Lienzo(driver, cfg["url"])


def test_login_correcto_redirige_al_listado(driver_anonimo, cfg):
    p = SignIn(driver_anonimo, cfg["url"]).entrar(cfg["email"], cfg["password"])
    p.esperar(EC.url_matches(r"/(home|workflows)"))
    assert "/signin" not in driver_anonimo.current_url


def test_login_con_clave_incorrecta_no_inicia_sesion(driver_anonimo, cfg):
    p = SignIn(driver_anonimo, cfg["url"]).entrar(cfg["email"], "clave-incorrecta-vyv")
    p.esperar(lambda d: any(w in d.find_element(By.TAG_NAME, "body").text.lower()
                            for w in ("wrong", "incorrect", "invalid", "error")))
    assert "/signin" in driver_anonimo.current_url


def test_wf01_nodos_y_conexion_persisten_al_recargar(api, lienzo, limpiar):
    wf = api.crear_workflow(N8nClient.unico("VyV dos nodos"),
                            [N8nClient.nodo_manual(), N8nClient.nodo_campos({"saludo": "hola"})],
                            N8nClient.cadena("Manual Trigger", "Edit Fields"))
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    lienzo.abrir(wf["id"]).hasta_cantidad(Lienzo.NODO, 2)
    lienzo.esperar(lambda d: lienzo.hay_arista("Manual Trigger", "Edit Fields"))
    lienzo.d.refresh()
    lienzo.nodo("Edit Fields")
    assert lienzo.hay_arista("Manual Trigger", "Edit Fields")


def test_wf01_eliminar_nodo_quita_conexiones_y_deshacer_lo_restaura(api, lienzo, limpiar):
    nodos = [N8nClient.nodo_manual(), N8nClient.nodo_campos({"a": 1}, "Paso A"),
             N8nClient.nodo_campos({"b": 2}, "Paso B", (440, 0))]
    wf = api.crear_workflow(N8nClient.unico("VyV eliminar"), nodos,
                            N8nClient.cadena("Manual Trigger", "Paso A", "Paso B"))
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    lienzo.abrir(wf["id"]).hasta_cantidad(Lienzo.NODO, 3)

    lienzo.nodo("Paso B").click()
    lienzo.teclas(Keys.DELETE)
    lienzo.esperar(lambda d: not lienzo.hay_nodo("Paso B"))
    assert not lienzo.hay_arista("Paso A", "Paso B")
    assert lienzo.hay_arista("Manual Trigger", "Paso A")

    lienzo.combinacion(Keys.CONTROL, "z")  # deshacer
    lienzo.esperar(lambda d: lienzo.hay_nodo("Paso B"))
    assert lienzo.hay_arista("Paso A", "Paso B")


def test_wf01_error_workflow_inexistente_no_muestra_lienzo(lienzo):
    lienzo.ir("/workflow/id-que-no-existe-vyv")
    lienzo.esperar(lambda d: lienzo.num_nodos() == 0 and (
        "not found" in lienzo.texto_pagina().lower() or "could not find" in lienzo.texto_pagina().lower()
        or "/workflow/id-que-no-existe-vyv" not in d.current_url))
    assert lienzo.num_nodos() == 0


def test_wf02_ejecucion_manual_termina_con_exito(api, lienzo, limpiar):
    nodos = [N8nClient.nodo_manual(), N8nClient.nodo_campos({"a": 1}, "Paso A")]
    wf = api.crear_workflow(N8nClient.unico("VyV manual"), nodos, N8nClient.cadena("Manual Trigger", "Paso A"))
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    lienzo.abrir(wf["id"]).ejecutar()
    lienzo.esperar(lambda d: lienzo.existe(
        f'{Lienzo.NODO}[data-node-name="Paso A"] {sel("canvas-node-status-success")}'))
    assert api.esperar_ejecuciones(wf["id"], 1)[0]["status"] == "success"


@pytest.mark.parametrize("ajustes", [{"timezone": "America/Bogota", "executionTimeout": 120}])
def test_wf02_ajustes_guardados_se_conservan(api, lienzo, limpiar, ajustes):
    wf = api.crear_workflow(N8nClient.unico("VyV ajustes"), [N8nClient.nodo_manual()], {})
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    api.datos(api.req("PATCH", f"/rest/workflows/{wf['id']}",
                      json={"versionId": wf["versionId"], "settings": ajustes}))
    leido = api.datos(api.obtener_workflow(wf["id"]))
    assert leido["settings"]["timezone"] == ajustes["timezone"]
    lienzo.abrir(wf["id"])  # el editor abre sin errores con los ajustes guardados
    assert lienzo.num_nodos() == 1


def test_wf03_publicar_responde_por_webhook_y_marca_publicado(api, lienzo, limpiar):
    ruta = N8nClient.unico("vyv-pub").replace("_", "-")
    wf = api.crear_publicado(N8nClient.unico("VyV publicado"), ruta, {"v": 1})
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    r = api.llamar_webhook(ruta)
    assert r.status_code == 200 and r.json() == {"v": 1}
    lienzo.abrir(wf["id"])
    ind = lienzo.esperar(EC.presence_of_element_located((By.CSS_SELECTOR, INDICADOR)))
    assert "indicatorPublished" in ind.get_attribute("class")


def test_wf03_cambios_guardados_sin_publicar_no_llegan_a_produccion(api, lienzo, limpiar):
    ruta = N8nClient.unico("vyv-ver").replace("_", "-")
    wf = api.crear_publicado(N8nClient.unico("VyV version"), ruta, {"v": 1})
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    assert api.llamar_webhook(ruta).json() == {"v": 1}
    nuevos = [N8nClient.nodo_webhook(ruta), N8nClient.nodo_campos({"v": 2})]
    api.datos(api.req("PATCH", f"/rest/workflows/{wf['id']}",
                      json={"versionId": wf["versionId"], "nodes": nuevos, "connections": wf["connections"]}))
    assert api.llamar_webhook(ruta).json() == {"v": 1}, "producción debe seguir en la versión publicada"
    lienzo.abrir(wf["id"])
    lienzo.esperar(lambda d: "indicatorChanges" in (
        (d.find_elements(By.CSS_SELECTOR, INDICADOR) or [None])[0].get_attribute("class") if d.find_elements(By.CSS_SELECTOR, INDICADOR) else ""))


def test_wf03_error_workflow_sin_disparador_no_se_publica(api, limpiar):
    wf = api.crear_workflow(N8nClient.unico("VyV sin trigger"), [N8nClient.nodo_campos({"ok": True})], {})
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    r = api.req("POST", f"/rest/workflows/{wf['id']}/activate", json={"versionId": wf["versionId"]})
    assert r.status_code >= 400, "un workflow sin disparador no debe poder publicarse"
