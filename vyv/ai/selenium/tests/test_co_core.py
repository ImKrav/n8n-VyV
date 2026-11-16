"""
Módulo 4 · Core: data tables (CO-01, CO-02, CO-03) y carpetas (CO-04, CO-05) · Selenium.
Las pruebas marcadas `refactor` cubren el código modificado en la rama (BUG-016-01, BUG-018-01…05).
Los CSV de entrada son los de ../../e2e/fixtures/csv.
"""
import time

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from n8n_client import N8nClient
from pages import Carpetas, DataTables, Pagina, sel

pytestmark = pytest.mark.co


@pytest.fixture
def dt(driver, cfg):
    return DataTables(driver, cfg["url"])


@pytest.fixture
def carpetas(driver, cfg):
    return Carpetas(driver, cfg["url"])


def _abrir_modal_desde_cero(dt, nombre):
    dt.abrir_listado().abrir_modal()
    dt.escribir("data-table-name-input-select", nombre)
    dt.d.find_elements(By.CSS_SELECTOR, sel("create-from-scratch-option"))[0].click()


# --------------------------------------------------------------------------- CO-01 · data tables
def test_co01_crear_data_table_desde_cero_muestra_su_tarjeta(api, dt, limpiar):
    nombre = N8nClient.unico("vyv_sel")
    _abrir_modal_desde_cero(dt, nombre)
    dt.clic("proceed-from-select-button")
    dt.tid("data-table-details-view")
    t = next(x for x in api.tablas() if x["name"] == nombre)
    limpiar(lambda: api.borrar_tabla(t["id"]))
    dt.abrir_listado()
    dt.esperar(lambda d: any(nombre in e.text for e in dt.todos(sel("data-table-card"))))


@pytest.mark.refactor
def test_co01_boton_create_deshabilitado_con_nombre_vacio_o_solo_espacios(dt):
    """BUG-016-01: antes de la refactorización, '   ' habilitaba el botón."""
    dt.abrir_listado().abrir_modal()
    dt.d.find_elements(By.CSS_SELECTOR, sel("create-from-scratch-option"))[0].click()
    boton = dt.tid("proceed-from-select-button")
    assert not boton.is_enabled(), "con nombre vacío debe estar deshabilitado"
    dt.escribir("data-table-name-input-select", "   ")
    assert not dt.tid("proceed-from-select-button").is_enabled(), "con solo espacios debe estar deshabilitado"
    dt.escribir("data-table-name-input-select", "ok")
    dt.esperar(lambda d: dt.tid("proceed-from-select-button").is_enabled())


def test_co01_encabezados_de_columnas_de_los_cuatro_tipos(api, dt, limpiar):
    cols = [{"name": "nombre", "type": "string"}, {"name": "edad", "type": "number"},
            {"name": "activo", "type": "boolean"}, {"name": "fecha", "type": "date"}]
    t = api.crear_tabla_ok(N8nClient.unico("vyv_sel_cols"), cols)
    limpiar(lambda: api.borrar_tabla(t["id"]))
    dt.abrir_tabla(api.proyecto, t["id"])
    dt.esperar(lambda d: {e.text.strip() for e in dt.todos(sel("data-table-column-header-text"))}
               >= {"nombre", "edad", "activo", "fecha"})


def test_co01_nombre_duplicado_se_rechaza_por_api(api, limpiar):
    nombre = N8nClient.unico("vyv_dup")
    t = api.crear_tabla_ok(nombre)
    limpiar(lambda: api.borrar_tabla(t["id"]))
    assert api.crear_tabla(nombre).status_code in (400, 409)


@pytest.mark.seguridad
def test_co01_nombre_de_tabla_con_html_se_muestra_como_texto(api, dt, limpiar):
    nombre = f'<img src=x onerror="window.__xss=1">_{int(time.time())}'
    r = api.crear_tabla(nombre)
    if r.status_code != 200:
        pytest.skip("el servidor rechaza el nombre con HTML (también es un resultado válido)")
    limpiar(lambda: api.borrar_tabla(r.json()["data"]["id"]))
    dt.abrir_listado()
    dt.esperar(lambda d: "<img" in dt.texto_pagina())
    assert dt.d.execute_script("return window.__xss") is None


# --------------------------------------------------------------------------- CO-02 · filas
def test_co02_las_filas_insertadas_se_muestran_en_la_cuadricula(api, dt, limpiar):
    t = api.crear_tabla_ok(N8nClient.unico("vyv_sel_filas"),
                           [{"name": "nombre", "type": "string"}, {"name": "edad", "type": "number"}])
    limpiar(lambda: api.borrar_tabla(t["id"]))
    assert api.insertar_filas(t["id"], [{"nombre": "Ana", "edad": 25}, {"nombre": "Luis", "edad": 32}]).status_code == 200
    dt.abrir_tabla(api.proyecto, t["id"])
    dt.hasta_cantidad(DataTables.GRID, 2)
    texto = " ".join(e.text for e in dt.filas_grid())
    assert "Ana" in texto and "32" in texto


