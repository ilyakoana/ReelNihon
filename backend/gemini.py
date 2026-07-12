"""
gemini.py
Dues crides separades a Gemini:
  1. generate_summary  — analitza el vídeo/fotos i genera title + summary + natural_warning
  2. generate_exercises — a partir del summary generat, crea els exercicis
"""

import os
import json
import time
import logging

import google.generativeai as genai

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ── Prompts ───────────────────────────────────────────────────────────────────

SUMMARY_PROMPT = """Eres un módulo de análisis de contenido integrado en una aplicación de aprendizaje de japonés. Procesas el material recibido (vídeo o fotos) y generas material de estudio en JSON.

REGLAS:
- Empieza directamente con el contenido. Sin saludos, sin introducciones, sin frases motivacionales.
- Tono amigable y directo, como explicar a un amigo.
- Las explicaciones van en ruso. El japonés se escribe en japonés (kanji/kana) con romaji entre paréntesis cuando sea necesario.
- Nivel N5 (principiante absoluto), sin simplificar a costa de la verdad sobre cómo habla la gente real.
- Prioriza el japonés natural y coloquial: el que se usa en combinis, con amigos, en redes sociales.
- Si hay expresiones demasiado formales o académicas que los japoneses reales raramente usan, indicalo en "natural_warning".
- Explica también contexto cultural, comportamiento y señales no verbales cuando sea relevante.

FURIGANA (MUY IMPORTANTE):
Cuando escribas kanji en el summary, usa siempre el formato furigana: 漢字[よみかた]
Ejemplos:
  - 日本語[にほんご] → se verá como 日本語 con にほんご encima
  - 勉強[べんきょう]する → se verá como 勉強 con べんきょう encima
  - 飛[と]ぶ → solo el kanji lleva furigana, la kana suelta no
Regla: SOLO los kanji llevan [furigana]. El hiragana y katakana solos NO llevan corchetes.

Devuelve SOLO JSON valido, sin markdown, sin ```json, sin preambulo:
{
  "title": "Nombre del tema en ruso (max 60 caracteres)",
  "summary": "Explicacion detallada en formato markdown con furigana en formato Kanji[よみ]. Incluye nueva lexica con lectura y traduccion, gramatica si hay, contexto cultural.",
  "natural_warning": "Si hay expresiones de libro de texto poco naturales, describelo aqui. Si todo es natural, deja string vacio."
}"""

