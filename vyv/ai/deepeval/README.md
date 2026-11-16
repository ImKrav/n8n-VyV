# DeepEval · calidad de la IA y de los mensajes de n8n (módulos 1–4)

| Archivo | Qué evalúa |
| --- | --- |
| `test_calidad_errores_api.py` | 12 errores reales de la API de Workflows, Ejecuciones, Credenciales y Core: código 4xx (determinista) + juez LLM: mensaje **útil** y **sin fuga de información interna**. Incluye los casos del código refactorizado (BUG-018-05). |
| `test_asistente_modulos.py` | El asistente responde sobre **datos reales de los 4 módulos** (workflows, ejecuciones, credenciales, carpetas): relevancia, fidelidad y exactitud (la respuesta esperada se calcula con la API). Seguridad: no revela secretos ni obedece instrucciones inyectadas en un nombre. |
| `test_asistente_datatables.py` | Evaluación original del asistente de Data Tables (5 preguntas × 3 métricas). |

```bash
cd vyv/ai/deepeval
python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
cp .env.example .env          # OPENAI_API_KEY + N8N_URL / N8N_EMAIL / N8N_PASSWORD
deepeval test run test_calidad_errores_api.py      # no necesita el workflow del asistente
pytest -q -m seguridad                              # solo fuga de secretos / inyección
pytest -q -m "wf or cr"                             # por módulo: wf | ex | cr | co
```

`test_calidad_errores_api.py` solo necesita n8n y la API key del juez. `test_asistente_*` además necesitan el workflow
del asistente (sección 1 de este README). Si falta algo, esa suite se **omite** con un mensaje claro.

---

# Asistente de Data Tables (componente de IA incorporado)

## 1. Construir el workflow en n8n (5 minutos)
1. Crear workflow **"Asistente de Data Tables"**.
2. Nodo **Webhook**: método `POST`, path `asistente-datatables`, *Respond* = `Using 'Respond to Webhook' Node`.
3. Nodo **Basic LLM Chain** (o *AI Agent*) conectado al Webhook:
   - Prompt (expresión):
     ```
     Eres un asistente que responde SOLO con los datos de esta tabla (JSON):
     {{ JSON.stringify($json.body.filas) }}
     Si el dato no está en la tabla, di que no está disponible. Responde en español, en una o dos frases.
     Pregunta: {{ $json.body.pregunta }}
     ```
   - Sub-nodo de modelo: **OpenAI Chat Model** (gpt-4.1-mini) o **Google Gemini Chat Model**, con su credencial.
4. Nodo **Respond to Webhook**: *Respond With* = JSON, cuerpo `{ "respuesta": "{{ $json.text }}" }`.
5. Guardar y **publicar/activar** el workflow (la URL de producción es `/webhook/asistente-datatables`).

> Variante 100 % data tables: en lugar de enviar las filas en el cuerpo, añade un nodo *Data Table → Get rows*
> antes del LLM y usa sus filas en el prompt. Las métricas de DeepEval no cambian.

## 2. Ejecutar
```bash
cd vyv/ai/deepeval
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # poner la API key
deepeval test run test_asistente_datatables.py
```

## 3. Qué reportar
Tabla con las 5 preguntas × 3 métricas (puntaje y razón que da DeepEval), casos que fallan y por qué
(p. ej. promedio mal calculado = fallo de Exactitud; inventar un teléfono = fallo de Faithfulness),
costo/tiempo aproximado y limitaciones (el juez también es un LLM y puede variar entre ejecuciones).
