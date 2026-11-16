"""
Fixtures compartidas de DeepEval para los 4 módulos de n8n.

  n8n       cliente REST con la sesión del propietario (omite la suite si n8n no responde)
  requiere_juez   omite si no hay API key del LLM que hace de juez
"""
from __future__ import annotations

import json
import os
import uuid
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

load_dotenv()
URL = os.getenv("N8N_URL", "http://localhost:5678").rstrip("/")
EMAIL = os.getenv("N8N_EMAIL", "qa.vyv@example.com")
CLAVE = os.getenv("N8N_PASSWORD", "VyvPrueba2026")
FIXTURES_CSV = (Path(__file__).parent / ".." / ".." / "e2e" / "fixtures" / "csv").resolve()


class N8n:
    def __init__(self):
        self.s = requests.Session()
        self.s.headers["browser-id"] = "vyv-deepeval"

    def login(self):
        self.s.post(f"{URL}/rest/owner/setup", json={"email": EMAIL, "firstName": "QA", "lastName": "VyV", "password": CLAVE}, timeout=30)
        r = self.s.post(f"{URL}/rest/login", json={"emailOrLdapLoginId": EMAIL, "password": CLAVE}, timeout=30)
        r.raise_for_status()
        return self

    def req(self, metodo, ruta, **kw):
        kw.setdefault("timeout", 60)
        return self.s.request(metodo, f"{URL}{ruta}", **kw)

    def datos(self, r):
        assert r.status_code in (200, 201), f"HTTP {r.status_code}: {r.text[:200]}"
        j = r.json()
        return j.get("data", j) if isinstance(j, dict) else j

    @property
    def proyecto(self):
        if not hasattr(self, "_p"):
            self._p = self.datos(self.req("GET", "/rest/projects/personal"))["id"]
        return self._p

    @staticmethod
    def mensaje(r) -> str:
        """Texto de error tal como lo vería un usuario o un cliente de la API."""
        try:
            j = r.json()
            return json.dumps(j, ensure_ascii=False)[:1500]
        except ValueError:
            return r.text[:1500]

    def unico(self, p="vyv"):
        return f"{p}_{uuid.uuid4().hex[:8]}"

    # Atajos usados por las pruebas
    def crear_workflow(self, nombre, nodes=None, connections=None, **extra):
        return self.datos(self.req("POST", "/rest/workflows", json={"name": nombre, "nodes": nodes or [], "connections": connections or {}, "settings": {}, "active": False, **extra}))

    def publicar(self, wf):
        return self.datos(self.req("POST", f"/rest/workflows/{wf['id']}/activate", json={"versionId": wf["versionId"]}))

    def borrar_workflow(self, wf_id):
        self.req("POST", f"/rest/workflows/{wf_id}/deactivate")
        self.req("POST", f"/rest/workflows/{wf_id}/archive")
        self.req("DELETE", f"/rest/workflows/{wf_id}")


@pytest.fixture(scope="session")
def n8n() -> N8n:
    try:
        requests.get(f"{URL}/healthz", timeout=10)
    except requests.RequestException as e:
        pytest.skip(f"n8n no responde en {URL}: {e}")
    return N8n().login()


@pytest.fixture(scope="session")
def requiere_juez():
    if not (os.getenv("OPENAI_API_KEY") or os.getenv("GOOGLE_API_KEY")):
        pytest.skip("Falta OPENAI_API_KEY o GOOGLE_API_KEY para el LLM juez (ver .env.example)")
