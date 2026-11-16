"""
Page Objects para el editor de n8n. Todos los selectores son `data-test-id`, los mismos que usan
las pruebas Cypress y las pruebas oficiales de n8n (packages/quality/testing/playwright/pages).
"""
from __future__ import annotations

from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

ESPERA = 30


def sel(test_id: str) -> str:
    return f'[data-test-id="{test_id}"]'


class Pagina:
    def __init__(self, driver: WebDriver, base: str):
        self.d, self.base = driver, base.rstrip("/")

    # ------------------------------------------------------------- utilidades
    def ir(self, ruta: str):
        self.d.get(f"{self.base}{ruta}")
        return self

    def esperar(self, condicion, segundos=ESPERA):
        return WebDriverWait(self.d, segundos).until(condicion)

    def tid(self, test_id: str, segundos=ESPERA) -> WebElement:
        """Primer elemento visible con ese data-test-id."""
        return self.esperar(EC.visibility_of_element_located((By.CSS_SELECTOR, sel(test_id))), segundos)

    def todos(self, css: str) -> list[WebElement]:
        return self.d.find_elements(By.CSS_SELECTOR, css)

    def existe(self, css: str) -> bool:
        return bool(self.todos(css))

    def clic(self, test_id: str):
        el = self.esperar(EC.element_to_be_clickable((By.CSS_SELECTOR, sel(test_id))))
        try:
            el.click()
        except Exception:  # elemento tapado por una animación: clic por JavaScript
            self.d.execute_script("arguments[0].click();", el)
        return el

    def escribir(self, test_id: str, texto: str, limpiar=True) -> WebElement:
        el = self.tid(test_id)
        if el.tag_name not in ("input", "textarea"):
            el = el.find_element(By.CSS_SELECTOR, "input, textarea")
        if limpiar:
            el.send_keys(Keys.CONTROL, "a", Keys.DELETE)
        el.send_keys(texto)
        return el

    def hasta_cantidad(self, css: str, n: int, minimo=False, segundos=ESPERA) -> list[WebElement]:
        def cond(d):
            els = d.find_elements(By.CSS_SELECTOR, css)
            return els if (len(els) >= n if minimo else len(els) == n) else False
        return self.esperar(cond, segundos)

    def texto_pagina(self) -> str:
        return self.d.find_element(By.TAG_NAME, "body").text

    def teclas(self, *teclas):
        ActionChains(self.d).send_keys(*teclas).perform()

    def combinacion(self, modificador, tecla):
        ActionChains(self.d).key_down(modificador).send_keys(tecla).key_up(modificador).perform()

    @staticmethod
    def valor(el: WebElement) -> str:
        """Valor visible de un input o de un select de Element Plus."""
        interno = el.find_elements(By.CSS_SELECTOR, "input")
        v = (interno[0].get_attribute("value") if interno else el.get_attribute("value")) or ""
        return v.strip() or el.text.strip()


class SignIn(Pagina):
    def entrar(self, email: str, password: str):
        self.ir("/signin")
        self.esperar(EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="email"], input[name="emailOrLdapLoginId"]')))
        self.d.find_element(By.CSS_SELECTOR, 'input[type="email"], input[name="emailOrLdapLoginId"]').send_keys(email)
        pw = self.d.find_element(By.CSS_SELECTOR, 'input[type="password"]')
        pw.send_keys(password, Keys.ENTER)
        return self


class Listado(Pagina):
    """Listados de recursos (/home/credentials, /home/workflows...)."""
    ITEM = sel("resources-list-item")

    def buscar(self, texto: str):
        campo = self.esperar(EC.visibility_of_element_located((
            By.CSS_SELECTOR, f'input{sel("resources-list-search")}, {sel("resources-list-search")} input')))
        campo.send_keys(Keys.CONTROL, "a", Keys.DELETE)
        campo.send_keys(texto)
        return self

    def nombres(self, prefijo="") -> list[str]:
        out = []
        for el in self.todos(self.ITEM):
            h = el.find_elements(By.CSS_SELECTOR, "h2")
            t = (h[0].text if h else el.text).strip()
            if t.startswith(prefijo):
                out.append(t)
        return out

    def ordenar(self, opcion: str):
        self.clic("resources-list-sort")
        self.esperar(lambda d: [e for e in d.find_elements(By.CSS_SELECTOR, sel("resources-list-sort-item"))
                                if e.is_displayed() and opcion in e.text]).pop().click()
        return self


class Lienzo(Pagina):
    NODO = sel("canvas-node")

    def abrir(self, wf_id: str):
        self.ir(f"/workflow/{wf_id}")
        self.esperar(EC.presence_of_element_located((By.CSS_SELECTOR, self.NODO)))
        return self

    def nodo(self, nombre: str) -> WebElement:
        css = f'{self.NODO}[data-node-name="{nombre}"]'
        return self.esperar(EC.visibility_of_element_located((By.CSS_SELECTOR, css)))

    def hay_nodo(self, nombre: str) -> bool:
        return self.existe(f'{self.NODO}[data-node-name="{nombre}"]')

    def hay_arista(self, origen: str, destino: str) -> bool:
        return self.existe(f'{sel("edge")}[data-source-node-name="{origen}"][data-target-node-name="{destino}"]')

    def num_nodos(self) -> int:
        return len(self.todos(self.NODO))

    def ejecutar(self):
        self.clic("execute-workflow-button")
        return self


class DataTables(Pagina):
    def abrir_listado(self):
        return self.ir("/home/datatables")

    def abrir_modal(self):
        self.esperar(lambda d: d.find_elements(By.CSS_SELECTOR, f'{sel("add-resource")}, button'))
        if self.existe(sel("add-resource")):
            self.clic("add-resource")
            self.clic("add-resource-dataTable")
        else:
            self.esperar(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Create data table') or contains(., 'Create Data table')]"))).click()
        self.tid("data-table-name-input-select")
        return self

    def abrir_tabla(self, proyecto: str, tabla_id: str):
        self.ir(f"/projects/{proyecto}/datatables/{tabla_id}")
        self.tid("data-table-details-view")
        return self

    GRID = f'{sel("data-table-grid")} .ag-center-cols-container [row-index]'

    def filas_grid(self) -> list[WebElement]:
        return self.todos(self.GRID)


class Carpetas(Pagina):
    def abrir_workflows(self, proyecto: str):
        return self.ir(f"/projects/{proyecto}/workflows")

    def abrir_carpeta(self, proyecto: str, carpeta_id: str):
        return self.ir(f"/projects/{proyecto}/folders/{carpeta_id}/workflows")

    def tarjeta(self, nombre: str) -> list[WebElement]:
        return [e for e in self.todos(sel("folder-card")) if nombre in e.text]
