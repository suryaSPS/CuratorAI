import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import multer from 'multer';

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
  type: 'message_sent' | 'concept_extracted' | 'pdf_uploaded' | 'flashcard_created' | 'session_started';
  timestamp: string;
}

// --- In-memory state (empty on start — no fabricated data) ---
let flashcards: Flashcard[] = [];
let courses: Course[] = [];
let currentCourseContext: { title: string; outline: Course['outline'] } | null = null;
let studyEvents: StudyEvent[] = [];
let sessionCount = 0;

// --- Helpers ---

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

// --- Initialize AI (server-side only) ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- API ROUTES ---

// GET /api/user — user profile from environment
app.get('/api/user', (_req, res) => {
  res.json({
    name: process.env.USER_NAME || 'Learner',
    tier: 'Pro Member',
  });
});

// GET /api/context — current course + flashcards
app.get('/api/context', (_req, res) => {
  res.json({
    course: currentCourseContext,
    flashcards,
    sessionCount,
  });
});

// GET /api/flashcards — full deck
app.get('/api/flashcards', (_req, res) => {
  res.json(flashcards);
});

// POST /api/flashcards — create manual card
app.post('/api/flashcards', (req, res) => {
  const { tag, q, a } = req.body;
  if (!q || !a) return res.status(400).json({ error: 'Question and answer are required' });

  const newCard: Flashcard = {
    id: Date.now(),
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

// GET /api/analytics — computed from real events
app.get('/api/analytics', (_req, res) => {
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

  // Last 3 AI-extracted flashcards for "Recent Concepts" section
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

// GET /api/subjects — derived from uploaded courses
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

// GET /api/weak-areas — computed from actual flashcard mastery
app.get('/api/weak-areas', (_req, res) => {
  res.json(getWeakAreas());
});

// POST /api/upload-pdf — multimodal PDF synthesis
app.post('/api/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const pdfBase64 = req.file.buffer.toString('base64');

    const schema: any = {
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
    const courseId = Date.now();

    const newCourse: Course = {
      id: courseId,
      title: result.title,
      outline: result.outline.map((o: any, i: number) => ({
        ...o,
        status: i === 0 ? 'active' : 'upcoming',
      })),
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      messageCount: 0,
    };

    courses.push(newCourse);
    currentCourseContext = { title: newCourse.title, outline: newCourse.outline };

    const newCards: Flashcard[] = result.flashcards.map((f: any, i: number) => ({
      id: courseId + i + 1,
      tag: f.tag || 'General',
      q: f.q,
      a: f.a || '',
      mastery: 0,
      courseId,
      source: 'pdf' as const,
    }));

    flashcards = [...newCards, ...flashcards];
    studyEvents.push({ type: 'pdf_uploaded', timestamp: new Date().toISOString() });

    res.json({ success: true, course: currentCourseContext });
  } catch (error) {
    console.error('PDF Processing Error:', error);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

// POST /api/chat — Socratic tutor with autonomous concept extraction
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;

    // Count a new session when the user sends their first message
    if (!history || history.length === 0) {
      sessionCount++;
      studyEvents.push({ type: 'session_started', timestamp: new Date().toISOString() });
    }

    studyEvents.push({ type: 'message_sent', timestamp: new Date().toISOString() });

    // Update active course engagement
    if (currentCourseContext) {
      const course = courses.find((c) => c.title === currentCourseContext?.title);
      if (course) {
        course.messageCount++;
        course.lastActiveAt = new Date().toISOString();
      }
    }

    const responseSchema: any = {
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
            "If the conversation introduces a highly important, testable concept, extract it into a flashcard. Otherwise, return null.",
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

    const formattedHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
    formattedHistory.push({ role: 'user', parts: [{ text: message }] });

    const courseTitle = currentCourseContext?.title || 'the subject at hand';

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
      const courseId = currentCourseContext
        ? courses.find((c) => c.title === currentCourseContext?.title)?.id
        : undefined;

      flashcards.unshift({
        id: Date.now(),
        tag: result.extractedConcept.tag || 'Concept',
        q: result.extractedConcept.question,
        a: result.extractedConcept.answer || '',
        mastery: 0,
        courseId,
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
