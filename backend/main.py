"""
main.py — ReelNihon backend
"""

import json
import logging
import shutil
from pathlib import Path

from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from pydantic import BaseModel

from models import init_db, SessionLocal, Content, Exercise
from gemini import generate_summary, generate_exercises

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

app = FastAPI(title="ReelNihon API")

VIDEO_EXTS = {'.mp4', '.webm', '.mkv', '.mov', '.avi', '.m4v'}
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp'}


@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("BD inicialitzada")


# ── Process ───────────────────────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    content_id: str
    source_url: str
    folder: str
    files: list[str]


@app.post("/process")
async def process_content(req: ProcessRequest, background_tasks: BackgroundTasks):
    db = SessionLocal()
    try:
        content = Content(
            id=req.content_id,
            source_url=req.source_url,
            folder_path=req.folder,
            status="processing",
        )
        db.add(content)
        db.commit()
    finally:
        db.close()

    background_tasks.add_task(_process_with_gemini, req.content_id, req.files)
    return {"status": "accepted", "content_id": req.content_id}


def _process_with_gemini(content_id: str, files: list[str]):
    """
    Dues crides separades a Gemini:
    1. generate_summary  -> title + summary + natural_warning
    2. generate_exercises -> llista d'exercicis basada en el summary
    """
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            logger.error(f"Content {content_id} no trobat a BD")
            return

        # ── Crida 1: resum ────────────────────────────────────────────────────
        logger.info(f"[{content_id}] Generant resum...")
        try:
            summary_result = generate_summary(files)
        except Exception as e:
            logger.error(f"[{content_id}] Error generant resum: {e}")
            content.status = "error"
            content.error_message = str(e)
            db.commit()
            return

        content.title = summary_result.get("title")
        content.summary = summary_result.get("summary")
        content.natural_warning = summary_result.get("natural_warning", "")
        content.status = "processing"  # seguim processant
        db.commit()
        logger.info(f"[{content_id}] Resum generat. Generant exercicis...")

        # ── Crida 2: exercicis ────────────────────────────────────────────────
        try:
            exercises_result = generate_exercises(
                title=content.title,
                summary=content.summary,
            )
        except Exception as e:
            logger.error(f"[{content_id}] Error generant exercicis: {e}")
            content.status = "error"
            content.error_message = str(e)
            db.commit()
            return

        for ex in exercises_result:
            exercise = Exercise(
                content_id=content_id,
                type=ex.get("type"),
                question=ex.get("question"),
                options=json.dumps(ex.get("options"), ensure_ascii=False) if ex.get("options") else None,
                answer=ex.get("answer"),
                explanation=ex.get("explanation"),
                difficulty=ex.get("difficulty", 1),
            )
            db.add(exercise)

        content.status = "ready"
        db.commit()
        logger.info(f"[{content_id}] Llest. {len(exercises_result)} exercicis generats.")

    finally:
        db.close()


# ── Thumbnail ─────────────────────────────────────────────────────────────────

def _get_thumbnail(content_id: str, folder: Path):
    if not folder.exists():
        return None

    images = sorted([f for f in folder.rglob("*") if f.suffix.lower() in IMAGE_EXTS and f.name != "thumb.jpg"])
    if images:
        rel = images[0].relative_to(folder)
        return f"/api/media/{content_id}/{rel}"

    videos = sorted([f for f in folder.rglob("*") if f.suffix.lower() in VIDEO_EXTS])
    if videos:
        thumb_path = folder / "thumb.jpg"
        if not thumb_path.exists():
            try:
                import subprocess
                subprocess.run([
                    "ffmpeg", "-i", str(videos[0]),
                    "-ss", "00:00:01", "-vframes", "1", "-q:v", "3",
                    str(thumb_path),
                ], capture_output=True, timeout=15)
            except Exception:
                pass
        if thumb_path.exists():
            return f"/api/media/{content_id}/thumb.jpg"
        rel = videos[0].relative_to(folder)
        return f"/api/media/{content_id}/{rel}"

    return None


# ── Contents ──────────────────────────────────────────────────────────────────

