"""Módulo 3 · Credenciales (CR-01 … CR-05) · Selenium."""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from n8n_client import N8nClient
from pages import Listado, Pagina, sel

pytestmark = pytest.mark.cr


@pytest.fixture
def listado(driver, cfg):
    return Listado(driver, cfg["url"])


def _abrir(listado, buscar):
    listado.ir("/home/credentials")
    listado.buscar(buscar)
    return listado


def test_cr01_nombre_con_html_se_muestra_como_texto_y_no_se_ejecuta(api, listado, limpiar):
    marca = N8nClient.unico("vyvhtml").replace("_", "")
    nombre = f'<img src=x onerror="window.__vyvMarca=1">{marca}'
    c = api.crear_credencial(nombre)
    limpiar(lambda: api.borrar_credencial(c["id"]))
    _abrir(listado, marca)
    listado.hasta_cantidad(Listado.ITEM, 1)
    assert "<img" in listado.texto_pagina(), "el HTML debe verse como texto"
    assert listado.d.execute_script("return window.__vyvMarca") is None
    assert not listado.existe(f'{Listado.ITEM} img[src="x"]')


def test_cr01_credencial_con_tipo_inexistente_se_rechaza(api):
    r = api.req("POST", "/rest/credentials", json={"name": "VyV tipo malo", "type": "noExisteVyV", "data": {}})
    assert 400 <= r.status_code < 500


def test_cr02_secreto_enmascarado_y_ausente_del_dom(api, listado, limpiar):
    pref = N8nClient.unico("vyvmodal").replace("_", "")
    secreto = f"secreto-{pref}"
    c = api.crear_credencial(f"{pref} Header", valor=secreto)
    limpiar(lambda: api.borrar_credencial(c["id"]))
    _abrir(listado, pref).hasta_cantidad(Listado.ITEM, 1)[0].click()
    listado.tid("editCredential-modal")
    campo = listado.esperar(EC.presence_of_element_located((By.CSS_SELECTOR, f'{sel("parameter-input-value")} input')))
    assert campo.get_attribute("value") != secreto
    assert secreto not in listado.d.page_source


def test_cr02_cancelar_eliminacion_conserva_la_credencial(api, listado, limpiar):
    pref = N8nClient.unico("vyvdel").replace("_", "")
    c = api.crear_credencial(f"{pref} Header")
    limpiar(lambda: api.borrar_credencial(c["id"]))
    _abrir(listado, pref).hasta_cantidad(Listado.ITEM, 1)
    listado.clic("credential-card-actions")
    listado.esperar(lambda d: [e for e in d.find_elements(By.CSS_SELECTOR,
                    f'{sel("action-delete")}, .el-dropdown-menu__item') if e.is_displayed() and "delete" in e.text.lower()]).pop().click()
    caja = listado.esperar(EC.visibility_of_element_located((By.CSS_SELECTOR, ".el-message-box")))
    assert "Delete Credential?" in caja.text
    caja.find_element(By.XPATH, ".//button[contains(., 'Cancel')]").click()
    listado.esperar(EC.invisibility_of_element(caja))
    assert api.req("GET", f"/rest/credentials/{c['id']}").status_code == 200


def test_cr04_http_request_envia_la_credencial_asignada_como_cabecera(api, limpiar):
    # Workflow de eco: un Webhook sin más nodos responde con las cabeceras que recibe.
    ruta_eco = N8nClient.unico("vyv-eco").replace("_", "-")
    eco = api.crear_workflow(N8nClient.unico("VyV eco"), [N8nClient.nodo_webhook(ruta_eco)], {})
    api.publicar(eco)
    limpiar(lambda: api.borrar_workflow(eco["id"]))
    assert api.llamar_webhook(ruta_eco).status_code == 200

    cred = api.crear_credencial(N8nClient.unico("VyV cred http"), "X-Token", "asignada")
    limpiar(lambda: api.borrar_credencial(cred["id"]))
    ruta = N8nClient.unico("vyv-cr04").replace("_", "-")
    http = {"id": "http1", "name": "HTTP Request", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
            "position": [220, 0], "parameters": {"url": f"{api.base}/webhook/{ruta_eco}",
            "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "options": {}},
            "credentials": {"httpHeaderAuth": {"id": cred["id"], "name": cred["name"]}}}
    wf = api.crear_workflow(N8nClient.unico("VyV usa credencial"), [N8nClient.nodo_webhook(ruta), http],
                            N8nClient.cadena("Webhook", "HTTP Request"))
    api.publicar(wf)
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    r = api.llamar_webhook(ruta)
    assert r.status_code == 200
    assert r.json()["headers"]["x-token"] == "asignada"


def test_cr05_buscar_filtra_el_listado(api, listado, limpiar):
    pref = N8nClient.unico("vyvbusca").replace("_", "")
    nombres = [f"{pref} Alpha", f"{pref} Bravo", f"otra-{pref}-zzz"]
    for n in nombres:
        c = api.crear_credencial(n)
        limpiar(lambda c=c: api.borrar_credencial(c["id"]))
    _abrir(listado, f"{pref} Alpha").hasta_cantidad(Listado.ITEM, 1)
    assert listado.nombres(pref) == [f"{pref} Alpha"]


def test_cr05_orden_por_nombre_az(api, listado, limpiar):
    pref = N8nClient.unico("vyvorden").replace("_", "")
    nombres = [f"{pref} {x}" for x in ("Bravo", "Charlie", "Alpha")]
    for n in nombres:
        c = api.crear_credencial(n)
        limpiar(lambda c=c: api.borrar_credencial(c["id"]))
    _abrir(listado, pref).hasta_cantidad(Listado.ITEM, 3)
    listado.ordenar("Sort by name (A-Z)")
    listado.esperar(lambda d: listado.nombres(pref) == sorted(nombres))


def test_cr05_busqueda_sin_coincidencias_devuelve_lista_vacia(api):
    assert api.listar_credenciales(name="no-existe-vyv-xyz") == []