def test_co02_tipo_incorrecto_en_una_fila_se_rechaza(api, limpiar):
    t = api.crear_tabla_ok(N8nClient.unico("vyv_tipos"), [{"name": "edad", "type": "number"}])
    limpiar(lambda: api.borrar_tabla(t["id"]))
    assert api.insertar_filas(t["id"], [{"edad": "no-es-numero"}]).status_code == 400
    assert api.filas(t["id"]) == []


# --------------------------------------------------------------------------- CO-03 · CSV
def test_co03_importar_csv_valido_crea_la_tabla_con_5_filas(api, dt, fixtures_csv, limpiar):
    nombre = N8nClient.unico("vyv_sel_csv")
    dt.abrir_listado().abrir_modal()
    dt.escribir("data-table-name-input-select", nombre)
    dt.d.find_elements(By.CSS_SELECTOR, sel("import-csv-option"))[0].click()
    dt.d.find_element(By.CSS_SELECTOR, 'input[type="file"]').send_keys(str(fixtures_csv / "valido.csv"))
    dt.esperar(lambda d: dt.tid("proceed-from-select-button").is_enabled())
    dt.clic("proceed-from-select-button")
    assert Pagina.valor(dt.tid("column-name-3")) == "fecha"
    dt.clic("confirm-add-data-table-button")
    dt.tid("data-table-details-view")
    t = next(x for x in api.tablas() if x["name"] == nombre)
    limpiar(lambda: api.borrar_tabla(t["id"]))
    dt.hasta_cantidad(DataTables.GRID, 5)
    assert len(api.filas(t["id"])) == 5


@pytest.mark.refactor
def test_co03_vista_previa_no_infiere_fechas_imposibles_ni_numeros_no_decimales(dt, fixtures_csv):
    """BUG-018-01/02: 2024-02-30 e Infinity ya no se infieren como date/number."""
    dt.abrir_listado().abrir_modal()
    dt.escribir("data-table-name-input-select", N8nClient.unico("vyv_infer"))
    dt.d.find_elements(By.CSS_SELECTOR, sel("import-csv-option"))[0].click()
    dt.d.find_element(By.CSS_SELECTOR, 'input[type="file"]').send_keys(str(fixtures_csv / "fechas_limite.csv"))
    dt.esperar(lambda d: dt.tid("proceed-from-select-button").is_enabled())
    dt.clic("proceed-from-select-button")
    # columnas: nombre, fecha_iso, fecha_imposible, fecha_ddmm, numero_raro
    tipos = {Pagina.valor(dt.tid(f"column-name-{i}")): Pagina.valor(dt.tid(f"column-type-{i}")).lower() for i in range(5)}
    assert tipos["fecha_iso"] == "date"
    assert tipos["fecha_imposible"] == "text" or tipos["fecha_imposible"] == "string"
    assert tipos["numero_raro"] in ("text", "string")


def test_co03_descargar_csv_desde_la_interfaz(api, dt, descargas, limpiar):
    t = api.crear_tabla_ok(N8nClient.unico("vyv_sel_dl"),
                           [{"name": "nombre", "type": "string"}, {"name": "edad", "type": "number"}])
    limpiar(lambda: api.borrar_tabla(t["id"]))
    api.insertar_filas(t["id"], [{"nombre": "Ana", "edad": 30}])
    for f in descargas.glob("*.csv"):
        f.unlink()
    dt.abrir_tabla(api.proyecto, t["id"])
    dt.tid("data-table-card-actions").find_element(By.CSS_SELECTOR, "button").click()
    dt.esperar(lambda d: [e for e in d.find_elements(By.CSS_SELECTOR, sel("action-toggle-dropdown"))
                          if e.is_displayed()])
    dt.d.find_element(By.XPATH, "//*[@data-test-id='action-toggle-dropdown']//*[contains(translate(., 'DOWNLOAD', 'download'), 'download')]").click()
    dt.clic("download-modal-confirm")
    dt.esperar(lambda d: list(descargas.glob("*.csv")), 30)
    assert "Ana" in next(descargas.glob("*.csv")).read_text(encoding="utf-8")


@pytest.mark.refactor
@pytest.mark.seguridad
def test_co03_exportar_neutraliza_formulas(api, limpiar):
    """BUG-018-04 (OWASP A03 · CWE-1236): celdas que empiezan por = + - @ se prefijan con comilla simple."""
    t = api.crear_tabla_ok(N8nClient.unico("vyv_formula"), [{"name": "formula", "type": "string"}])
    limpiar(lambda: api.borrar_tabla(t["id"]))
    peligrosos = ['=HYPERLINK("https://example.com";"clic")', "+1+1", "-2+3", "@SUM(1+1)"]
    assert api.insertar_filas(t["id"], [{"formula": f} for f in peligrosos]).status_code == 200
    lineas = api.descargar_csv(t["id"]).splitlines()[1:]
    sin_neutralizar = [l for l in lineas if l.lstrip('"')[:1] in "=+-@"]
    assert not sin_neutralizar, f"celdas sin neutralizar: {sin_neutralizar}"


