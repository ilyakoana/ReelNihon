"""
bot.py
Telegram-бот ReelNihon.
Принимает ссылку на Instagram (Reel или карусель), скачивает контент
и отвечает "Получено!". Дальнейшая обработка (Gemini, темарии, упражнения)
будет добавлена в следующих этапах.
"""

import logging
import os

import httpx
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    ContextTypes,
    MessageHandler,
    CommandHandler,
    filters,
)

from downloader import is_instagram_url, download_instagram_content

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ALLOWED_USER_ID = os.getenv("TELEGRAM_ALLOWED_USER_ID")  # опционально, для безопасности
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000")


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Привет! Я ReelNihon 🎌\n"
        "Отправь мне ссылку на Instagram Reel или карусель с японским языком, "
        "и я её сохраню."
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id

    if ALLOWED_USER_ID and str(user_id) != str(ALLOWED_USER_ID):
        logger.warning(f"Неавторизованный пользователь: {user_id}")
        return  # молча игнорируем чужих

    text = (update.message.text or "").strip()

    if not is_instagram_url(text):
        await update.message.reply_text(
            "Это не похоже на ссылку Instagram 🤔\nПришли ссылку на Reel или карусель."
        )
        return

    logger.info(f"Скачивание контента: {text}")

    result = download_instagram_content(text)

    if not result["success"]:
        logger.error(f"Ошибка: {result['error']}")
        await update.message.reply_text(
            f"Не получилось скачать 😕\nОшибка: {result['error']}"
        )
        return

    logger.info(
        f"Скачано успешно: content_id={result['content_id']}, "
        f"файлов={len(result['files'])}, folder={result['folder']}"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{BACKEND_URL}/process",
                json={
                    "content_id": result["content_id"],
                    "source_url": text,
                    "folder": result["folder"],
                    "files": result["files"],
                },
            )
    except Exception as e:
        logger.error(f"No se pudo notificar al backend: {e}")
        # No bloqueamos la respuesta al usuario por esto — el contenido
        # ya está descargado, solo falló el aviso al backend.

    await update.message.reply_text("Получено! 📥")


def main():
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN не задан в .env")

    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("ReelNihon bot запущен")
    app.run_polling()


if __name__ == "__main__":
    main()
