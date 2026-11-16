"""
Cliente mínimo de la API REST interna de n8n (/rest) para Selenium.

Se usa para PREPARAR datos (crear workflows, credenciales, tablas...) y para VERIFICAR el
estado después de una acción hecha en el navegador. Las respuestas de /rest vienen en { data }.
n8n liga la cookie de sesión a un `browser-id`: se envía el mismo en todas las peticiones y se
guarda en localStorage del navegador (ver conftest.py) para que ambas sesiones coincidan.
"""
from __future__ import annotations

import json
import time
import uuid
from typing import Any

import requests

BROWSER_ID = "vyv-selenium-browser"


class N8nError(AssertionError):
    pass


class N8nClient:
    def __init__(self, base_url: str, email: str, password: str):
        self.base = base_url.rstrip("/")
        self.email, self.password = email, password
        self.s = requests.Session()
        self.s.headers["browser-id"] = BROWSER_ID
        self._proyecto: str | None = None

    # ------------------------------------------------------------------ sesión
    def login(self) -> "N8nClient":
        # En una instancia nueva crea al propietario (solo funciona la primera vez).
        self.s.post(f"{self.base}/rest/owner/setup", json={
            "email": self.email, "firstName": "QA", "lastName": "VyV", "password": self.password,
        }, timeout=30)
        r = self.s.post(f"{self.base}/rest/login", json={
            "emailOrLdapLoginId": self.email, "password": self.password,
        }, timeout=30)
        if r.status_code != 200:
            raise N8nError(f"Login falló ({r.status_code}): {r.text[:200]}")
        return self

    @property
    def cookie_sesion(self) -> dict | None:
        c = next((c for c in self.s.cookies if c.name == "n8n-auth"), None)
        return {"name": c.name, "value": c.value, "path": "/"} if c else None

    # ------------------------------------------------------------------ base
    def req(self, metodo: str, ruta: str, **kw) -> requests.Response:
        kw.setdefault("timeout", 60)
        return self.s.request(metodo, f"{self.base}{ruta}", **kw)

    @staticmethod
    def datos(r: requests.Response, esperado=(200, 201)) -> Any:
        if r.status_code not in esperado:
            raise N8nError(f"HTTP {r.status_code}: {r.text[:300]}")
        j = r.json()
        return j.get("data", j) if isinstance(j, dict) else j

    @staticmethod
    def mensaje(r: requests.Response) -> str:
        try:
            j = r.json()
            return str(j.get("message") or (j.get("data") or {}).get("message") or j)
        except ValueError:
            return r.text

    @staticmethod
    def unico(prefijo="vyv") -> str:
        return f"{prefijo}_{int(time.time() * 1000) % 10**9}_{uuid.uuid4().hex[:4]}"

    @property
    def proyecto(self) -> str:
        if not self._proyecto:
            self._proyecto = self.datos(self.req("GET", "/rest/projects/personal"))["id"]
        return self._proyecto

    # ------------------------------------------------------------------ nodos de uso común
    @staticmethod
    def nodo_manual() -> dict:
        return {"id": "mt", "name": "Manual Trigger", "type": "n8n-nodes-base.manualTrigger",
                "typeVersion": 1, "position": [0, 0], "parameters": {}}

    @staticmethod
    def nodo_webhook(ruta: str, metodo="GET") -> dict:
        return {"id": f"wh-{ruta}", "name": "Webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2,
                "position": [0, 0], "webhookId": str(uuid.uuid4()),
                "parameters": {"httpMethod": metodo, "path": ruta, "responseMode": "lastNode", "options": {}}}

    @staticmethod
    def nodo_campos(campos: dict, nombre="Edit Fields", pos=(220, 0)) -> dict:
        def tipo(v):
            return "boolean" if isinstance(v, bool) else "number" if isinstance(v, (int, float)) else "string"
        return {"id": f"set-{nombre}", "name": nombre, "type": "n8n-nodes-base.set", "typeVersion": 3.4,
                "position": list(pos), "parameters": {"mode": "manual", "options": {}, "assignments": {
                    "assignments": [{"id": str(i), "name": k, "value": v, "type": tipo(v)}
                                    for i, (k, v) in enumerate(campos.items())]}}}

    @staticmethod
    def nodo_falla(mensaje: str, nombre="Falla", pos=(220, 0)) -> dict:
        return {"id": f"err-{nombre}", "name": nombre, "type": "n8n-nodes-base.stopAndError",
                "typeVersion": 1, "position": list(pos), "parameters": {"errorMessage": mensaje}}

    @staticmethod
    def cadena(*nombres: str) -> dict:
        return {n: {"main": [[{"node": nombres[i + 1], "type": "main", "index": 0}]]}
                for i, n in enumerate(nombres[:-1])}

    # ------------------------------------------------------------------ módulo 1 · workflows
    def crear_workflow(self, nombre: str, nodes=None, connections=None, **extra) -> dict:
        body = {"name": nombre, "nodes": nodes or [], "connections": connections or {},
                "settings": {}, "active": False, **extra}
        return self.datos(self.req("POST", "/rest/workflows", json=body))

    def publicar(self, wf: dict) -> dict:
        r = self.req("POST", f"/rest/workflows/{wf['id']}/activate", json={"versionId": wf["versionId"]})
        return self.datos(r)

    def crear_publicado(self, nombre: str, ruta: str, campos: dict | None = None) -> dict:
        nodos = [self.nodo_webhook(ruta), self.nodo_campos(campos or {"ok": True})]
        wf = self.crear_workflow(nombre, nodos, self.cadena("Webhook", "Edit Fields"))
        self.publicar(wf)
        return wf

    def desactivar(self, wf_id: str):
        return self.req("POST", f"/rest/workflows/{wf_id}/deactivate")

    def borrar_workflow(self, wf_id: str):
        self.desactivar(wf_id)
        self.req("POST", f"/rest/workflows/{wf_id}/archive")
        return self.req("DELETE", f"/rest/workflows/{wf_id}")

    def obtener_workflow(self, wf_id: str) -> requests.Response:
        return self.req("GET", f"/rest/workflows/{wf_id}")

    def llamar_webhook(self, ruta: str, intentos=15) -> requests.Response:
        """El webhook se registra poco después de publicar: se reintenta mientras responde 404."""
        for _ in range(intentos):
            r = self.s.get(f"{self.base}/webhook/{ruta}", timeout=30)
            if r.status_code != 404:
                return r
            time.sleep(0.5)
        return r

    # ------------------------------------------------------------------ módulo 2 · ejecuciones
    def ejecuciones(self, wf_id: str, limite=100) -> list[dict]:
        f = json.dumps({"workflowId": wf_id})
        d = self.datos(self.req("GET", "/rest/executions", params={"filter": f, "limit": limite}))
        return d.get("results", d) if isinstance(d, dict) else d

    def esperar_ejecuciones(self, wf_id: str, n=1, intentos=40) -> list[dict]:
        lista: list[dict] = []
        for _ in range(intentos):
            lista = self.ejecuciones(wf_id)
            if len(lista) >= n:
                break
            time.sleep(0.5)
        return lista

    # ------------------------------------------------------------------ módulo 3 · credenciales
    def crear_credencial(self, nombre: str, cabecera="X-API-Key", valor="secreto") -> dict:
        return self.datos(self.req("POST", "/rest/credentials", json={
            "name": nombre, "type": "httpHeaderAuth", "data": {"name": cabecera, "value": valor}}))

    def borrar_credencial(self, cred_id: str):
        return self.req("DELETE", f"/rest/credentials/{cred_id}")

    def listar_credenciales(self, **filtro) -> list[dict]:
        r = self.req("GET", "/rest/credentials", params={"filter": json.dumps(filtro)} if filtro else None)
        d = self.datos(r)
        return d if isinstance(d, list) else d.get("data", [])

    # ------------------------------------------------------------------ módulo 4 · core
    def _dt(self) -> str:
        return f"/rest/projects/{self.proyecto}/data-tables"

    def crear_tabla(self, nombre: str, columnas=None) -> requests.Response:
        return self.req("POST", self._dt(), json={"name": nombre, "columns": columnas or []})

    def crear_tabla_ok(self, nombre: str, columnas=None) -> dict:
        return self.datos(self.crear_tabla(nombre, columnas))

    def borrar_tabla(self, tabla_id: str):
        return self.req("DELETE", f"{self._dt()}/{tabla_id}")

    def insertar_filas(self, tabla_id: str, filas: list[dict]) -> requests.Response:
        return self.req("POST", f"{self._dt()}/{tabla_id}/insert", json={"data": filas, "returnType": "all"})

    def filas(self, tabla_id: str) -> list[dict]:
        d = self.datos(self.req("GET", f"{self._dt()}/{tabla_id}/rows", params={"take": "250"}))
        return d.get("data", d)

    def columnas(self, tabla_id: str) -> list[dict]:
        return self.datos(self.req("GET", f"{self._dt()}/{tabla_id}/columns"))

    def tablas(self) -> list[dict]:
        d = self.datos(self.req("GET", self._dt(), params={"take": "250"}))
        return d.get("data", d)

    def descargar_csv(self, tabla_id: str) -> str:
        d = self.datos(self.req("GET", f"{self._dt()}/{tabla_id}/download-csv",
                                params={"includeSystemColumns": "false"}))
        return d["csvContent"]

    def subir_csv(self, ruta: str, nombre: str | None = None, headers=True) -> requests.Response:
        with open(ruta, "rb") as f:
            return self.req("POST", "/rest/data-tables/uploads",
                            files={"file": (nombre or ruta.split("/")[-1], f, "text/csv")},
                            data={"hasHeaders": str(headers).lower()})

    def crear_carpeta(self, nombre: str, padre: str | None = None) -> requests.Response:
        body = {"name": nombre, **({"parentFolderId": padre} if padre else {})}
        return self.req("POST", f"/rest/projects/{self.proyecto}/folders", json=body)

    def crear_carpeta_ok(self, nombre: str, padre: str | None = None) -> dict:
        return self.datos(self.crear_carpeta(nombre, padre))

    def borrar_carpeta(self, carpeta_id: str, transferir_a: str | None = None):
        q = f"?transferToFolderId={transferir_a}" if transferir_a else ""
        return self.req("DELETE", f"/rest/projects/{self.proyecto}/folders/{carpeta_id}{q}")

    def listar_carpetas(self) -> list[dict]:
        d = self.datos(self.req("GET", f"/rest/projects/{self.proyecto}/folders", params={"take": "250"}))
        return d.get("data", d) if isinstance(d, dict) else d
