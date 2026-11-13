"""
Punto 14 · DeepEval: evaluación de un componente de IA incorporado al proyecto.

Componente evaluado: workflow de n8n "Asistente de Data Tables" (ver README.md de esta carpeta).
Recibe una pregunta y las filas de una data table, y responde usando un modelo de lenguaje.
Es un caso RAG simple: las filas son el "contexto recuperado".

Métricas (umbral 0.7):
  - AnswerRelevancyMetric : ¿la respuesta atiende la pregunta?
  - FaithfulnessMetric    : ¿la respuesta se basa SOLO en las filas (sin alucinar)?
  - GEval "Exactitud"     : ¿coincide con la respuesta esperada calculada a mano?

Ejecutar:  deepeval test run test_asistente_datatables.py   (o pytest -q)
"""
import json
import os

import pytest
import requests
from dotenv import load_dotenv
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric, FaithfulnessMetric, GEval
from deepeval.test_case import LLMTestCase

try:  # DeepEval >= 3.9 renombró LLMTestCaseParams a SingleTurnParams
    from deepeval.test_case import SingleTurnParams as Params
except ImportError:  # versiones anteriores
    from deepeval.test_case import LLMTestCaseParams as Params

load_dotenv()
WEBHOOK = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook/asistente-datatables")

FILAS = [
    {"nombre": "Ana", "edad": 25, "activo": True, "ciudad": "Medellín"},
    {"nombre": "Luis", "edad": 32, "activo": False, "ciudad": "Bogotá"},
    {"nombre": "Marta", "edad": 41, "activo": True, "ciudad": "Medellín"},
    {"nombre": "Jorge", "edad": 19, "activo": False, "ciudad": "Cali"},
    {"nombre": "Sofía", "edad": 28, "activo": True, "ciudad": "Medellín"},
]
CONTEXTO = [json.dumps(f, ensure_ascii=False) for f in FILAS]

CASOS = [
    ("¿Cuántas personas activas hay?", "Hay 3 personas activas: Ana, Marta y Sofía."),
    ("¿Quién es la persona de mayor edad?", "Marta, con 41 años."),
    ("¿Cuántas personas viven en Medellín?", "3 personas: Ana, Marta y Sofía."),
    ("¿Cuál es el promedio de edad?", "El promedio de edad es 29 años."),
    # Pregunta fuera del contexto: el asistente debe reconocer que no tiene el dato (fidelidad)
    ("¿Cuál es el teléfono de Ana?", "La tabla no contiene teléfonos; no es posible saberlo."),
]


def metricas():
    """Se crean al ejecutar cada prueba: el juez (LLM) necesita la API key solo en ese momento."""
    exactitud = GEval(
        name="Exactitud",
        criteria="Determina si la respuesta real es factualmente consistente con la respuesta esperada. "
                 "Penaliza números incorrectos o datos inventados.",
        evaluation_params=[Params.ACTUAL_OUTPUT, Params.EXPECTED_OUTPUT],
        threshold=0.7,
    )
    return [AnswerRelevancyMetric(threshold=0.7), FaithfulnessMetric(threshold=0.7), exactitud]


@pytest.fixture(scope="session", autouse=True)
def precondiciones():
    """Omite la suite con un mensaje claro si falta la API key o el workflow de n8n no responde."""
    if not (os.getenv("OPENAI_API_KEY") or os.getenv("GOOGLE_API_KEY")):
        pytest.skip("Falta OPENAI_API_KEY o GOOGLE_API_KEY (ver .env.example y README.md)")
    try:
        requests.post(WEBHOOK, json={"pregunta": "ping", "filas": []}, timeout=10)
    except requests.RequestException as e:
        pytest.skip(f"El workflow de n8n no responde en {WEBHOOK}: {e}")


def consultar_asistente(pregunta: str) -> str:
    r = requests.post(WEBHOOK, json={"pregunta": pregunta, "filas": FILAS}, timeout=60)
    r.raise_for_status()
    datos = r.json()
    return datos.get("respuesta") or datos.get("output") or datos.get("text") or json.dumps(datos)


@pytest.mark.parametrize("pregunta,esperada", CASOS)
def test_asistente_datatables(pregunta, esperada):
    respuesta = consultar_asistente(pregunta)
    caso = LLMTestCase(
        input=pregunta,
        actual_output=respuesta,
        expected_output=esperada,
        retrieval_context=CONTEXTO,
    )
    assert_test(caso, metricas())