EXERCISES_PROMPT = """Eres un generador de ejercicios de japonés integrado en una aplicación de aprendizaje.
Recibirás el título y el temario de una lección ya explicada, y debes crear ejercicios para practicarla.

REGLAS:
- Todos los ejercicios son de tipo cerrado (con opciones). El estudiante NUNCA escribe texto libre.
- Elige el tipo de ejercicio que mejor se adapte al contenido concreto, no aleatoriamente.
- Crea 10-50 ejercicios, mínimo 3-4 tipos diferentes. Más ejercicios cuando se aprenden kanjis.
- Las explicaciones van en ruso.

TIPOS DISPONIBLES:

1. "multiple_choice" — pregunta con 4 opciones, una correcta.
{"type":"multiple_choice","question":"...","options":["a","b","c","d"],"answer":"b","explanation":"...","difficulty":1}

2. "fill_blank_choice" — frase con ___, elegir la opcion correcta.
{"type":"fill_blank_choice","question":"この寿司、マジで___！","options":["飛ぶ","美味しい","面白い","詰んだ"],"answer":"飛ぶ","explanation":"...","difficulty":2}

3. "translate_choice" — traducir eligiendo entre 3-4 opciones.
{"type":"translate_choice","question":"Переведи: 「詰んだ！」","options":["Всё пропало!","Я голоден!","Это весело!","Спасибо!"],"answer":"Всё пропало!","explanation":"...","difficulty":2}

4. "natural_or_not" — elegir la opcion mas natural para un hablante nativo.
{"type":"natural_or_not","question":"Como decir naturalmente 'quizas voy'?","options":["もしかしたら、来ます。","ワンチャン、行くかも！","参ります。"],"answer":"ワンチャン、行くかも！","explanation":"...","difficulty":3}

5. "order_words" — ordenar palabras para formar una frase. answer es el orden correcto separado por comas.
{"type":"order_words","question":"Forma la frase 'Este ramen es increible'","options":["ラーメン","マジで","この","飛ぶ"],"answer":"この,ラーメン,マジで,飛ぶ","explanation":"...","difficulty":3}

6. "match_pairs" — emparejar 3-4 pares japones/ruso. options son los pares correctos, el frontend los mezcla.
{"type":"match_pairs","question":"Empareja","options":[{"left":"草","right":"ЛОЛ"},{"left":"詰んだ","right":"всё пропало"}],"answer":"草=ЛОЛ;詰んだ=всё пропало","explanation":"...","difficulty":2}

difficulty: 1-2 lexica basica, 3 construcciones similares, 4-5 matices culturales sutiles.

Devuelve SOLO un array JSON valido de ejercicios, sin markdown, sin ```json, sin preambulo:
[{...}, {...}, ...]"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _upload_file(filepath: str):
    logger.info(f"Pujant fitxer a Gemini: {filepath}")
    file = genai.upload_file(path=filepath)
    while file.state.name == "PROCESSING":
        time.sleep(2)
        file = genai.get_file(file.name)
    if file.state.name == "FAILED":
        raise RuntimeError(f"Gemini no ha pogut processar: {filepath}")
    return file


def _clean_json(raw: str) -> str:
    """Neteja possibles ```json que Gemini afegeix malgrat les instruccions."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    return text


# ── Chat ──────────────────────────────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = """Eres un asistente de aprendizaje de japonés integrado en la app ReelNihon.
El usuario es rusohablante, nivel N5 (principiante absoluto). Su objetivo es aprender japonés REAL y natural, no de libro de texto.

CÓMO COMPORTARTE:
- Responde siempre en ruso, de forma amigable y directa.
- Cuando escribas japonés, usa el formato furigana: 漢字[よみかた] para que la app lo muestre correctamente.
- Puedes responder preguntas sobre japonés, explicar gramática, vocabulario, cultura japonesa.
- Puedes analizar archivos (PDFs, imágenes, documentos) que el usuario adjunte.

FUNCIÓN ESPECIAL — GENERAR CONTENIDO:
Si el usuario pide explícitamente que generes un temario, lección o ejercicios sobre algún tema
(por ejemplo: "genera un temario sobre partículas", "crea ejercicios de saludos", "quiero estudiar esto"),
responde con un JSON especial en un bloque de código con el tag `GENERATE_CONTENT`:

```GENERATE_CONTENT
{
  "title": "Título del tema en ruso",
  "summary": "Temario completo en markdown con furigana 漢字[よみ]",
  "natural_warning": "Avisos sobre expresiones poco naturales, o string vacío",
  "exercises": [
    {
      "type": "multiple_choice|fill_blank_choice|translate_choice|natural_or_not|order_words|match_pairs",
      "question": "...",
      "options": [...],
      "answer": "...",
      "explanation": "...",
      "difficulty": 1
    }
  ]
}
```

Junto al bloque GENERATE_CONTENT, añade también un mensaje breve explicando qué has generado.
Si NO se pide explícitamente un temario o ejercicios, responde solo con texto normal, sin JSON.
"""


def chat_with_gemini(messages: list[dict], files_data: list[dict] = None) -> str:
    """
    Crida al model de xat amb historial de conversa i fitxers opcionals.

    messages: [{"role": "user"|"assistant", "content": str}, ...]
    files_data: [{"data": bytes, "mime_type": str, "name": str}, ...]

    Retorna el text de la resposta del model.
    """
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=CHAT_SYSTEM_PROMPT,
    )

    # Convertir historial al format de Gemini
    history = []
    for msg in messages[:-1]:  # tots menys l'últim (és el missatge actual)
        role = "user" if msg["role"] == "user" else "model"
        history.append({"role": role, "parts": [msg["content"]]})

    chat = model.start_chat(history=history)

    # Construir el missatge actual amb fitxers si n'hi ha
    current_parts = []

    if files_data:
        for f in files_data:
            current_parts.append({
                "inline_data": {
                    "mime_type": f["mime_type"],
                    "data": f["data"],
                }
            })

    # Text de l'últim missatge
    last_msg = messages[-1]["content"] if messages else ""
    current_parts.append(last_msg)

    response = chat.send_message(current_parts)
    return response.text


def generate_summary(files: list[str]) -> dict:
    """
    Envia el vídeo/fotos a Gemini i retorna:
    { title, summary, natural_warning }
    """
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=SUMMARY_PROMPT,
    )

    uploaded = [_upload_file(f) for f in files]

    try:
        response = model.generate_content(
            uploaded + ["Analiza este contenido y devuelve el JSON del temario."]
        )
        data = json.loads(_clean_json(response.text))
    except json.JSONDecodeError as e:
        raise RuntimeError(f"JSON invalid del resum: {e}")
    finally:
        for f in uploaded:
            try:
                genai.delete_file(f.name)
            except Exception:
                pass

    return data


# ── Crida 2: exercicis ────────────────────────────────────────────────────────

def generate_exercises(title: str, summary: str) -> list:
    """
    A partir del títol i el resum ja generat, crea els exercicis.
    Retorna una llista d'exercicis.
    """
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=EXERCISES_PROMPT,
    )

    prompt = f"Título de la lección: {title}\n\nTemario:\n{summary}\n\nGenera los ejercicios."

    response = model.generate_content(prompt)

    try:
        data = json.loads(_clean_json(response.text))
    except json.JSONDecodeError as e:
        raise RuntimeError(f"JSON invalid dels exercicis: {e}")

    if not isinstance(data, list):
        raise RuntimeError(f"S'esperava una llista d'exercicis, rebut: {type(data)}")

    return data