@app.get("/contents")
def list_contents():
    db = SessionLocal()
    try:
        contents = db.query(Content).order_by(Content.created_at.desc()).all()
        return [
            {
                "id": c.id,
                "title": c.title,
                "status": c.status,
                "created_at": c.created_at.isoformat(),
                "thumbnail": _get_thumbnail(c.id, Path(c.folder_path)),
            }
            for c in contents
        ]
    finally:
        db.close()


@app.get("/contents/{content_id}")
def get_content(content_id: str):
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="No trobat")
        return {
            "id": content.id,
            "title": content.title,
            "summary": content.summary,
            "natural_warning": content.natural_warning,
            "status": content.status,
            "folder_path": content.folder_path,
            "exercises": [
                {
                    "id": ex.id,
                    "type": ex.type,
                    "question": ex.question,
                    "options": json.loads(ex.options) if ex.options else None,
                    "answer": ex.answer,
                    "explanation": ex.explanation,
                    "difficulty": ex.difficulty,
                }
                for ex in content.exercises
            ],
        }
    finally:
        db.close()


@app.post("/contents/{content_id}/regenerate")
def regenerate_content(content_id: str, background_tasks: BackgroundTasks):
    """Torna a generar temari i exercicis d'un contingut existent."""
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="No trobat")

        # Esborrar exercicis antics
        db.query(Exercise).filter(Exercise.content_id == content_id).delete()
        content.status = "processing"
        content.error_message = None
        content.title = None
        content.summary = None
        content.natural_warning = None
        db.commit()

        # Recollir fitxers de la carpeta
        folder = Path(content.folder_path)
        exts = {'.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.webm'}
        files = sorted([str(f) for f in folder.rglob("*") if f.is_file() and f.suffix.lower() in exts])

        if not files:
            content.status = "error"
            content.error_message = "No s'han trobat fitxers multimèdia"
            db.commit()
            raise HTTPException(status_code=400, detail="No hi ha fitxers per processar")

    finally:
        db.close()

    background_tasks.add_task(_process_with_gemini, content_id, files)
    return {"status": "regenerating", "content_id": content_id}


def delete_content(content_id: str):
    db = SessionLocal()
    try:
        content = db.query(Content).filter(Content.id == content_id).first()
        if not content:
            raise HTTPException(status_code=404, detail="No trobat")
        folder = Path(content.folder_path)
        if folder.exists():
            shutil.rmtree(folder)
        db.delete(content)
        db.commit()
        return {"status": "deleted"}
    finally:
        db.close()


# ── Dailies (placeholder — lògica futura) ─────────────────────────────────────

@app.get("/dailies")
def get_dailies():
    return []


# ── Chat ──────────────────────────────────────────────────────────────────────

import base64
import re
import uuid as uuid_module
from fastapi import UploadFile, File, Form
from typing import Optional

