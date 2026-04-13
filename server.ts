import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import multer from 'multer';

// --- Startup guard: fail fast if API key is missing ---
if (!process.env.GEMINI_API_KEY) {
  console.error(
    'FATAL: GEMINI_API_KEY is not set.\nCopy .env.example to .env and add your Gemini API key.'
  );
  process.exit(1);
}

const app = express();
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// --- Types ---
interface Flashcard {
  id: number;
  tag: string;
  q: string;
  a: string;
  mastery: number;
  courseId?: number;
  source: 'ai_chat' | 'pdf' | 'manual';
}

interface Course {
  id: number;
  title: string;
  outline: Array<{ title: string; description: string; status: string }>;
  createdAt: string;
  lastActiveAt: string;
  messageCount: number;
}

interface StudyEvent {
  type:
    | 'message_sent'
    | 'concept_extracted'
    | 'pdf_uploaded'
    | 'flashcard_created'
    | 'session_started';
  timestamp: string;
}

// --- In-memory state ---
let nextId = 1;
const newId = () => nextId++;

let flashcards: Flashcard[] = [];
let courses: Course[] = [];
let currentCourseId: number | null = null;
let studyEvents: StudyEvent[] = [];
let sessionCount = 0;

// --- Helpers ---

function getCurrentCourse(): Course | undefined {
  return currentCourseId !== null
    ? courses.find((c) => c.id === currentCourseId)
    : undefined;
}

function getRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function getLast7DaysActivity() {
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toISOString().slice(0, 10);
    const dayName = dayNames[d.getDay()];
    const messages = studyEvents.filter(
      (e) => e.type === 'message_sent' && e.timestamp.slice(0, 10) === dayKey
    ).length;
    const concepts = studyEvents.filter(
      (e) => e.type === 'concept_extracted' && e.timestamp.slice(0, 10) === dayKey
    ).length;
    return { name: dayName, messages, concepts };
  });
}

function masteryToGrade(avg: number): string {
  if (avg >= 90) return 'A';
  if (avg >= 80) return 'B';
  if (avg >= 70) return 'C';
  if (avg >= 60) return 'D';
  return 'F';
}

function computeCourseProgress(courseId: number): number {
  const cards = flashcards.filter((f) => f.courseId === courseId);
  if (cards.length === 0) return 0;
  return Math.round(cards.reduce((sum, f) => sum + f.mastery, 0) / cards.length);
}

function getWeakAreas() {
  const lowMastery = flashcards
    .filter((f) => f.mastery < 50)
    .sort((a, b) => a.mastery - b.mastery);

  const tagMap: Record<string, { cards: Flashcard[]; avgMastery: number }> = {};
  for (const card of lowMastery) {
    if (!tagMap[card.tag]) tagMap[card.tag] = { cards: [], avgMastery: 0 };
    tagMap[card.tag].cards.push(card);
  }
  for (const tag of Object.keys(tagMap)) {
    const g = tagMap[tag];
    g.avgMastery = Math.round(
      g.cards.reduce((sum, c) => sum + c.mastery, 0) / g.cards.length
    );
  }

  return Object.entries(tagMap)
    .sort(([, a], [, b]) => a.avgMastery - b.avgMastery)
    .slice(0, 3)
    .map(([tag, { cards, avgMastery }]) => ({
      tag,
      avgMastery,
      topQuestion: cards[0]?.q ?? '',
    }));
}

// Prune events older than 30 days to prevent unbounded growth
function pruneOldEvents() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  studyEvents = studyEvents.filter((e) => e.timestamp >= cutoff);
}

// --- Initialize AI ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- API ROUTES ---

// GET /api/user
app.get('/api/user', (_req, res) => {
  res.json({
    name: process.env.USER_NAME || 'Learner',
    tier: 'Pro Member',
  });
});

// GET /api/context
app.get('/api/context', (_req, res) => {
  const course = getCurrentCourse();
  res.json({
    course: course
      ? { title: course.title, outline: course.outline }
      : null,
    flashcards,
    sessionCount,
  });
});

