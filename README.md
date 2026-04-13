# Curator AI

An AI-powered Socratic learning platform that synthesizes PDFs into structured courses and autonomously extracts flashcards from study conversations in real time.

---

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini_2.5_Pro-4285F4?style=flat&logo=google&logoColor=white)

---

## What It Does

| Feature | How it works |
|---|---|
| **PDF → Course** | Upload any PDF. Gemini 2.5 Pro deconstructs it via multimodal analysis into a structured learning outline + 5–8 testable flashcards using enforced JSON schema output. |
| **Autonomous Flashcard Extraction** | The Socratic tutor listens to the conversation and silently extracts key concepts into your flashcard deck — no user action required. Powered by a dual-output structured schema (`reply` + `extractedConcept`). |
| **Socratic Tutor** | A system-instructed AI persona that guides students toward understanding rather than giving direct answers. Maintains full conversation history per session. |
| **Real Analytics** | Tracks actual study events (messages sent, concepts extracted, sessions started) and computes mastery scores from flashcard reviews — no fabricated data. |

---

## Hero Metric

> **Generates a full course outline + 5–8 study-ready flashcards from any PDF in a single Gemini API call** — using structured JSON schema output with `temperature: 0.2` for consistent, parseable results.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React 19 + Vite SPA                │
│  Dashboard │ Study Session │ Flashcards │ Analytics │
└─────────────────────┬───────────────────────────────┘
                      │ REST /api/*
┌─────────────────────▼───────────────────────────────┐
│              Express.js + TypeScript                │
│                                                     │
│  /api/chat          Socratic tutor + concept        │
│                     extraction (structured output)  │
│                                                     │
│  /api/upload-pdf    PDF → outline + flashcards      │
│                     (multimodal, base64 encoded)    │
│                                                     │
│  /api/analytics     Real event tracking             │
│  /api/weak-areas    Computed from mastery scores    │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              Google Gemini 2.5 Pro                  │
│   Structured JSON schema · System instructions      │
│   Multimodal PDF processing · Streaming-ready       │
└─────────────────────────────────────────────────────┘
```

---

## Demo

> **Screenshot / GIF placeholder** — add a demo GIF or screenshot here.

To record a demo:
1. Upload a PDF (lecture notes, paper, textbook chapter)
2. Watch the course outline and flashcards generate
3. Start a chat — observe flashcards appear automatically as you discuss concepts
4. Check the Analytics page for real tracked data

---

## Run Locally

**Prerequisites:** Node.js 18+, a Gemini API key ([get one free](https://aistudio.google.com/apikey))

```bash
# 1. Clone and install
git clone https://github.com/suryaSPS/CuratorAI.git
cd CuratorAI
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env and set:
#   GEMINI_API_KEY=your_key_here
#   USER_NAME="Your Name"

# 3. Run
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key — used server-side only, never exposed to the client |
| `USER_NAME` | No | Your display name in the app (default: `Learner`) |
| `APP_URL` | No | Deployment URL for self-referential links |

---

## Project Structure

```
├── server.ts          # Express backend — all AI logic, event tracking, API routes
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx       # PDF upload + mastery paths + weak areas
│   │   ├── StudySession.tsx    # Socratic chat + live flashcard sidebar
│   │   ├── Flashcards.tsx      # Deck management + manual card creation
│   │   ├── Analytics.tsx       # Real-time study metrics + concept history
│   │   └── Subjects.tsx        # Courses derived from PDF uploads
│   └── components/
│       ├── Sidebar.tsx         # Dynamic course title
│       └── TopBar.tsx          # User profile from env
└── .env.example
```