@app.post("/chat")
async def chat(
    background_tasks: BackgroundTasks,
    messages: str = Form(...),          # JSON string amb l'historial
    files: list[UploadFile] = File([]), # fitxers adjunts opcionals
):
    """
    Endpoint de xat. Rep l'historial de conversa i fitxers opcionals.
    Retorna la resposta del model i, si detecta GENERATE_CONTENT, crea el contingut.
    """
    from gemini import chat_with_gemini

    history = json.loads(messages)

    # Processar fitxers adjunts
    files_data = []
    for f in files:
        raw = await f.read()
        files_data.append({
            "data": base64.b64encode(raw).decode(),
            "mime_type": f.content_type or "application/octet-stream",
            "name": f.filename,
        })

    try:
        response_text = chat_with_gemini(history, files_data if files_data else None)
    except Exception as e:
        logger.error(f"Error en xat Gemini: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    # Detectar si el model vol generar contingut
    content_id = None
    generate_match = re.search(
        r'```GENERATE_CONTENT\s*(\{.*?\})\s*```',
        response_text,
        re.DOTALL
    )

    if generate_match:
        try:
            content_data = json.loads(generate_match.group(1))
            content_id = str(uuid_module.uuid4())

            db = SessionLocal()
            try:
                content = Content(
                    id=content_id,
                    source_url="chat://generated",
                    folder_path=f"/data/media/{content_id}",
                    title=content_data.get("title"),
                    summary=content_data.get("summary"),
                    natural_warning=content_data.get("natural_warning", ""),
                    status="ready",
                )
                db.add(content)

                for ex in content_data.get("exercises", []):
                    exercise = Exercise(
                        content_id=content_id,
                        type=ex.get("type"),
                        question=ex.get("question"),
                        options=json.dumps(ex.get("options"), ensure_ascii=False) if ex.get("options") else None,
                        answer=ex.get("answer"),
                        explanation=ex.get("explanation"),
                        difficulty=ex.get("difficulty", 1),
                    )
                    db.add(exercise)

                db.commit()
                logger.info(f"Contingut generat des del xat: {content_id}")
            finally:
                db.close()

            # Netejar el bloc JSON de la resposta visible
            response_text = re.sub(r'```GENERATE_CONTENT.*?```', '', response_text, flags=re.DOTALL).strip()

        except Exception as e:
            logger.error(f"Error processant GENERATE_CONTENT: {e}")

    return {
        "response": response_text,
        "content_id": content_id,  # None si no s'ha generat res
    }




class SettingsRequest(BaseModel):
    model: str


ALLOWED_MODELS = {"gemini-2.5-flash", "gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-3.5-flash"}


@app.post("/settings")
def update_settings(req: SettingsRequest):
    import gemini as gemini_module
    if req.model not in ALLOWED_MODELS:
        raise HTTPException(status_code=400, detail="Model no vàlid")
    gemini_module.MODEL_NAME = req.model
    logger.info(f"Model canviat a: {req.model}")
    return {"status": "ok", "model": req.model}


@app.get("/settings")
def get_settings():
    import gemini as gemini_module
    return {"model": gemini_module.MODEL_NAME}


@app.post("/settings/reset")
def reset_all():
    """Elimina tota la BD i tots els fitxers multimèdia. Reset complet."""
    db = SessionLocal()
    try:
        # Esborrar tots els fitxers de media
        media_root = Path("/data/media")
        if media_root.exists():
            for folder in media_root.iterdir():
                if folder.is_dir():
                    shutil.rmtree(folder)

        # Esborrar tota la BD
        db.query(Exercise).delete()
        db.query(Content).delete()
        db.commit()
        logger.info("Reset complet executat")
        return {"status": "reset"}
    finally:
        db.close()


# ── Media ─────────────────────────────────────────────────────────────────────

@app.get("/media-list/{content_id}")
def list_media(content_id: str):
    folder = Path(f"/data/media/{content_id}")
    if not folder.exists():
        return []
    exts = {'.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.webm'}
    return sorted([
        str(f.relative_to(folder))
        for f in folder.rglob("*")
        if f.is_file() and f.suffix.lower() in exts
    ])


@app.get("/media/{content_id}/{filepath:path}")
def serve_media(content_id: str, filepath: str, request: Request):
    """Serveix arxius multimèdia amb suport de Range requests (necessari per seek de vídeo)."""
    from fastapi.responses import StreamingResponse, Response
    import mimetypes

    file_path = Path(f"/data/media/{content_id}/{filepath}")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Arxiu no trobat")

    file_size = file_path.stat().st_size
    mime_type, _ = mimetypes.guess_type(str(file_path))
    mime_type = mime_type or "application/octet-stream"

    range_header = request.headers.get("range")

    if range_header:
        # Parse "bytes=start-end"
        ranges = range_header.strip().replace("bytes=", "").split("-")
        start = int(ranges[0])
        end = int(ranges[1]) if ranges[1] else file_size - 1
        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        def iter_file():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    data = f.read(min(65536, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type=mime_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
            },
        )

    # Sense range: retorna el fitxer sencer
    def iter_full():
        with open(file_path, "rb") as f:
            while True:
                data = f.read(65536)
                if not data:
                    break
                yield data

    return StreamingResponse(
        iter_full(),
        media_type=mime_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        },
    )