// GET /api/flashcards
app.get('/api/flashcards', (_req, res) => {
  res.json(flashcards);
});

// POST /api/flashcards — create manual card
app.post('/api/flashcards', (req, res) => {
  const { tag, q, a } = req.body;
  if (!q || !a) return res.status(400).json({ error: 'Question and answer are required' });

  const newCard: Flashcard = {
    id: newId(),
    tag: tag || 'Custom',
    q,
    a,
    mastery: 0,
    source: 'manual',
  };
  flashcards.unshift(newCard);
  studyEvents.push({ type: 'flashcard_created', timestamp: new Date().toISOString() });
  res.json(newCard);
});

// GET /api/analytics
app.get('/api/analytics', (_req, res) => {
  pruneOldEvents();

  const totalMessages = studyEvents.filter((e) => e.type === 'message_sent').length;
  const totalConcepts = studyEvents.filter((e) => e.type === 'concept_extracted').length;
  const avgMastery =
    flashcards.length > 0
      ? Math.round(flashcards.reduce((sum, f) => sum + f.mastery, 0) / flashcards.length)
      : 0;

  const studyTimeData = getLast7DaysActivity();

  const subjectMastery = courses.map((c) => ({
    name: c.title,
    score: computeCourseProgress(c.id),
    color: '#00c8fe',
  }));

  const recentConcepts = flashcards
    .filter((f) => f.source === 'ai_chat')
    .slice(0, 3)
    .map((f) => ({ tag: f.tag, question: f.q, mastery: f.mastery }));

  res.json({
    totalMessages,
    totalConcepts,
    avgMastery,
    masteryGrade: flashcards.length > 0 ? masteryToGrade(avgMastery) : '--',
    totalCards: flashcards.length,
    sessionCount,
    studyTimeData,
    subjectMastery,
    recentConcepts,
  });
});

// GET /api/subjects
app.get('/api/subjects', (_req, res) => {
  const result = courses.map((c) => ({
    id: c.id,
    name: c.title,
    progress: computeCourseProgress(c.id),
    totalMessages: c.messageCount,
    lastActive: getRelativeTime(c.lastActiveAt),
  }));
  res.json(result);
});

// GET /api/weak-areas
app.get('/api/weak-areas', (_req, res) => {
  res.json(getWeakAreas());
});

// PATCH /api/flashcards/:id/review — update mastery from a review rating
app.patch('/api/flashcards/:id/review', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid card ID' });

  const { rating } = req.body as { rating: 'again' | 'hard' | 'easy' };
  if (!['again', 'hard', 'easy'].includes(rating)) {
    return res.status(400).json({ error: 'rating must be again | hard | easy' });
  }

  const card = flashcards.find((f) => f.id === id);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  const delta = rating === 'again' ? -20 : rating === 'hard' ? 5 : 15;
  card.mastery = Math.min(100, Math.max(0, card.mastery + delta));

  res.json(card);
});

