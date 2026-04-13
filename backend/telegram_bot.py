"""
Фича 1: Telegram Smart Inbox — Локальная обработка через Ollama

Запуск:
  python telegram_bot.py

Зависимости:
  pip install python-telegram-bot httpx python-dotenv

Переменные окружения (.env):
  TELEGRAM_BOT_TOKEN=your_bot_token_here
  OLLAMA_BASE_URL=http://localhost:11434
  OLLAMA_MODEL=mistral
  NEXUS_API_URL=http://localhost:8000/api
"""

import json
import logging
import os
from datetime import datetime, timedelta

import httpx
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
NEXUS_API = os.getenv("NEXUS_API_URL", "http://localhost:8000/api")

# ──────────────────────────────────────────────────────────────
# Промт для Ollama — стабильный JSON-вывод
# ──────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """Ты — парсер задач для инженерного планировщика Nexus.
Пользователь отправляет тебе текстовое сообщение на русском языке.
Твоя задача — извлечь структурированные данные и вернуть ТОЛЬКО валидный JSON.

Правила:
1. Определи тип: "task" (задача/действие), "event" (встреча/пара с фиксированным временем), "note" (заметка).
2. Извлеки заголовок (title) — краткое описание действия, до 10 слов.
3. Если упоминается проект — извлеки в поле "project".
4. Если есть дата/время — преобразуй в ISO-формат YYYY-MM-DDTHH:MM.
   Сегодняшняя дата: {today}. "Завтра" = {tomorrow}.
5. Извлеки контекстные теги из содержания:
   - работа с кодом/программирование → "@код"
   - пайка/сборка/железо → "@железо"
   - учёба/универ/пары → "@универ"
   - 3D-моделирование/CAD → "@cad"

Формат ответа (СТРОГО только JSON, без markdown, без пояснений):
{{
  "type": "task",
  "title": "Краткий заголовок",
  "project": "Название проекта или null",
  "deadline": "YYYY-MM-DDTHH:MM или null",
  "context_tags": ["@код"],
  "event_type": "class или meeting или null",
  "start_time": "YYYY-MM-DDTHH:MM или null",
  "end_time": "YYYY-MM-DDTHH:MM или null"
}}"""


def build_prompt(user_text: str) -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    return SYSTEM_PROMPT.format(today=today, tomorrow=tomorrow)


async def call_ollama(user_text: str) -> dict:
    """Отправляет запрос к Ollama и парсит JSON-ответ."""
    prompt = build_prompt(user_text)

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": f"{prompt}\n\nСообщение пользователя: \"{user_text}\"\n\nJSON:",
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.1, "num_predict": 512},
            },
        )
        response.raise_for_status()
        raw = response.json().get("response", "{}")

    # Извлекаем JSON — модель иногда оборачивает в markdown
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning(f"Ollama returned non-JSON: {raw[:200]}")
        return {"type": "note", "title": user_text[:200]}


async def send_to_nexus_inbox(raw_text: str, parsed: dict, chat_id: str):
    """Сохраняет распарсенный результат в Nexus Inbox через API."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(
            f"{NEXUS_API}/inbox/",
            json={
                "raw_text": raw_text,
                "parsed_type": parsed.get("type", "task"),
                "parsed_data": parsed,
                "source": "telegram",
                "telegram_chat_id": chat_id,
            },
        )


# ──────────────────────────────────────────────────────────────
# Telegram Handlers
# ──────────────────────────────────────────────────────────────

async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Привет! Я — Nexus Inbox Bot.\n\n"
        "Отправь мне текст или голосовое сообщение, и я создам задачу, "
        "событие или заметку в твоём планировщике.\n\n"
        "Примеры:\n"
        '• "Завтра в 16:00 пофиксить плату для экзоскелета"\n'
        '• "В понедельник лекция по матанализу 9:00-10:30"\n'
        '• "Купить резисторы 10кОм для дрона"'
    )


async def message_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Основной хэндлер — парсит текст через Ollama и сохраняет в Inbox."""
    user_text = update.message.text
    chat_id = str(update.effective_chat.id)

    await update.message.reply_text("Обрабатываю...")

    try:
        parsed = await call_ollama(user_text)
        await send_to_nexus_inbox(user_text, parsed, chat_id)

        # Формируем красивый ответ
        type_labels = {"task": "Задача", "event": "Событие", "note": "Заметка"}
        msg_type = type_labels.get(parsed.get("type", ""), "Запись")
        title = parsed.get("title", user_text[:50])
        deadline = parsed.get("deadline") or parsed.get("start_time") or "—"
        project = parsed.get("project") or "—"
        tags = ", ".join(parsed.get("context_tags", [])) or "—"

        reply = (
            f"✅ {msg_type} добавлена во Входящие!\n\n"
            f"📌 {title}\n"
            f"📅 {deadline}\n"
            f"📁 Проект: {project}\n"
            f"🏷 Теги: {tags}"
        )
        await update.message.reply_text(reply)

    except Exception as e:
        logger.exception("Error processing message")
        await update.message.reply_text(
            f"Ошибка обработки: {str(e)[:100]}\n"
            "Сообщение всё равно сохранено как заметка."
        )
        await send_to_nexus_inbox(
            user_text, {"type": "note", "title": user_text[:200]}, chat_id
        )


def main():
    if not BOT_TOKEN:
        print("ERROR: TELEGRAM_BOT_TOKEN не установлен в .env")
        return

    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, message_handler))

    print(f"Nexus Telegram Bot запущен (Ollama: {OLLAMA_MODEL}@{OLLAMA_URL})")
    app.run_polling()


if __name__ == "__main__":
    main()
