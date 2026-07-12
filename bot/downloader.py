"""
downloader.py
Скачивает контент (Reels или карусели фото) с Instagram через yt-dlp.
Сохраняет файлы в /data/media/<content_id>/
"""

import uuid
import logging
import subprocess
from pathlib import Path

import yt_dlp

logger = logging.getLogger(__name__)

MEDIA_ROOT = Path("/data/media")
COOKIES_FILE = Path("/app/cookies.txt")


def is_instagram_url(url: str) -> bool:
    """Простая проверка, что ссылка похожа на Instagram."""
    return "instagram.com" in url


def _download_with_gallery_dl(url: str, folder: Path) -> bool:
    """
    Fallback для каруселей фото (yt-dlp не умеет их скачивать).
    Возвращает True si la descàrrega ha funcionat.
    """
    cmd = [
        "gallery-dl",
        "--dest", str(folder),
        "-o", "directory=[]",
        "-o", "filename={num}.{extension}",
        url,
    ]
    if COOKIES_FILE.exists():
        cmd.extend(["--cookies", str(COOKIES_FILE)])

    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            logger.error(f"gallery-dl error: {result.stderr}")
            return False
        return True
    except Exception as e:
        logger.error(f"gallery-dl excepción: {e}")
        return False


def download_instagram_content(url: str) -> dict:
    """
    Скачивает контент по ссылке Instagram.

    Возвращает dict с информацией:
    {
        "content_id": str,
        "folder": str,            # путь к папке с файлами
        "files": list[str],       # пути ко всем скачанным файлам
        "title": str | None,
        "success": bool,
        "error": str | None,
    }
    """
    content_id = str(uuid.uuid4())
    folder = MEDIA_ROOT / content_id
    folder.mkdir(parents=True, exist_ok=True)

    output_template = str(folder / "%(id)s.%(ext)s")

    ydl_opts = {
        "outtmpl": output_template,
        "quiet": True,
        "no_warnings": True,
        "format": "best",
        # Карусели (несколько фото/видео в одном посте) тоже скачаются,
        # yt-dlp создаст несколько файлов с playlist_index
        "noplaylist": False,
    }

    if COOKIES_FILE.exists():
        ydl_opts["cookiefile"] = str(COOKIES_FILE)
    else:
        logger.warning(
            "cookies.txt не найден — скачивание может не сработать "
            "из-за ограничений Instagram"
        )

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get("title") or info.get("description", "")[:100]
    except Exception as e:
        error_msg = str(e)
        # "No video formats found" suele indicar que es un carrusel de fotos,
        # que yt-dlp no soporta. Probamos con gallery-dl como fallback.
        if "No video formats found" in error_msg:
            logger.info(f"Parece carrusel de fotos, probando gallery-dl: {url}")
            success = _download_with_gallery_dl(url, folder)
            if success:
                files = [str(f) for f in folder.rglob("*") if f.is_file()]
                if files:
                    return {
                        "content_id": content_id,
                        "folder": str(folder),
                        "files": files,
                        "title": None,
                        "success": True,
                        "error": None,
                    }

        logger.error(f"Ошибка скачивания {url}: {e}")
        return {
            "content_id": content_id,
            "folder": str(folder),
            "files": [],
            "title": None,
            "success": False,
            "error": error_msg,
        }

    files = [str(f) for f in folder.iterdir() if f.is_file()]

    if not files:
        return {
            "content_id": content_id,
            "folder": str(folder),
            "files": [],
            "title": title,
            "success": False,
            "error": "Не найдено скачанных файлов",
        }

    return {
        "content_id": content_id,
        "folder": str(folder),
        "files": files,
        "title": title,
        "success": True,
        "error": None,
    }
