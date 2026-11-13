# DeepEval – Asistente de Data Tables (componente de IA incorporado)

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
cd ia/deepeval
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # poner la API key
deepeval test run test_asistente_datatables.py
```

## 3. Qué reportar
Tabla con las 5 preguntas × 3 métricas (puntaje y razón que da DeepEval), casos que fallan y por qué
(p. ej. promedio mal calculado = fallo de Exactitud; inventar un teléfono = fallo de Faithfulness),
costo/tiempo aproximado y limitaciones (el juez también es un LLM y puede variar entre ejecuciones).
