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
| **PDF → Course** | Upload any PDF. Gemini 2.5 Flash deconstructs it via multimodal analysis into a structured learning outline + 5–8 testable flashcards using enforced JSON schema output. Deep analysis can explicitly route to Pro. |
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
│  /api/auth          Server-verified accounts        │
│  /api/billing       Credits, ledger, checkout       │
│  /api/weak-areas    Computed from mastery scores    │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│ SQLite (users, sessions, courses, cards, ledger)    │
│ Private disk storage (per-user PDFs)                │
│ Gemini 2.5 Flash default · Pro for Deep mode        │
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

**Prerequisites:** Node.js 22.6+, a Gemini API key, and a billing-enabled Gemini project for document/chat processing in production.

```bash
# 1. Clone and install
git clone https://github.com/suryaSPS/CuratorAI.git
cd CuratorAI
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env and set:
#   GEMINI_API_KEY=your_key_here
#   GEMINI_DATA_TIER="paid" # required in production; protects sensitive study material
#   VITE_GOOGLE_CLIENT_ID="your-google-oauth-client-id" # optional
#   GOOGLE_CLIENT_ID="your-google-oauth-client-id"      # required with Google sign-in

# 3. Run
npm run dev
# → http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key — used server-side only, never exposed to the client |
| `GEMINI_DATA_TIER` | Production | Set to `paid` only for a billing-enabled Gemini project. Production refuses to run model calls for `unpaid` projects. |
| `USER_NAME` | No | Your display name in the app (default: `Learner`) |
| `APP_URL` | No | Deployment URL for self-referential links |
| `VITE_GOOGLE_CLIENT_ID` | No | Public Google OAuth Web client ID used to render Google Identity Services |
| `GOOGLE_CLIENT_ID` | No | Matching client ID, used by the server to verify Google ID tokens |
| `CURATOR_DATA_DIR` | No | Persistent local directory for the SQLite database and private PDFs (default: `.data`) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | No | Enables Stripe credit checkout and verification webhook |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | No | Enables Razorpay credit checkout and verification webhook |

### Accounts, privacy, and billing

Curator opens at the sign-in page by default. Username/password accounts are persisted in SQLite with bcrypt password hashes. Sessions are random, opaque tokens held only in HTTP-only cookies and stored hashed in the database. Every course, flashcard, PDF, event, usage record, and payment order is scoped to that user.

The server records every model call in a per-user usage ledger (feature, model, input/output/cached tokens, timestamp, and calculated cost). It checks a plan quota, monthly spend ceiling, and available prepaid credits before it calls Gemini. Standard requests route to Flash; users can opt into Deep/Pro for more expensive work. Stripe and Razorpay endpoints issue verified credit purchases only after their signed completion signals.

Academic PDFs can be sensitive. Curator requires both a recorded privacy acknowledgement and a billing-enabled Gemini project before processing a PDF or conversation. Google states that prompts, responses, and uploaded documents from its paid Gemini API services are not used to improve its products, while unpaid services may use submitted content to improve products; review the current [Gemini API Terms](https://ai.google.dev/gemini-api/terms) and [zero data retention guidance](https://ai.google.dev/gemini-api/docs/zdr) before launch. Paid-services logging for abuse monitoring can still apply.

To enable Google sign-in, create a Google OAuth **Web application** client, set both client-ID variables, and register the appropriate development/production origins. The browser only receives an ID token; the server verifies it with Google before it creates the session.

### Scaling note

The included persistence layer is real and durable for a single Node process: SQLite plus private local disk storage. Before running multiple application instances, replace `server/platform.ts` storage with managed Postgres and object storage, add backups, encryption-at-rest/key management, deletion jobs, and a payment reconciliation process. Do not share `.data/` or commit it.

---

## Project Structure

```
├── server.ts          # Express backend — auth, AI logic, billing, API routes
├── server/platform.ts # SQLite persistence, private PDF storage, quotas and ledger
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