// POST /api/upload-pdf — multimodal PDF synthesis
app.post('/api/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const pdfBase64 = req.file.buffer.toString('base64');

    const schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'A catchy, academic title for this material.' },
        outline: {
          type: Type.ARRAY,
          description: "A 3-5 step learning outline based on the document's structure.",
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
            },
          },
        },
        flashcards: {
          type: Type.ARRAY,
          description:
            '5-8 highly testable flashcards extracted from the core concepts of the document.',
          items: {
            type: Type.OBJECT,
            properties: {
              tag: { type: Type.STRING, description: '1-2 word category' },
              q: { type: Type.STRING, description: 'The question' },
              a: { type: Type.STRING, description: 'The answer' },
            },
            required: ['tag', 'q', 'a'],
          },
        },
      },
      required: ['title', 'outline', 'flashcards'],
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { data: pdfBase64, mimeType: 'application/pdf' } },
            {
              text: 'Analyze this document. Generate a course title, a learning outline, and extract the most critical concepts into flashcards.',
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.2,
      },
    });

    if (!response.text) throw new Error('Failed to generate content from PDF');

    const result = JSON.parse(response.text);
    const courseId = newId();

    const newCourse: Course = {
      id: courseId,
      title: result.title,
      outline: result.outline.map((o: { title: string; description: string }, i: number) => ({
        ...o,
        status: i === 0 ? 'active' : 'upcoming',
      })),
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      messageCount: 0,
    };

    courses.push(newCourse);
    currentCourseId = courseId;

    const newCards: Flashcard[] = result.flashcards.map(
      (f: { tag: string; q: string; a: string }) => ({
        id: newId(),
        tag: f.tag || 'General',
        q: f.q,
        a: f.a || '',
        mastery: 0,
        courseId,
        source: 'pdf' as const,
      })
    );

    flashcards = [...newCards, ...flashcards];
    studyEvents.push({ type: 'pdf_uploaded', timestamp: new Date().toISOString() });

    res.json({ success: true, course: { title: newCourse.title, outline: newCourse.outline } });
  } catch (error) {
    console.error('PDF Processing Error:', error);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

// POST /api/chat — Socratic tutor with autonomous concept extraction
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Count a new session when the user sends their first message
    if (!history || history.length === 0) {
      sessionCount++;
      studyEvents.push({ type: 'session_started', timestamp: new Date().toISOString() });
    }

    studyEvents.push({ type: 'message_sent', timestamp: new Date().toISOString() });

    // Update active course engagement by ID
    const activeCourse = getCurrentCourse();
    if (activeCourse) {
      activeCourse.messageCount++;
      activeCourse.lastActiveAt = new Date().toISOString();
    }

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        reply: {
          type: Type.STRING,
          description:
            "Your conversational response to the user. Act as an elite Socratic tutor. Guide them, don't just give answers. Keep it concise and engaging.",
        },
        extractedConcept: {
          type: Type.OBJECT,
          nullable: true,
          description:
            'If the conversation introduces a highly important, testable concept, extract it into a flashcard. Otherwise, return null.',
          properties: {
            tag: {
              type: Type.STRING,
              description: "A 1-2 word category tag (e.g., 'Architecture', 'Math')",
            },
            question: { type: Type.STRING, description: 'A concise question testing the concept.' },
            answer: { type: Type.STRING, description: 'The answer to the question.' },
          },
          required: ['tag', 'question', 'answer'],
        },
      },
      required: ['reply'],
    };

    // Validate and sanitize history items before sending to Gemini
    const formattedHistory = (Array.isArray(history) ? history : [])
      .filter(
        (msg: unknown): msg is { role: string; content: string } =>
          typeof msg === 'object' &&
          msg !== null &&
          typeof (msg as Record<string, unknown>).role === 'string' &&
          typeof (msg as Record<string, unknown>).content === 'string'
      )
      .map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }));

    formattedHistory.push({ role: 'user', parts: [{ text: message.trim() }] });

    const courseTitle = activeCourse?.title ?? 'the subject at hand';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: formattedHistory,
      config: {
        systemInstruction: `You are Curator AI, a sophisticated, high-end Socratic tutor helping the student master "${courseTitle}". You are encouraging, precise, and you guide students to epiphanies rather than spoon-feeding them.`,
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    if (!response.text) throw new Error('No response from AI');

    const result = JSON.parse(response.text);

    let newFlashcardAdded = false;
    if (result.extractedConcept?.question) {
      flashcards.unshift({
        id: newId(),
        tag: result.extractedConcept.tag || 'Concept',
        q: result.extractedConcept.question,
        a: result.extractedConcept.answer || '',
        mastery: 0,
        courseId: activeCourse?.id,
        source: 'ai_chat',
      });

      studyEvents.push({ type: 'concept_extracted', timestamp: new Date().toISOString() });
      newFlashcardAdded = true;
    }

    res.json({ reply: result.reply, newFlashcardAdded, flashcards });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// --- Vite middleware + server start ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
