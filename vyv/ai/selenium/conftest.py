"""
Fixtures de Selenium para el plan de pruebas de n8n-VyV.

  cfg      configuración (.env)
  api      cliente REST con sesión del propietario (preparación y verificación de datos)
  driver   navegador ya autenticado (cookie de sesión + browser-id inyectados; evita repetir el login por UI)
  limpiar  registra recursos creados para borrarlos al terminar la prueba (pruebas independientes: FIRST)
Si n8n no responde, la suite se omite con un mensaje claro en lugar de fallar.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions

from n8n_client import BROWSER_ID, N8nClient

load_dotenv()
RAIZ = Path(__file__).parent
FIXTURES = (RAIZ / ".." / ".." / "e2e" / "fixtures" / "csv").resolve()
RESULTADOS = RAIZ / "results"
CAPTURAS = RESULTADOS / "screenshots"
CAPTURAS.mkdir(parents=True, exist_ok=True)


@pytest.fixture(scope="session")
def cfg() -> dict:
    return {
        "url": os.getenv("N8N_URL", "http://localhost:5678").rstrip("/"),
        "email": os.getenv("N8N_EMAIL", "qa.vyv@example.com"),
        "password": os.getenv("N8N_PASSWORD", "VyvPrueba2026"),
        "browser": os.getenv("SELENIUM_BROWSER", "chrome").lower(),
        "headless": os.getenv("SELENIUM_HEADLESS", "true").lower() != "false",
        "remote": os.getenv("SELENIUM_REMOTE_URL"),
    }


@pytest.fixture(scope="session")
def api(cfg) -> N8nClient:
    try:
        requests.get(f"{cfg['url']}/healthz", timeout=10)
    except requests.RequestException as e:
        pytest.skip(f"n8n no responde en {cfg['url']}: {e}", allow_module_level=False)
    return N8nClient(cfg["url"], cfg["email"], cfg["password"]).login()


@pytest.fixture(scope="session")
def descargas() -> Path:
    return Path(tempfile.mkdtemp(prefix="vyv-selenium-dl-"))


@pytest.fixture(scope="session")
def fixtures_csv() -> Path:
    return FIXTURES


def _crear_driver(cfg: dict, descargas: Path):
    if cfg["browser"] == "firefox":
        o = FirefoxOptions()
        if cfg["headless"]:
            o.add_argument("-headless")
        o.set_preference("browser.download.folderList", 2)
        o.set_preference("browser.download.dir", str(descargas))
        o.set_preference("browser.helperApps.neverAsk.saveToDisk", "text/csv,application/csv")
        d = webdriver.Remote(cfg["remote"], options=o) if cfg["remote"] else webdriver.Firefox(options=o)
    else:
        o = ChromeOptions()
        if cfg["headless"]:
            o.add_argument("--headless=new")
        for a in ("--window-size=1440,900", "--no-sandbox", "--disable-dev-shm-usage", "--lang=en-US"):
            o.add_argument(a)
        o.add_experimental_option("prefs", {
            "download.default_directory": str(descargas),
            "download.prompt_for_download": False,
        })
        d = webdriver.Remote(cfg["remote"], options=o) if cfg["remote"] else webdriver.Chrome(options=o)
    d.set_window_size(1440, 900)
    return d


@pytest.fixture
def driver(cfg, api, descargas):
    d = _crear_driver(cfg, descargas)
    # Misma sesión que el cliente REST: cookie n8n-auth + browser-id en localStorage.
    d.get(f"{cfg['url']}/signin")
    cookie = api.cookie_sesion
    if cookie:
        d.add_cookie(cookie)
    d.execute_script("window.localStorage.setItem('n8n-browserId', arguments[0]);", BROWSER_ID)
    d.implicitly_wait(0)  # solo esperas explícitas (WebDriverWait)
    yield d
    d.quit()


@pytest.fixture
def driver_anonimo(cfg, descargas):
    """Navegador sin sesión, para probar el inicio de sesión desde la interfaz."""
    d = _crear_driver(cfg, descargas)
    yield d
    d.quit()


@pytest.fixture
def limpiar(api):
    """Uso: limpiar(lambda: api.borrar_tabla(id)). Los recursos se eliminan en orden inverso."""
    pendientes: list = []
    yield pendientes.append
    for fn in reversed(pendientes):
        try:
            fn()
        except Exception:  # la limpieza nunca debe ocultar el resultado de la prueba
            pass


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Captura de pantalla cuando una prueba de UI falla (evidencia para el informe)."""
    salida = yield
    rep = salida.get_result()
    d = item.funcargs.get("driver") or item.funcargs.get("driver_anonimo")
    if rep.when == "call" and rep.failed and d:
        try:
            d.save_screenshot(str(CAPTURAS / f"FALLO_{item.name}.png"))
        except Exception:
            pass