@pytest.mark.refactor
def test_co03_csv_malformado_responde_400(api, fixtures_csv):
    """BUG-018-05: antes respondía 500."""
    assert api.subir_csv(str(fixtures_csv / "malformado.csv")).status_code == 400


@pytest.mark.refactor
@pytest.mark.seguridad
def test_co03_file_id_con_path_traversal_responde_400(api):
    r = api.req("POST", api._dt(), json={
        "name": N8nClient.unico("vyv_trav"), "fileId": "../../../../etc/passwd", "hasHeaders": True,
        "columns": [{"name": "a", "type": "string", "csvColumnName": "a"}]})
    assert r.status_code == 400


def test_co03_solo_se_aceptan_archivos_csv(api, fixtures_csv):
    assert api.subir_csv(str(fixtures_csv / "no_es_csv.txt"), nombre="script.exe").status_code == 400


# --------------------------------------------------------------------------- CO-04 · carpetas
def test_co04_crear_carpeta_desde_la_vista_de_workflows(api, carpetas, limpiar):
    nombre = N8nClient.unico("VyV Sel")
    carpetas.abrir_workflows(api.proyecto)
    carpetas.clic("add-resource")
    carpetas.esperar(EC.element_to_be_clickable((By.XPATH, "//*[(@role='menuitem' or self::li)][contains(translate(., 'FOLDER', 'folder'), 'folder')]"))).click()
    caja = carpetas.esperar(EC.visibility_of_element_located((By.CSS_SELECTOR, ".el-message-box input, [role='dialog'] input")))
    caja.send_keys(nombre)
    carpetas.d.find_element(By.XPATH, "//*[contains(@class,'el-message-box') or @role='dialog']//button[contains(translate(., 'CREATE', 'create'), 'create')]").click()
    carpetas.esperar(lambda d: carpetas.tarjeta(nombre))
    f = next(x for x in api.listar_carpetas() if x["name"] == nombre)
    limpiar(lambda: api.borrar_carpeta(f["id"]))


@pytest.mark.parametrize("nombre", ["a/b", "a:b", "..", ".oculta", "a*b", "a<b>", ""])
def test_co04_nombres_invalidos_de_carpeta_se_rechazan(api, nombre):
    assert api.crear_carpeta(nombre).status_code == 400


def test_co04_breadcrumbs_muestran_padre_y_carpeta_actual(api, carpetas, limpiar):
    a = api.crear_carpeta_ok(N8nClient.unico("VyV Nav"))
    b = api.crear_carpeta_ok("B", a["id"])
    c = api.crear_carpeta_ok("C", b["id"])
    limpiar(lambda: api.borrar_carpeta(a["id"]))
    carpetas.abrir_carpeta(api.proyecto, c["id"])
    carpetas.esperar(lambda d: "B" in carpetas.tid("breadcrumbs-item").text)
    assert "C" in carpetas.tid("breadcrumbs-item-current").text


# --------------------------------------------------------------------------- CO-05 · mover y eliminar
def test_co05_no_se_puede_mover_una_carpeta_a_si_misma_ni_a_su_descendiente(api, limpiar):
    a = api.crear_carpeta_ok(N8nClient.unico("VyV Mover"))
    b = api.crear_carpeta_ok("hija", a["id"])
    limpiar(lambda: api.borrar_carpeta(a["id"]))
    base = f"/rest/projects/{api.proyecto}/folders"
    assert api.req("PATCH", f"{base}/{a['id']}", json={"parentFolderId": a["id"]}).status_code == 400
    assert api.req("PATCH", f"{base}/{a['id']}", json={"parentFolderId": b["id"]}).status_code == 400


def test_co05_eliminar_carpeta_transfiriendo_su_contenido_lo_conserva(api, carpetas, limpiar):
    origen = api.crear_carpeta_ok(N8nClient.unico("VyV Borrar"))
    destino = api.crear_carpeta_ok(N8nClient.unico("VyV Destino"))
    limpiar(lambda: api.borrar_carpeta(destino["id"]))
    nombre_wf = N8nClient.unico("WF trasladado")
    wf = api.crear_workflow(nombre_wf, [], {}, parentFolderId=origen["id"])
    limpiar(lambda: api.borrar_workflow(wf["id"]))
    assert api.borrar_carpeta(origen["id"], transferir_a=destino["id"]).status_code == 200
    carpetas.abrir_carpeta(api.proyecto, destino["id"])
    carpetas.esperar(lambda d: nombre_wf in carpetas.texto_pagina())
