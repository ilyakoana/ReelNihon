# ReelNihon 🎌

**Learn real Japanese from Instagram content — not textbook Japanese.**

ReelNihon is a self-hosted personal Japanese learning app. You send Instagram Reels or carousels to a Telegram bot, and the app automatically generates structured study material and interactive exercises using Google Gemini AI. Everything runs on your own Linux server via Docker.

> ⚠️ This is a personal project, currently built for a single user. It is not polished for general public use yet. Setup requires basic knowledge of Docker and Linux.

---

## What it does

1. **Send an Instagram link** to the Telegram bot (Reels or photo carousels)
2. The bot downloads the content and sends it to Google Gemini for analysis
3. Gemini generates:
   - A detailed **study summary** in your language, with furigana over kanji
   - **10–50 interactive exercises** (multiple choice, fill-in-the-blank, translation, word ordering, pair matching, and more)
4. Everything appears instantly in the **web app**, accessible from your phone

---

## Features

- 📲 **Telegram bot** — send a link, get back "Received". That's it.
- 📚 **Study tab** — read the AI-generated summary with furigana (reading aid over kanji), view the original video or photo carousel
- 🏋️ **Exercises** — 6 interactive exercise types, Duolingo-style, all closed-answer (no free text input)
- 💬 **AI Chat** — ask questions, attach PDFs or images, or ask the AI to generate a lesson on any topic directly from the chat
- 🔤 **Furigana toggle** — show or hide reading aids over kanji, switchable in settings
- ⚙️ **Settings** — switch Gemini model, full data reset
- 📅 **Dailies** — coming soon: daily spaced repetition sessions from your accumulated content
- 🗑️ **Delete & regenerate** — remove content or re-run AI analysis if something went wrong
- 🌙 **Mobile-first dark UI** — designed for phone use, Tokyo minimal aesthetic

---

## Philosophy

Most Japanese learning apps teach textbook Japanese. ReelNihon is built around one idea: **learn the Japanese people actually speak**.

- If the AI detects unnatural or overly formal expressions (the kind real Japanese people rarely use in daily conversation), it flags them explicitly
- Content covers vocabulary, grammar, expressions, pronunciation, culture, and social behavior — whatever is in the video
- Exercises simulate real situations: convenience stores, friends, social media — not JLPT exams

---

## Tech stack

| Layer | Technology |
|---|---|
| Bot | Python, python-telegram-bot, yt-dlp, gallery-dl |
| Backend | Python, FastAPI, SQLAlchemy, SQLite |
| AI | Google Gemini (2.5 Flash by default, configurable) |
| Frontend | React, Vite, react-markdown |
| Infrastructure | Docker Compose, Nginx |

---

## Requirements

- A Linux server (tested on Ubuntu 24)
- Docker + Docker Compose
- A [Telegram bot token](https://t.me/BotFather)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- Instagram cookies file (exported from your browser — required for downloading content)

---

## Setup

**1. Clone the repo**
```bash
git clone https://github.com/yourusername/reel-nihon.git
cd reel-nihon
```

**2. Configure environment variables**
```bash
cp .env.example .env
nano .env
```

Fill in:
```env
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_ALLOWED_USER_ID=your_telegram_user_id   # get it from @userinfobot
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash
BACKEND_URL=http://backend:8000
```

**3. Add Instagram cookies**

Log into Instagram in your browser, then export cookies using a browser extension like *Get cookies.txt LOCALLY* (Chrome/Firefox). Save the file as `bot/cookies.txt`.

> Without cookies, Instagram will block most downloads.

**4. Start everything**
```bash
docker compose up -d --build
```

The web app will be available at `http://your-server-ip:9990`

---

## Usage

1. Open Telegram and send `/start` to your bot
2. Paste any public Instagram Reel or carousel URL
3. The bot replies "Получено! 📥" (Received)
4. In ~30–60 seconds, the content appears in the web app at `:9990`
5. Open it, read the summary, do the exercises

To generate a lesson from the chat tab, just type something like:
> *"Generate a lesson about Japanese particles は and が"*

The lesson will appear directly in the Content tab.

---

## Project structure

```
reel-nihon/
├── bot/                  # Telegram bot + Instagram downloader
├── backend/              # FastAPI API + Gemini integration + SQLite
├── frontend/             # React web app (Vite + Nginx)
├── data/
│   ├── media/            # Downloaded videos and photos
│   └── db/               # SQLite database
└── docker-compose.yml
```

---

## Roadmap

- [ ] Daily review system (spaced repetition from existing exercises)
- [ ] Chat-generated lessons with topic browsing
- [ ] Per-exercise progress tracking
- [ ] Support for other content sources beyond Instagram

---

## License

MIT — do whatever you want with it.

---

*Built for personal use. The goal is to actually speak Japanese, not to pass a test.*
